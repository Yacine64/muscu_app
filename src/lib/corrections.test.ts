import { describe, expect, it } from 'vitest'
import { buildSeed } from '../db/seed'
import type { Exercise, SessionEntry, WorkoutSession, WorkoutTemplate } from '../db/types'
import { filterExercises } from './exerciseFilter'
import { migrateV5 } from './migrations'
import { formatLine } from './programs'
import { exerciseSeries } from './progress'
import { replaceEntry, sessionVolume } from './session'

let n = 0
const id = () => `id-${++n}`
const seed = buildSeed(id)
const ex = (name: string) => seed.exercises.find((e) => e.name === name)!
const names = (t: WorkoutTemplate) => t.exercises.map((l) => seed.exercises.find((e) => e.id === l.exerciseId)!.name)
const [A, B, C] = seed.templates

describe('corrections du 14/11 : données de départ', () => {
  it('les nouveaux exercices sont dans la banque, sans retirer les anciens', () => {
    for (const nm of ['Leg curl assis', 'Hip thrust', 'Leg extension', 'Adducteurs', 'Abducteurs', 'Hyperextensions', 'Tractions assistées', 'Oiseau à la machine', 'Rameur', 'SkiErg', 'Leg curl', 'Développé incliné']) {
      expect(ex(nm), nm).toBeDefined()
    }
    expect(ex('Tractions assistées').assisted).toBe(true)
    expect(ex('Hyperextensions').equipment).toEqual(['poids_du_corps'])
  })

  it('« Dos + Poulie » donne toujours les 3 mêmes exercices', () => {
    expect(filterExercises(seed.exercises, { muscle: 'Dos', equipment: 'poulie' }).map((e) => e.name).sort()).toEqual([
      'Rowing assis à la poulie',
      'Tirage vertical prise large',
      'Tirage vertical prise serrée',
    ])
  })

  it('développé couché : barre, machine ou haltères', () => {
    expect(ex('Développé couché').equipment).toEqual(['barre', 'machine', 'halteres'])
  })

  it('séance B : leg curl assis à la place du leg curl, mêmes réglages', () => {
    expect(names(B)).toContain('Leg curl assis')
    expect(names(B)).not.toContain('Leg curl')
    expect(B.exercises[names(B).indexOf('Leg curl assis')]).toMatchObject({ sets: 2, repsMin: 12, repsMax: 12, restSeconds: 60 })
  })

  it('séance C : développé incliné aux haltères en 4 × 8–10, 2 min', () => {
    expect(names(C)[0]).toBe('Développé incliné aux haltères')
    expect(names(C)).not.toContain('Développé incliné')
    expect(C.exercises[0]).toMatchObject({ sets: 4, repsMin: 8, repsMax: 10, restSeconds: 120 })
    expect(names(A)).toContain('Développé incliné aux haltères') // toujours en A aussi
  })

  it('rowing un bras « par bras » et remplacements proposés', () => {
    const rowing = B.exercises[names(B).indexOf('Rowing un bras avec haltère')]
    expect(rowing.perSide).toBe(true)
    expect(formatLine(rowing)).toBe('3 × 10 / bras')
    expect(C.exercises[names(C).indexOf('Face pull')].alternativeIds).toEqual([ex('Oiseau à la machine').id])
    expect(C.exercises[names(C).indexOf('Dips assistés')].alternativeIds).toEqual([ex('Pompes').id])
  })
})

const done = (weightKg: number, reps: number) => ({ weightKg, reps, done: true })

describe('par bras : volume des deux bras', () => {
  const s: WorkoutSession = {
    id: 's', startedAt: '2026-11-14T10:00:00Z', endedAt: '2026-11-14T11:00:00Z',
    entries: [
      { exerciseId: 'row', equipment: 'halteres', target: { repsMin: 10, repsMax: 10, restSeconds: 60, perSide: true }, sets: [done(20, 10)] },
      { exerciseId: 'curl', equipment: 'halteres', target: { repsMin: 10, repsMax: 12, restSeconds: 60 }, sets: [done(10, 10)] },
    ],
  }
  it('compte le volume × 2, la charge reste celle d’un haltère', () => {
    expect(sessionVolume(s)).toBe(400 + 100)
    const p = exerciseSeries([s], 'row', 'halteres')[0]
    expect(p.volume).toBe(400)
    expect(p.bestKg).toBe(20)
  })
})

