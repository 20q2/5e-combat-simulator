import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a Challenge Rating as a fraction string (D&D style)
 * 0.125 → "1/8", 0.25 → "1/4", 0.5 → "1/2", 1+ → "1", "2", etc.
 */
export function formatCR(cr: number): string {
  if (cr === 0) return "0"
  if (cr === 0.125) return "1/8"
  if (cr === 0.25) return "1/4"
  if (cr === 0.5) return "1/2"
  return cr.toString()
}
