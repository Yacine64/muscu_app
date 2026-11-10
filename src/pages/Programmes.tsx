import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Button } from '../components/ui'
import { db } from '../db/db'
import { createProgram, createTemplate } from '../db/programs'
import { useLiveQuery } from '../db/useLiveQuery'

export default function Programmes() {
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const [programs, templates] = await Promise.all([db.programs.toArray(), db.templates.toArray()])
    return { programs, templates }
  })
  if (!data) return null

  const byId = new Map(data.templates.map((t) => [t.id, t]))
  const used = new Set(data.programs.flatMap((p) => p.templateIds))
  const orphans = data.templates.filter((t) => !used.has(t.id))
  // Programme actif en premier.
  const programs = [...data.programs].sort((a, b) => Number(b.isActive) - Number(a.isActive))

  return (
    <>
      <PageHeader title="Programmes" />
      <div className="space-y-4 px-4">
        {programs.map((p) => (
          <section key={p.id} className="rounded-2xl bg-neutral-900 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{p.name}</h2>
                {p.isActive && <span className="text-sm font-semibold text-lime-400">Programme actif</span>}
              </div>
              <Link
                to={`/programmes/${p.id}`}
                className="shrink-0 rounded-full bg-neutral-800 px-4 py-2 text-base active:bg-neutral-700"
              >
                Modifier
              </Link>
            </div>
            <ol className="space-y-2">
              {p.templateIds.map((tid) => {
                const t = byId.get(tid)
                if (!t) return null
                return (
                  <li key={tid}>
                    <Link
                      to={`/programmes/seance/${tid}`}
                      className="flex items-center justify-between rounded-xl bg-neutral-800 px-4 py-3 active:bg-neutral-700"
                    >
                      <span>
                        <span className="block text-lg font-semibold">{t.name}</span>
                        <span className="text-sm text-neutral-400">{t.exercises.length} exercice(s)</span>
                      </span>
                      <span className="text-2xl text-neutral-500">›</span>
                    </Link>
                  </li>
                )
              })}
              {p.templateIds.length === 0 && <li className="text-neutral-400">Aucune séance pour l’instant.</li>}
            </ol>
          </section>
        ))}

        <Button variant="secondary" className="w-full" onClick={async () => navigate(`/programmes/${await createProgram()}`)}>
          + Nouveau programme
        </Button>

        <section className="pt-2">
          <h2 className="mb-2 text-lg font-bold text-neutral-300">Séances hors programme</h2>
          <ul className="space-y-2">
            {orphans.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/programmes/seance/${t.id}`}
                  className="flex items-center justify-between rounded-xl bg-neutral-900 px-4 py-3 active:bg-neutral-800"
                >
                  <span>
                    <span className="block text-lg font-semibold">{t.name}</span>
                    <span className="text-sm text-neutral-400">{t.exercises.length} exercice(s)</span>
                  </span>
                  <span className="text-2xl text-neutral-500">›</span>
                </Link>
              </li>
            ))}
          </ul>
          {orphans.length === 0 && <p className="text-neutral-500">Aucune.</p>}
          <Button
            variant="secondary"
            className="mt-3 w-full"
            onClick={async () => navigate(`/programmes/seance/${await createTemplate()}`)}
          >
            + Nouvelle séance seule
          </Button>
        </section>
      </div>
    </>
  )
}
