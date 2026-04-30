import { useEffect, useRef } from 'react'

export function HeroCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const parent = canvas.parentElement

    let nodes = []
    let w = 0
    let h = 0
    let raf = 0
    let t = 0

    function resize() {
      if (!parent) return
      w = parent.clientWidth
      h = parent.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const target = Math.floor((w * h) / 16000)
      const count = Math.min(95, Math.max(42, target))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
      }))
    }

    function frame() {
      t += 0.007
      ctx.clearRect(0, 0, w, h)

      const bg = ctx.createLinearGradient(0, 0, w, h * 1.2)
      bg.addColorStop(0, '#06080f')
      bg.addColorStop(0.45, '#0a0e18')
      bg.addColorStop(1, '#040508')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      const orbs = [
        {
          x: w * 0.15 + Math.sin(t * 0.38) * 90,
          y: h * 0.2 + Math.cos(t * 0.31) * 70,
          r: Math.max(w, h) * 0.42,
          inner: 'rgba(56, 189, 248, 0.14)',
        },
        {
          x: w * 0.82 + Math.cos(t * 0.27) * 110,
          y: h * 0.45 + Math.sin(t * 0.39) * 85,
          r: Math.max(w, h) * 0.48,
          inner: 'rgba(167, 139, 250, 0.16)',
        },
        {
          x: w * 0.48 + Math.sin(t * 0.22) * 130,
          y: h * 0.88 + Math.cos(t * 0.18) * 50,
          r: h * 0.55,
          inner: 'rgba(52, 211, 153, 0.09)',
        },
      ]
      ctx.globalCompositeOperation = 'screen'
      for (const o of orbs) {
        const rg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r)
        rg.addColorStop(0, o.inner)
        rg.addColorStop(0.55, 'rgba(0,0,0,0)')
        rg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = rg
        ctx.fillRect(0, 0, w, h)
      }
      ctx.globalCompositeOperation = 'source-over'

      ctx.strokeStyle = 'rgba(255,255,255,0.035)'
      ctx.lineWidth = 1
      const gStep = 56
      const off = (t * 12) % gStep
      for (let x = -gStep + off; x < w + gStep; x += gStep) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = off; y < h + gStep; y += gStep) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      const linkDist = Math.min(140, w * 0.14 + 80)
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x <= 0 || n.x >= w) n.vx *= -1
        if (n.y <= 0 || n.y >= h) n.vy *= -1
        n.x = Math.max(0, Math.min(w, n.x))
        n.y = Math.max(0, Math.min(h, n.y))
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d = Math.hypot(dx, dy)
          if (d < linkDist) {
            const a = (1 - d / linkDist) * 0.42
            ctx.strokeStyle = `rgba(148, 197, 255, ${a})`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(226, 241, 255, 0.65)'
        ctx.fill()
      }

      const vignette = ctx.createRadialGradient(
        w * 0.5,
        h * 0.35,
        0,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.85,
      )
      vignette.addColorStop(0, 'rgba(4,6,10,0)')
      vignette.addColorStop(0.65, 'rgba(4,6,10,0.35)')
      vignette.addColorStop(1, 'rgba(2,3,6,0.92)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, w, h)

      raf = requestAnimationFrame(frame)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    resize()
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="hero-canvas" aria-hidden />
}
