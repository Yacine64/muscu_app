import { useMemo, useState } from 'react'
import { db } from '../db/db'
import type { Equipment, Exercise } from '../db/types'
import { useLiveQuery } from '../db/useLiveQuery'
import { EQUIPMENT_LABELS, EQUIPMENT_LIST, equipmentLabel } from '../lib/equipment'
import { allMuscles, filterExercises } from '../lib/exerciseFilter'
import { Chip, inputClass } from './ui'

/** Écran plein qui permet de choisir un exercice dans la banque (recherche + filtres). */
export default function ExercisePicker({
  onPick,
  onClose,
  title = 'Choisir un exercice',
}: {
  onPick: (e: Exercise) => void
  onClose: () => void
  title?: string
}) {
  const exercises = useLiveQuery(() => db.exercises.toArray())
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState('')
  const [equipment, setEquipment] = useState<Equipment | ''>('')

  const muscles = useMemo(() => allMuscles((exercises ?? []).filter((e) => !e.archived)), [exercises])
  const list = useMemo(
    () => filterExercises(exercises ?? [], { query, muscle: muscle || undefined, equipment: equipment || undefined }),
    [exercises, query, muscle, equipment],
  )

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-neutral-950" role="dialog" aria-label={title}>
      <div className="flex items-center justify-between px-4 pb-2" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <h2 className="text-xl font-bold">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-full px-4 py-3 text-lg text-lime-400 active:bg-neutral-800">
          Fermer
        </button>
      </div>
      <div className="px-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher"
          className={inputClass}
          aria-label="Rechercher un exercice"
        />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {muscles.map((m) => (
          <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? '' : m)}>
            {m}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {EQUIPMENT_LIST.filter((e) => e !== 'autre').map((e) => (
          <Chip key={e} active={equipment === e} onClick={() => setEquipment(equipment === e ? '' : e)}>
            {EQUIPMENT_LABELS[e]}
          </Chip>
        ))}
      </div>
      <ul className="mt-3 flex-1 space-y-2 overflow-y-auto px-4 pb-8">
        {list.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onPick(e)}
              className="block w-full rounded-2xl bg-neutral-900 px-4 py-3 text-left active:bg-neutral-800"
            >
              <span className="block text-lg font-semibold">{e.name}</span>
              <span className="block text-sm text-neutral-400">
                {e.primaryMuscle} · {equipmentLabel(e.equipment)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
