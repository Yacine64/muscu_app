import { describe, expect, it } from 'vitest'
import type { Program } from '../db/types'
import { activate, duplicateTemplate, formatLine, formatRest, insertAfter, moveItem, sanitizeLine } from './programs'

describe('moveItem', () => {
  it('déplace vers le haut et vers le bas', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })
  it('ignore un déplacement hors limites', () => {
    const l = ['a', 'b']
    expect(moveItem(l, 0, -1)).toBe(l)
    expect(moveItem(l, 1, 2)).toBe(l)
  })
})

describe('duplication', () => {
  it('copie les exercices sans partager les objets', () => {
    const t = { id: 't1', name: 'Séance A', exercises: [{ exerciseId: 'e1', sets: 4, repsMin: 8, repsMax: 10, restSeconds: 120 }] }
    const c = duplicateTemplate(t, 't2')
    expect(c).toEqual({ id: 't2', name: 'Séance A (copie)', exercises: t.exercises })
    c.exercises[0].sets = 1
    expect(t.exercises[0].sets).toBe(4)
  })
  it('insère la copie juste après l’original', () => {
    expect(insertAfter(['a', 'b', 'c'], 'a', 'x')).toEqual(['a', 'x', 'b', 'c'])
    expect(insertAfter(['a'], 'z', 'x')).toEqual(['a', 'x'])
  })
})

it('un seul programme actif', () => {
  const ps: Program[] = [
    { id: '1', name: 'P1', isActive: true, templateIds: [] },
    { id: '2', name: 'P2', isActive: false, templateIds: [] },
  ]
  expect(activate(ps, '2').map((p) => p.isActive)).toEqual([false, true])
})

describe('affichage', () => {
  it('formate le repos', () => {
    expect(formatRest(45)).toBe('45 s')
    expect(formatRest(60)).toBe('1 min')
    expect(formatRest(90)).toBe('1 min 30')
    expect(formatRest(120)).toBe('2 min')
  })
  it('formate séries × reps', () => {
    expect(formatLine({ sets: 4, repsMin: 8, repsMax: 10 })).toBe('4 × 8–10')
    expect(formatLine({ sets: 3, repsMin: 12, repsMax: 12 })).toBe('3 × 12')
    expect(formatLine({ sets: 3, repsMin: 30, repsMax: 45, isTimed: true })).toBe('3 × 30–45 s')
  })
})

it('corrige une saisie incohérente', () => {
  expect(sanitizeLine({ exerciseId: 'e', sets: 0, repsMin: 12, repsMax: 8, restSeconds: -5 })).toEqual({
    exerciseId: 'e',
    sets: 1,
    repsMin: 12,
    repsMax: 12,
    restSeconds: 0,
  })
})
