import { describe, expect, it } from 'vitest'
import type { SessionEntry, WorkoutSession } from '../db/types'
import { DEFAULT_SETTINGS } from '../db/seed'
import {
  buildEntry,
  changeEquipment,
  finalizeSession,
  findPrevious,
  firstUnfinishedIndex,
  formatKg,
  nextTemplateId,
  prefillSets,
  recordsBeaten,
  sessionVolume,
  sessionsThisWeek,
  suggestProgression,
  validateSet,
} from './session'
import { adjustTimer, formatClock, remainingSec, startTimer } from './timer'

const S = DEFAULT_SETTINGS
const set = (weightKg: number, reps: number, done = true) => ({ weightKg, reps, done })
const timed = (durationSec: number, done = true) => ({ weightKg: 0, reps: 0, durationSec, done })
const target = { repsMin: 8, repsMax: 10, restSeconds: 120 }

function session(id: string, startedAt: string, entries: SessionEntry[], ended = true): WorkoutSession {
  return { id, startedAt, ...(ended ? { endedAt: startedAt } : {}), entries }
}

describe('suggestion d’augmentation de charge', () => {
  const prev = (sets: ReturnType<typeof set>[]) => ({ date: '2026-11-01', sets })

  it('toutes les séries au haut de la fourchette → +2,5 kg à la barre et à la machine', () => {
    const p = prev([set(60, 10), set(60, 10), set(60, 11)])
    expect(suggestProgression(p, target, 'barre', S)).toEqual({ kind: 'weight', weightKg: 62.5, increment: 2.5 })
    expect(suggestProgression(p, target, 'machine', S)).toEqual({ kind: 'weight', weightKg: 62.5, increment: 2.5 })
  })

  it('→ +1 kg aux haltères', () => {
    expect(suggestProgression(prev([set(14, 12), set(14, 12)]), { ...target, repsMax: 12 }, 'halteres', S)).toEqual({
      kind: 'weight',
      weightKg: 15,
      increment: 1,
    })
  })

  it('→ +2,5 kg à la poulie (traitée comme une machine)', () => {
    expect(suggestProgression(prev([set(40, 10)]), target, 'poulie', S)).toMatchObject({ weightKg: 42.5 })
  })

  it('part de la charge la plus lourde de la fois précédente', () => {
    expect(suggestProgression(prev([set(60, 10), set(57.5, 10)]), target, 'barre', S)).toMatchObject({ weightKg: 62.5 })
  })

  it('pas de suggestion si une seule série est sous le haut de la fourchette', () => {
    expect(suggestProgression(prev([set(60, 10), set(60, 9), set(60, 10)]), target, 'barre', S)).toBeNull()
  })

  it('pas de suggestion sans historique ou sans objectif', () => {
    expect(suggestProgression(undefined, target, 'barre', S)).toBeNull()
    expect(suggestProgression(prev([set(60, 10)]), undefined, 'barre', S)).toBeNull()
  })

  it('utilise les pas réglés dans les réglages', () => {
    expect(suggestProgression(prev([set(60, 10)]), target, 'barre', { incrementBarbellKg: 5, incrementDumbbellKg: 2 })).toMatchObject({
      weightKg: 65,
    })
  })

  it('poids du corps : signale le haut de fourchette sans charge', () => {
    expect(suggestProgression(prev([set(0, 12)]), { ...target, repsMax: 12 }, 'poids_du_corps', S)).toEqual({ kind: 'bodyweight' })
  })

  it('exercice chronométré : +5 s si toutes les séries atteignent la durée max', () => {
    const t = { repsMin: 30, repsMax: 45, restSeconds: 45, isTimed: true }
    expect(suggestProgression({ date: 'x', sets: [timed(45), timed(45), timed(47)] }, t, 'poids_du_corps', S)).toEqual({
      kind: 'duration',
      durationSec: 52,
      increment: 5,
    })
    expect(suggestProgression({ date: 'x', sets: [timed(45), timed(40)] }, t, 'poids_du_corps', S)).toBeNull()
  })
})

describe('valeurs précédentes', () => {
  const history = [
    session('s1', '2026-11-01T10:00:00Z', [{ exerciseId: 'dc', equipment: 'machine', sets: [set(50, 10), set(50, 8, false)] }]),
    session('s2', '2026-11-03T10:00:00Z', [{ exerciseId: 'dc', equipment: 'barre', sets: [set(60, 8)] }]),
    session('s3', '2026-11-05T10:00:00Z', [{ exerciseId: 'dc', equipment: 'machine', sets: [set(55, 9)] }], false), // en cours
  ]

  it('prend la dernière séance terminée avec le même matériel, séries validées seulement', () => {
    expect(findPrevious(history, 'dc', 'machine')).toEqual({ date: '2026-11-01T10:00:00Z', sets: [set(50, 10)] })
    expect(findPrevious(history, 'dc', 'barre')?.sets).toEqual([set(60, 8)])
    expect(findPrevious(history, 'dc', 'halteres')).toBeUndefined()
  })

  it('pré-remplit les séries (la dernière valeur est répétée si besoin)', () => {
    expect(prefillSets(3, target, { date: 'x', sets: [set(60, 10), set(57.5, 9)] })).toEqual([
      set(60, 10, false),
      set(57.5, 9, false),
      set(57.5, 9, false),
    ])
    expect(prefillSets(1, target)).toEqual([set(0, 8, false)])
    expect(prefillSets(1, { repsMin: 30, repsMax: 45, restSeconds: 45, isTimed: true })).toEqual([timed(30, false)])
  })

  it('matériel par défaut = machine, puis changement vers la barre', () => {
    const e = buildEntry({ id: 'dc', equipment: ['barre', 'machine'] }, { sets: 2, ...target }, history)
    expect(e.equipment).toBe('machine')
    expect(e.sets).toEqual([set(50, 10, false), set(50, 10, false)])
    const done = { ...e, sets: [set(50, 10), e.sets[1]] }
    const c = changeEquipment(done, 'barre', history, 'cur')
    expect(c.equipment).toBe('barre')
    expect(c.sets).toEqual([set(50, 10), set(60, 8, false)]) // la série validée ne bouge pas
  })
})

