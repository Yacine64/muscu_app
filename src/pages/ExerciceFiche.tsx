import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BackButton from '../components/BackButton'
import ExerciseProgress from '../components/ExerciseProgress'
import PageHeader from '../components/PageHeader'
import { Button } from '../components/ui'
import { db, deleteOrArchiveExercise, isExerciseUsed } from '../db/db'
import type { Exercise } from '../db/types'
import { useLiveQuery } from '../db/useLiveQuery'
import { equipmentLabel } from '../lib/equipment'
import { lines, resolveMediaUrl } from '../lib/exerciseDetails'

function Media({ ex }: { ex: Exercise }) {
  if (!ex.mediaUrl) return null
  const url = resolveMediaUrl(ex.mediaUrl, import.meta.env.BASE_URL)
  let media
  if (ex.mediaType === 'video') {
    media = /\.(mp4|webm|ogg)(\?|$)/i.test(url) ? (
      <video src={url} controls className="w-full rounded-2xl" />
    ) : (
      <a href={url} target="_blank" rel="noreferrer" className="text-lime-400 underline">
        Voir la vidéo
      </a>
    )
  } else {
    media = <img src={url} alt={ex.name} loading="lazy" className="w-full rounded-2xl bg-neutral-900" />
  }
  return (
    <figure>
      {media}
      {ex.mediaSource && <figcaption className="mt-1 text-xs text-neutral-500">Image : {ex.mediaSource}</figcaption>}
    </figure>
  )
}

/** Consignes d'exécution (numérotées) et points de vigilance. */
function Guide({ ex }: { ex: Exercise }) {
  const steps = lines(ex.instructions)
  const warnings = ex.warnings ?? []
  if (!steps.length && !warnings.length) return null
  return (
    <div className="space-y-4">
      {steps.length > 0 && (
        <section className="rounded-2xl bg-neutral-900 p-4">
          <h2 className="mb-3 text-lg font-bold">Exécution</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-lg leading-snug text-neutral-200">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-base font-bold">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {warnings.length > 0 && (
        <section className="rounded-2xl border border-amber-700/70 bg-amber-950/30 p-4">
          <h2 className="mb-3 text-lg font-bold text-amber-200">⚠ Points de vigilance</h2>
          <ul className="space-y-3">
            {warnings.map((w, i) => (
              <li key={i} className="flex gap-3 text-lg leading-snug text-neutral-100">
                <span className="text-amber-400" aria-hidden="true">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

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

        <Media ex={ex} />
        <Guide ex={ex} />

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
