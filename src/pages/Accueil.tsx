import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Button } from '../components/ui'
import { db } from '../db/db'
import { startSession } from '../db/sessions'
import { useLiveQuery } from '../db/useLiveQuery'
import { formatLine, formatRest } from '../lib/programs'
import { currentAverage7, latest, toDay } from '../lib/progress'
import { formatKg, nextTemplateId, sessionsThisWeek } from '../lib/session'

export default function Accueil() {
  return (
    <>
      <PageHeader
        title="Accueil"
        action={
          <Link
            to="/reglages"
            aria-label="Réglages"
            className="flex h-12 w-12 items-center justify-center rounded-full text-neutral-300 active:bg-neutral-800"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </Link>
        }
      />
      <HomeContent />
    </>
  )
}

function HomeContent() {
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const [sessions, templates, programs, exercises, weights] = await Promise.all([
      db.sessions.toArray(),
      db.templates.toArray(),
      db.programs.toArray(),
      db.exercises.toArray(),
      db.bodyWeights.toArray(),
    ])
    return { sessions, templates, programs, exercises, weights }
  })
  if (!data) return null

  const active = data.sessions.find((s) => !s.endedAt)
  const program = data.programs.find((p) => p.isActive)
  const next = data.templates.find((t) => t.id === nextTemplateId(program, data.sessions))
  const today = toDay(new Date())
  const week = sessionsThisWeek(data.sessions, new Date())
  const lastWeight = latest(data.weights)
  const avg = currentAverage7(data.weights, today)
  const name = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? '—'

  return (
    <div className="space-y-4 px-4">
      {active ? (
        <section className="rounded-3xl border border-lime-700 bg-lime-950/40 p-5">
          <p className="text-sm uppercase tracking-wide text-lime-300">Séance en cours</p>
          <h2 className="mt-1 text-2xl font-bold">{active.templateName ?? 'Séance'}</h2>
          <Button className="mt-4 w-full" onClick={() => navigate('/seance')}>
            Reprendre
          </Button>
        </section>
      ) : next ? (
        <section className="rounded-3xl bg-neutral-900 p-5">
          <p className="text-sm uppercase tracking-wide text-neutral-400">Prochaine séance</p>
          <h2 className="mt-1 text-2xl font-bold">{next.name}</h2>
          <ul className="mt-3 space-y-1 text-neutral-300">
            {next.exercises.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">{name(l.exerciseId)}</span>
                <span className="shrink-0 text-neutral-400">
                  {formatLine(l)} · {formatRest(l.restSeconds)}
                </span>
              </li>
            ))}
          </ul>
          <Button
            className="mt-4 w-full"
            onClick={async () => {
              await startSession(next.id)
              navigate('/seance')
            }}
          >
            Démarrer
          </Button>
          <Link to="/seance" className="mt-3 block text-center text-neutral-400 underline">
            Choisir une autre séance
          </Link>
        </section>
      ) : (
        <Button className="w-full" onClick={() => navigate('/seance')}>
          Démarrer une séance
        </Button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/progres?vue=historique" className="rounded-3xl bg-neutral-900 p-4 active:bg-neutral-800">
          <p className="text-sm uppercase tracking-wide text-neutral-400">Cette semaine</p>
          <p className="mt-1 text-3xl font-bold">
            {week} séance{week > 1 ? 's' : ''}
          </p>
        </Link>
        <Link to="/progres?vue=corps" className="rounded-3xl bg-neutral-900 p-4 active:bg-neutral-800">
          <p className="text-sm uppercase tracking-wide text-neutral-400">Poids</p>
          <p className="mt-1 text-3xl font-bold">{lastWeight ? `${formatKg(lastWeight.weightKg)} kg` : '—'}</p>
          <p className="text-sm text-neutral-400">{avg !== null ? `moy. 7 j : ${formatKg(avg)} kg` : lastWeight ? '' : 'Ajouter une pesée ›'}</p>
        </Link>
      </div>
    </div>
  )
}
