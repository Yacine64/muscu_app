import { describe, expect, it } from 'vitest'
import { buildSeed } from '../db/seed'
import type { Exercise } from '../db/types'
import { defaultEquipment } from './equipment'
import { allMuscles, filterExercises } from './exerciseFilter'
import { parseExerciseImport } from './importExercises'
import { normalize } from './text'

let n = 0
const fakeId = () => `id-${++n}`
const seed = buildSeed(fakeId)
const names = (list: Exercise[]) => list.map((e) => e.name).sort()

describe('données de départ', () => {
  it('contient 31 exercices et 3 séances', () => {
    expect(seed.exercises).toHaveLength(31)
    expect(seed.templates.map((t) => t.exercises.length)).toEqual([6, 6, 6])
    expect(seed.programs[0].templateIds).toEqual(seed.templates.map((t) => t.id))
  })

  it('le gainage est chronométré (30–45 s, repos 45 s)', () => {
    const gainage = seed.exercises.find((e) => e.name === 'Gainage (planche)')!
    const line = seed.templates[2].exercises.find((x) => x.exerciseId === gainage.id)!
    expect(line).toMatchObject({ sets: 3, repsMin: 30, repsMax: 45, restSeconds: 45, isTimed: true })
  })

  it('la séance C contient « Dips assistés » et pas les pompes', () => {
    const ids = seed.templates[2].exercises.map((x) => x.exerciseId)
    const cNames = seed.exercises.filter((e) => ids.includes(e.id)).map((e) => e.name)
    expect(cNames).toContain('Dips assistés')
    expect(cNames).not.toContain('Pompes')
  })
})

describe('recherche et filtres', () => {
  it('« Dos + Poulie » donne les 2 tirages verticaux et le rowing assis', () => {
    expect(names(filterExercises(seed.exercises, { muscle: 'Dos', equipment: 'poulie' }))).toEqual([
      'Rowing assis à la poulie',
      'Tirage vertical prise large',
      'Tirage vertical prise serrée',
    ])
  })

  it('la recherche ignore les accents et la casse', () => {
    expect(names(filterExercises(seed.exercises, { query: 'ECARTES' }))).toEqual(['Écartés à la poulie'])
    expect(names(filterExercises(seed.exercises, { query: 'eleva' }))).toEqual(['Élévations latérales'])
    expect(names(filterExercises(seed.exercises, { query: 'tirage LARGE' }))).toEqual(['Tirage vertical prise large'])
  })

  it('le filtre muscle inclut les muscles secondaires', () => {
    const triceps = names(filterExercises(seed.exercises, { muscle: 'Triceps' }))
    expect(triceps).toContain('Extensions triceps à la poulie') // principal
    expect(triceps).toContain('Développé couché') // secondaire
  })

  it('un exercice à matériel multiple apparaît pour chacun de ses matériels', () => {
    expect(names(filterExercises(seed.exercises, { equipment: 'barre' }))).toEqual([
      'Développé couché',
      'Développé incliné',
    ])
  })

  it('les exercices archivés sont masqués par défaut', () => {
    const list = seed.exercises.map((e) => (e.name === 'Pompes' ? { ...e, archived: true } : e))
    expect(names(filterExercises(list, {}))).not.toContain('Pompes')
    expect(names(filterExercises(list, { showArchived: true }))).toContain('Pompes')
  })

  it('liste les muscles sans doublon', () => {
    const muscles = allMuscles(seed.exercises)
    expect(new Set(muscles).size).toBe(muscles.length)
    expect(muscles).toContain('Dos')
  })
})

describe('matériel par défaut', () => {
  it('choisit la machine si possible, sinon le premier', () => {
    expect(defaultEquipment(['barre', 'machine'])).toBe('machine')
    expect(defaultEquipment(['machine', 'halteres'])).toBe('machine')
    expect(defaultEquipment(['halteres'])).toBe('halteres')
  })
})

describe('import d’exercices JSON', () => {
  it('ajoute les nouveaux et ignore les doublons (accents et casse ignorés)', () => {
    const json = JSON.stringify([
      { name: 'developpe couche', primaryMuscle: 'Pectoraux', equipment: ['barre'] },
      { name: 'Soulevé de terre', primaryMuscle: 'Dos', secondaryMuscles: ['Ischios'], equipment: ['barre', 'xyz'], mediaUrl: 'https://x/y.gif', mediaType: 'gif' },
      { name: 'Soulevé de terre' },
    ])
    const r = parseExerciseImport(json, seed.exercises, fakeId)
    expect(r.errors).toEqual([])
    expect(r.duplicates).toEqual(['developpe couche', 'Soulevé de terre'])
    expect(r.toAdd).toHaveLength(1)
    expect(r.toAdd[0]).toMatchObject({
      name: 'Soulevé de terre',
      equipment: ['barre'],
      secondaryMuscles: ['Ischios'],
      mediaUrl: 'https://x/y.gif',
      mediaType: 'gif',
      isCustom: true,
      archived: false,
    })
  })

  it('accepte le format { exercises: [...] } et complète les champs manquants', () => {
    const r = parseExerciseImport('{"exercises":[{"name":"Hip thrust"}]}', [], fakeId)
    expect(r.toAdd[0]).toMatchObject({ name: 'Hip thrust', primaryMuscle: 'Autre', equipment: ['autre'], secondaryMuscles: [] })
  })

  it('signale un fichier invalide ou un nom manquant', () => {
    expect(parseExerciseImport('pas du json', [], fakeId).errors).toHaveLength(1)
    expect(parseExerciseImport('{"a":1}', [], fakeId).errors).toHaveLength(1)
    expect(parseExerciseImport('[{"primaryMuscle":"Dos"}]', [], fakeId).errors).toEqual(['Élément 1 : nom manquant.'])
  })
})

it('normalize', () => {
  expect(normalize('  Élévations Latérales ')).toBe('elevations laterales')
})
