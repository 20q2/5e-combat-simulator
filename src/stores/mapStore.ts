import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MapPreset } from '@/data/maps'

interface MapState {
  savedMaps: MapPreset[]
  saveMap: (map: Omit<MapPreset, 'id'>) => void
  deleteMap: (id: string) => void
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      savedMaps: [],

      saveMap: (map) =>
        set((state) => ({
          savedMaps: [
            ...state.savedMaps,
            { ...map, id: crypto.randomUUID() },
          ],
        })),

      deleteMap: (id) =>
        set((state) => ({
          savedMaps: state.savedMaps.filter((m) => m.id !== id),
        })),
    }),
    {
      name: '5e-combat-sim-maps',
      partialize: (state) => ({
        savedMaps: state.savedMaps,
      }),
    }
  )
)
