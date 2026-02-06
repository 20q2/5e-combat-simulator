import { useState, useRef, useCallback, useEffect } from 'react'

interface Position {
  x: number
  y: number
}

interface UseDraggableOptions {
  /** Reset position when this value changes */
  resetKey?: string | number | null
}

interface UseDraggableReturn {
  /** Current position offset from initial position */
  position: Position
  /** Whether currently dragging */
  isDragging: boolean
  /** Props to spread on the draggable container */
  containerProps: {
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
  const { resetKey } = options

  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Position>({ x: 0, y: 0 })
  const positionRef = useRef<Position>({ x: 0, y: 0 })

  // Reset position when resetKey changes
  useEffect(() => {
    setPosition({ x: 0, y: 0 })
    positionRef.current = { x: 0, y: 0 }
  }, [resetKey])

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
    const newX = e.clientX - dragStartRef.current.x
    const newY = e.clientY - dragStartRef.current.y
    positionRef.current = { x: newX, y: newY }
    setPosition({ x: newX, y: newY })
  }, [isDragging])

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
      style: {
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : undefined,
      },
      onMouseDown: handleMouseDown,
    },
    dragHandleAttr: { 'data-drag-handle': true as const },
  }
}
