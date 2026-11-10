import { buildSessionFromTemplate, finalizeSession } from '../lib/session'
import { db } from './db'
import type { WorkoutSession } from './types'

export function getActiveSession() {
  return db.sessions.filter((s) => !s.endedAt).first()
}

/** Démarre une séance depuis un modèle, ou une séance libre (sans modèle). Renvoie la séance en cours si elle existe déjà. */
export async function startSession(templateId?: string): Promise<string> {
  return db.transaction('rw', db.sessions, db.templates, db.exercises, async () => {
    const active = await getActiveSession()
    if (active) return active.id
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const template = templateId ? await db.templates.get(templateId) : undefined
    const session: WorkoutSession = template
      ? buildSessionFromTemplate(template, await db.exercises.toArray(), await db.sessions.toArray(), id, now)
      : { id, startedAt: now, templateName: 'Séance libre', entries: [] }
    await db.sessions.add(session)
    return id
  })
}

export async function finishSession(id: string) {
  const s = await db.sessions.get(id)
  if (s) await db.sessions.put(finalizeSession(s, new Date().toISOString()))
}

export async function abandonSession(id: string) {
  await db.sessions.delete(id)
}
