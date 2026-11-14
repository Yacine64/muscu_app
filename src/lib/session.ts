import type { EntryTarget, Equipment, Exercise, Program, SessionEntry, SessionSet, Settings, TemplateExercise, WorkoutSession, WorkoutTemplate } from '../db/types'
import { defaultEquipment } from './equipment'

export interface Previous {
  date: string // startedAt de la séance précédente
  sets: SessionSet[] // séries validées
}

/** Dernière séance terminée où cet exercice a été fait avec ce matériel. */
export function findPrevious(
  sessions: WorkoutSession[],
  exerciseId: string,
  equipment: Equipment,
  excludeSessionId?: string,
): Previous | undefined {
  const done = sessions
    .filter((s) => s.endedAt && s.id !== excludeSessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  for (const s of done) {
    const entry = s.entries.find((e) => e.exerciseId === exerciseId && e.equipment === equipment)
    const sets = entry?.sets.filter((x) => x.done) ?? []
    if (sets.length) return { date: s.startedAt, sets }
  }
  return undefined
}

/** Pas d'augmentation selon le matériel : barre, machine et poulie = pas « barre » (2,5 kg) ; haltères = 1 kg. */
export function incrementFor(equipment: Equipment, settings: Pick<Settings, 'incrementBarbellKg' | 'incrementDumbbellKg'>): number | null {
  if (equipment === 'halteres') return settings.incrementDumbbellKg
  if (equipment === 'barre' || equipment === 'machine' || equipment === 'poulie') return settings.incrementBarbellKg
  return null // poids du corps, autre : pas de charge à augmenter
}

export const DURATION_STEP_SEC = 5

export type Suggestion =
  | { kind: 'weight'; weightKg: number; increment: number }
  | { kind: 'duration'; durationSec: number; increment: number }
  | { kind: 'bodyweight' } // haut de fourchette atteint, mais rien à charger

/**
 * Suggestion de progression : si toutes les séries de la fois précédente ont atteint
 * le haut de la fourchette (reps, ou durée pour un exercice chronométré).
 */
export function suggestProgression(
  previous: Previous | undefined,
  target: SessionEntry['target'],
  equipment: Equipment,
  settings: Pick<Settings, 'incrementBarbellKg' | 'incrementDumbbellKg'>,
  assisted = false,
): Suggestion | null {
  if (!previous || !target || previous.sets.length === 0) return null
  if (target.isTimed) {
    const ok = previous.sets.every((s) => (s.durationSec ?? 0) >= target.repsMax)
    if (!ok) return null
    const best = Math.max(...previous.sets.map((s) => s.durationSec ?? 0))
    return { kind: 'duration', durationSec: best + DURATION_STEP_SEC, increment: DURATION_STEP_SEC }
  }
  if (!previous.sets.every((s) => s.reps >= target.repsMax)) return null
  const inc = incrementFor(equipment, settings)
  if (inc === null) return { kind: 'bodyweight' }
  if (assisted) {
    // Machine d'assistance : on progresse en retirant de l'aide, à partir de l'aide la plus faible.
    const lightest = Math.min(...previous.sets.map((s) => s.weightKg))
    if (lightest <= 0) return { kind: 'bodyweight' }
    const next = roundKg(Math.max(0, lightest - inc))
    return { kind: 'weight', weightKg: next, increment: roundKg(next - lightest) }
  }
  const heaviest = Math.max(...previous.sets.map((s) => s.weightKg))
  return { kind: 'weight', weightKg: roundKg(heaviest + inc), increment: inc }
}

export function roundKg(n: number): number {
  return Math.round(n * 100) / 100
}

/** Séries pré-remplies avec les valeurs de la fois précédente. */
export function prefillSets(count: number, target: SessionEntry['target'], previous?: Previous): SessionSet[] {
  return Array.from({ length: count }, (_, i) => {
    const p = previous?.sets[Math.min(i, previous.sets.length - 1)]
    if (target?.isTimed) {
      return { weightKg: p?.weightKg ?? 0, reps: 0, durationSec: p?.durationSec ?? target.repsMin, done: false }
    }
    return { weightKg: p?.weightKg ?? 0, reps: p?.reps ?? target?.repsMin ?? 10, done: false }
  })
}

export function targetFromLine(
  line: Pick<TemplateExercise, 'repsMin' | 'repsMax' | 'restSeconds' | 'isTimed' | 'perSide' | 'alternativeIds'>,
): EntryTarget {
  return {
    repsMin: line.repsMin,
    repsMax: line.repsMax,
    restSeconds: line.restSeconds,
    ...(line.isTimed ? { isTimed: true } : {}),
    ...(line.perSide ? { perSide: true } : {}),
    ...(line.alternativeIds?.length ? { alternativeIds: [...line.alternativeIds] } : {}),
  }
}

/** Crée une entrée de séance pour un exercice, avec le matériel par défaut et les valeurs précédentes. */
export function buildEntry(
  exercise: Pick<Exercise, 'id' | 'equipment'>,
  line: Pick<TemplateExercise, 'sets' | 'repsMin' | 'repsMax' | 'restSeconds' | 'isTimed' | 'perSide' | 'alternativeIds'>,
  history: WorkoutSession[],
): SessionEntry {
  const equipment = defaultEquipment(exercise.equipment)
  const target = targetFromLine(line)
  return { exerciseId: exercise.id, equipment, target, sets: prefillSets(line.sets, target, findPrevious(history, exercise.id, equipment)) }
}

export function buildSessionFromTemplate(
  template: WorkoutTemplate,
  exercises: Exercise[],
  history: WorkoutSession[],
  id: string,
  now: string,
): WorkoutSession {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  return {
    id,
    templateId: template.id,
    templateName: template.name,
    startedAt: now,
    entries: template.exercises.flatMap((line) => {
      const ex = byId.get(line.exerciseId)
      return ex ? [buildEntry(ex, line, history)] : []
    }),
  }
}

/** Change le matériel d'une entrée : les séries non validées sont pré-remplies avec l'historique de ce matériel. */
export function changeEquipment(entry: SessionEntry, equipment: Equipment, history: WorkoutSession[], sessionId: string): SessionEntry {
  const previous = findPrevious(history, entry.exerciseId, equipment, sessionId)
  const fresh = prefillSets(entry.sets.length, entry.target, previous)
  return { ...entry, equipment, sets: entry.sets.map((s, i) => (s.done ? s : fresh[i])) }
}

/** Prochaine séance du programme : celle qui suit la dernière séance terminée du programme. */
export function nextTemplateId(program: Program | undefined, sessions: WorkoutSession[]): string | undefined {
  if (!program || program.templateIds.length === 0) return undefined
  const last = sessions
    .filter((s) => s.endedAt && s.templateId && program.templateIds.includes(s.templateId))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  if (!last) return program.templateIds[0]
  const i = program.templateIds.indexOf(last.templateId!)
  return program.templateIds[(i + 1) % program.templateIds.length]
}

/** Volume d'une entrée : charge × répétitions des séries validées ; × 2 pour un exercice « par bras » (les deux bras travaillent). */
export function entryVolume(e: SessionEntry): number {
  if (e.target?.isTimed) return 0
  const v = e.sets.filter((x) => x.done).reduce((a, x) => a + x.weightKg * x.reps, 0)
  return roundKg(e.target?.perSide ? v * 2 : v)
}

/** Volume = somme des volumes des exercices (hors exercices chronométrés). */
export function sessionVolume(s: WorkoutSession): number {
  return roundKg(s.entries.reduce((sum, e) => sum + entryVolume(e), 0))
}

export function durationMinutes(s: WorkoutSession): number {
  if (!s.endedAt) return 0
  return Math.max(0, Math.round((Date.parse(s.endedAt) - Date.parse(s.startedAt)) / 60000))
}

export interface RecordBeaten {
  exerciseId: string
  equipment: Equipment
  weightKg: number
  previousKg: number
}

/** Records de charge battus pendant cette séance (par exercice + matériel), par rapport aux séances précédentes. */
export function recordsBeaten(
  session: WorkoutSession,
  history: WorkoutSession[],
  isAssisted: (exerciseId: string) => boolean = () => false,
): RecordBeaten[] {
  const out: RecordBeaten[] = []
  for (const e of session.entries) {
    if (e.target?.isTimed) continue
    const done = e.sets.filter((x) => x.done && x.reps > 0)
    if (!done.length) continue
    const assisted = isAssisted(e.exerciseId)
    const pick = (l: number[]) => (assisted ? Math.min(...l) : Math.max(...l))
    const best = pick(done.map((x) => x.weightKg))
    const before = history
      .filter((s) => s.endedAt && s.id !== session.id && s.startedAt < session.startedAt)
      .flatMap((s) => s.entries.filter((x) => x.exerciseId === e.exerciseId && x.equipment === e.equipment))
      .flatMap((x) => x.sets.filter((y) => y.done && y.reps > 0).map((y) => y.weightKg))
    if (!before.length) continue // première fois : pas un record « battu »
    const previousKg = pick(before)
    if (assisted ? best < previousKg : best > previousKg) out.push({ exerciseId: e.exerciseId, equipment: e.equipment, weightKg: best, previousKg })
  }
  return out
}

/** À la fin : on ne garde que les séries validées et les exercices où au moins une série a été faite. */
export function finalizeSession(s: WorkoutSession, now: string): WorkoutSession {
  return {
    ...s,
    endedAt: now,
    entries: s.entries.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })).filter((e) => e.sets.length > 0),
  }
}

