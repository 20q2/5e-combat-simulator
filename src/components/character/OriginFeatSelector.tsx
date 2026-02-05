import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ORIGIN_FEATS, isRepeatableFeat } from '@/data'
import type { OriginFeatId } from '@/data/originFeats'
import { Award, Sparkles, AlertCircle } from 'lucide-react'

export interface OriginFeatSelectorProps {
  title?: string
  description?: string
  selectedFeat: OriginFeatId | null
  onSelectFeat: (feat: OriginFeatId | null) => void
  /** Feat IDs that cannot be selected (unless repeatable) */
  disabledFeatIds?: OriginFeatId[]
  /** Message to show when there's a conflict */
  conflictMessage?: string
  /** Default feat ID to show as "(default)" in the dropdown */
  defaultFeatId?: OriginFeatId
  /** Whether to wrap in a Card component (default: true) */
  showCard?: boolean
}

function OriginFeatDetails({ featId }: { featId: OriginFeatId }) {
  const feat = ORIGIN_FEATS.find((f) => f.id === featId)
  if (!feat) return null

  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-amber-400" />
        <span className="font-semibold">{feat.name}</span>
        {feat.repeatable && (
          <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
            Repeatable
          </span>
        )}
      </div>
      <div className="space-y-2">
        {feat.benefits.map((benefit, index) => (
          <div key={index} className="pl-1">
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 text-amber-400 shrink-0" />
              <div>
                <span className="font-medium text-sm">{benefit.name}</span>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OriginFeatSelectorInner({
  selectedFeat,
  onSelectFeat,
  disabledFeatIds = [],
  conflictMessage,
  defaultFeatId,
}: Omit<OriginFeatSelectorProps, 'title' | 'description' | 'showCard'>) {
  // Filter out disabled feats (unless repeatable)
  const availableFeats = ORIGIN_FEATS.filter((feat) => {
    if (disabledFeatIds.includes(feat.id) && !isRepeatableFeat(feat.id)) {
      return false
    }
    return true
  })

  const hasConflict = disabledFeatIds.length > 0 && conflictMessage

  return (
    <div className="space-y-4">
      {hasConflict && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-200">{conflictMessage}</p>
        </div>
      )}

      <div>
        <Label className="text-sm mb-2 block">Choose Feat</Label>
        <Select
          value={selectedFeat ?? ''}
          onValueChange={(v) => onSelectFeat((v as OriginFeatId) || null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an origin feat" />
          </SelectTrigger>
          <SelectContent>
            {availableFeats.map((feat) => (
              <SelectItem key={feat.id} value={feat.id}>
                {feat.name}
                {feat.id === defaultFeatId && (
                  <span className="text-muted-foreground ml-2">(default)</span>
                )}
                {feat.repeatable && (
                  <span className="text-green-400 ml-2">(repeatable)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedFeat && <OriginFeatDetails featId={selectedFeat} />}
    </div>
  )
}

export function OriginFeatSelector({
  title = 'Origin Feat',
  description = 'Choose an origin feat.',
  showCard = true,
  ...props
}: OriginFeatSelectorProps) {
  if (!showCard) {
    return <OriginFeatSelectorInner {...props} />
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <OriginFeatSelectorInner {...props} />
      </CardContent>
    </Card>
  )
}
