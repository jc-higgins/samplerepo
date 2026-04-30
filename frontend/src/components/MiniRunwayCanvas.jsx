import { useEffect, useRef } from 'react'

export function MiniRunwayCanvas() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = 320
    const H = 96
    let raf = 0
    let phase = 0

    function draw() {
      phase += 0.018
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const n = 48
      const pathY = (i) => {
        const x = i / n
        return (
          H * 0.52 +
          Math.sin(i * 0.38 + phase) * 14 +
          Math.cos(i * 0.11 + phase * 0.45) * 10 +
          x * x * 8
        )
      }

      ctx.beginPath()
      ctx.moveTo(0, H)
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * W
        ctx.lineTo(x, pathY(i))
      }
      ctx.lineTo(W, H)
      ctx.closePath()
      const fill = ctx.createLinearGradient(0, 0, 0, H)
      fill.addColorStop(0, 'rgba(45, 212, 191, 0.45)')
      fill.addColorStop(0.55, 'rgba(56, 189, 248, 0.12)')
      fill.addColorStop(1, 'rgba(15, 23, 42, 0)')
      ctx.fillStyle = fill
      ctx.fill()

      ctx.strokeStyle = 'rgba(125, 211, 252, 0.95)'
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.beginPath()
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * W
        const y = pathY(i)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.moveTo(0, H * 0.72)
      ctx.lineTo(W, H * 0.72)
      ctx.stroke()
      ctx.setLineDash([])

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={ref}
      className="mini-runway-canvas"
      aria-hidden
    />
  )
}
