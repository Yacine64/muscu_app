import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { db } from '../db/db'
import { useLiveQuery } from '../db/useLiveQuery'
import { EQUIPMENT_LABELS } from '../lib/equipment'
import { durationMinutes, formatKg, recordsBeaten, sessionVolume } from '../lib/session'

export default function SeanceResume() {
  const { id = '' } = useParams()
  const data = useLiveQuery(async () => {
    const [session, sessions, exercises] = await Promise.all([db.sessions.get(id), db.sessions.toArray(), db.exercises.toArray()])
    return { session, sessions, exercises }
  }, [id])
  if (!data) return null
  const s = data.session
  if (!s) return <PageHeader title="Séance introuvable" />

  const name = (exId: string) => data.exercises.find((e) => e.id === exId)?.name ?? 'Exercice'
  const records = recordsBeaten(s, data.sessions)
  const sets = s.entries.reduce((n, e) => n + e.sets.length, 0)
  const stats = [
    { label: 'Durée', value: `${durationMinutes(s)} min` },
    { label: 'Volume', value: `${formatKg(sessionVolume(s))} kg` },
    { label: 'Séries', value: String(sets) },
  ]

  return (
    <>
      <PageHeader title="Séance terminée 💪" />
      <div className="space-y-5 px-4">
        <p className="text-lg text-neutral-300">{s.templateName ?? 'Séance'}</p>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((x) => (
            <div key={x.label} className="rounded-2xl bg-neutral-900 p-3 text-center">
              <span className="block text-sm text-neutral-400">{x.label}</span>
              <span className="text-2xl font-bold">{x.value}</span>
            </div>
          ))}
        </div>

        <section>
          <h2 className="mb-2 text-lg font-bold">Records battus</h2>
          {records.length === 0 ? (
            <p className="text-neutral-400">Aucun cette fois-ci.</p>
          ) : (
            <ul className="space-y-2">
              {records.map((r) => (
                <li key={`${r.exerciseId}-${r.equipment}`} className="rounded-2xl border border-lime-700 bg-lime-950/40 p-3">
                  <span className="block text-lg font-semibold">🏆 {name(r.exerciseId)}</span>
                  <span className="text-lime-200">
                    {formatKg(r.weightKg)} kg (avant : {formatKg(r.previousKg)} kg) · {EQUIPMENT_LABELS[r.equipment]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">Détail</h2>
          <ul className="space-y-2">
            {s.entries.map((e, i) => (
              <li key={i} className="rounded-2xl bg-neutral-900 p-3">
                <span className="block font-semibold">{name(e.exerciseId)}</span>
                <span className="text-neutral-400">
                  {e.sets.map((x) => (e.target?.isTimed ? `${x.durationSec ?? 0} s` : `${formatKg(x.weightKg)} × ${x.reps}`)).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
          {s.note && <p className="mt-3 whitespace-pre-line rounded-2xl bg-neutral-900 p-3 text-neutral-300">{s.note}</p>}
        </section>

        <Link to="/" replace className="flex min-h-14 items-center justify-center rounded-2xl bg-lime-400 text-lg font-semibold text-neutral-950">
          Retour à l’accueil
        </Link>
      </div>
    </>
  )
}
