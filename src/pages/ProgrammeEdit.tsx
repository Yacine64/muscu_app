import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BackButton from '../components/BackButton'
import PageHeader from '../components/PageHeader'
import { Button, IconButton, Label, inputClass } from '../components/ui'
import { db } from '../db/db'
import { createTemplate, deleteProgram, setActiveProgram } from '../db/programs'
import type { Program, WorkoutTemplate } from '../db/types'
import { useLiveQuery } from '../db/useLiveQuery'
import { moveItem } from '../lib/programs'

export default function ProgrammeEdit() {
  const { id = '' } = useParams()
  const data = useLiveQuery(async () => {
    const [program, templates] = await Promise.all([db.programs.get(id), db.templates.toArray()])
    return { program: program ?? null, templates }
  }, [id])
  if (!data) return null
  if (!data.program) return <PageHeader title="Programme introuvable" action={<BackButton />} />
  return <Editor key={data.program.id} program={data.program} templates={data.templates} />
}

function Editor({ program, templates }: { program: Program; templates: WorkoutTemplate[] }) {
  const navigate = useNavigate()
  const [name, setName] = useState(program.name)
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const byId = new Map(templates.map((t) => [t.id, t]))
  const ids = program.templateIds.filter((t) => byId.has(t))
  const others = templates.filter((t) => !ids.includes(t.id))

  const setIds = (templateIds: string[]) => db.programs.update(program.id, { templateIds })

  return (
    <>
      <PageHeader title="Programme" action={<BackButton />} />
      <div className="space-y-6 px-4">
        <label className="block">
          <Label>Nom</Label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              void db.programs.update(program.id, { name: e.target.value.trim() || 'Sans nom' })
            }}
          />
        </label>

        {program.isActive ? (
          <p className="font-semibold text-lime-400">✓ C’est le programme actif (proposé sur l’accueil).</p>
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => setActiveProgram(program.id)}>
            Utiliser ce programme
          </Button>
        )}

        <div>
          <Label>Séances (dans l’ordre)</Label>
          <ol className="space-y-2">
            {ids.map((tid, i) => (
              <li key={tid} className="flex items-center gap-2 rounded-xl bg-neutral-900 p-2">
                <Link to={`/programmes/seance/${tid}`} className="min-w-0 flex-1 px-2 py-1">
                  <span className="block truncate text-lg font-semibold">{byId.get(tid)!.name}</span>
                  <span className="text-sm text-lime-400">Modifier la séance ›</span>
                </Link>
                <IconButton label="Monter" disabled={i === 0} onClick={() => setIds(moveItem(ids, i, i - 1))}>
                  ↑
                </IconButton>
                <IconButton label="Descendre" disabled={i === ids.length - 1} onClick={() => setIds(moveItem(ids, i, i + 1))}>
                  ↓
                </IconButton>
                <IconButton label="Retirer du programme" onClick={() => setIds(ids.filter((x) => x !== tid))}>
                  ✕
                </IconButton>
              </li>
            ))}
          </ol>
          {ids.length === 0 && <p className="text-neutral-400">Aucune séance.</p>}
          <p className="mt-2 text-sm text-neutral-500">✕ retire la séance du programme sans la supprimer.</p>
        </div>

        <div className="grid gap-3">
          <Button onClick={async () => navigate(`/programmes/seance/${await createTemplate(program.id)}`)}>+ Nouvelle séance</Button>
          {others.length > 0 && (
            <Button variant="secondary" onClick={() => setAdding(!adding)}>
              + Ajouter une séance existante
            </Button>
          )}
          {adding && (
            <ul className="space-y-2">
              {others.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-left text-lg active:bg-neutral-800"
                    onClick={() => {
                      void setIds([...ids, t.id])
                      setAdding(false)
                    }}
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pt-4">
          {!confirmDelete ? (
            <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
              Supprimer le programme
            </Button>
          ) : (
            <div className="space-y-3 rounded-2xl border border-red-900 bg-neutral-900 p-4">
              <p className="text-lg">Supprimer ce programme ? Ses séances sont conservées dans « Séances hors programme ».</p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    await deleteProgram(program.id)
                    navigate('/programmes', { replace: true })
                  }}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