/** Premier exercice qui a encore une série à faire (pour reprendre une séance). */
export function firstUnfinishedIndex(s: WorkoutSession): number {
  const i = s.entries.findIndex((e) => e.sets.some((x) => !x.done))
  return i === -1 ? Math.max(0, s.entries.length - 1) : i
}

/** Nombre de séances terminées depuis lundi (semaine en cours, heure locale). */
export function sessionsThisWeek(sessions: WorkoutSession[], now: Date): number {
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return sessions.filter((s) => s.endedAt && new Date(s.startedAt) >= monday).length
}

/** « 62.5 » → « 62,5 ». */
export function formatKg(n: number): string {
  return String(roundKg(n)).replace('.', ',')
}

/**
 * Valide (ou dé-valide) la série i. À la validation, les séries suivantes encore vides
 * (0 kg, typiquement la première fois) reprennent la charge et les répétitions de cette série.
 */
export function validateSet(sets: SessionSet[], i: number, done: boolean): SessionSet[] {
  const cur = { ...sets[i], done }
  return sets.map((s, j) => {
    if (j === i) return cur
    if (done && j > i && !s.done && s.weightKg === 0 && cur.weightKg > 0) {
      return { ...s, weightKg: cur.weightKg, reps: cur.reps, ...(cur.durationSec !== undefined ? { durationSec: cur.durationSec } : {}) }
    }
    return s
  })
}

