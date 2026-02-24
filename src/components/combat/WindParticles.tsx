import { useEffect, useRef, useState } from 'react'
import type { Position } from '@/types'

const CELL_SIZE = 56
const PARTICLE_COUNT = 24
const PARTICLE_SPEED = 60 // pixels per second

interface Particle {
  x: number
  y: number
  opacity: number
  length: number
  speed: number
}

interface WindParticlesProps {
  affectedCells: Set<string>
  direction: Position
}

/**
 * RAF-based wind particle system that renders flowing particles
 * along the Gust of Wind line direction
 */
export function WindParticles({ affectedCells, direction }: WindParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])

  // Compute bounding box of affected cells in pixel space
  const bounds = (() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const key of affectedCells) {
      const [cx, cy] = key.split(',').map(Number)
      minX = Math.min(minX, cx * CELL_SIZE)
      minY = Math.min(minY, cy * CELL_SIZE)
      maxX = Math.max(maxX, (cx + 1) * CELL_SIZE)
      maxY = Math.max(maxY, (cy + 1) * CELL_SIZE)
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
  })()

  // Spawn a particle at a random position along the upwind edge
  function spawnParticle(): Particle {
    // The upwind edge is opposite to the direction vector
    // Particles spawn at the upwind side and flow toward the downwind side
    const perpX = -direction.y
    const perpY = direction.x

    // Random position along the perpendicular axis within the bounding box
    const t = Math.random()
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2

    // Upwind edge: offset backward from center along direction
    const extent = Math.max(bounds.width, bounds.height) / 2
    const startX = centerX - direction.x * extent + perpX * (t - 0.5) * extent * 2
    const startY = centerY - direction.y * extent + perpY * (t - 0.5) * extent * 2

    // Randomize entry point along the line
    const entryOffset = Math.random() * extent * 1.5
    return {
      x: startX + direction.x * entryOffset,
      y: startY + direction.y * entryOffset,
      opacity: 0.15 + Math.random() * 0.35,
      length: 6 + Math.random() * 10,
      speed: PARTICLE_SPEED * (0.7 + Math.random() * 0.6),
    }
  }

  useEffect(() => {
    // Initialize particles
    const initial: Particle[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      initial.push(spawnParticle())
    }
    particlesRef.current = initial
    setParticles([...initial])
    lastTimeRef.current = performance.now()

    const animate = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000
      lastTimeRef.current = time

      const updated = particlesRef.current.map(p => {
        let nx = p.x + direction.x * p.speed * dt
        let ny = p.y + direction.y * p.speed * dt

        // If particle exits bounds, respawn it
        if (nx < bounds.minX - 20 || nx > bounds.maxX + 20 ||
            ny < bounds.minY - 20 || ny > bounds.maxY + 20) {
          return spawnParticle()
        }

        return { ...p, x: nx, y: ny }
      })

      particlesRef.current = updated
      setParticles([...updated])
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affectedCells, direction.x, direction.y])

  if (affectedCells.size === 0) return null

  // Rotation angle for particles (align with wind direction)
  const angle = Math.atan2(direction.y, direction.x) * (180 / Math.PI)

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute bg-sky-200"
          style={{
            left: p.x,
            top: p.y,
            width: p.length,
            height: 2,
            opacity: p.opacity,
            transform: `rotate(${angle}deg)`,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  )
}
