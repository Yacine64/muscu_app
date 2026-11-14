import { describe, expect, it } from 'vitest'
import { buildSeed } from '../db/seed'
import type { Exercise } from '../db/types'
import { applyDetail, EXERCISE_DETAILS, findDetail, lines, resolveMediaUrl } from './exerciseDetails'
import { parseExerciseImport } from './importExercises'

const seed = buildSeed(() => 'id')
// Liste des images présentes dans public/ (fonction de Vite, aucun fichier n'est chargé).
const images = import.meta.glob('../../public/media/exercises/*/*.jpg')

describe('fiches des exercices', () => {
  it('chaque exercice de départ a ses consignes, ses points de vigilance et ses 2 photos (sauf le SkiErg, sans photo)', () => {
    for (const e of seed.exercises) {
      if (e.name === 'SkiErg') {
        expect(e.warnings?.length).toBeGreaterThan(0)
        expect(e.mediaUrl).toBeUndefined()
        continue
      }
      expect(lines(e.instructions).length, e.name).toBeGreaterThan(0)
      expect(e.warnings?.length, e.name).toBeGreaterThan(0)
      expect(e.mediaUrl, e.name).toMatch(/^media\/exercises\/[^/]+\/0\.jpg$/)
      expect(e.mediaEndUrl, e.name).toMatch(/^media\/exercises\/[^/]+\/1\.jpg$/)
      expect(e.mediaSource, e.name).toContain('free-exercise-db')
    }
  })

  it('chaque fiche correspond à un exercice et chaque image existe dans public/', () => {
    for (const d of EXERCISE_DETAILS) {
      expect(seed.exercises.some((e) => findDetail(e.name) === d), d.name).toBe(true)
      if (!d.mediaUrl) continue
      expect(Object.keys(images), d.mediaUrl).toContain(`../../public/${d.mediaUrl}`)
      expect(Object.keys(images), d.mediaEndUrl).toContain(`../../public/${d.mediaEndUrl}`)
    }
  })

  it('retrouve une fiche malgré la précision entre parenthèses', () => {
    expect(findDetail('Gainage (planche)')?.name).toBe('Gainage')
    expect(findDetail('Vélo / rameur (échauffement)')?.name).toBe('Vélo / rameur')
    expect(findDetail('DEVELOPPE COUCHE')?.name).toBe('Développé couché')
    expect(findDetail('Squat bulgare')).toBeUndefined()
  })

  it('ne remplace pas ce qui a déjà été saisi', () => {
    const ex: Exercise = {
      id: '1', name: 'Pompes', primaryMuscle: 'Pectoraux', secondaryMuscles: [], equipment: ['poids_du_corps'],
      isCustom: false, archived: false, instructions: 'Ma consigne', mediaUrl: 'https://exemple.fr/moi.gif', mediaType: 'gif',
    }
    const out = applyDetail(ex, findDetail('Pompes'))
    expect(out.instructions).toBe('Ma consigne')
    expect(out.mediaUrl).toBe('https://exemple.fr/moi.gif')
    expect(out.mediaSource).toBeUndefined()
    expect(out.mediaEndUrl).toBeUndefined() // photo perso : pas de photo de fin d'une autre source
    expect(out.warnings).toEqual(findDetail('Pompes')!.warnings) // champ vide : rempli
  })

  it('met à jour l’ancien emplacement d’image (v3) et ajoute la photo de fin', () => {
    const d = findDetail('Gainage (planche)')!
    const ex: Exercise = {
      id: '1', name: 'Gainage (planche)', primaryMuscle: 'Abdominaux', secondaryMuscles: [], equipment: ['poids_du_corps'],
      isCustom: false, archived: false, mediaUrl: 'media/exercises/Plank.jpg', mediaType: 'image', instructions: 'déjà là', warnings: ['déjà là'],
    }
    const out = applyDetail(ex, d)
    expect(out.mediaUrl).toBe('media/exercises/Plank/0.jpg')
    expect(out.mediaEndUrl).toBe('media/exercises/Plank/1.jpg')
    expect(out.warnings).toEqual(['déjà là'])
  })

  it('résout l’adresse des images selon l’adresse de l’app', () => {
    expect(resolveMediaUrl('media/exercises/Plank.jpg', '/muscu_app/')).toBe('/muscu_app/media/exercises/Plank.jpg')
    expect(resolveMediaUrl('media/a.jpg', '/')).toBe('/media/a.jpg')
    expect(resolveMediaUrl('https://x.org/a.gif', '/muscu_app/')).toBe('https://x.org/a.gif')
  })
})

describe('import JSON avec consignes et points de vigilance', () => {
  it('accepte des listes (format du fichier fourni) ou du texte', () => {
    const r = parseExerciseImport(
      JSON.stringify([
        { name: 'Hip thrust', instructions: ['Étape 1', ' Étape 2 '], warnings: ['Attention 1', ''], mediaSource: 'Moi', mediaUrl: 'a/0.jpg', mediaEndUrl: 'a/1.jpg' },
        { name: 'Soulevé de terre', instructions: 'A\nB', warnings: 'Dos droit' },
      ]),
      [],
      () => 'x',
    )
    expect(r.toAdd[0]).toMatchObject({ instructions: 'Étape 1\nÉtape 2', warnings: ['Attention 1'], mediaSource: 'Moi', mediaEndUrl: 'a/1.jpg' })
    expect(r.toAdd[1]).toMatchObject({ instructions: 'A\nB', warnings: ['Dos droit'] })
  })
})
