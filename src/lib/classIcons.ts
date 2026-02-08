// Use Vite's glob import to load all class icons
const classIconModules = import.meta.glob<{ default: string }>(
  '@/assets/class_icons/*.png',
  { eager: true }
)

/**
 * Get the icon URL for a given class ID
 * @param classId - The lowercase class ID (e.g., 'fighter', 'wizard')
 * @returns The icon URL or undefined if not found
 */
export function getClassIcon(classId: string): string | undefined {
  // Capitalize first letter to match filename (e.g., 'fighter' -> 'Fighter.png')
  const capitalized = classId.charAt(0).toUpperCase() + classId.slice(1)
  const path = `/src/assets/class_icons/${capitalized}.png`
  return classIconModules[path]?.default
}
