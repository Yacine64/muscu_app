import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BackButton from '../components/BackButton'
import ExercisePicker from '../components/ExercisePicker'
import NumberField from '../components/NumberField'
import PageHeader from '../components/PageHeader'
import { Button, Chip, IconButton, Label, inputClass } from '../components/ui'
import { db } from '../db/db'
import { deleteTemplate, duplicateTemplateInDb } from '../db/programs'
import { DEFAULT_SETTINGS } from '../db/seed'
import type { Exercise, TemplateExercise, WorkoutTemplate } from '../db/types'
import { useLiveQuery } from '../db/useLiveQuery'
import { equipmentLabel } from '../lib/equipment'
import { formatLine, formatRest, moveItem, newLine, sanitizeLine } from '../lib/programs'

export default function SeanceModele() {
  const { id = '' } = useParams()
  const data = useLiveQuery(async () => {
    const [template, exercises, settings] = await Promise.all([db.templates.get(id), db.exercises.toArray(), db.settings.get('settings')])
    return { template: template ?? null, exercises, defaultRest: settings?.defaultRestSeconds ?? DEFAULT_SETTINGS.defaultRestSeconds }
  }, [id])
  if (!data) return null
  if (!data.template) return <PageHeader title="Séance introuvable" action={<BackButton />} />
  // La clé recrée l'éditeur pour chaque séance (utile après « Dupliquer »).
  return <Editor key={data.template.id} template={data.template} exercises={data.exercises} defaultRest={data.defaultRest} />
}

function Editor({ template, exercises, defaultRest }: { template: WorkoutTemplate; exercises: Exercise[]; defaultRest: number }) {
  const navigate = useNavigate()
  const [name, setName] = useState(template.name)
  const [lines, setLines] = useState<TemplateExercise[]>(template.exercises)
  const [picking, setPicking] = useState(false)
  const [altFor, setAltFor] = useState<number | null>(null) // ligne dont on choisit un remplacement
  const [confirmDelete, setConfirmDelete] = useState(false)
  const byId = new Map(exercises.map((e) => [e.id, e]))

  // Chaque modification est enregistrée tout de suite.
  function save(nextName: string, nextLines: TemplateExercise[]) {
    void db.templates.put({ id: template.id, name: nextName.trim() || 'Sans nom', exercises: nextLines.map(sanitizeLine) })
  }
  function updateLines(next: TemplateExercise[]) {
    setLines(next)
    save(name, next)
  }
  function updateLine(i: number, patch: Partial<TemplateExercise>) {
    updateLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }

  return (
    <>
      <PageHeader title="Séance modèle" action={<BackButton />} />
      <div className="space-y-6 px-4">
        <label className="block">
          <Label>Nom de la séance</Label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              save(e.target.value, lines)
            }}
          />
        </label>

        <div>
          <Label>Exercices ({lines.length})</Label>
          <ol className="space-y-3">
            {lines.map((l, i) => {
              const ex = byId.get(l.exerciseId)
              return (
                <li key={`${l.exerciseId}-${i}`} className="rounded-2xl bg-neutral-900 p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 px-1">
                      <span className="block text-lg font-semibold leading-tight">
                        {i + 1}. {ex?.name ?? 'Exercice supprimé'}
                        {ex?.archived && <span className="ml-2 text-sm font-normal text-amber-400">archivé</span>}
                      </span>
                      <span className="block text-sm text-neutral-400">
                        <span className="whitespace-nowrap">{formatLine(sanitizeLine(l))}</span> ·{' '}
                        <span className="whitespace-nowrap">repos {formatRest(sanitizeLine(l).restSeconds)}</span>
                      </span>
                      {ex && <span className="block text-sm text-neutral-500">{equipmentLabel(ex.equipment)}</span>}
                    </div>
                    <IconButton label="Monter" disabled={i === 0} onClick={() => updateLines(moveItem(lines, i, i - 1))}>
                      ↑
                    </IconButton>
                    <IconButton label="Descendre" disabled={i === lines.length - 1} onClick={() => updateLines(moveItem(lines, i, i + 1))}>
                      ↓
                    </IconButton>
                    <IconButton label="Retirer" onClick={() => updateLines(lines.filter((_, j) => j !== i))}>
                      ✕
                    </IconButton>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <NumberField label="Séries" value={l.sets} onChange={(n) => updateLine(i, { sets: n })} />
                    <NumberField label={l.isTimed ? 'Min (s)' : 'Reps min'} value={l.repsMin} onChange={(n) => updateLine(i, { repsMin: n })} />
                    <NumberField label={l.isTimed ? 'Max (s)' : 'Reps max'} value={l.repsMax} onChange={(n) => updateLine(i, { repsMax: n })} />
                    <NumberField label="Repos (s)" value={l.restSeconds} onChange={(n) => updateLine(i, { restSeconds: n })} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip active={!!l.isTimed} onClick={() => updateLine(i, { isTimed: !l.isTimed })}>
                      {l.isTimed ? '⏱ Durée (secondes)' : '⏱ Compter en durée'}
                    </Chip>
                    <Chip active={!!l.perSide} onClick={() => updateLine(i, { perSide: !l.perSide })}>
                      {l.perSide ? '✓ Par bras' : 'Par bras'}
                    </Chip>
                  </div>
                  <div className="mt-3">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Remplacements proposés en séance</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {(l.alternativeIds ?? []).map((altId) => (
                        <span key={altId} className="flex min-h-11 items-center gap-1 rounded-full bg-neutral-800 pl-4 pr-1">
                          {byId.get(altId)?.name ?? 'Exercice supprimé'}
                          <button
                            type="button"
                            aria-label={`Retirer ${byId.get(altId)?.name ?? ''} des remplacements`}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 active:bg-neutral-700"
                            onClick={() => updateLine(i, { alternativeIds: (l.alternativeIds ?? []).filter((x) => x !== altId) })}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      <button type="button" className="min-h-11 px-2 text-lime-400 underline" onClick={() => setAltFor(i)}>
                        + Ajouter
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
          {lines.length === 0 && <p className="text-neutral-400">Aucun exercice pour l’instant.</p>}
        </div>

        <Button className="w-full" onClick={() => setPicking(true)}>
          + Ajouter un exercice
        </Button>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={async () => {
              const copyId = await duplicateTemplateInDb(template.id)
              if (copyId) navigate(`/programmes/seance/${copyId}`, { replace: true })
            }}
          >
            Dupliquer
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Supprimer
          </Button>
        </div>
        {confirmDelete && (
          <div className="space-y-3 rounded-2xl border border-red-900 bg-neutral-900 p-4">
            <p className="text-lg">Supprimer cette séance modèle ? Les séances déjà faites restent dans l’historique.</p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteTemplate(template.id)
                  navigate(-1)
                }}
              >
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </div>

      {altFor !== null && (
        <ExercisePicker
          title="Remplacement proposé"
          onClose={() => setAltFor(null)}
          onPick={(e) => {
            const l = lines[altFor]
            if (l && e.id !== l.exerciseId && !(l.alternativeIds ?? []).includes(e.id)) {
              updateLine(altFor, { alternativeIds: [...(l.alternativeIds ?? []), e.id] })
            }
            setAltFor(null)
          }}
        />
      )}

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(e) => {
            updateLines([...lines, newLine(e.id, defaultRest)])
            setPicking(false)
          }}
        />
      )}
    </>
  )
}
