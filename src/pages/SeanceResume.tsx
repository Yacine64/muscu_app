import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import BackButton from '../components/BackButton'
import { Button } from '../components/ui'
import { deleteSession } from '../db/sessions'
import PageHeader from '../components/PageHeader'
import { db } from '../db/db'
import { useLiveQuery } from '../db/useLiveQuery'
import { EQUIPMENT_LABELS } from '../lib/equipment'
import { durationMinutes, formatKg, recordsBeaten, sessionVolume } from '../lib/session'

export default function SeanceResume() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  // Même écran pour le résumé de fin de séance et pour le détail depuis l'historique.
  const fromHistory = useLocation().pathname.startsWith('/progres')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const data = useLiveQuery(async () => {
    const [session, sessions, exercises] = await Promise.all([db.sessions.get(id), db.sessions.toArray(), db.exercises.toArray()])
    return { session, sessions, exercises }
  }, [id])
  if (!data) return null
  const s = data.session
  if (!s) return <PageHeader title="Séance introuvable" action={<BackButton />} />

  const name = (exId: string) => data.exercises.find((e) => e.id === exId)?.name ?? 'Exercice'
  const records = recordsBeaten(s, data.sessions, (exId) => !!data.exercises.find((e) => e.id === exId)?.assisted)
  const sets = s.entries.reduce((n, e) => n + e.sets.length, 0)
  const stats = [
    { label: 'Durée', value: `${durationMinutes(s)} min` },
    { label: 'Volume', value: `${formatKg(sessionVolume(s))} kg` },
    { label: 'Séries', value: String(sets) },
  ]

  return (
    <>
      {fromHistory ? (
        <PageHeader
          title={new Date(s.startedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          action={<BackButton />}
        />
      ) : (
        <PageHeader title="Séance terminée 💪" />
      )}
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

        {!fromHistory && (
          <Link to="/" replace className="flex min-h-14 items-center justify-center rounded-2xl bg-lime-400 text-lg font-semibold text-neutral-950">
            Retour à l’accueil
          </Link>
        )}

        {!confirmDelete ? (
          <div className="text-center">
            <button type="button" className="min-h-11 text-red-300 underline" onClick={() => setConfirmDelete(true)}>
              Supprimer cette séance de l’historique
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-red-900 bg-neutral-900 p-4">
            <p className="text-lg">Supprimer définitivement cette séance ? Ses séries disparaîtront des graphiques et des records.</p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteSession(s.id)
                  navigate(fromHistory ? '/progres?vue=historique' : '/', { replace: true })
                }}
              >
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
