import React, { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  radius: number
  baseAlpha: number
  alpha: number
  twinkleSpeed: number
  twinkleOffset: number
  color: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
}

export const CelestialCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      initEntities()
    }

    window.addEventListener('resize', handleResize)

    // Starfield entities
    const stars: Star[] = []
    const particles: Particle[] = []
    const STAR_COUNT = Math.min(180, Math.floor((width * height) / 8000))
    const PARTICLE_COUNT = 30

    const starColors = [
      '#ffffff',
      '#E0F2FE', // Ice Blue
      '#BAE6FD', // Cyan Blue
      '#DDD6FE', // Violet
      '#FEF3C7', // Pale Gold
    ]

    function initEntities() {
      stars.length = 0
      particles.length = 0

      for (let i = 0; i < STAR_COUNT; i++) {
        const baseAlpha = Math.random() * 0.7 + 0.2
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() < 0.85 ? Math.random() * 1.2 + 0.4 : Math.random() * 2.2 + 1.2,
          baseAlpha,
          alpha: baseAlpha,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinkleOffset: Math.random() * Math.PI * 2,
          color: starColors[Math.floor(Math.random() * starColors.length)],
        })
      }

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          radius: Math.random() * 2 + 1,
          alpha: Math.random() * 0.3 + 0.1,
        })
      }
    }

    initEntities()

    // Interactive mouse coordinates
    let mouseX = width / 2
    let mouseY = height / 2
    let targetMouseX = mouseX
    let targetMouseY = mouseY

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX
      targetMouseY = e.clientY
    }

    window.addEventListener('mousemove', handleMouseMove)

    let time = 0

    const render = () => {
      time += 0.015
      mouseX += (targetMouseX - mouseX) * 0.05
      mouseY += (targetMouseY - mouseY) * 0.05

      ctx.clearRect(0, 0, width, height)

      // Draw faint orbital guide arcs in the deep background
      const centerX = width * 0.5 + (mouseX - width * 0.5) * 0.02
      const centerY = height * 0.45 + (mouseY - height * 0.5) * 0.02

      ctx.save()
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.06)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 8])

      // Orbit 1
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, width * 0.38, height * 0.26, -0.22, 0, Math.PI * 2)
      ctx.stroke()

      // Orbit 2
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)'
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, width * 0.55, height * 0.38, 0.18, 0, Math.PI * 2)
      ctx.stroke()

      // Faint orbital object marker orbiting slowly
      const orbAngle = time * 0.25
      const orbX = centerX + Math.cos(orbAngle) * (width * 0.38) * Math.cos(-0.22) - Math.sin(orbAngle) * (height * 0.26) * Math.sin(-0.22)
      const orbY = centerY + Math.cos(orbAngle) * (width * 0.38) * Math.sin(-0.22) + Math.sin(orbAngle) * (height * 0.26) * Math.cos(-0.22)

      // Glow behind moving object
      const glowGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, 14)
      glowGrad.addColorStop(0, 'rgba(34, 211, 238, 0.6)')
      glowGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = glowGrad
      ctx.beginPath()
      ctx.arc(orbX, orbY, 14, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#22D3EE'
      ctx.beginPath()
      ctx.arc(orbX, orbY, 2.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Draw Stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i]
        const currentAlpha = star.baseAlpha + Math.sin(time * 2 + star.twinkleOffset) * 0.3
        const clampedAlpha = Math.max(0.1, Math.min(1, currentAlpha))

        // Parallax offset
        const px = star.x + (mouseX - width / 2) * (star.radius * 0.015)
        const py = star.y + (mouseY - height / 2) * (star.radius * 0.015)

        ctx.save()
        ctx.fillStyle = star.color
        ctx.globalAlpha = clampedAlpha
        ctx.beginPath()
        ctx.arc(px, py, star.radius, 0, Math.PI * 2)
        ctx.fill()

        // Subtle glow for larger stars
        if (star.radius > 1.8) {
          ctx.globalAlpha = clampedAlpha * 0.25
          ctx.beginPath()
          ctx.arc(px, py, star.radius * 3, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      // Draw and animate floating atmospheric particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        ctx.save()
        ctx.fillStyle = '#3B82F6'
        ctx.globalAlpha = p.alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
      aria-hidden="true"
    />
  )
}
