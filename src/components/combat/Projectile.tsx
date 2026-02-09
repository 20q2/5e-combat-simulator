import { useEffect, useState } from 'react'
import type { Position } from '@/types'

const CELL_SIZE = 56

interface ProjectileProps {
  from: Position
  to: Position
  duration: number
}

export function Projectile({ from, to, duration }: ProjectileProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const startTime = performance.now()
    let animationFrame: number

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const p = Math.min(elapsed / duration, 1)
      setProgress(p)

      if (p < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [duration])

  // Calculate pixel positions (center of cells)
  const fromX = from.x * CELL_SIZE + CELL_SIZE / 2
  const fromY = from.y * CELL_SIZE + CELL_SIZE / 2
  const toX = to.x * CELL_SIZE + CELL_SIZE / 2
  const toY = to.y * CELL_SIZE + CELL_SIZE / 2

  // Ease-in-out for smooth flight
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2

  const currentX = fromX + (toX - fromX) * eased
  const currentY = fromY + (toY - fromY) * eased

  // Fade out near the end of flight
  const opacity = progress > 0.85 ? (1 - progress) / 0.15 : 1

  // Calculate rotation angle to face direction of travel
  const angle = Math.atan2(toY - fromY, toX - fromX) * (180 / Math.PI)

  const size = 10

  return (
    <div
      className="absolute pointer-events-none z-[150]"
      style={{
        left: currentX - size / 2,
        top: currentY - size / 2,
        width: size,
        height: size,
        opacity,
        transform: `rotate(${angle}deg)`,
      }}
    >
      {/* Glowing projectile with directional trail */}
      <div
        className="w-full h-full rounded-full bg-amber-300"
        style={{
          boxShadow: '0 0 6px 2px rgba(251, 191, 36, 0.8), 0 0 12px 4px rgba(251, 191, 36, 0.4)',
        }}
      />
    </div>
  )
}
