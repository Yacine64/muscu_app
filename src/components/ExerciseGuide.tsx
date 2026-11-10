import { useState } from 'react'
import type { Exercise } from '../db/types'
import { lines, resolveMediaUrl } from '../lib/exerciseDetails'

const url = (u: string) => resolveMediaUrl(u, import.meta.env.BASE_URL)

/** Photos de l'exercice : position de départ et position finale côte à côte (ou une seule image / vidéo). */
export function ExerciseMedia({ ex }: { ex: Exercise }) {
  if (!ex.mediaUrl) return null
  const start = url(ex.mediaUrl)

  if (ex.mediaType === 'video') {
    return /\.(mp4|webm|ogg)(\?|$)/i.test(start) ? (
      <video src={start} controls className="w-full rounded-2xl" />
    ) : (
      <a href={start} target="_blank" rel="noreferrer" className="text-lime-400 underline">
        Voir la vidéo
      </a>
    )
  }

  const photos = ex.mediaEndUrl
    ? [
        { src: start, label: 'Départ' },
        { src: url(ex.mediaEndUrl), label: 'Fin' },
      ]
    : [{ src: start, label: '' }]

  return (
    <figure>
      <div className={`grid gap-2 ${photos.length > 1 ? 'grid-cols-2' : ''}`}>
        {photos.map((p) => (
          <div key={p.src} className="relative">
            <img src={p.src} alt={`${ex.name}${p.label ? ` – position ${p.label.toLowerCase()}` : ''}`} loading="lazy" className="aspect-[3/2] w-full rounded-xl bg-neutral-800 object-cover" />
            {p.label && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-2 py-0.5 text-sm font-semibold text-white">{p.label}</span>
            )}
          </div>
        ))}
      </div>
      {ex.mediaSource && <figcaption className="mt-1 text-xs text-neutral-500">Images : {ex.mediaSource}</figcaption>}
    </figure>
  )
}

/** Étapes d'exécution (numérotées) et points de vigilance. */
export function ExerciseSteps({ ex, compact = false }: { ex: Exercise; compact?: boolean }) {
  const steps = lines(ex.instructions)
  const warnings = ex.warnings ?? []
  if (!steps.length && !warnings.length) return null
  const box = compact ? 'rounded-xl p-3' : 'rounded-2xl p-4'
  return (
    <div className="space-y-3">
      {steps.length > 0 && (
        <section className={`${box} bg-neutral-800/60`}>
          <h3 className="mb-3 text-lg font-bold">Exécution</h3>
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
        <section className={`${box} border border-amber-700/70 bg-amber-950/30`}>
          <h3 className="mb-3 text-lg font-bold text-amber-200">⚠ Points de vigilance</h3>
          <ul className="space-y-3">
            {warnings.map((w, i) => (
              <li key={i} className="flex gap-3 text-lg leading-snug text-neutral-100">
                <span className="text-amber-400" aria-hidden="true">
                  •
                </span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export function hasGuide(ex: Exercise | undefined): boolean {
  return !!ex && (!!ex.mediaUrl || lines(ex.instructions).length > 0 || (ex.warnings?.length ?? 0) > 0)
}

// Ouvert ou fermé : le choix est retenu d'un exercice à l'autre et d'une séance à l'autre.
const OPEN_KEY = 'muscu.guideOuvert'
function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}
function writeOpen(open: boolean) {
  try {
    localStorage.setItem(OPEN_KEY, open ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Menu déroulant pendant la séance : photos, étapes et points de vigilance. */
export function ExerciseGuideToggle({ ex }: { ex: Exercise }) {
  const [open, setOpen] = useState(readOpen)
  if (!hasGuide(ex)) return null
  const warnings = ex.warnings?.length ?? 0
  return (
    <div className="mt-3 rounded-2xl bg-neutral-800/50">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open)
          writeOpen(!open)
        }}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-3 text-left text-base font-semibold text-neutral-200 active:bg-neutral-700"
      >
        <span>
          📖 Comment faire l’exercice
          {warnings > 0 && <span className="ml-2 text-sm font-normal text-amber-300">⚠ {warnings}</span>}
        </span>
        <span className={`text-xl transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          ⌄
        </span>
      </button>
      {open && (
        <div className="space-y-3 px-3 pb-3">
          <ExerciseMedia ex={ex} />
          <ExerciseSteps ex={ex} compact />
        </div>
      )}
    </div>
  )
}
