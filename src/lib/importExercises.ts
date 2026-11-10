import type { Exercise } from '../db/types'
import { isEquipment } from './equipment'
import { normalize } from './text'

export interface ImportResult {
  toAdd: Exercise[]
  duplicates: string[] // noms déjà présents (ignorés)
  errors: string[]
}

const MEDIA_TYPES = ['image', 'gif', 'video'] as const

/**
 * Lit un fichier JSON d'exercices : soit un tableau, soit un objet { exercises: [...] }.
 * Les exercices dont le nom existe déjà (sans tenir compte des accents ni de la casse) sont ignorés.
 */
export function parseExerciseImport(
  json: string,
  existing: Exercise[],
  newId: () => string = () => crypto.randomUUID(),
): ImportResult {
  const result: ImportResult = { toAdd: [], duplicates: [], errors: [] }

  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    result.errors.push('Le fichier n’est pas un JSON valide.')
    return result
  }

  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { exercises?: unknown }).exercises)
      ? (data as { exercises: unknown[] }).exercises
      : null
  if (!list) {
    result.errors.push('Format attendu : une liste d’exercices, ou { "exercises": [...] }.')
    return result
  }

  const known = new Set(existing.map((e) => normalize(e.name)))

  list.forEach((item, i) => {
    const r = (item ?? {}) as Record<string, unknown>
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    if (!name) {
      result.errors.push(`Élément ${i + 1} : nom manquant.`)
      return
    }
    const key = normalize(name)
    if (known.has(key)) {
      result.duplicates.push(name)
      return
    }
    known.add(key)

    const equipment = Array.isArray(r.equipment) ? r.equipment.filter(isEquipment) : []
    const mediaType = MEDIA_TYPES.find((t) => t === r.mediaType)

    result.toAdd.push({
      id: newId(),
      name,
      primaryMuscle: typeof r.primaryMuscle === 'string' && r.primaryMuscle.trim() ? r.primaryMuscle.trim() : 'Autre',
      secondaryMuscles: Array.isArray(r.secondaryMuscles)
        ? r.secondaryMuscles.filter((m): m is string => typeof m === 'string' && m.trim() !== '')
        : [],
      equipment: equipment.length ? equipment : ['autre'],
      ...(typeof r.instructions === 'string' && r.instructions ? { instructions: r.instructions } : {}),
      ...(typeof r.mediaUrl === 'string' && r.mediaUrl ? { mediaUrl: r.mediaUrl } : {}),
      ...(mediaType ? { mediaType } : {}),
      isCustom: true,
      archived: false,
    })
  })

  return result
}
