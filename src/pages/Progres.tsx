import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import NumberField from '../components/NumberField'
import PageHeader from '../components/PageHeader'
import TimeChart from '../components/TimeChart'
import { Button, Chip, IconButton, inputClass } from '../components/ui'
import { db } from '../db/db'
import { DEFAULT_SETTINGS } from '../db/seed'
import type { BodyWeight, Measurement, Settings } from '../db/types'
import { useLiveQuery } from '../db/useLiveQuery'
import { currentAverage7, exercisesWithHistory, latest, measurementSeries, movingAverage7, toDay } from '../lib/progress'
import { durationMinutes, formatKg, sessionVolume } from '../lib/session'

const LIME = '#a3e635'
const GRAY = '#a3a3a3'
const VIEWS = [
  { key: 'corps', label: 'Corps' },
  { key: 'exercices', label: 'Exercices' },
  { key: 'historique', label: 'Historique' },
] as const
type View = (typeof VIEWS)[number]['key']

const dayFr = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const dayToTime = (day: string) => Date.parse(`${day}T12:00:00`)

export default function Progres() {
  const [params, setParams] = useSearchParams()
  const view: View = (VIEWS.find((v) => v.key === params.get('vue'))?.key ?? 'corps') as View

  return (
    <>
      <PageHeader title="Progrès" />
      <div className="mx-4 mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-neutral-900 p-1" role="tablist">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            onClick={() => setParams({ vue: v.key }, { replace: true })}
            className={`min-h-12 rounded-xl text-base font-semibold ${view === v.key ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {view === 'corps' && <Corps />}
      {view === 'exercices' && <ExercicesProgres />}
      {view === 'historique' && <Historique />}
    </>
  )
}

// ---------------- Corps : poids et mensurations ----------------

function Corps() {
  const data = useLiveQuery(async () => {
    const [weights, measurements, settings] = await Promise.all([db.bodyWeights.toArray(), db.measurements.toArray(), db.settings.get('settings')])
    return { weights, measurements, settings: settings ?? DEFAULT_SETTINGS }
  })
  if (!data) return null
  return (
    <div className="space-y-5 px-4">
      <Poids weights={data.weights} />
      <Mensurations measurements={data.measurements} settings={data.settings} />
    </div>
  )
}

function Poids({ weights }: { weights: BodyWeight[] }) {
  const today = toDay(new Date())
  const last = latest(weights)
  const [value, setValue] = useState<number>(last?.weightKg ?? 80)
  const [date, setDate] = useState(today)
  const [showAll, setShowAll] = useState(false)
  const avg = currentAverage7(weights, today)
  const points = movingAverage7(weights)
  const sorted = [...weights].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <section className="space-y-4 rounded-3xl bg-neutral-900 p-4">
      <h2 className="text-xl font-bold">Poids du corps</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-neutral-800 p-3">
          <span className="block text-sm text-neutral-400">Moyenne 7 jours</span>
          <span className="text-3xl font-bold">{avg !== null ? `${formatKg(avg)} kg` : '—'}</span>
        </div>
        <div className="rounded-2xl bg-neutral-800 p-3">
          <span className="block text-sm text-neutral-400">Dernière pesée</span>
          <span className="text-3xl font-bold">{last ? `${formatKg(last.weightKg)} kg` : '—'}</span>
          {last && <span className="block text-sm text-neutral-400">{dayFr(last.date)}</span>}
        </div>
      </div>
      <p className="text-sm text-neutral-400">La moyenne sur 7 jours lisse les variations d’un jour à l’autre (eau, repas) : c’est elle qu’il faut suivre.</p>

      <div className="grid grid-cols-[1fr_1fr] items-end gap-3">
        <NumberField big decimal label="Poids (kg)" value={value} onChange={setValue} />
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Date</span>
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} className={`${inputClass} min-h-16`} />
        </label>
      </div>
      <Button
        className="w-full"
        disabled={!(value > 0)}
        onClick={() => db.bodyWeights.add({ id: crypto.randomUUID(), date, weightKg: Math.round(value * 10) / 10 })}
      >
        Enregistrer la pesée
      </Button>

      <TimeChart
        data={points.map((p) => ({ t: dayToTime(p.date), weightKg: p.weightKg, avg7: p.avg7 }))}
        series={[
          { key: 'weightKg', name: 'Pesée', color: GRAY, showLine: false },
          { key: 'avg7', name: 'Moyenne 7 jours', color: LIME },
        ]}
        unit="kg"
      />

      {sorted.length > 0 && (
        <ul className="space-y-1">
          {(showAll ? sorted : sorted.slice(0, 5)).map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-800/60 py-1 pl-3 pr-1">
              <span className="text-neutral-300">{dayFr(w.date)}</span>
              <span className="flex items-center gap-3">
                <span className="text-lg font-semibold">{formatKg(w.weightKg)} kg</span>
                <IconButton label={`Supprimer la pesée du ${dayFr(w.date)}`} onClick={() => db.bodyWeights.delete(w.id)}>
                  ✕
                </IconButton>
              </span>
            </li>
          ))}
          {sorted.length > 5 && (
            <li className="text-center">
              <button type="button" className="min-h-11 text-neutral-400 underline" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Voir moins' : `Voir tout (${sorted.length})`}
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

function Mensurations({ measurements, settings }: { measurements: Measurement[]; settings: Settings }) {
  const today = toDay(new Date())
  const types = settings.measurementTypes
  const [type, setType] = useState(types[0] ?? '')
  const current = types.includes(type) ? type : (types[0] ?? '')
  const series = measurementSeries(measurements, current)
  const last = series[series.length - 1]
  const [value, setValue] = useState<number>(last?.valueCm ?? 80)
  const [date, setDate] = useState(today)
  const [managing, setManaging] = useState(false)
  const [newType, setNewType] = useState('')

  const saveTypes = (measurementTypes: string[]) => db.settings.put({ ...settings, measurementTypes })

  return (
    <section className="space-y-4 rounded-3xl bg-neutral-900 p-4">
      <h2 className="text-xl font-bold">Mensurations</h2>
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <Chip
            key={t}
            active={t === current}
            onClick={() => {
              setType(t)
              const l = measurementSeries(measurements, t).at(-1)
              if (l) setValue(l.valueCm)
            }}
          >
            {t}
          </Chip>
        ))}
      </div>

      {current && (
        <>
          <div className="rounded-2xl bg-neutral-800 p-3">
            <span className="block text-sm text-neutral-400">{current} – dernière mesure</span>
            <span className="text-3xl font-bold">{last ? `${formatKg(last.valueCm)} cm` : '—'}</span>
            {last && <span className="block text-sm text-neutral-400">{dayFr(last.date)}</span>}
          </div>
          <div className="grid grid-cols-2 items-end gap-3">
            <NumberField key={current} big decimal label={`${current} (cm)`} value={value} onChange={setValue} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">Date</span>
              <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} className={`${inputClass} min-h-16`} />
            </label>
          </div>
          <Button
            className="w-full"
            disabled={!(value > 0)}
            onClick={() => db.measurements.add({ id: crypto.randomUUID(), date, type: current, valueCm: Math.round(value * 10) / 10 })}
          >
            Enregistrer
          </Button>
          <TimeChart data={series.map((m) => ({ t: dayToTime(m.date), valueCm: m.valueCm }))} series={[{ key: 'valueCm', name: current, color: LIME }]} unit="cm" />
          {series.length > 0 && (
            <ul className="space-y-1">
              {[...series].reverse().slice(0, 5).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-800/60 py-1 pl-3 pr-1">
                  <span className="text-neutral-300">{dayFr(m.date)}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-lg font-semibold">{formatKg(m.valueCm)} cm</span>
                    <IconButton label={`Supprimer la mesure du ${dayFr(m.date)}`} onClick={() => db.measurements.delete(m.id)}>
                      ✕
                    </IconButton>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <button type="button" className="min-h-11 text-neutral-400 underline" onClick={() => setManaging(!managing)}>
        {managing ? 'Fermer' : 'Modifier la liste des mensurations'}
      </button>
      {managing && (
        <div className="space-y-2">
          {types.map((t) => (
            <div key={t} className="flex items-center justify-between rounded-xl bg-neutral-800/60 py-1 pl-3 pr-1">
              <span>{t}</span>
              <IconButton label={`Retirer ${t}`} onClick={() => saveTypes(types.filter((x) => x !== t))}>
                ✕
              </IconButton>
            </div>
          ))}
          <p className="text-sm text-neutral-500">Retirer un type le cache de la liste ; les mesures déjà saisies sont gardées.</p>
          <div className="flex gap-2">
            <input className={inputClass} value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="ex. Mollet" />
            <Button
              variant="secondary"
              disabled={!newType.trim() || types.includes(newType.trim())}
              onClick={() => {
                void saveTypes([...types, newType.trim()])
                setNewType('')
              }}
            >
              Ajouter
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

// ---------------- Exercices ----------------

function ExercicesProgres() {
  const data = useLiveQuery(async () => {
    const [sessions, exercises] = await Promise.all([db.sessions.toArray(), db.exercises.toArray()])
    return { sessions, exercises }
  })
  if (!data) return null
  const list = exercisesWithHistory(data.sessions)
  if (!list.length) return <p className="mx-4 rounded-2xl bg-neutral-900 p-4 text-neutral-400">Termine une séance pour voir ta progression par exercice.</p>
  return (
    <ul className="space-y-2 px-4">
      {list.map((x) => {
        const ex = data.exercises.find((e) => e.id === x.exerciseId)
        return (
          <li key={x.exerciseId}>
            <Link to={`/exercices/${x.exerciseId}`} className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-900 px-4 py-3 active:bg-neutral-800">
              <span>
                <span className="block text-lg font-semibold">{ex?.name ?? 'Exercice supprimé'}</span>
                <span className="text-sm text-neutral-400">
                  {x.count} séance{x.count > 1 ? 's' : ''} · dernière : {dateFr(x.lastDate)}
                </span>
              </span>
              <span className="text-2xl text-neutral-500">›</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

// ---------------- Historique ----------------

function Historique() {
  const sessions = useLiveQuery(() => db.sessions.toArray())
  if (!sessions) return null
  const done = sessions.filter((s) => s.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  if (!done.length) return <p className="mx-4 rounded-2xl bg-neutral-900 p-4 text-neutral-400">Aucune séance terminée pour l’instant.</p>
  return (
    <ul className="space-y-2 px-4">
      {done.map((s) => (
        <li key={s.id}>
          <Link to={`/progres/seance/${s.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-900 px-4 py-3 active:bg-neutral-800">
            <span className="min-w-0">
              <span className="block text-sm text-neutral-400">{dateFr(s.startedAt)}</span>
              <span className="block truncate text-lg font-semibold">{s.templateName ?? 'Séance'}</span>
              <span className="text-sm text-neutral-400">
                {durationMinutes(s)} min · {formatKg(sessionVolume(s))} kg · {s.entries.length} exercice{s.entries.length > 1 ? 's' : ''}
              </span>
            </span>
            <span className="text-2xl text-neutral-500">›</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
