import Dexie, { type EntityTable } from 'dexie'
import { buildSeed } from './seed'
import type { BodyWeight, Exercise, Measurement, Program, Settings, WorkoutSession, WorkoutTemplate } from './types'

/**
 * Base IndexedDB de l'app.
 * Pour changer le schéma plus tard (ex. alimentation), ajouter un `this.version(2).stores({...})`
 * sans modifier la version 1 : Dexie migre les données existantes sans rien perdre.
 */
export const SCHEMA_VERSION = 2

export class MuscuDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  programs!: EntityTable<Program, 'id'>
  templates!: EntityTable<WorkoutTemplate, 'id'>
  sessions!: EntityTable<WorkoutSession, 'id'>
  bodyWeights!: EntityTable<BodyWeight, 'id'>
  measurements!: EntityTable<Measurement, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('muscu')
    this.version(1).stores({
      exercises: 'id, name, primaryMuscle',
      programs: 'id, isActive',
      templates: 'id',
      sessions: 'id, startedAt, endedAt, templateId',
      bodyWeights: 'id, date',
      measurements: 'id, date, type',
      settings: 'id',
    })

    // v2 : les dips assistés sont marqués « machine d'assistance » (moins de kg = plus dur).
    this.version(2)
      .stores({})
      .upgrade((tx) =>
        tx
          .table('exercises')
          .toCollection()
          .modify((e: Exercise) => {
            if (e.name === 'Dips assistés' && !e.isCustom) e.assisted = true
          }),
      )

    // Exécuté une seule fois, à la création de la base sur le téléphone.
    this.on('populate', (tx) => {
      const seed = buildSeed()
      tx.table('exercises').bulkAdd(seed.exercises)
      tx.table('templates').bulkAdd(seed.templates)
      tx.table('programs').bulkAdd(seed.programs)
      tx.table('settings').add(seed.settings)
    })
  }
}

export const db = new MuscuDB()

/** Un exercice est « utilisé » s'il apparaît dans l'historique ou dans une séance modèle. */
export async function isExerciseUsed(exerciseId: string): Promise<boolean> {
  const inSessions = await db.sessions
    .filter((s) => s.entries.some((e) => e.exerciseId === exerciseId))
    .count()
  if (inSessions > 0) return true
  const inTemplates = await db.templates
    .filter((t) => t.exercises.some((e) => e.exerciseId === exerciseId))
    .count()
  return inTemplates > 0
}

/** Supprime l'exercice, ou l'archive s'il est déjà utilisé. Renvoie ce qui a été fait. */
export async function deleteOrArchiveExercise(exerciseId: string): Promise<'deleted' | 'archived'> {
  if (await isExerciseUsed(exerciseId)) {
    await db.exercises.update(exerciseId, { archived: true })
    return 'archived'
  }
  await db.exercises.delete(exerciseId)
  return 'deleted'
}