/**
 * Remplace l'exercice d'indice `index` pendant la séance.
 * Le remplaçant garde l'objectif (séries restantes, fourchette, repos, durée) mais pas « par bras » ;
 * l'exercice d'origine devient un remplacement proposé (pour revenir en arrière).
 * Les séries déjà faites restent enregistrées sur l'exercice d'origine.
 */
export function replaceEntry(
  entries: SessionEntry[],
  index: number,
  ex: Pick<Exercise, 'id' | 'equipment'>,
  history: WorkoutSession[],
  defaultRestSeconds: number,
): { entries: SessionEntry[]; index: number } {
  const entry = entries[index]
  if (!entry) return { entries, index }
  const doneSets = entry.sets.filter((s) => s.done)
  const remaining = Math.max(1, entry.sets.length - doneSets.length)
  const base = entry.target ?? { repsMin: 10, repsMax: 12, restSeconds: defaultRestSeconds }
  const alternativeIds = [entry.exerciseId, ...(entry.target?.alternativeIds ?? [])].filter((id, i, a) => id !== ex.id && a.indexOf(id) === i)
  const built = buildEntry(ex, { ...base, perSide: false, alternativeIds, sets: remaining }, history)
  const before = entries.slice(0, index)
  const after = entries.slice(index + 1)
  return doneSets.length
    ? { entries: [...before, { ...entry, sets: doneSets }, built, ...after], index: index + 1 }
    : { entries: [...before, built, ...after], index }
}
