import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Button, Chip, Label, inputClass } from '../components/ui'
import { db } from '../db/db'
import type { Equipment, Exercise } from '../db/types'
import { useLiveQuery } from '../db/useLiveQuery'
import { EQUIPMENT_LABELS, EQUIPMENT_LIST } from '../lib/equipment'
import { allMuscles } from '../lib/exerciseFilter'
import { normalize } from '../lib/text'
import { BackButton } from './ExerciceFiche'

type MediaType = NonNullable<Exercise['mediaType']>

export default function ExerciceForm() {
  const { id } = useParams() // absent = nouvel exercice
  const all = useLiveQuery(() => db.exercises.toArray())
  if (all === undefined) return null
  // La clé force un formulaire neuf, pré-rempli, pour chaque exercice.
  return <Form key={id ?? 'nouveau'} id={id} all={all} existing={all.find((e) => e.id === id)} />
}

function Form({ id, all, existing }: { id?: string; all: Exercise[]; existing?: Exercise }) {
  const navigate = useNavigate()
  const [name, setName] = useState(existing?.name ?? '')
  const [primaryMuscle, setPrimaryMuscle] = useState(existing?.primaryMuscle ?? '')
  const [secondary, setSecondary] = useState<string[]>(existing?.secondaryMuscles ?? [])
  const [newMuscle, setNewMuscle] = useState('')
  const [equipment, setEquipment] = useState<Equipment[]>(existing?.equipment ?? [])
  const [instructions, setInstructions] = useState(existing?.instructions ?? '')
  const [mediaUrl, setMediaUrl] = useState(existing?.mediaUrl ?? '')
  const [mediaType, setMediaType] = useState<MediaType>(existing?.mediaType ?? 'image')

  const muscles = useMemo(() => {
    const set = new Set([...allMuscles(all), ...secondary])
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [all, secondary])

  const duplicate = all.some((e) => e.id !== id && normalize(e.name) === normalize(name))
  const canSave = name.trim() !== '' && primaryMuscle.trim() !== '' && equipment.length > 0 && !duplicate

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  async function save() {
    if (!canSave) return
    const ex: Exercise = {
      id: existing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      primaryMuscle: primaryMuscle.trim(),
      secondaryMuscles: secondary.filter((m) => m !== primaryMuscle.trim()),
      equipment,
      isCustom: existing?.isCustom ?? true,
      archived: existing?.archived ?? false,
      ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      ...(mediaUrl.trim() ? { mediaUrl: mediaUrl.trim(), mediaType } : {}),
    }
    await db.exercises.put(ex)
    navigate(`/exercices/${ex.id}`, { replace: true })
  }

  return (
    <>
      <PageHeader title={id ? 'Modifier' : 'Nouvel exercice'} action={<BackButton />} />
      <form
        className="space-y-6 px-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className="block">
          <Label>Nom</Label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Soulevé de terre" />
          {duplicate && <span className="mt-1 block text-amber-400">Un exercice porte déjà ce nom.</span>}
        </label>

        <label className="block">
          <Label>Muscle principal</Label>
          <input
            className={inputClass}
            value={primaryMuscle}
            onChange={(e) => setPrimaryMuscle(e.target.value)}
            list="muscles"
            placeholder="ex. Dos"
          />
          <datalist id="muscles">
            {muscles.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>

        <div>
          <Label>Muscles secondaires</Label>
          <div className="flex flex-wrap gap-2">
            {muscles
              .filter((m) => m !== primaryMuscle.trim())
              .map((m) => (
                <Chip key={m} active={secondary.includes(m)} onClick={() => setSecondary(toggle(secondary, m))}>
                  {m}
                </Chip>
              ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className={inputClass}
              value={newMuscle}
              onChange={(e) => setNewMuscle(e.target.value)}
              placeholder="Autre muscle…"
            />
            <Button
              variant="secondary"
              disabled={!newMuscle.trim()}
              onClick={() => {
                const m = newMuscle.trim()
                if (m && !secondary.includes(m)) setSecondary([...secondary, m])
                setNewMuscle('')
              }}
            >
              Ajouter
            </Button>
          </div>
        </div>

        <div>
          <Label>Matériel (un ou plusieurs)</Label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_LIST.map((e) => (
              <Chip key={e} active={equipment.includes(e)} onClick={() => setEquipment(toggle(equipment, e))}>
                {EQUIPMENT_LABELS[e]}
              </Chip>
            ))}
          </div>
        </div>

        <label className="block">
          <Label>Consignes (facultatif)</Label>
          <textarea
            className={`${inputClass} min-h-28 py-3`}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </label>

        <div>
          <Label>Média (facultatif)</Label>
          <input
            className={inputClass}
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="Lien vers une image, un GIF ou une vidéo"
          />
          {mediaUrl.trim() && (
            <div className="mt-2 flex gap-2">
              {(['image', 'gif', 'video'] as const).map((t) => (
                <Chip key={t} active={mediaType === t} onClick={() => setMediaType(t)}>
                  {{ image: 'Image', gif: 'GIF', video: 'Vidéo' }[t]}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" disabled={!canSave} className="w-full">
          Enregistrer
        </Button>
        {!canSave && !duplicate && (
          <p className="-mt-3 text-center text-sm text-neutral-400">Nom, muscle principal et matériel sont obligatoires.</p>
        )}
      </form>
    </>
  )
}
