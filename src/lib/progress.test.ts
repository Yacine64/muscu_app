import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../db/seed'
import type { BodyWeight, WorkoutSession } from '../db/types'
import {
  currentAverage7,
  dayNumber,
  equipmentsUsed,
  exerciseSeries,
  exercisesWithHistory,
  movingAverage7,
  personalRecord,
  toDay,
} from './progress'
import { recordsBeaten, suggestProgression } from './session'

const bw = (date: string, weightKg: number): BodyWeight => ({ id: date + weightKg, date, weightKg })

describe('moyenne sur 7 jours', () => {
  it('fait la moyenne des pesées du jour et des 6 jours précédents', () => {
    const pts = movingAverage7([
      bw('2026-11-01', 80),
      bw('2026-11-03', 79),
      bw('2026-11-07', 78), // fenêtre 01→07 : 80, 79, 78
      bw('2026-11-08', 77), // fenêtre 02→08 : 79, 78, 77 (le 1er sort)
    ])
    expect(pts.map((p) => p.avg7)).toEqual([80, 79.5, 79, 78])
  })

  it('trie les pesées par date et arrondit au dixième', () => {
    const pts = movingAverage7([bw('2026-11-02', 80.4), bw('2026-11-01', 80)])
    expect(pts.map((p) => p.date)).toEqual(['2026-11-01', '2026-11-02'])
    expect(pts[1].avg7).toBe(80.2)
  })

  it('compte chaque pesée quand il y en a deux le même jour', () => {
    expect(movingAverage7([bw('2026-11-01', 80), bw('2026-11-01', 82)]).map((p) => p.avg7)).toEqual([81, 81])
  })

  it('gère le passage d’un mois à l’autre et d’une année à l’autre', () => {
    expect(dayNumber('2026-12-01') - dayNumber('2026-11-30')).toBe(1)
    expect(movingAverage7([bw('2026-12-27', 80), bw('2027-01-02', 78)])[1].avg7).toBe(79)
    expect(movingAverage7([bw('2026-12-26', 80), bw('2027-01-02', 78)])[1].avg7).toBe(78)
  })

  it('moyenne actuelle : pesées des 7 derniers jours, ou rien', () => {
    const l = [bw('2026-11-01', 80), bw('2026-11-05', 79), bw('2026-11-09', 78)]
    expect(currentAverage7(l, '2026-11-10')).toBe(78.5)
    expect(currentAverage7(l, '2026-11-30')).toBeNull()
    expect(currentAverage7([], '2026-11-10')).toBeNull()
  })

  it('toDay donne la date locale', () => {
    expect(toDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

const done = (weightKg: number, reps: number) => ({ weightKg, reps, done: true })
function s(id: string, startedAt: string, entries: WorkoutSession['entries'], ended = true): WorkoutSession {
  return { id, startedAt, ...(ended ? { endedAt: startedAt } : {}), entries }
}
const history = [
  s('3', '2026-11-08T10:00:00Z', [{ exerciseId: 'dc', equipment: 'machine', sets: [done(62.5, 8), done(60, 10)] }]),
  s('1', '2026-11-01T10:00:00Z', [{ exerciseId: 'dc', equipment: 'machine', sets: [done(60, 10), done(60, 9)] }]),
  s('2', '2026-11-04T10:00:00Z', [
    { exerciseId: 'dc', equipment: 'machine', sets: [done(60, 10), done(60, 10)] },
    { exerciseId: 'dc', equipment: 'barre', sets: [done(50, 8)] },
  ]),
  s('x', '2026-11-09T10:00:00Z', [{ exerciseId: 'dc', equipment: 'machine', sets: [done(100, 10)] }], false), // en cours : ignorée
]

describe('progression d’un exercice', () => {
  it('un point par séance terminée, du plus ancien au plus récent, par matériel', () => {
    const pts = exerciseSeries(history, 'dc', 'machine')
    expect(pts.map((p) => [p.sessionId, p.bestKg, p.volume])).toEqual([
      ['1', 60, 1140],
      ['2', 60, 1200],
      ['3', 62.5, 1100],
    ])
    expect(exerciseSeries(history, 'dc', 'barre').map((p) => p.bestKg)).toEqual([50])
  })

  it('record : charge la plus lourde, puis le plus de reps à cette charge', () => {
    expect(personalRecord(exerciseSeries(history, 'dc', 'machine'))).toEqual({ weightKg: 62.5, reps: 8, date: '2026-11-08T10:00:00Z' })
    const tie = [s('a', '2026-11-01', [{ exerciseId: 'e', equipment: 'poulie', sets: [done(40, 10), done(40, 12)] }])]
    expect(personalRecord(exerciseSeries(tie, 'e', 'poulie'))).toMatchObject({ weightKg: 40, reps: 12 })
    expect(personalRecord([])).toBeNull()
  })

  it('record chronométré : la plus longue durée', () => {
    const g = [s('a', '2026-11-01', [{ exerciseId: 'g', equipment: 'poids_du_corps', sets: [{ weightKg: 0, reps: 0, durationSec: 40, done: true }, { weightKg: 0, reps: 0, durationSec: 45, done: true }] }])]
    expect(personalRecord(exerciseSeries(g, 'g', 'poids_du_corps'), { timed: true })).toMatchObject({ durationSec: 45 })
  })

  it('liste les matériels utilisés et les exercices avec historique', () => {
    expect(equipmentsUsed(history, 'dc')).toEqual(['machine', 'barre'])
    expect(exercisesWithHistory(history)).toEqual([{ exerciseId: 'dc', lastDate: '2026-11-08T10:00:00Z', count: 3 }])
  })
})

describe('machine d’assistance (dips assistés)', () => {
  const target = { repsMin: 10, repsMax: 12, restSeconds: 90 }
  it('suggère de retirer de l’assistance quand tout est réussi', () => {
    const prev = { date: 'x', sets: [done(30, 12), done(27.5, 12)] }
    expect(suggestProgression(prev, target, 'machine', DEFAULT_SETTINGS, true)).toEqual({ kind: 'weight', weightKg: 25, increment: -2.5 })
  })
  it('sans assistance restante : plus de charge à retirer', () => {
    expect(suggestProgression({ date: 'x', sets: [done(0, 12)] }, target, 'machine', DEFAULT_SETTINGS, true)).toEqual({ kind: 'bodyweight' })
    expect(suggestProgression({ date: 'x', sets: [done(1, 12)] }, target, 'machine', DEFAULT_SETTINGS, true)).toMatchObject({ weightKg: 0, increment: -1 })
  })
  it('record = moins d’assistance', () => {
    const old = [s('o', '2026-11-01T10:00:00Z', [{ exerciseId: 'dips', equipment: 'machine', sets: [done(30, 10)] }])]
    const cur = s('c', '2026-11-08T10:00:00Z', [{ exerciseId: 'dips', equipment: 'machine', sets: [done(27.5, 10), done(35, 12)] }])
    expect(recordsBeaten(cur, old, (id) => id === 'dips')).toEqual([{ exerciseId: 'dips', equipment: 'machine', weightKg: 27.5, previousKg: 30 }])
    expect(recordsBeaten(cur, old)).toEqual([{ exerciseId: 'dips', equipment: 'machine', weightKg: 35, previousKg: 30 }])
    expect(personalRecord(exerciseSeries([...old, cur], 'dips', 'machine', true), { assisted: true })).toMatchObject({ weightKg: 27.5 })
  })
})
