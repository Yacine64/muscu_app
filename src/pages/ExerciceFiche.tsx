import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BackButton from '../components/BackButton'
import { ExerciseMedia, ExerciseSteps } from '../components/ExerciseGuide'
import ExerciseProgress from '../components/ExerciseProgress'
import PageHeader from '../components/PageHeader'
import { Button } from '../components/ui'
import { db, deleteOrArchiveExercise, isExerciseUsed } from '../db/db'
import { useLiveQuery } from '../db/useLiveQuery'
import { equipmentLabel } from '../lib/equipment'

export default function ExerciceFiche() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const ex = useLiveQuery(() => db.exercises.get(id).then((e) => e ?? null), [id])
  const [confirming, setConfirming] = useState<null | boolean>(null) // null = pas de confirmation ; true/false = utilisé ?

  if (ex === undefined) return null
  if (ex === null)
    return (
      <>
        <PageHeader title="Exercice introuvable" action={<BackButton />} />
      </>
    )

  async function askDelete() {
    setConfirming(await isExerciseUsed(id))
  }

  async function doDelete() {
    const r = await deleteOrArchiveExercise(id)
    if (r === 'deleted') navigate('/exercices', { replace: true })
    else setConfirming(null)
  }

  return (
    <>
      <PageHeader title="" action={<BackButton />} />
      <div className="space-y-5 px-4">
        <div>
          <h1 className="text-2xl font-bold">{ex.name}</h1>
          {ex.archived && <p className="mt-1 text-amber-400">Exercice archivé (masqué de la banque)</p>}
          {ex.assisted && <p className="mt-1 text-amber-300">Machine d’assistance : moins de kg = plus dur</p>}
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-neutral-900 p-4 text-lg">
          <dt className="text-neutral-400">Muscle</dt>
          <dd>{ex.primaryMuscle}</dd>
          <dt className="text-neutral-400">Secondaires</dt>
          <dd>{ex.secondaryMuscles.length ? ex.secondaryMuscles.join(', ') : '—'}</dd>
          <dt className="text-neutral-400">Matériel</dt>
          <dd>{equipmentLabel(ex.equipment)}</dd>
        </dl>

        <ExerciseMedia ex={ex} />
        <ExerciseSteps ex={ex} />

        <ExerciseProgress exercise={ex} />

        <div className="grid grid-cols-2 gap-3">
          <Link
            to={`/exercices/${ex.id}/modifier`}
            className="flex min-h-14 items-center justify-center rounded-2xl bg-neutral-800 text-lg font-semibold active:bg-neutral-700"
          >
            Modifier
          </Link>
          {ex.archived ? (
            <Button variant="secondary" onClick={() => db.exercises.update(ex.id, { archived: false })}>
              Désarchiver
            </Button>
          ) : (
            <Button variant="danger" onClick={askDelete}>
              Supprimer
            </Button>
          )}
        </div>

        {confirming !== null && (
          <div className="space-y-3 rounded-2xl border border-red-900 bg-neutral-900 p-4">
            <p className="text-lg">
              {confirming
                ? 'Cet exercice est utilisé dans une séance ou l’historique : il sera archivé (masqué, mais l’historique est conservé).'
                : 'Supprimer définitivement cet exercice ?'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setConfirming(null)}>
                Annuler
              </Button>
              <Button variant="danger" onClick={doDelete}>
                {confirming ? 'Archiver' : 'Supprimer'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
