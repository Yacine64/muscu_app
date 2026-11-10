import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Button } from '../components/ui'
import { db } from '../db/db'
import { DEFAULT_SETTINGS } from '../db/seed'
import { startSession } from '../db/sessions'
import { useLiveQuery } from '../db/useLiveQuery'
import { nextTemplateId } from '../lib/session'
import SeanceEnCours from './SeanceEnCours'

export default function Seance() {
  const data = useLiveQuery(async () => {
    const [sessions, exercises, settings, templates, programs] = await Promise.all([
      db.sessions.toArray(),
      db.exercises.toArray(),
      db.settings.get('settings'),
      db.templates.toArray(),
      db.programs.toArray(),
    ])
    return { sessions, exercises, settings: settings ?? DEFAULT_SETTINGS, templates, programs }
  })
  if (!data) return null

  const active = data.sessions.find((s) => !s.endedAt)
  if (active) {
    return (
      <SeanceEnCours
        key={active.id}
        initial={active}
        exercises={data.exercises}
        history={data.sessions.filter((s) => s.endedAt)}
        settings={data.settings}
      />
    )
  }
  return <StartScreen {...data} />
}

function StartScreen({
  sessions,
  templates,
  programs,
}: {
  sessions: import('../db/types').WorkoutSession[]
  templates: import('../db/types').WorkoutTemplate[]
  programs: import('../db/types').Program[]
}) {
  const navigate = useNavigate()
  const program = programs.find((p) => p.isActive)
  const next = nextTemplateId(program, sessions)
  const inProgram = new Set(program?.templateIds ?? [])
  const ordered = [
    ...(program?.templateIds ?? []).map((id) => templates.find((t) => t.id === id)).filter((t) => !!t),
    ...templates.filter((t) => !inProgram.has(t.id)),
  ]

  async function start(templateId?: string) {
    await startSession(templateId)
    navigate('/seance', { replace: true })
  }

  return (
    <>
      <PageHeader title="Démarrer une séance" />
      <ul className="space-y-2 px-4">
        {ordered.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => start(t.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left ${
                t.id === next ? 'bg-lime-400 text-neutral-950 active:bg-lime-300' : 'bg-neutral-900 active:bg-neutral-800'
              }`}
            >
              <span>
                <span className="block text-lg font-semibold">{t.name}</span>
                <span className={`text-sm ${t.id === next ? 'text-neutral-800' : 'text-neutral-400'}`}>
                  {t.id === next ? 'Prochaine séance · ' : ''}
                  {t.exercises.length} exercice(s)
                </span>
              </span>
              <span className="text-xl font-bold">▶</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 px-4">
        <Button variant="secondary" className="w-full" onClick={() => start()}>
          Séance libre
        </Button>
      </div>
    </>
  )
}
