import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getAllBackgrounds, getBackgroundById, ORIGIN_FEATS, isRepeatableFeat } from '@/data'
import { useCharacterStore } from '@/stores/characterStore'
import type { Background } from '@/data/backgrounds'
import { OriginFeatSelector } from './OriginFeatSelector'
import {
  Award,
  BookOpen,
  Info,
  Sparkles,
  Briefcase,
} from 'lucide-react'

function BackgroundCard({
  background,
  selected,
  onSelect,
}: {
  background: Background
  selected: boolean
  onSelect: () => void
}) {
  const defaultFeat = ORIGIN_FEATS.find((f) => f.id === background.defaultOriginFeat)

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-lg border-2 transition-all hover:border-primary/50',
        selected ? 'border-primary bg-primary/5' : 'border-border'
      )}
    >
      <div>
        <h3 className="font-semibold">{background.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{background.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {background.skillProficiencies.map((skill) => (
            <span key={skill} className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
              {skill}
            </span>
          ))}
          {defaultFeat && (
            <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
              {defaultFeat.name}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function BackgroundDetails({ background }: { background: Background }) {
  const defaultFeat = ORIGIN_FEATS.find((f) => f.id === background.defaultOriginFeat)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          {background.name}
        </CardTitle>
        <CardDescription>{background.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
            Skill Proficiencies
          </h4>
          <div className="flex flex-wrap gap-1">
            {background.skillProficiencies.map((skill) => (
              <span key={skill} className="text-sm bg-muted px-2 py-0.5 rounded">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {background.toolProficiency && (
          <div>
            <h4 className="font-medium text-sm mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-green-400" />
              Tool Proficiency
            </h4>
            <p className="text-sm text-muted-foreground">{background.toolProficiency}</p>
          </div>
        )}

        {background.languages && background.languages > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-violet-400" />
              Languages
            </h4>
            <p className="text-sm text-muted-foreground">
              {background.languages} additional language{background.languages > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {defaultFeat && (
          <div>
            <h4 className="font-medium text-sm mb-1 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Default Origin Feat
            </h4>
            <p className="text-sm text-muted-foreground">{defaultFeat.name}</p>
          </div>
        )}

        <div>
          <h4 className="font-medium text-sm mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Ability Score Increases
          </h4>
          <p className="text-sm text-muted-foreground">
            Choose +2/+1 or +1/+1/+1 from:{' '}
            {background.suggestedAbilities
              .map((a) => a.charAt(0).toUpperCase() + a.slice(1))
              .join(', ')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function BackgroundSelector() {
  const {
    draft,
    setBackground,
    setBackgroundOriginFeat,
  } = useCharacterStore()

  const backgrounds = getAllBackgrounds()
  const selectedBackground = draft.backgroundId
    ? getBackgroundById(draft.backgroundId)
    : null

  // Handle background selection
  const handleBackgroundSelect = (backgroundId: string) => {
    setBackground(backgroundId)
    // Set the default origin feat for this background
    const background = getBackgroundById(backgroundId)
    if (background) {
      // Check if human already has this feat
      if (
        draft.raceId === 'human' &&
        draft.humanOriginFeat === background.defaultOriginFeat &&
        !isRepeatableFeat(background.defaultOriginFeat)
      ) {
        // Don't set the default, let user choose a different one
        setBackgroundOriginFeat(null)
      } else {
        setBackgroundOriginFeat(background.defaultOriginFeat)
      }
    }
  }

  // Get the feat that's blocked (human racial feat, unless repeatable)
  const disabledFeatIds =
    draft.raceId === 'human' && draft.humanOriginFeat
      ? [draft.humanOriginFeat]
      : []

  // Build conflict message if needed
  const conflictMessage =
    disabledFeatIds.length > 0 && !isRepeatableFeat(disabledFeatIds[0])
      ? `As a Human, you already selected ${ORIGIN_FEATS.find((f) => f.id === disabledFeatIds[0])?.name} as your racial feat. Choose a different feat here.`
      : undefined

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Background List */}
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            Select Background
          </CardTitle>
          <CardDescription>
            Choose your character's background. This determines your origin feat and skill proficiencies.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-2 pr-2">
            {backgrounds.map((background) => (
              <BackgroundCard
                key={background.id}
                background={background}
                selected={draft.backgroundId === background.id}
                onSelect={() => handleBackgroundSelect(background.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Background Details and Origin Feat */}
      <div className="space-y-4">
        {selectedBackground ? (
          <>
            <BackgroundDetails background={selectedBackground} />
            <OriginFeatSelector
              title="Origin Feat"
              description={`Choose an origin feat for your background. The default is ${ORIGIN_FEATS.find((f) => f.id === selectedBackground.defaultOriginFeat)?.name}.`}
              selectedFeat={draft.backgroundOriginFeat}
              onSelectFeat={setBackgroundOriginFeat}
              disabledFeatIds={disabledFeatIds}
              conflictMessage={conflictMessage}
              defaultFeatId={selectedBackground.defaultOriginFeat}
            />
          </>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center text-muted-foreground py-12">
              Select a background to see its details
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
