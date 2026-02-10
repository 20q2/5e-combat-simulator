import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { TerrainDefinition, ObstacleType, TerrainType, Obstacle } from '@/types'
import {
  Download,
  Trash2,
  TreePine,
  Circle,
  Square,
  Sofa,
  Mountain,
  Eraser,
  AlertTriangle,
  Droplets,
  Footprints,
  X,
  Upload,
} from 'lucide-react'

// Use Vite's glob import to load obstacle images
const obstacleImages = import.meta.glob<{ default: string }>(
  '@/assets/obstacles/*.png',
  { eager: true }
)

// Use Vite's glob import to load map background images
const mapBackgroundImages = import.meta.glob<{ default: string }>(
  '@/assets/maps/*.{png,jpg,jpeg}',
  { eager: true }
)

// Get list of available background images
interface BackgroundOption {
  name: string
  path: string
  src: string
}

const backgroundOptions: BackgroundOption[] = Object.entries(mapBackgroundImages).map(
  ([path, module]) => {
    // Extract filename without extension from path like "/src/assets/maps/goblin_camp.png"
    const filename = path.split('/').pop()?.replace(/\.(png|jpe?g)$/, '') || 'unknown'
    const displayName = filename
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    return {
      name: displayName,
      path: filename,
      src: module.default,
    }
  }
)

function getObstacleImage(type: string): string | null {
  const imagePath = `/src/assets/obstacles/${type}.png`
  const imageModule = obstacleImages[imagePath]
  return imageModule?.default ?? null
}