describe('programme', () => {
  const program = { id: 'p', name: 'P', isActive: true, templateIds: ['A', 'B', 'C'] }
  const s = (templateId: string, d: string, ended = true): WorkoutSession => ({ ...session(templateId + d, d, [], ended), templateId })

  it('propose la séance suivante, en boucle', () => {
    expect(nextTemplateId(program, [])).toBe('A')
    expect(nextTemplateId(program, [s('A', '2026-11-01'), s('B', '2026-11-03')])).toBe('C')
    expect(nextTemplateId(program, [s('C', '2026-11-05'), s('B', '2026-11-03')])).toBe('A')
    expect(nextTemplateId(program, [s('A', '2026-11-01'), s('B', '2026-11-09', false)])).toBe('B')
  })

  it('compte les séances de la semaine (depuis lundi)', () => {
    const now = new Date(2026, 10, 12, 18) // jeudi 12 novembre 2026
    const list = [s('A', new Date(2026, 10, 9, 8).toISOString()), s('B', new Date(2026, 10, 8, 8).toISOString())]
    expect(sessionsThisWeek(list, now)).toBe(1)
  })
})

describe('fin de séance', () => {
  const history = [session('old', '2026-11-01T10:00:00Z', [{ exerciseId: 'dc', equipment: 'barre', sets: [set(60, 10)] }])]
  const cur = session('cur', '2026-11-08T10:00:00Z', [
    { exerciseId: 'dc', equipment: 'barre', target, sets: [set(62.5, 8), set(62.5, 6, false)] },
    { exerciseId: 'el', equipment: 'halteres', target, sets: [set(8, 12)] },
    { exerciseId: 'g', equipment: 'poids_du_corps', target: { ...target, isTimed: true }, sets: [timed(40)] },
    { exerciseId: 'x', equipment: 'machine', target, sets: [set(10, 10, false)] },
  ])

  it('calcule le volume (séries validées, hors chrono)', () => {
    expect(sessionVolume(cur)).toBe(62.5 * 8 + 8 * 12)
  })

  it('détecte les records battus (pas la première fois)', () => {
    expect(recordsBeaten(cur, history)).toEqual([{ exerciseId: 'dc', equipment: 'barre', weightKg: 62.5, previousKg: 60 }])
  })

  it('ne garde que les séries validées', () => {
    const f = finalizeSession(cur, '2026-11-08T11:00:00Z')
    expect(f.endedAt).toBe('2026-11-08T11:00:00Z')
    expect(f.entries.map((e) => [e.exerciseId, e.sets.length])).toEqual([
      ['dc', 1],
      ['el', 1],
      ['g', 1],
    ])
  })

  it('reprend au premier exercice non fini', () => {
    expect(firstUnfinishedIndex(cur)).toBe(0)
    expect(firstUnfinishedIndex({ ...cur, entries: cur.entries.slice(1) })).toBe(2)
  })

  it('affiche les kg avec une virgule', () => {
    expect(formatKg(62.5)).toBe('62,5')
  })
})

describe('minuteur', () => {
  it('décompte, +15 / −15 s sans passer sous zéro', () => {
    const t = startTimer(90, 0)
    expect(remainingSec(t, 0)).toBe(90)
    expect(remainingSec(t, 30_500)).toBe(60)
    expect(remainingSec(adjustTimer(t, 15, 0), 0)).toBe(105)
    expect(remainingSec(adjustTimer(t, -15, 80_000), 80_000)).toBe(0)
    expect(remainingSec(null, 0)).toBe(0)
    expect(formatClock(83)).toBe('1:23')
  })
})

describe('validation d’une série', () => {
  it('recopie charge et reps dans les séries suivantes encore vides', () => {
    const sets = [set(60, 10, false), set(0, 8, false), set(55, 9, false)]
    expect(validateSet(sets, 0, true)).toEqual([set(60, 10), set(60, 10, false), set(55, 9, false)])
  })
  it('dé-valider ne touche pas aux autres séries', () => {
    const sets = [set(60, 10), set(0, 8, false)]
    expect(validateSet(sets, 0, false)).toEqual([set(60, 10, false), set(0, 8, false)])
  })
})
