import { useEffect } from 'react'
import { useCombatStore } from '@/stores/combatStore'

const STEP_DURATION = 100 // ms per cell - adjust for faster/slower animation

/**
 * Hook that drives the movement animation by advancing through path steps
 * at regular intervals. Should be called once in a component that's always mounted
 * during combat (e.g., CombatGrid).
 */
export function useMovementAnimation() {
  const movementAnimation = useCombatStore((state) => state.movementAnimation)
  const advanceMovementAnimation = useCombatStore((state) => state.advanceMovementAnimation)

  useEffect(() => {
    if (!movementAnimation) return

    // Start a timer to advance to the next position
    const timer = setTimeout(() => {
      advanceMovementAnimation()
    }, STEP_DURATION)

    return () => clearTimeout(timer)
  }, [movementAnimation, advanceMovementAnimation])
}
