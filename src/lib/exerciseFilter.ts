import type { Equipment, Exercise } from '../db/types'
import { normalize } from './text'

export interface ExerciseFilter {
  query?: string
  muscle?: string // principal ou secondaire
  equipment?: Equipment
  showArchived?: boolean
}

export function filterExercises(list: Exercise[], f: ExerciseFilter): Exercise[] {
  // Chaque mot tapé doit apparaître dans le nom, dans n'importe quel ordre.
  const words = normalize(f.query ?? '').split(/\s+/).filter(Boolean)
  return list
    .filter((e) => (f.showArchived ? true : !e.archived))
    .filter((e) => {
      const name = normalize(e.name)
      return words.every((w) => name.includes(w))
    })
    .filter((e) => !f.muscle || e.primaryMuscle === f.muscle || e.secondaryMuscles.includes(f.muscle))
    .filter((e) => !f.equipment || e.equipment.includes(f.equipment))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/** Tous les muscles présents dans la banque, triés : sert aux filtres et au formulaire. */
export function allMuscles(list: Exercise[]): string[] {
  const set = new Set<string>()
  for (const e of list) {
    set.add(e.primaryMuscle)
    e.secondaryMuscles.forEach((m) => set.add(m))
  }
  return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr'))
}
