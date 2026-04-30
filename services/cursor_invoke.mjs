#!/usr/bin/env node
/**
 * cursor_invoke.mjs — one-shot bridge from the Python backend to @cursor/sdk.
 *
 * Reads a JSON payload from stdin:
 *   { system: string, user: string, model?: string,
 *     timeout_ms?: number, expect_json?: boolean }
 *
 * Writes a JSON payload to stdout:
 *   on success: { ok: true,  text, parsed?, model, elapsed_ms }
 *   on failure: { ok: false, error }
 *
 * Failures never throw — the Python wrapper just falls back to its
 * deterministic baseline if `ok` is false.
 *
 * The agent is created against an empty tmp directory so its tool surface
 * has nothing to poke at; we only want the model's reply.
 */

import { Agent } from "@cursor/sdk";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_MODEL = "composer-2";
const DEFAULT_TIMEOUT_MS = 25000;

async function readStdin() {
  let buf = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) buf += chunk;
  return buf;
}

function extractTextFromBlocks(content) {
  if (!Array.isArray(content)) return "";
  let out = "";
  for (const block of content) {
    if (block && block.type === "text" && typeof block.text === "string") {
      out += block.text;
    }
  }
  return out;
}

function tryParseJson(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  // Strip ```json ... ``` fences if the model wrapped its reply.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // Try to find the first balanced { ... } block.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function runAgent(payload) {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) throw new Error("CURSOR_API_KEY not set in env");

  const model = payload.model || DEFAULT_MODEL;
  const timeoutMs = payload.timeout_ms || DEFAULT_TIMEOUT_MS;
  const sandbox = mkdtempSync(join(tmpdir(), "cursor-sdk-"));

  const agent = await Agent.create({
    apiKey,
    model: { id: model },
    local: { cwd: sandbox },
  });

  const prompt = payload.expect_json
    ? `${payload.system}\n\n${payload.user}\n\nReturn ONLY a single valid JSON object. No prose, no fenced code blocks.`
    : `${payload.system}\n\n${payload.user}`;

  const startedAt = Date.now();
  const run = await agent.send(prompt);

  let collected = "";
  const timeoutSignal = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs)
  );

  const collect = (async () => {
    for await (const event of run.stream()) {
      if (event && event.type === "assistant" && event.message) {
        collected += extractTextFromBlocks(event.message.content);
      }
    }
    await run.wait();
  })();

  await Promise.race([collect, timeoutSignal]);
  const elapsedMs = Date.now() - startedAt;

  const result = { ok: true, text: collected.trim(), model, elapsed_ms: elapsedMs };
  if (payload.expect_json) {
    const parsed = tryParseJson(collected);
    if (parsed !== null) result.parsed = parsed;
  }
  return result;
}

async function main() {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, error: `bad stdin: ${e.message}` }));
    process.exit(2);
  }

  try {
    const result = await runAgent(payload);
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  } catch (e) {
    const detail = e?.stack || e?.message || String(e);
    process.stderr.write(`[cursor_invoke] ${detail}\n`);
    process.stdout.write(
      JSON.stringify({ ok: false, error: e?.message || String(e), detail })
    );
    process.exit(1);
  }
}

main();