describe('remplacement pendant la séance', () => {
  const face = ex('Face pull')
  const oiseau = ex('Oiseau à la machine')
  const entry: SessionEntry = {
    exerciseId: face.id, equipment: 'poulie',
    target: { repsMin: 15, repsMax: 15, restSeconds: 60, alternativeIds: [oiseau.id] },
    sets: [{ weightKg: 20, reps: 15, done: false }, { weightKg: 20, reps: 15, done: false }],
  }

  it('remplace par l’exercice proposé, garde l’objectif et propose de revenir en arrière', () => {
    const r = replaceEntry([entry], 0, oiseau, [], 90)
    expect(r.index).toBe(0)
    expect(r.entries).toHaveLength(1)
    expect(r.entries[0]).toMatchObject({ exerciseId: oiseau.id, equipment: 'machine' })
    expect(r.entries[0].target).toMatchObject({ repsMin: 15, repsMax: 15, restSeconds: 60, alternativeIds: [face.id] })
    expect(r.entries[0].sets).toHaveLength(2)
  })

  it('ne garde pas « par bras » sur le remplaçant', () => {
    const row: SessionEntry = { ...entry, target: { ...entry.target!, perSide: true } }
    expect(replaceEntry([row], 0, oiseau, [], 90).entries[0].target?.perSide).toBeFalsy()
  })

  it('les séries déjà faites restent sur l’exercice d’origine', () => {
    const started = { ...entry, sets: [{ ...entry.sets[0], done: true }, entry.sets[1]] }
    const r = replaceEntry([started], 0, oiseau, [], 90)
    expect(r.entries.map((e) => [e.exerciseId, e.sets.length])).toEqual([
      [face.id, 1],
      [oiseau.id, 1],
    ])
    expect(r.index).toBe(1)
  })
})

describe('mise à jour v5 des données du téléphone', () => {
  // Données « comme avant » : sans les nouveaux exercices, avec l'ancien programme.
  const NEW = ['Leg curl assis', 'Hip thrust', 'Leg extension', 'Adducteurs', 'Abducteurs', 'Hyperextensions', 'Tractions assistées', 'Oiseau à la machine', 'Rameur', 'SkiErg']
  const oldExercises: Exercise[] = seed.exercises
    .filter((e) => !NEW.includes(e.name))
    .map((e) => (e.name === 'Développé couché' ? { ...e, equipment: ['barre', 'machine'] } : e))
  const strip = (t: WorkoutTemplate): WorkoutTemplate => ({
    ...t,
    exercises: t.exercises.map(({ perSide: _p, alternativeIds: _a, ...l }) => l),
  })
  const oldB = strip({ ...B, exercises: B.exercises.map((l) => (l.exerciseId === ex('Leg curl assis').id ? { ...l, exerciseId: ex('Leg curl').id } : l)) })
  const oldC = strip({ ...C, exercises: C.exercises.map((l, i) => (i === 0 ? { ...l, exerciseId: ex('Développé incliné').id } : l)) })
  const custom = strip({ ...C, id: 'perso', name: 'Ma séance', exercises: [{ exerciseId: ex('Développé incliné').id, sets: 3, repsMin: 8, repsMax: 8, restSeconds: 90 }] })
  const pastRow: WorkoutSession = {
    id: 'past', startedAt: '2026-11-10T10:00:00Z', endedAt: '2026-11-10T11:00:00Z',
    entries: [{ exerciseId: ex('Rowing un bras avec haltère').id, equipment: 'halteres', target: { repsMin: 10, repsMax: 10, restSeconds: 60 }, sets: [done(20, 10)] }],
  }

  const r = migrateV5({ exercises: oldExercises, templates: [strip(A), oldB, oldC, custom], sessions: [pastRow] }, seed.exercises, () => `new-${++n}`)
  const all = [...r.exercises, ...r.added]
  const nameOf = (i: string) => all.find((e) => e.id === i)?.name

  it('ajoute les 10 exercices manquants, sans toucher aux autres', () => {
    expect(r.added.map((e) => e.name).sort()).toEqual([...NEW].sort())
    expect(r.exercises).toHaveLength(oldExercises.length)
    expect(r.exercises.find((e) => e.name === 'Développé couché')!.equipment).toEqual(['barre', 'machine', 'halteres'])
  })

  it('met à jour les séances B et C et laisse les autres séances tranquilles', () => {
    const [, b, c, mine] = r.templates
    expect(b.exercises.map((l) => nameOf(l.exerciseId))).toContain('Leg curl assis')
    expect(b.exercises.map((l) => nameOf(l.exerciseId))).not.toContain('Leg curl')
    expect(nameOf(c.exercises[0].exerciseId)).toBe('Développé incliné aux haltères')
    expect(c.exercises[0]).toMatchObject({ sets: 4, repsMin: 8, repsMax: 10, restSeconds: 120 })
    expect(nameOf(mine.exercises[0].exerciseId)).toBe('Développé incliné') // séance perso : inchangée
  })

  it('ajoute « par bras » et les remplacements proposés', () => {
    const [, b, c] = r.templates
    expect(b.exercises.find((l) => nameOf(l.exerciseId) === 'Rowing un bras avec haltère')!.perSide).toBe(true)
    expect(nameOf(c.exercises.find((l) => nameOf(l.exerciseId) === 'Face pull')!.alternativeIds![0])).toBe('Oiseau à la machine')
    expect(nameOf(c.exercises.find((l) => nameOf(l.exerciseId) === 'Dips assistés')!.alternativeIds![0])).toBe('Pompes')
  })

  it('les séances passées de rowing comptent aussi les deux bras', () => {
    expect(r.sessions[0].entries[0].target?.perSide).toBe(true)
    expect(sessionVolume(r.sessions[0])).toBe(400)
  })

  it('ne refait rien si on la relance', () => {
    const again = migrateV5({ exercises: all, templates: r.templates, sessions: r.sessions }, seed.exercises, () => 'x')
    expect(again.added).toEqual([])
    expect(again.templates).toEqual(r.templates)
  })
})
