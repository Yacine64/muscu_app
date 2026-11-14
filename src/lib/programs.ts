import type { Program, TemplateExercise, WorkoutTemplate } from '../db/types'

/** Déplace l'élément d'indice `from` vers `to` (renvoie un nouveau tableau). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const copy = [...list]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

/** Copie d'une séance modèle, avec un nouvel id et « (copie) » dans le nom. */
export function duplicateTemplate(t: WorkoutTemplate, newId: string): WorkoutTemplate {
  return { id: newId, name: `${t.name} (copie)`, exercises: t.exercises.map((e) => ({ ...e })) }
}

/** Insère `newId` juste après `afterId` dans l'ordre d'un programme (ou à la fin si absent). */
export function insertAfter(ids: string[], afterId: string, newId: string): string[] {
  const i = ids.indexOf(afterId)
  if (i === -1) return [...ids, newId]
  return [...ids.slice(0, i + 1), newId, ...ids.slice(i + 1)]
}

/** Rend un seul programme actif. */
export function activate(programs: Program[], id: string): Program[] {
  return programs.map((p) => ({ ...p, isActive: p.id === id }))
}

/** « 90 » → « 1 min 30 », « 45 » → « 45 s », « 120 » → « 2 min ». */
export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} s`
  return s ? `${m} min ${String(s).padStart(2, '0')}` : `${m} min`
}

/** « 3 × 8–10 » ou « 3 × 12 » ou « 3 × 30–45 s ». */
export function formatLine(e: Pick<TemplateExercise, 'sets' | 'repsMin' | 'repsMax' | 'isTimed' | 'perSide'>): string {
  const range = e.repsMin === e.repsMax ? `${e.repsMin}` : `${e.repsMin}–${e.repsMax}`
  return `${e.sets} × ${range}${e.isTimed ? ' s' : ''}${e.perSide ? ' / bras' : ''}`
}

/** Nouvelle ligne d'exercice avec des valeurs par défaut raisonnables. */
export function newLine(exerciseId: string, restSeconds: number): TemplateExercise {
  return { exerciseId, sets: 3, repsMin: 10, repsMax: 12, restSeconds }
}

/** Corrige une ligne saisie : valeurs entières positives et min ≤ max. */
export function sanitizeLine(e: TemplateExercise): TemplateExercise {
  const int = (n: number, min: number) => (Number.isFinite(n) ? Math.max(min, Math.round(n)) : min)
  const repsMin = int(e.repsMin, 1)
  const repsMax = Math.max(repsMin, int(e.repsMax, 1))
  return { ...e, sets: int(e.sets, 1), repsMin, repsMax, restSeconds: int(e.restSeconds, 0) }
}
