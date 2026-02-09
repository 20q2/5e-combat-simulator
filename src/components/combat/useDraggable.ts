import { useState, useRef, useCallback, useEffect } from 'react'

interface Position {
  x: number
  y: number
}

interface UseDraggableOptions {
  /** Reset position when this value changes */
  resetKey?: string | number | null
  /** Minimum visible pixels from each edge (default: 50) */
  edgePadding?: number
}

interface UseDraggableReturn {
  /** Current position offset from initial position */
  position: Position
  /** Whether currently dragging */
  isDragging: boolean
  /** Props to spread on the draggable container */
  containerProps: {
    ref: React.RefObject<HTMLDivElement>
    style: React.CSSProperties
    onMouseDown: (e: React.MouseEvent) => void
  }
  /** Data attribute to add to drag handle elements */
  dragHandleAttr: { 'data-drag-handle': true }
}

/**
 * Hook for making a dialog draggable
 *
 * Usage:
 * 1. Spread containerProps on the dialog container
 * 2. Add dragHandleAttr to elements that should initiate dragging
 *
 * @example
 * const { position, isDragging, containerProps, dragHandleAttr } = useDraggable()
 *
 * return (
 *   <div {...containerProps}>
 *     <div {...dragHandleAttr}>Drag here</div>
 *     <div>Content</div>
 *   </div>
 * )
 */
export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
  const { resetKey, edgePadding = 50 } = options

  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Position>({ x: 0, y: 0 })
  const positionRef = useRef<Position>({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset position when resetKey changes
  useEffect(() => {
    setPosition({ x: 0, y: 0 })
    positionRef.current = { x: 0, y: 0 }
  }, [resetKey])

  // Clamp position to keep dialog within viewport bounds
  const clampPosition = useCallback((x: number, y: number): Position => {
    if (!containerRef.current) return { x, y }

    const rect = containerRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Calculate the container's initial center position (before any transform)
    // The container is centered in the viewport, so its initial position is:
    const initialCenterX = viewportWidth / 2
    const initialCenterY = viewportHeight / 2
    const halfWidth = rect.width / 2
    const halfHeight = rect.height / 2

    // Calculate bounds: ensure at least edgePadding pixels remain visible
    const minX = edgePadding - (initialCenterX - halfWidth) - halfWidth
    const maxX = viewportWidth - edgePadding - (initialCenterX - halfWidth) - halfWidth
    const minY = edgePadding - (initialCenterY - halfHeight) - halfHeight
    const maxY = viewportHeight - edgePadding - (initialCenterY - halfHeight) - halfHeight

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    }
  }, [edgePadding])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from elements with data-drag-handle attribute
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX - positionRef.current.x,
        y: e.clientY - positionRef.current.y,
      }
      e.preventDefault()
    }
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    const rawX = e.clientX - dragStartRef.current.x
    const rawY = e.clientY - dragStartRef.current.y
    const clamped = clampPosition(rawX, rawY)
    positionRef.current = clamped
    setPosition(clamped)
  }, [isDragging, clampPosition])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add/remove global mouse listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return {
    position,
    isDragging,
    containerProps: {
      ref: containerRef,
      style: {
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : undefined,
      },
      onMouseDown: handleMouseDown,
    },
    dragHandleAttr: { 'data-drag-handle': true as const },
  }
}
