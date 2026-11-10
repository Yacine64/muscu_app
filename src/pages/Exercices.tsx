import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Chip, inputClass } from '../components/ui'
import { db } from '../db/db'
import type { Equipment } from '../db/types'
import { useLiveQuery } from '../db/useLiveQuery'
import { EQUIPMENT_LABELS, EQUIPMENT_LIST, equipmentLabel, isEquipment } from '../lib/equipment'
import { allMuscles, filterExercises } from '../lib/exerciseFilter'
import { parseExerciseImport } from '../lib/importExercises'

export default function Exercices() {
  const exercises = useLiveQuery(() => db.exercises.toArray())
  // Les filtres sont gardés dans l'adresse : en revenant d'une fiche, on les retrouve.
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const muscle = params.get('muscle') ?? ''
  const eqParam = params.get('materiel')
  const equipment: Equipment | undefined = isEquipment(eqParam) ? eqParam : undefined
  const showArchived = params.get('archives') === '1'

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const muscles = useMemo(() => allMuscles((exercises ?? []).filter((e) => !e.archived)), [exercises])
  const list = useMemo(
    () => filterExercises(exercises ?? [], { query, muscle: muscle || undefined, equipment, showArchived }),
    [exercises, query, muscle, equipment, showArchived],
  )
  const archivedCount = (exercises ?? []).filter((e) => e.archived).length

  const fileRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState('')

  async function onImport(file: File) {
    const r = parseExerciseImport(await file.text(), exercises ?? [])
    if (r.toAdd.length) await db.exercises.bulkAdd(r.toAdd)
    const parts = [`${r.toAdd.length} exercice(s) ajouté(s)`]
    if (r.duplicates.length) parts.push(`${r.duplicates.length} déjà présent(s), ignoré(s)`)
    if (r.errors.length) parts.push(`${r.errors.length} erreur(s) : ${r.errors.slice(0, 3).join(' ')}`)
    setImportMsg(parts.join(' · '))
  }

  return (
    <>
      <PageHeader
        title="Exercices"
        action={
          <Link
            to="/exercices/nouveau"
            className="flex min-h-12 items-center rounded-full bg-lime-400 px-5 text-lg font-semibold text-neutral-950 active:bg-lime-300"
          >
            + Ajouter
          </Link>
        }
      />

      <div className="px-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setParam('q', e.target.value)}
          placeholder="Rechercher un exercice"
          className={inputClass}
          aria-label="Rechercher un exercice"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filtrer par muscle">
        {muscles.map((m) => (
          <Chip key={m} active={muscle === m} onClick={() => setParam('muscle', muscle === m ? '' : m)}>
            {m}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filtrer par matériel">
        {EQUIPMENT_LIST.filter((e) => e !== 'autre').map((e) => (
          <Chip key={e} active={equipment === e} onClick={() => setParam('materiel', equipment === e ? '' : e)}>
            {EQUIPMENT_LABELS[e]}
          </Chip>
        ))}
      </div>

      <p className="mt-3 px-4 text-sm text-neutral-400">
        {exercises === undefined ? 'Chargement…' : `${list.length} exercice${list.length > 1 ? 's' : ''}`}
        {(query || muscle || equipment) && (
          <button type="button" className="ml-3 text-lime-400 underline" onClick={() => setParams({}, { replace: true })}>
            Tout effacer
          </button>
        )}
      </p>

      <ul className="mt-2 space-y-2 px-4">
        {list.map((e) => (
          <li key={e.id}>
            <Link
              to={`/exercices/${e.id}`}
              className="block rounded-2xl bg-neutral-900 px-4 py-3 active:bg-neutral-800"
            >
              <span className="block text-lg font-semibold">
                {e.name}
                {e.archived && <span className="ml-2 text-sm font-normal text-amber-400">archivé</span>}
              </span>
              <span className="block text-sm text-neutral-400">
                {e.primaryMuscle} · {equipmentLabel(e.equipment)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-3 px-4 text-center">
        {archivedCount > 0 && (
          <button
            type="button"
            className="min-h-11 text-neutral-400 underline"
            onClick={() => setParam('archives', showArchived ? '' : '1')}
          >
            {showArchived ? 'Masquer les exercices archivés' : `Afficher les exercices archivés (${archivedCount})`}
          </button>
        )}
        <div>
          <button
            type="button"
            className="min-h-11 text-neutral-400 underline"
            onClick={() => fileRef.current?.click()}
          >
            Importer des exercices (fichier JSON)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(ev) => {
              const f = ev.target.files?.[0]
              if (f) void onImport(f)
              ev.target.value = ''
            }}
          />
        </div>
        {importMsg && <p className="rounded-2xl bg-neutral-900 p-3 text-sm text-neutral-200">{importMsg}</p>}
      </div>
    </>
  )
}
