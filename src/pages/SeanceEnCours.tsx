import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExerciseGuideToggle } from '../components/ExerciseGuide'
import ExercisePicker from '../components/ExercisePicker'
import NumberField from '../components/NumberField'
import { Button, Chip } from '../components/ui'
import { db } from '../db/db'
import { abandonSession, finishSession } from '../db/sessions'
import type { Exercise, SessionEntry, SessionSet, Settings, WorkoutSession } from '../db/types'
import { EQUIPMENT_LABELS } from '../lib/equipment'
import { formatLine, formatRest, newLine } from '../lib/programs'
import { askNotificationPermission, restTimer, unlockAudio } from '../lib/restTimer'
import {
  buildEntry,
  changeEquipment,
  findPrevious,
  firstUnfinishedIndex,
  formatKg,
  suggestProgression,
  targetFromLine,
  replaceEntry,
  validateSet,
  type Previous,
  type Suggestion,
} from '../lib/session'
import { useWakeLock } from '../lib/useWakeLock'

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

export default function SeanceEnCours({
  initial,
  exercises,
  history,
  settings,
}: {
  initial: WorkoutSession
  exercises: Exercise[]
  history: WorkoutSession[] // séances terminées
  settings: Settings
}) {
  const navigate = useNavigate()
  const [session, setSession] = useState(initial)
  const [index, setIndex] = useState(() => firstUnfinishedIndex(initial))
  const [picker, setPicker] = useState<null | 'add' | 'replace'>(null)
  const [confirm, setConfirm] = useState<null | 'finish' | 'abandon'>(null)
  const [notif, setNotif] = useState(() => ('Notification' in window ? Notification.permission : 'denied'))
  const [minutes, setMinutes] = useState(0)
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  useWakeLock(true)

  useEffect(() => {
    const update = () => setMinutes(Math.floor((Date.now() - Date.parse(session.startedAt)) / 60000))
    update()
    const t = setInterval(update, 15000)
    return () => clearInterval(t)
  }, [session.startedAt])

  // Sauvegarde continue : chaque changement est écrit tout de suite dans la base.
  function save(next: WorkoutSession) {
    setSession(next)
    void db.sessions.put(next)
  }
  function updateEntry(i: number, entry: SessionEntry) {
    save({ ...session, entries: session.entries.map((e, j) => (j === i ? entry : e)) })
  }

  const entry = session.entries[index] as SessionEntry | undefined
  const exercise = entry ? byId.get(entry.exerciseId) : undefined
  const previous = entry ? findPrevious(history, entry.exerciseId, entry.equipment, session.id) : undefined
  const suggestion = entry ? suggestProgression(previous, entry.target, entry.equipment, settings, !!exercise?.assisted) : null
  const doneCount = session.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)

  function validate(i: number) {
    if (!entry) return
    unlockAudio()
    const wasDone = entry.sets[i].done
    updateEntry(index, { ...entry, sets: validateSet(entry.sets, i, !wasDone) })
    if (!wasDone) restTimer.start(entry.target?.restSeconds ?? settings.defaultRestSeconds)
  }

  function replaceWith(ex: Exercise) {
    const r = replaceEntry(session.entries, index, ex, history, settings.defaultRestSeconds)
    save({ ...session, entries: r.entries })
    setIndex(r.index)
  }

  function onPick(ex: Exercise) {
    if (picker === 'replace' && entry) {
      replaceWith(ex)
    } else {
      const built = buildEntry(ex, newLine(ex.id, settings.defaultRestSeconds), history)
      const at = session.entries.length ? index + 1 : 0
      const entries = [...session.entries.slice(0, at), built, ...session.entries.slice(at)]
      save({ ...session, entries })
      setIndex(at)
    }
    setPicker(null)
  }

  return (
    <div className="pb-28">
      <header className="flex items-center justify-between gap-3 px-4 pb-2" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{session.templateName ?? 'Séance'}</h1>
          <p className="text-sm text-neutral-400">
            {minutes} min · {doneCount} série{doneCount > 1 ? 's' : ''} faite{doneCount > 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirm('finish')}
          className="min-h-12 shrink-0 rounded-full bg-lime-400 px-5 text-lg font-semibold text-neutral-950 active:bg-lime-300"
        >
          Terminer
        </button>
      </header>

      {/* Navigation entre exercices */}
      {session.entries.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2">
          {session.entries.map((e, i) => {
            const all = e.sets.length > 0 && e.sets.every((s) => s.done)
            return (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Exercice ${i + 1} : ${byId.get(e.exerciseId)?.name ?? ''}`}
                className={`h-11 min-w-11 shrink-0 rounded-full px-3 text-lg font-semibold ${
                  i === index ? 'bg-lime-400 text-neutral-950' : all ? 'bg-lime-900 text-lime-200' : 'bg-neutral-800 text-neutral-200'
                }`}
              >
                {all && i !== index ? '✓' : i + 1}
              </button>
            )
          })}
        </div>
      )}

      {notif === 'default' && (
        <div className="mx-4 mt-2 flex items-center gap-3 rounded-2xl bg-neutral-900 p-3 text-sm text-neutral-300">
          <span className="flex-1">Être prévenu de la fin du repos même quand l’app est en arrière-plan ?</span>
          <button
            type="button"
            className="min-h-11 rounded-xl bg-neutral-800 px-3 font-semibold"
            onClick={async () => {
              const r = await askNotificationPermission()
              setNotif(r === 'unsupported' ? 'denied' : r)
            }}
          >
            Activer
          </button>
        </div>
      )}

      {!entry && (
        <div className="mx-4 mt-6 space-y-4 text-center">
          <p className="text-lg text-neutral-300">Aucun exercice pour l’instant.</p>
          <Button className="w-full" onClick={() => setPicker('add')}>
            + Ajouter un exercice
          </Button>
        </div>
      )}

      {entry && (
        <ExerciseCard
          key={`${index}-${entry.exerciseId}`}
          entry={entry}
          exercise={exercise}
          previous={previous}
          suggestion={suggestion}
          onChange={(e) => updateEntry(index, e)}
          onEquipment={(eq) => updateEntry(index, changeEquipment(entry, eq, history, session.id))}
          onValidate={validate}
          alternatives={(entry.target?.alternativeIds ?? []).map((id) => byId.get(id)).filter((x): x is Exercise => !!x && !x.archived)}
          onReplaceWith={replaceWith}
        />
      )}

      {entry && (
        <div className="mt-4 space-y-3 px-4">
          {index < session.entries.length - 1 ? (
            <Button className="w-full" variant={entry.sets.every((s) => s.done) ? 'primary' : 'secondary'} onClick={() => setIndex(index + 1)}>
              Exercice suivant ›
            </Button>
          ) : (
            <Button className="w-full" variant={entry.sets.every((s) => s.done) ? 'primary' : 'secondary'} onClick={() => setConfirm('finish')}>
              Terminer la séance
            </Button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setPicker('replace')}>
              Remplacer
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                save({ ...session, entries: session.entries.filter((_, j) => j !== index) })
                setIndex(Math.max(0, Math.min(index, session.entries.length - 2)))
              }}
            >
              Retirer
            </Button>
          </div>
          <Button variant="secondary" className="w-full" onClick={() => setPicker('add')}>
            + Ajouter un exercice
          </Button>
        </div>
      )}

      <label className="mt-6 block px-4">
        <span className="mb-2 block text-sm font-medium uppercase tracking-wide text-neutral-400">Note</span>
        <textarea
          value={session.note ?? ''}
          onChange={(e) => save({ ...session, note: e.target.value })}
          placeholder="Sensations, réglages machine…"
          className="min-h-24 w-full rounded-2xl border border-neutral-700 bg-neutral-900 p-3 text-lg focus:border-lime-400 focus:outline-none"
        />
      </label>

      <div className="mt-6 px-4 text-center">
        <button type="button" className="min-h-11 text-red-300 underline" onClick={() => setConfirm('abandon')}>
          Abandonner la séance
        </button>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/60 p-4" role="dialog">
          <div className="w-full space-y-4 rounded-3xl bg-neutral-900 p-5">
            <p className="text-xl font-semibold">
              {confirm === 'finish' ? 'Terminer la séance ?' : 'Abandonner la séance ?'}
            </p>
            <p className="text-neutral-300">
              {confirm === 'finish'
                ? 'Les séries non validées ne seront pas enregistrées.'
                : 'Tout ce qui a été saisi pendant cette séance sera effacé.'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                Annuler
              </Button>
              <Button
                variant={confirm === 'finish' ? 'primary' : 'danger'}
                onClick={async () => {
                  restTimer.skip()
                  if (confirm === 'finish') {
                    await finishSession(session.id)
                    navigate(`/seance/resume/${session.id}`, { replace: true })
                  } else {
                    await abandonSession(session.id)
                    navigate('/', { replace: true })
                  }
                }}
              >
                {confirm === 'finish' ? 'Terminer' : 'Abandonner'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {picker && (
        <ExercisePicker
          title={picker === 'replace' ? 'Remplacer par…' : 'Ajouter un exercice'}
          onClose={() => setPicker(null)}
          onPick={onPick}
        />
      )}
    </div>
  )
}

function ExerciseCard({
  entry,
  exercise,
  previous,
  suggestion,
  onChange,
  onEquipment,
  onValidate,
  alternatives,
  onReplaceWith,
}: {
  alternatives: Exercise[]
  onReplaceWith: (ex: Exercise) => void
  entry: SessionEntry
  exercise?: Exercise
  previous?: Previous
  suggestion: Suggestion | null
  onChange: (e: SessionEntry) => void
  onEquipment: (eq: Exercise['equipment'][number]) => void
  onValidate: (i: number) => void
}) {
  const timed = !!entry.target?.isTimed
  const setSet = (i: number, patch: Partial<SessionSet>) => onChange({ ...entry, sets: entry.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  const target = entry.target ?? targetFromLine(newLine(entry.exerciseId, 90))

  function applySuggestion() {
    if (!suggestion || suggestion.kind === 'bodyweight') return
    onChange({
      ...entry,
      sets: entry.sets.map((s) =>
        s.done ? s : suggestion.kind === 'weight' ? { ...s, weightKg: suggestion.weightKg } : { ...s, durationSec: suggestion.durationSec },
      ),
    })
  }

  return (
    <section className="mx-4 mt-3 rounded-3xl bg-neutral-900 p-4">
      <h2 className="text-2xl font-bold leading-tight">{exercise?.name ?? 'Exercice supprimé'}</h2>
      {exercise?.assisted && <p className="mt-1 text-sm text-amber-300">Machine d’assistance : moins de kg = plus dur</p>}
      {alternatives.length > 0 && entry.sets.every((s) => !s.done) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {alternatives.map((alt) => (
            <button
              key={alt.id}
              type="button"
              onClick={() => onReplaceWith(alt)}
              className="min-h-11 rounded-full border border-neutral-600 px-4 text-base text-neutral-200 active:bg-neutral-800"
            >
              ⇄ Remplacer par : <strong>{alt.name}</strong>
            </button>
          ))}
        </div>
      )}
      {exercise && <ExerciseGuideToggle ex={exercise} />}
      <p className="mt-1 text-neutral-400">
        Objectif {formatLine({ ...target, sets: entry.sets.length })} · repos {formatRest(target.restSeconds)}
      </p>

      {exercise && exercise.equipment.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {exercise.equipment.map((eq) => (
            <Chip key={eq} active={entry.equipment === eq} onClick={() => eq !== entry.equipment && onEquipment(eq)}>
              {EQUIPMENT_LABELS[eq]}
            </Chip>
          ))}
        </div>
      )}

      <p className="mt-3 rounded-xl bg-neutral-800 px-3 py-2 text-neutral-200">
        {previous ? (
          <>
            <span className="text-neutral-400">Dernière fois ({shortDate(previous.date)}) : </span>
            {previous.sets.map((s) => (timed ? `${s.durationSec ?? 0} s` : `${formatKg(s.weightKg)} × ${s.reps}`)).join(' · ')}
          </>
        ) : (
          <span className="text-neutral-400">Première fois{exercise && exercise.equipment.length > 1 ? ` avec : ${EQUIPMENT_LABELS[entry.equipment]}` : ''}.</span>
        )}
      </p>

      {suggestion && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-lime-700 bg-lime-950/40 px-3 py-2">
          <p className="flex-1 text-lime-200">
            {suggestion.kind === 'weight' && (
              <>
                ↑ Tu as tout réussi : essaie <strong>{formatKg(suggestion.weightKg)} kg</strong>
                {exercise?.assisted ? ' d’assistance' : ''} ({suggestion.increment > 0 ? '+' : '−'}
                {formatKg(Math.abs(suggestion.increment))})
              </>
            )}
            {suggestion.kind === 'duration' && (
              <>
                ↑ Tu as tout réussi : essaie <strong>{suggestion.durationSec} s</strong> (+{suggestion.increment} s)
              </>
            )}
            {suggestion.kind === 'bodyweight' && (
              <>{exercise?.assisted ? '↑ Plus d’assistance : passe à la version sans machine !' : '↑ Haut de fourchette atteint : ajoute des répétitions ou du lest.'}</>
            )}
          </p>
          {suggestion.kind !== 'bodyweight' && (
            <button type="button" onClick={applySuggestion} className="min-h-11 shrink-0 rounded-xl bg-lime-400 px-3 font-semibold text-neutral-950">
              Appliquer
            </button>
          )}
        </div>
      )}

      <ol className="mt-4 space-y-2">
        {entry.sets.map((s, i) => (
          <li
            key={`${i}-${entry.equipment}`}
            className={`grid items-end gap-2 rounded-2xl p-2 ${timed ? 'grid-cols-[2rem_1fr_4.5rem]' : 'grid-cols-[2rem_1fr_1fr_4.5rem]'} ${
              s.done ? 'bg-lime-950/50' : 'bg-neutral-800/60'
            }`}
          >
            <span className="pb-4 text-center text-lg font-bold text-neutral-400">{i + 1}</span>
            {!timed && <NumberField big decimal label={target.perSide ? 'kg / haltère' : 'kg'} value={s.weightKg} onChange={(n) => setSet(i, { weightKg: n })} />}
            {timed ? (
              <NumberField big label="secondes" value={s.durationSec ?? 0} onChange={(n) => setSet(i, { durationSec: n })} />
            ) : (
              <NumberField big label={target.perSide ? 'reps / bras' : 'reps'} value={s.reps} onChange={(n) => setSet(i, { reps: n })} />
            )}
            <button
              type="button"
              onClick={() => onValidate(i)}
              aria-label={s.done ? `Annuler la série ${i + 1}` : `Valider la série ${i + 1}`}
              className={`h-16 rounded-2xl text-3xl font-bold ${s.done ? 'bg-lime-400 text-neutral-950' : 'bg-neutral-700 text-neutral-300 active:bg-neutral-600'}`}
            >
              ✓
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            const last = entry.sets[entry.sets.length - 1]
            const fresh: SessionSet = last ? { ...last, done: false } : timed ? { weightKg: 0, reps: 0, durationSec: target.repsMin, done: false } : { weightKg: 0, reps: target.repsMin, done: false }
            onChange({ ...entry, sets: [...entry.sets, fresh] })
          }}
        >
          + Série
        </Button>
        <Button variant="secondary" disabled={entry.sets.length === 0} onClick={() => onChange({ ...entry, sets: entry.sets.slice(0, -1) })}>
          − Série
        </Button>
      </div>
    </section>
  )
}
