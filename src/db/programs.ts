import { activate, duplicateTemplate, insertAfter } from '../lib/programs'
import { db } from './db'
import type { Program, WorkoutTemplate } from './types'

export async function setActiveProgram(id: string) {
  await db.transaction('rw', db.programs, async () => {
    await db.programs.bulkPut(activate(await db.programs.toArray(), id))
  })
}

export async function createProgram(): Promise<string> {
  const count = await db.programs.count()
  const p: Program = { id: crypto.randomUUID(), name: 'Nouveau programme', isActive: count === 0, templateIds: [] }
  await db.programs.add(p)
  return p.id
}

/** Supprime le programme ; ses séances restent disponibles (« hors programme »). */
export async function deleteProgram(id: string) {
  await db.transaction('rw', db.programs, async () => {
    const wasActive = (await db.programs.get(id))?.isActive
    await db.programs.delete(id)
    const first = await db.programs.toCollection().first()
    if (wasActive && first) await db.programs.update(first.id, { isActive: true })
  })
}

/** Crée une séance vide, ajoutée à la fin du programme si on en donne un. */
export async function createTemplate(programId?: string): Promise<string> {
  const t: WorkoutTemplate = { id: crypto.randomUUID(), name: 'Nouvelle séance', exercises: [] }
  await db.transaction('rw', db.templates, db.programs, async () => {
    await db.templates.add(t)
    if (programId) {
      const p = await db.programs.get(programId)
      if (p) await db.programs.update(programId, { templateIds: [...p.templateIds, t.id] })
    }
  })
  return t.id
}

/** Duplique une séance et place la copie juste après l'original dans chaque programme qui la contient. */
export async function duplicateTemplateInDb(id: string): Promise<string | undefined> {
  return db.transaction('rw', db.templates, db.programs, async () => {
    const t = await db.templates.get(id)
    if (!t) return undefined
    const copy = duplicateTemplate(t, crypto.randomUUID())
    await db.templates.add(copy)
    for (const p of await db.programs.toArray()) {
      if (p.templateIds.includes(id)) await db.programs.update(p.id, { templateIds: insertAfter(p.templateIds, id, copy.id) })
    }
    return copy.id
  })
}

/** Supprime une séance modèle et la retire des programmes. L'historique des séances faites est conservé. */
export async function deleteTemplate(id: string) {
  await db.transaction('rw', db.templates, db.programs, async () => {
    await db.templates.delete(id)
    for (const p of await db.programs.toArray()) {
      if (p.templateIds.includes(id)) await db.programs.update(p.id, { templateIds: p.templateIds.filter((x) => x !== id) })
    }
  })
}
