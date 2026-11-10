import type { BodyWeight, Equipment, Measurement, WorkoutSession } from '../db/types'
import { roundKg } from './session'

/** Jour local au format AAAA-MM-JJ (pour les saisies de poids et de mensurations). */
export function toDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Numéro de jour (sans fuseau) d'une date AAAA-MM-JJ. */
export function dayNumber(day: string): number {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

export interface WeightPoint {
  date: string
  weightKg: number
  avg7: number // moyenne des pesées des 7 derniers jours (jour même inclus)
}

/**
 * Moyenne glissante sur 7 jours : pour chaque pesée, moyenne de toutes les pesées
 * faites ce jour-là et les 6 jours d'avant. Plusieurs pesées le même jour comptent chacune.
 */
export function movingAverage7(entries: BodyWeight[]): WeightPoint[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((e) => {
    const day = dayNumber(e.date)
    const window = sorted.filter((x) => {
      const d = dayNumber(x.date)
      return d <= day && d > day - 7
    })
    const avg = window.reduce((s, x) => s + x.weightKg, 0) / window.length
    return { date: e.date, weightKg: e.weightKg, avg7: Math.round(avg * 10) / 10 }
  })
}

/** Moyenne 7 jours « aujourd'hui » : pesées des 7 derniers jours par rapport à `today`. */
export function currentAverage7(entries: BodyWeight[], today: string): number | null {
  const t = dayNumber(today)
  const window = entries.filter((x) => {
    const d = dayNumber(x.date)
    return d <= t && d > t - 7
  })
  if (!window.length) return null
  return Math.round((window.reduce((s, x) => s + x.weightKg, 0) / window.length) * 10) / 10
}

export function latest<T extends { date: string }>(list: T[]): T | undefined {
  return [...list].sort((a, b) => b.date.localeCompare(a.date))[0]
}

export function measurementSeries(list: Measurement[], type: string): Measurement[] {
  return list.filter((m) => m.type === type).sort((a, b) => a.date.localeCompare(b.date))
}

// ---------- Exercices ----------

export interface ExercisePoint {
  date: string // startedAt de la séance
  sessionId: string
  bestKg: number // charge max (ou charge min pour une machine d'assistance)
  volume: number // somme charge × reps
  bestDurationSec: number // pour les exercices chronométrés
  sets: { weightKg: number; reps: number; durationSec?: number }[]
}

/** Un point par séance terminée où l'exercice a été fait avec ce matériel (du plus ancien au plus récent). */
export function exerciseSeries(sessions: WorkoutSession[], exerciseId: string, equipment: Equipment, assisted = false): ExercisePoint[] {
  return sessions
    .filter((s) => s.endedAt)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .flatMap((s) => {
      const sets = s.entries
        .filter((e) => e.exerciseId === exerciseId && e.equipment === equipment)
        .flatMap((e) => e.sets.filter((x) => x.done))
      if (!sets.length) return []
      const weights = sets.map((x) => x.weightKg)
      return [
        {
          date: s.startedAt,
          sessionId: s.id,
          bestKg: assisted ? Math.min(...weights) : Math.max(...weights),
          volume: roundKg(sets.reduce((a, x) => a + x.weightKg * x.reps, 0)),
          bestDurationSec: Math.max(0, ...sets.map((x) => x.durationSec ?? 0)),
          sets: sets.map(({ weightKg, reps, durationSec }) => ({ weightKg, reps, ...(durationSec !== undefined ? { durationSec } : {}) })),
        },
      ]
    })
}

export interface PersonalRecord {
  weightKg: number
  reps: number
  durationSec?: number
  date: string
}

/**
 * Record personnel : la charge la plus lourde (avec le meilleur nombre de reps à cette charge),
 * ou la plus légère pour une machine d'assistance, ou la plus longue durée si chronométré.
 */
export function personalRecord(points: ExercisePoint[], opts: { assisted?: boolean; timed?: boolean } = {}): PersonalRecord | null {
  let best: PersonalRecord | null = null
  for (const p of points) {
    for (const s of p.sets) {
      if (opts.timed) {
        if (!best || (s.durationSec ?? 0) > (best.durationSec ?? 0)) best = { weightKg: s.weightKg, reps: s.reps, durationSec: s.durationSec ?? 0, date: p.date }
        continue
      }
      if (s.reps <= 0) continue
      const better =
        !best ||
        (opts.assisted ? s.weightKg < best.weightKg : s.weightKg > best.weightKg) ||
        (s.weightKg === best.weightKg && s.reps > best.reps)
      if (better) best = { weightKg: s.weightKg, reps: s.reps, date: p.date }
    }
  }
  return best
}

/** Matériels avec lesquels l'exercice a été fait, du plus fréquent au moins fréquent. */
export function equipmentsUsed(sessions: WorkoutSession[], exerciseId: string): Equipment[] {
  const count = new Map<Equipment, number>()
  for (const s of sessions) {
    if (!s.endedAt) continue
    for (const e of s.entries) if (e.exerciseId === exerciseId && e.sets.some((x) => x.done)) count.set(e.equipment, (count.get(e.equipment) ?? 0) + 1)
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([e]) => e)
}

/** Exercices présents dans l'historique, avec la date de la dernière fois. */
export function exercisesWithHistory(sessions: WorkoutSession[]): { exerciseId: string; lastDate: string; count: number }[] {
  const map = new Map<string, { lastDate: string; count: number }>()
  for (const s of sessions) {
    if (!s.endedAt) continue
    const ids = new Set(s.entries.filter((e) => e.sets.some((x) => x.done)).map((e) => e.exerciseId))
    for (const id of ids) {
      const cur = map.get(id)
      map.set(id, { lastDate: !cur || s.startedAt > cur.lastDate ? s.startedAt : cur.lastDate, count: (cur?.count ?? 0) + 1 })
    }
  }
  return [...map.entries()].map(([exerciseId, v]) => ({ exerciseId, ...v })).sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}
