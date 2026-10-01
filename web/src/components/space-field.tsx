/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

/*
Ambient deep-space backdrop for public pages (OpenSpec: ambient-background-fx).

Purely decorative: never takes pointer events, never focusable, hidden from
assistive tech, painted behind content. The CSS wash on `.space-field` is the
default appearance, so the layer still reads as designed with JavaScript
disabled or under a reduced-motion preference.

Drawn on Canvas 2D rather than a WebGL library: the effect is a 2D lattice of
drifting nodes with proximity links and pointer parallax, so a 3D engine would
buy a remote dependency, a WebGL context and hundreds of kilobytes for no
visible difference. See design.md D5.
*/

const PARTICLES_DESKTOP = 130
const PARTICLES_MOBILE = 60
const NEIGHBOUR_SCAN = 20
const LINK_DISTANCE = 118
const POINTER_RADIUS = 130
const DRIFT = 0.16
const MAX_PIXEL_RATIO = 2
const FALLBACK_PRIMARY = 'rgb(62, 233, 255)'
const FALLBACK_ACCENT = 'rgb(123, 92, 255)'

interface Particle {
  x: number
  y: number
  homeX: number
  homeY: number
  vx: number
  vy: number
}

function cssColor(token: string, fallback: string): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim()
  if (!raw) return fallback
  // Theme tokens are authored in oklch, which canvas cannot always parse.
  // Rasterising through a 1px context resolves any supported CSS colour into
  // sRGB that every engine can reuse.
  const probe = document.createElement('canvas')
  probe.width = 1
  probe.height = 1
  const probeCtx = probe.getContext('2d', { willReadFrequently: true })
  if (!probeCtx) return fallback
  probeCtx.fillStyle = raw
  probeCtx.fillRect(0, 0, 1, 1)
  const [r, g, b] = probeCtx.getImageData(0, 0, 1, 1).data
  return `rgb(${r ?? 0}, ${g ?? 0}, ${b ?? 0})`
}

function withAlpha(color: string, alpha: number): string {
  return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
}

function seedParticles(
  count: number,
  width: number,
  height: number
): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i += 1) {
    const x = Math.random() * width
    const y = Math.random() * height
    particles.push({
      x,
      y,
      homeX: x,
      homeY: y,
      vx: (Math.random() - 0.5) * 2 * DRIFT,
      vy: (Math.random() - 0.5) * 2 * DRIFT,
    })
  }
  return particles
}

/**
 * Starts the drift loop on `canvas` and returns its teardown. Returns null when
 * the 2D context is unavailable, leaving only the CSS wash.
 */
function createDriftField(canvas: HTMLCanvasElement): (() => void) | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  let primary = cssColor('--primary', FALLBACK_PRIMARY)
  let accent = cssColor('--chart-2', FALLBACK_ACCENT)
  let width = window.innerWidth
  let height = window.innerHeight
  let particles = seedParticles(
    width < 768 ? PARTICLES_MOBILE : PARTICLES_DESKTOP,
    width,
    height
  )
  const pointer = { x: Number.NaN, y: Number.NaN }
  let frame = 0

  const resize = () => {
    // Guarded against a zero-size viewport so the lattice never collapses to an
    // undrawable canvas.
    width = Math.max(1, window.innerWidth)
    height = Math.max(1, window.innerHeight)
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(height * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    particles = seedParticles(
      width < 768 ? PARTICLES_MOBILE : PARTICLES_DESKTOP,
      width,
      height
    )
  }

  const onPointerMove = (event: PointerEvent) => {
    pointer.x = event.clientX
    pointer.y = event.clientY
  }
  const onPointerLeave = () => {
    pointer.x = Number.NaN
    pointer.y = Number.NaN
  }

  // Re-read the palette when the mode or preset changes so the backdrop keeps
  // following the same tokens as the rest of the page.
  const themeObserver = new MutationObserver(() => {
    primary = cssColor('--primary', FALLBACK_PRIMARY)
    accent = cssColor('--chart-2', FALLBACK_ACCENT)
  })

  const drawLinks = () => {
    ctx.lineWidth = 1
    // A bounded forward window keeps this pass linear instead of O(n²).
    // Particles are not spatially sorted, so it samples a stochastic neighbour
    // set — sufficient for a decorative lattice.
    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i]
      if (!a) continue
      const scanEnd = Math.min(i + NEIGHBOUR_SCAN, particles.length)
      for (let j = i + 1; j < scanEnd; j += 1) {
        const b = particles[j]
        if (!b) continue
        const distance = Math.hypot(a.x - b.x, a.y - b.y)
        if (distance > LINK_DISTANCE) continue
        ctx.strokeStyle = withAlpha(
          accent,
          0.18 * (1 - distance / LINK_DISTANCE)
        )
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }
  }

  const advance = () => {
    for (const particle of particles) {
      particle.x += particle.vx
      particle.y += particle.vy

      if (
        particle.x < 0 ||
        particle.x > width ||
        particle.y < 0 ||
        particle.y > height
      ) {
        particle.vx *= -1
        particle.vy *= -1
      }

      if (!Number.isNaN(pointer.x)) {
        const dx = pointer.x - particle.x
        const dy = (pointer.y ?? 0) - particle.y
        const distance = Math.hypot(dx, dy)
        if (distance > 0.001 && distance < POINTER_RADIUS) {
          const force = (POINTER_RADIUS - distance) / POINTER_RADIUS
          particle.x -= dx * force * 0.03
          particle.y -= dy * force * 0.03
        }
      }

      particle.x += (particle.homeX - particle.x) * 0.006
      particle.y += (particle.homeY - particle.y) * 0.006
    }
  }

  const step = () => {
    frame = requestAnimationFrame(step)
    // No work while the tab is hidden.
    if (document.hidden) return
    advance()
    ctx.clearRect(0, 0, width, height)
    drawLinks()
    ctx.fillStyle = primary
    for (const particle of particles) {
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme-preset'],
  })
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerleave', onPointerLeave)
  resize()
  requestAnimationFrame(step)

  return () => {
    cancelAnimationFrame(frame)
    themeObserver.disconnect()
    window.removeEventListener('resize', resize)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerleave', onPointerLeave)
  }
}

interface SpaceFieldProps {
  className?: string
}

/**
 * Fixed decorative backdrop. Mount once per public page; content keeps its own
 * stacking context above it.
 */
export function SpaceField(props: SpaceFieldProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = document.createElement('canvas')
    canvas.className = 'size-full'
    root.appendChild(canvas)
    const teardown = createDriftField(canvas)

    return () => {
      teardown?.()
      canvas.remove()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn(
        'space-field pointer-events-none fixed inset-0 -z-10',
        props.className
      )}
    />
  )
}
