import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { mapPresets, type MapPreset } from '@/data/maps'
import { useMapStore } from '@/stores/mapStore'
import { Map, Trees, Skull, Plus, Waves, Bookmark, X } from 'lucide-react'

interface MapSelectorProps {
  selectedMap: MapPreset | null
  onSelectMap: (map: MapPreset | null) => void
}

// Icon mapping for map themes
const mapIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'goblin-camp': Trees,
  'graveyard': Skull,
  'grassy-field': Waves,
}

function MapCard({
  map,
  isSelected,
  onSelect,
  onDelete,
}: {
  map: MapPreset | null
  isSelected: boolean
  onSelect: () => void
  onDelete?: () => void
}) {
  const Icon = map ? mapIcons[map.id] || (onDelete ? Bookmark : Map) : Map

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative w-full text-left p-2 rounded-lg border transition-all overflow-hidden',
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}
    >
      {/* Background map image with gradient fade */}
      {map?.previewImage && (
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, transparent 0%, hsl(var(--background)) 70%), url(${map.previewImage})`,
            backgroundSize: 'cover, cover',
            backgroundPosition: 'center, center',
            backgroundRepeat: 'no-repeat, no-repeat',
          }}
        />
      )}

      <div className="relative z-10 flex items-center gap-2">
        <div
          className={cn(
            'w-8 h-8 rounded flex items-center justify-center shrink-0',
            isSelected ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400'
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{map ? map.name : 'No Map'}</div>
          <div className="text-xs text-muted-foreground truncate">
            {map ? `${map.gridWidth}x${map.gridHeight}` : 'Empty grid'}
          </div>
        </div>
        {onDelete && (
          <div
            role="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="w-6 h-6 rounded flex items-center justify-center shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </button>
  )
}

export function MapSelector({ selectedMap, onSelectMap }: MapSelectorProps) {
  const { savedMaps, deleteMap } = useMapStore()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Battle Map</CardTitle>
        <CardDescription>Choose a map for your encounter</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {/* Map selection buttons */}
          <div className="flex-1 space-y-2">
            {/* No Map option */}
            <MapCard map={null} isSelected={selectedMap === null} onSelect={() => onSelectMap(null)} />

            {/* Map presets */}
            {mapPresets.map((map) => (
              <MapCard
                key={map.id}
                map={map}
                isSelected={selectedMap?.id === map.id}
                onSelect={() => onSelectMap(map)}
              />
            ))}

            {/* Saved maps */}
            {savedMaps.map((map) => (
              <MapCard
                key={map.id}
                map={map}
                isSelected={selectedMap?.id === map.id}
                onSelect={() => onSelectMap(map)}
                onDelete={() => {
                  if (selectedMap?.id === map.id) onSelectMap(null)
                  deleteMap(map.id)
                }}
              />
            ))}

            {/* Create new map link */}
            <Link
              to="/map-builder"
              className="w-full flex items-center gap-2 p-2 rounded-lg border border-dashed border-slate-600 hover:border-primary/50 transition-all text-sm text-muted-foreground hover:text-primary"
            >
              <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 bg-slate-800 text-slate-400">
                <Plus className="w-4 h-4" />
              </div>
              <span className="font-medium">Create New Map</span>
            </Link>
          </div>

          {/* Map preview */}
          <div className="w-40 shrink-0">
            <div className="aspect-square rounded-lg border border-slate-700 bg-slate-900 overflow-hidden flex items-center justify-center">
              {selectedMap?.previewImage ? (
                <img
                  src={selectedMap.previewImage}
                  alt={selectedMap.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <Map className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <span className="text-xs text-slate-500">
                    {selectedMap ? 'No preview' : 'Select a map'}
                  </span>
                </div>
              )}
            </div>
            {selectedMap && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {selectedMap.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