// Tool definitions
interface ObstacleTool {
  type: 'obstacle'
  obstacleType: ObstacleType
  blocksMovement: boolean
  blocksLineOfSight: boolean
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface TerrainTool {
  type: 'terrain'
  terrainType: TerrainType
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface EraserTool {
  type: 'eraser'
  label: string
  icon: React.ComponentType<{ className?: string }>
}

type Tool = ObstacleTool | TerrainTool | EraserTool

const obstacleTools: ObstacleTool[] = [
  { type: 'obstacle', obstacleType: 'wall', blocksMovement: true, blocksLineOfSight: true, label: 'Wall', icon: Square },
  { type: 'obstacle', obstacleType: 'pillar', blocksMovement: true, blocksLineOfSight: true, label: 'Pillar', icon: Circle },
  { type: 'obstacle', obstacleType: 'tree', blocksMovement: true, blocksLineOfSight: true, label: 'Tree', icon: TreePine },
  { type: 'obstacle', obstacleType: 'boulder', blocksMovement: true, blocksLineOfSight: true, label: 'Boulder', icon: Mountain },
  { type: 'obstacle', obstacleType: 'furniture', blocksMovement: true, blocksLineOfSight: false, label: 'Furniture', icon: Sofa },
]

const terrainTools: TerrainTool[] = [
  { type: 'terrain', terrainType: 'difficult', label: 'Difficult', icon: Footprints },
  { type: 'terrain', terrainType: 'hazard', label: 'Hazard', icon: AlertTriangle },
  { type: 'terrain', terrainType: 'water', label: 'Water', icon: Droplets },
]

const eraserTool: EraserTool = { type: 'eraser', label: 'Eraser', icon: Eraser }

const CELL_SIZE = 40 // pixels for editor grid

interface GridCellData {
  obstacle?: Obstacle
  terrain?: TerrainType
  elevation?: number
}

export function MapBuilderPage() {
  const [mapName, setMapName] = useState('My Custom Map')
  const [mapDescription, setMapDescription] = useState('')
  const [gridWidth, setGridWidth] = useState(14)
  const [gridHeight, setGridHeight] = useState(10)
  const [widthInput, setWidthInput] = useState('14')
  const [heightInput, setHeightInput] = useState('10')
  const [selectedTool, setSelectedTool] = useState<Tool>(obstacleTools[0])
  const [gridData, setGridData] = useState<Record<string, GridCellData>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState<BackgroundOption | null>(null)
  const [bgScale, setBgScale] = useState(100) // percentage
  const [bgOffsetX, setBgOffsetX] = useState(0) // pixels
  const [bgOffsetY, setBgOffsetY] = useState(0) // pixels
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
    setBackgroundImage({ name, path: 'custom-upload', src: url })
    // Reset the input so re-uploading the same file triggers onChange
    e.target.value = ''
  }

  const getCellKey = (x: number, y: number) => `${x},${y}`

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      const key = getCellKey(x, y)

      setGridData((prev) => {
        const newData = { ...prev }

        if (selectedTool.type === 'eraser') {
          // Remove all data from cell
          delete newData[key]
        } else if (selectedTool.type === 'obstacle') {
          // Set obstacle
          newData[key] = {
            ...newData[key],
            obstacle: {
              type: selectedTool.obstacleType,
              blocksMovement: selectedTool.blocksMovement,
              blocksLineOfSight: selectedTool.blocksLineOfSight,
            },
            terrain: undefined, // Clear terrain when placing obstacle
          }
        } else if (selectedTool.type === 'terrain') {
          // Set terrain
          newData[key] = {
            ...newData[key],
            terrain: selectedTool.terrainType,
            obstacle: undefined, // Clear obstacle when placing terrain
          }
        }

        return newData
      })
    },
    [selectedTool]
  )

  const handleMouseDown = (x: number, y: number) => {
    setIsDragging(true)
    handleCellClick(x, y)
  }

  const handleMouseEnter = (x: number, y: number) => {
    if (isDragging) {
      handleCellClick(x, y)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleClear = () => {
    setGridData({})
  }

  const handleExport = () => {
    // Convert grid data to terrain definitions array
    const terrain: TerrainDefinition[] = []

    Object.entries(gridData).forEach(([key, data]) => {
      const [x, y] = key.split(',').map(Number)

      if (data.obstacle) {
        terrain.push({ x, y, obstacle: data.obstacle })
      } else if (data.terrain) {
        terrain.push({ x, y, terrain: data.terrain })
      } else if (data.elevation !== undefined && data.elevation > 0) {
        terrain.push({ x, y, elevation: data.elevation })
      }
    })

    const mapData = {
      name: mapName,
      description: mapDescription,
      gridWidth,
      gridHeight,
      terrain,
      backgroundImage: backgroundImage?.path,
    }

    // Create downloadable JSON file
    const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${mapName.toLowerCase().replace(/\s+/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clampGridSize = (value: number) => Math.max(5, Math.min(100, value))

  // Check if a cell has a wall obstacle
  const hasWall = (x: number, y: number): boolean => {
    const key = getCellKey(x, y)
    return gridData[key]?.obstacle?.type === 'wall'
  }

  // Get wall border styles based on adjacent walls
  const getWallBorderStyle = (x: number, y: number): React.CSSProperties => {
    const borderWidth = 3
    const borderColor = '#ffffff' // white for visibility

    return {
      borderTopWidth: hasWall(x, y - 1) ? 0 : borderWidth,
      borderBottomWidth: hasWall(x, y + 1) ? 0 : borderWidth,
      borderLeftWidth: hasWall(x - 1, y) ? 0 : borderWidth,
      borderRightWidth: hasWall(x + 1, y) ? 0 : borderWidth,
      borderColor,
      borderStyle: 'solid',
    }
  }

  const getCellContent = (x: number, y: number) => {
    const key = getCellKey(x, y)
    const data = gridData[key]

    if (!data) return null

    if (data.obstacle) {
      // Special rendering for walls - transparent fill with merged borders
      if (data.obstacle.type === 'wall') {
        return (
          <div
            className="absolute inset-0 bg-transparent"
            style={getWallBorderStyle(x, y)}
          />
        )
      }

      // Other obstacles use images
      const image = getObstacleImage(data.obstacle.type)
      if (image) {
        return (
          <img
            src={image}
            alt={data.obstacle.type}
            className="w-full h-full object-cover"
          />
        )
      }
      // Fallback icon based on type
      const iconMap: Record<ObstacleType, string> = {
        wall: '🧱',
        pillar: '🪨',
        tree: '🌲',
        boulder: '⬛',
        furniture: '🪑',
      }
      return <span className="text-lg">{iconMap[data.obstacle.type]}</span>
    }

    if (data.terrain) {
      const terrainStyles: Record<TerrainType, string> = {
        difficult: 'bg-amber-700/50',
        hazard: 'bg-orange-600/50',
        water: 'bg-blue-500/50',
      }
      return <div className={cn('absolute inset-0', terrainStyles[data.terrain])} />
    }

    return null
  }

  return (
    <div className="space-y-6" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div>
        <h1 className="text-3xl font-bold">Map Builder</h1>
        <p className="text-muted-foreground">Create custom battle maps for your encounters</p>
      </div>

      <div className="grid grid-cols-[250px_1fr_280px] gap-6">
        {/* Left Panel - Tools */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Obstacles</CardTitle>
              <CardDescription>Click to select, then paint on grid</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {obstacleTools.map((tool) => {
                const Icon = tool.icon
                const isSelected =
                  selectedTool.type === 'obstacle' &&
                  (selectedTool as ObstacleTool).obstacleType === tool.obstacleType

                return (
                  <button
                    key={tool.obstacleType}
                    onClick={() => setSelectedTool(tool)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{tool.label}</span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Terrain</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {terrainTools.map((tool) => {
                const Icon = tool.icon
                const isSelected =
                  selectedTool.type === 'terrain' &&
                  (selectedTool as TerrainTool).terrainType === tool.terrainType

                return (
                  <button
                    key={tool.terrainType}
                    onClick={() => setSelectedTool(tool)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{tool.label}</span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => setSelectedTool(eraserTool)}
                className={cn(
                  'w-full flex items-center gap-2 p-2 rounded-lg border transition-colors',
                  selectedTool.type === 'eraser'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Eraser className="w-5 h-5" />
                <span className="text-sm">Eraser</span>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Center - Grid Editor */}
        <Card className="overflow-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Grid Editor</CardTitle>
            <CardDescription>
              Click and drag to place {selectedTool.label.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-auto">
            <div
              className="relative border border-slate-600 rounded select-none"
              style={{
                width: gridWidth * CELL_SIZE + (gridWidth - 1),
                height: gridHeight * CELL_SIZE + (gridHeight - 1),
              }}
            >
              {/* Background image layer */}
              {backgroundImage && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img
                    src={backgroundImage.src}
                    alt={backgroundImage.name}
                    className="opacity-60"
                    style={{
                      width: `${bgScale}%`,
                      height: `${bgScale}%`,
                      objectFit: 'cover',
                      transform: `translate(${bgOffsetX}px, ${bgOffsetY}px)`,
                    }}
                  />
                </div>
              )}

              {/* Grid layer */}
              <div
                className="relative grid gap-px"
                style={{
                  gridTemplateColumns: `repeat(${gridWidth}, ${CELL_SIZE}px)`,
                }}
              >
                {Array.from({ length: gridHeight }).map((_, y) =>
                  Array.from({ length: gridWidth }).map((_, x) => {
                    const key = getCellKey(x, y)
                    const data = gridData[key]

                    return (
                      <div
                        key={key}
                        className={cn(
                          'relative flex items-center justify-center cursor-crosshair transition-colors',
                          !backgroundImage && 'bg-slate-900',
                          backgroundImage && 'bg-slate-900/30',
                          'hover:bg-slate-800/50',
                          data?.terrain === 'difficult' && 'bg-amber-900/50',
                          data?.terrain === 'hazard' && 'bg-orange-900/50',
                          data?.terrain === 'water' && 'bg-blue-900/50',
                          'border border-slate-700/50'
                        )}
                        style={{ width: CELL_SIZE, height: CELL_SIZE }}
                        onMouseDown={() => handleMouseDown(x, y)}
                        onMouseEnter={() => handleMouseEnter(x, y)}
                      >
                        {getCellContent(x, y)}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Properties */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Map Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mapName">Map Name</Label>
                <Input
                  id="mapName"
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  placeholder="Enter map name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mapDescription">Description</Label>
                <Input
                  id="mapDescription"
                  value={mapDescription}
                  onChange={(e) => setMapDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="gridWidth">Width</Label>
                  <Input
                    id="gridWidth"
                    type="number"
                    min={5}
                    max={100}
                    value={widthInput}
                    onChange={(e) => setWidthInput(e.target.value)}
                    onBlur={() => {
                      const v = clampGridSize(parseInt(widthInput) || 14)
                      setGridWidth(v)
                      setWidthInput(String(v))
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = clampGridSize(parseInt(widthInput) || 14)
                        setGridWidth(v)
                        setWidthInput(String(v))
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gridHeight">Height</Label>
                  <Input
                    id="gridHeight"
                    type="number"
                    min={5}
                    max={100}
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    onBlur={() => {
                      const v = clampGridSize(parseInt(heightInput) || 10)
                      setGridHeight(v)
                      setHeightInput(String(v))
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = clampGridSize(parseInt(heightInput) || 10)
                        setGridHeight(v)
                        setHeightInput(String(v))
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Background Image</CardTitle>
              <CardDescription>Select and position a map image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Available backgrounds */}
              <div className="grid grid-cols-2 gap-2">
                {/* None option */}
                <button
                  onClick={() => setBackgroundImage(null)}
                  className={cn(
                    'relative rounded-lg border overflow-hidden transition-all h-16 flex items-center justify-center',
                    !backgroundImage
                      ? 'border-primary ring-1 ring-primary bg-primary/10'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-800'
                  )}
                >
                  <div className="text-center">
                    <X className="w-4 h-4 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px] text-muted-foreground">None</span>
                  </div>
                </button>

                {backgroundOptions.map((option) => (
                  <button
                    key={option.path}
                    onClick={() => setBackgroundImage(option)}
                    className={cn(
                      'relative rounded-lg border overflow-hidden transition-all',
                      backgroundImage?.path === option.path
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-slate-700 hover:border-slate-500'
                    )}
                  >
                    <img
                      src={option.src}
                      alt={option.name}
                      className="w-full h-16 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-slate-900/80 text-[10px] truncate">
                      {option.name}
                    </div>
                  </button>
                ))}

                {/* Upload custom image */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'relative rounded-lg border overflow-hidden transition-all h-16 flex items-center justify-center',
                    backgroundImage?.path === 'custom-upload'
                      ? 'border-primary ring-1 ring-primary bg-primary/10'
                      : 'border-dashed border-slate-600 hover:border-slate-400 bg-slate-800/50'
                  )}
                >
                  <div className="text-center">
                    <Upload className="w-4 h-4 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px] text-muted-foreground">Upload</span>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Position and scale controls - only show when image selected */}
              {backgroundImage && (
                <div className="space-y-3 pt-2 border-t border-slate-700">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Scale</Label>
                      <span className="text-xs text-muted-foreground">{bgScale}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={200}
                      value={bgScale}
                      onChange={(e) => setBgScale(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Offset X</Label>
                      <Input
                        type="number"
                        value={bgOffsetX}
                        onChange={(e) => setBgOffsetX(parseInt(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Offset Y</Label>
                      <Input
                        type="number"
                        value={bgOffsetY}
                        onChange={(e) => setBgOffsetY(parseInt(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setBgScale(100)
                      setBgOffsetX(0)
                      setBgOffsetY(0)
                    }}
                  >
                    Reset Position
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleExport} className="w-full" variant="default">
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
              <Button onClick={handleClear} className="w-full" variant="outline">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Map
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-700/50 rounded" />
                <span className="text-muted-foreground">Difficult Terrain</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-600/50 rounded" />
                <span className="text-muted-foreground">Hazard (damage)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500/50 rounded" />
                <span className="text-muted-foreground">Water</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
