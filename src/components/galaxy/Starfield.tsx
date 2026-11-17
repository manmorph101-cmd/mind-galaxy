'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number; y: number; r: number
  alpha: number; twinkle: number; speed: number
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let af: number

    const stars: Star[] = Array.from({ length: 220 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.4 + 0.3,
      alpha: Math.random() * 0.5 + 0.1,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.005,
    }))

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach(s => {
        s.twinkle += s.speed
        const a = s.alpha * (0.7 + 0.3 * Math.sin(s.twinkle))
        ctx.beginPath()
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fill()
      })
      af = requestAnimationFrame(draw)
    }
    af = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(af)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
