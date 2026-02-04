import type { TerrainDefinition } from '@/types'

// Import map preview images
import goblinCampImage from '@/assets/maps/goblin_camp.png'
import graveyardImage from '@/assets/maps/graveyard.png'

export interface MapPreset {
  id: string
  name: string
  description: string
  gridWidth: number
  gridHeight: number
  terrain: TerrainDefinition[]
  previewImage?: string
}

export const mapPresets: MapPreset[] = [
  {
    id: 'open-field',
    name: 'Open Field',
    description: 'A wide open battlefield with minimal cover.',
    gridWidth: 14,
    gridHeight: 10,
    terrain: [
      // A few scattered rocks for light cover
      { x: 4, y: 4, obstacle: { type: 'boulder', blocksMovement: true, blocksLineOfSight: true } },
      { x: 9, y: 6, obstacle: { type: 'boulder', blocksMovement: true, blocksLineOfSight: true } },
      { x: 2, y: 7, obstacle: { type: 'tree', blocksMovement: true, blocksLineOfSight: true } },
    ],
  },
  {
    id: 'goblin-camp',
    name: 'Goblin Camp',
    description: 'A forest clearing with campfire, tents, and scattered trees.',
    gridWidth: 14,
    gridHeight: 10,
    previewImage: goblinCampImage,
    terrain: [
      // Campfire area (hazard - fire)
      { x: 6, y: 4, terrain: 'hazard' },
      { x: 7, y: 4, terrain: 'hazard' },
      { x: 6, y: 5, terrain: 'hazard' },
      { x: 7, y: 5, terrain: 'hazard' },
      // Tents (furniture - blocks movement but not sight)
      { x: 9, y: 2, obstacle: { type: 'furniture', blocksMovement: true, blocksLineOfSight: false } },
      { x: 10, y: 2, obstacle: { type: 'furniture', blocksMovement: true, blocksLineOfSight: false } },
      { x: 9, y: 3, obstacle: { type: 'furniture', blocksMovement: true, blocksLineOfSight: false } },
      { x: 10, y: 6, obstacle: { type: 'furniture', blocksMovement: true, blocksLineOfSight: false } },
      { x: 10, y: 7, obstacle: { type: 'furniture', blocksMovement: true, blocksLineOfSight: false } },
      // Scattered trees around the perimeter
      { x: 1, y: 1, obstacle: { type: 'tree', blocksMovement: true, blocksLineOfSight: true } },
      { x: 3, y: 0, obstacle: { type: 'tree', blocksMovement: true, blocksLineOfSight: true } },
      { x: 12, y: 1, obstacle: { type: 'tree', blocksMovement: true, blocksLineOfSight: true } },
      { x: 0, y: 5, obstacle: { type: 'tree', blocksMovement: true, blocksLineOfSight: true } },
      { x: 2, y: 8, obstacle: { type: 'tree', blocksMovement: true, blocksLineOfSight: true } },
      { x: 11, y: 9, obstacle: { type: 'tree', blocksMovement: true, blocksLineOfSight: true } },
      // Some difficult terrain (underbrush)
      { x: 3, y: 3, terrain: 'difficult' },
      { x: 4, y: 3, terrain: 'difficult' },
      { x: 3, y: 4, terrain: 'difficult' },
      { x: 10, y: 4, terrain: 'difficult' },
      { x: 11, y: 4, terrain: 'difficult' },
    ],
  },
  {
    id: 'graveyard',
    name: 'Graveyard',
    description: 'A haunted graveyard with tombstones and a raised crypt.',
    gridWidth: 15,
    gridHeight: 10,
    previewImage: graveyardImage,
    terrain: [
      // Raised altar platform (right side)
      { x: 11, y: 3, elevation: 1 },
      { x: 12, y: 3, elevation: 1 },
      { x: 13, y: 3, elevation: 1 },
      { x: 11, y: 4, elevation: 1 },
      { x: 12, y: 4, elevation: 1 },
      { x: 13, y: 4, elevation: 1 },
      { x: 11, y: 5, elevation: 1 },
      { x: 12, y: 5, elevation: 1 },
      { x: 13, y: 5, elevation: 1 },
      { x: 11, y: 6, elevation: 1 },
      { x: 12, y: 6, elevation: 1 },
      { x: 13, y: 6, elevation: 1 },
      // Stairs to platform
      { x: 10, y: 4, stairConnection: { targetX: 11, targetY: 4, targetElevation: 1, direction: 'up' } },
      { x: 10, y: 5, stairConnection: { targetX: 11, targetY: 5, targetElevation: 1, direction: 'up' } },
      // Pillars throughout the chamber
      { x: 3, y: 2, obstacle: { type: 'pillar', blocksMovement: true, blocksLineOfSight: true } },
      { x: 3, y: 7, obstacle: { type: 'pillar', blocksMovement: true, blocksLineOfSight: true } },
      { x: 7, y: 2, obstacle: { type: 'pillar', blocksMovement: true, blocksLineOfSight: true } },
      { x: 7, y: 7, obstacle: { type: 'pillar', blocksMovement: true, blocksLineOfSight: true } },
      // Walls blocking some areas
      { x: 0, y: 0, obstacle: { type: 'wall', blocksMovement: true, blocksLineOfSight: true } },
      { x: 1, y: 0, obstacle: { type: 'wall', blocksMovement: true, blocksLineOfSight: true } },
      { x: 0, y: 1, obstacle: { type: 'wall', blocksMovement: true, blocksLineOfSight: true } },
      { x: 0, y: 9, obstacle: { type: 'wall', blocksMovement: true, blocksLineOfSight: true } },
      { x: 1, y: 9, obstacle: { type: 'wall', blocksMovement: true, blocksLineOfSight: true } },
      { x: 0, y: 8, obstacle: { type: 'wall', blocksMovement: true, blocksLineOfSight: true } },
      { x: 14, y: 0, obstacle: { type: 'wall', blocksMovement: true, blocksLineOfSight: true } },
      { x: 13, y: 0, obstacle: { type: 'wall', blocksMovement: true, blocksLineOfSight: true } },
      { x: 14, y: 1, obstacle: { type: 'wall', blocksMovement: true, blocksLineOfSight: true } },
      { x: 14, y: 9, obstacle: { type: 'wall', blocksMovement: true, blocksLineOfSight: true } },
      { x: 13, y: 9, obstacle: { type: 'wall', blocksMovement: true, blocksLineOfSight: true } },
      { x: 14, y: 8, obstacle: { type: 'wall', blocksMovement: true, blocksLineOfSight: true } },
      // Some rubble (boulders)
      { x: 5, y: 5, obstacle: { type: 'boulder', blocksMovement: true, blocksLineOfSight: true } },
    ],
  },
]

export function getMapPreset(id: string): MapPreset | undefined {
  return mapPresets.find((m) => m.id === id)
}
