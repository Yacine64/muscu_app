import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db/db'
import type { Exercise } from '../db/types'
import { useLiveQuery } from '../db/useLiveQuery'
import { EQUIPMENT_LABELS } from '../lib/equipment'
import { equipmentsUsed, exerciseSeries, personalRecord } from '../lib/progress'
import { formatKg } from '../lib/session'
import TimeChart from './TimeChart'
import { Chip } from './ui'

const LIME = '#a3e635'
const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/** Record, graphiques (charge et volume) et historique d'un exercice, par matériel. */
export default function ExerciseProgress({ exercise }: { exercise: Exercise }) {
  const sessions = useLiveQuery(() => db.sessions.toArray())
  const [chosen, setChosen] = useState<Exercise['equipment'][number] | null>(null)
  if (!sessions) return null

  const used = equipmentsUsed(sessions, exercise.id)
  if (used.length === 0) {
    return <p className="rounded-2xl bg-neutral-900 p-4 text-neutral-400">Pas encore fait en séance : le record et les graphiques apparaîtront ici.</p>
  }
  const equipment = chosen && used.includes(chosen) ? chosen : used[0]
  const assisted = !!exercise.assisted
  const points = exerciseSeries(sessions, exercise.id, equipment, assisted)
  const timed = points.length > 0 && points.every((p) => p.sets.every((s) => s.durationSec !== undefined && s.reps === 0))
  const record = personalRecord(points, { assisted, timed })
  const data = points.map((p) => ({ t: Date.parse(p.date), best: timed ? p.bestDurationSec : p.bestKg, volume: p.volume }))

  return (
    <div className="space-y-4">
      {used.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {used.map((e) => (
            <Chip key={e} active={e === equipment} onClick={() => setChosen(e)}>
              {EQUIPMENT_LABELS[e]}
            </Chip>
          ))}
        </div>
      )}

      {record && (
        <div className="rounded-2xl border border-lime-700 bg-lime-950/40 p-4">
          <span className="block text-sm uppercase tracking-wide text-lime-300">Record{assisted ? ' (moins d’assistance)' : ''}</span>
          <span className="text-3xl font-bold">
            {timed ? `${record.durationSec} s` : `${formatKg(record.weightKg)} kg × ${record.reps}`}
          </span>
          <span className="block text-sm text-neutral-400">le {dateFr(record.date)}</span>
        </div>
      )}

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h3 className="mb-2 font-semibold">
          {timed ? 'Meilleure durée (s)' : assisted ? 'Assistance la plus faible (kg)' : 'Charge max (kg)'}
        </h3>
        <TimeChart data={data} series={[{ key: 'best', name: timed ? 'Durée' : 'Charge', color: LIME }]} unit={timed ? 's' : 'kg'} />
      </section>

      {!timed && !assisted && (
        <section className="rounded-2xl bg-neutral-900 p-4">
          <h3 className="mb-2 font-semibold">Volume (charge × répétitions, kg)</h3>
          <TimeChart data={data} series={[{ key: 'volume', name: 'Volume', color: LIME }]} unit="kg" />
        </section>
      )}

      <section>
        <h3 className="mb-2 font-semibold">Historique</h3>
        <ul className="space-y-2">
          {[...points].reverse().map((p) => (
            <li key={p.sessionId}>
              <Link to={`/progres/seance/${p.sessionId}`} className="block rounded-2xl bg-neutral-900 p-3 active:bg-neutral-800">
                <span className="block text-sm text-neutral-400">{dateFr(p.date)}</span>
                <span>{p.sets.map((s) => (timed ? `${s.durationSec ?? 0} s` : `${formatKg(s.weightKg)} × ${s.reps}`)).join(' · ')}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
