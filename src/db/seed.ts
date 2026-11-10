import rawExercises from '../data/exercises.json'
import type { Equipment, Exercise, Program, Settings, TemplateExercise, WorkoutTemplate } from './types'

type RawExercise = { name: string; primaryMuscle: string; secondaryMuscles: string[]; equipment: string[]; assisted?: boolean }

// [nom de l'exercice, séries, reps min, reps max, repos (s), chronométré ?]
type Line = [string, number, number, number, number, boolean?]

const PROGRAM: { name: string; lines: Line[] }[] = [
  {
    name: 'Séance A – Pecs, épaules, triceps',
    lines: [
      ['Développé couché', 4, 8, 10, 120],
      ['Développé incliné aux haltères', 3, 10, 12, 90],
      ['Écartés à la poulie', 3, 12, 15, 60],
      ['Développé épaules', 3, 10, 12, 90],
      ['Élévations latérales', 3, 12, 15, 60],
      ['Extensions triceps à la poulie', 3, 12, 12, 60],
    ],
  },
  {
    name: 'Séance B – Dos, biceps, jambes',
    lines: [
      ['Tirage vertical prise large', 4, 8, 10, 120],
      ['Rowing assis à la poulie', 3, 10, 12, 90],
      ['Rowing un bras avec haltère', 3, 10, 10, 60],
      ['Presse à cuisses', 3, 10, 12, 120],
      ['Leg curl', 2, 12, 12, 60],
      ['Curl biceps aux haltères', 3, 10, 12, 60],
    ],
  },
  {
    name: 'Séance C – Haut du corps',
    lines: [
      ['Développé incliné', 4, 8, 10, 120],
      ['Tirage vertical prise serrée', 4, 8, 10, 120],
      ['Dips assistés', 3, 10, 12, 90],
      ['Face pull', 3, 15, 15, 60],
      ['Élévations latérales', 3, 12, 15, 60],
      ['Gainage (planche)', 3, 30, 45, 45, true],
    ],
  },
]

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  defaultRestSeconds: 90,
  incrementBarbellKg: 2.5,
  incrementDumbbellKg: 1,
  measurementTypes: ['Tour de taille', 'Poitrine', 'Bras', 'Cuisse', 'Hanches'],
}

/** Construit toutes les données de départ. `newId` est injecté pour pouvoir tester. */
export function buildSeed(newId: () => string = () => crypto.randomUUID()) {
  const exercises: Exercise[] = (rawExercises as RawExercise[]).map((r) => ({
    id: newId(),
    name: r.name,
    primaryMuscle: r.primaryMuscle,
    secondaryMuscles: r.secondaryMuscles,
    equipment: r.equipment as Equipment[],
    isCustom: false,
    archived: false,
    ...(r.assisted ? { assisted: true } : {}),
  }))

  const byName = new Map(exercises.map((e) => [e.name, e.id]))

  const templates: WorkoutTemplate[] = PROGRAM.map((t) => ({
    id: newId(),
    name: t.name,
    exercises: t.lines.map(([name, sets, repsMin, repsMax, restSeconds, isTimed]): TemplateExercise => {
      const exerciseId = byName.get(name)
      if (!exerciseId) throw new Error(`Exercice inconnu dans le programme : ${name}`)
      return { exerciseId, sets, repsMin, repsMax, restSeconds, ...(isTimed ? { isTimed: true } : {}) }
    }),
  }))

  const program: Program = {
    id: newId(),
    name: 'Programme A / B / C',
    isActive: true,
    templateIds: templates.map((t) => t.id),
  }

  return { exercises, templates, programs: [program], settings: DEFAULT_SETTINGS }
}
