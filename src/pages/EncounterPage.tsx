import { EncounterBuilder } from '@/components/encounter/EncounterBuilder'

export function EncounterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Encounter Setup</h1>
        <p className="text-muted-foreground">
          Build your battle scenario by selecting characters and monsters
        </p>
      </div>

      <EncounterBuilder />
    </div>
  )
}
