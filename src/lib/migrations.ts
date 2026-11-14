import type { Exercise, WorkoutSession, WorkoutTemplate } from '../db/types'
import { normalize } from './text'

/**
 * Mise à jour v5 des données déjà présentes sur le téléphone (corrections du 14/11) :
 * - ajoute les exercices de départ qui manquent (comparaison par nom, sans renommer ni supprimer) ;
 * - Développé couché : haltères en plus de barre et machine ;
 * - Séance B : « Leg curl » → « Leg curl assis » ; Séance C : « Développé incliné » → « … aux haltères » ;
 * - Rowing un bras : « par bras » (séances modèles et séances déjà faites, pour le volume) ;
 * - Remplacements proposés : Face pull → Oiseau à la machine ; Dips assistés → Pompes.
 * Les lignes déjà modifiées par l'utilisateur (autre exercice) ne sont pas touchées.
 */
export function migrateV5(
  data: { exercises: Exercise[]; templates: WorkoutTemplate[]; sessions: WorkoutSession[] },
  seedExercises: Exercise[],
  newId: () => string,
) {
  const key = (name: string) => normalize(name)
  const known = new Set(data.exercises.map((e) => key(e.name)))
  const added: Exercise[] = seedExercises.filter((e) => !known.has(key(e.name))).map((e) => ({ ...e, id: newId() }))
  const all = [...data.exercises, ...added]
  // Exercice de départ (non personnalisé) par nom.
  const idOf = (name: string) => all.find((e) => key(e.name) === key(name) && !e.isCustom)?.id ?? all.find((e) => key(e.name) === key(name))?.id

  const exercises = data.exercises.map((e) =>
    !e.isCustom && key(e.name) === key('Développé couché') && !e.equipment.includes('halteres')
      ? { ...e, equipment: [...e.equipment, 'halteres' as const] }
      : e,
  )

  const legCurl = idOf('Leg curl')
  const legCurlAssis = idOf('Leg curl assis')
  const incline = idOf('Développé incliné')
  const inclineDb = idOf('Développé incliné aux haltères')
  const rowing = idOf('Rowing un bras avec haltère')
  const alternatives: [string | undefined, string | undefined][] = [
    [idOf('Face pull'), idOf('Oiseau à la machine')],
    [idOf('Dips assistés'), idOf('Pompes')],
  ]

  const templates = data.templates.map((t) => {
    const isB = key(t.name).startsWith(key('Séance B'))
    const isC = key(t.name).startsWith(key('Séance C'))
    return {
      ...t,
      exercises: t.exercises.map((l) => {
        let line = { ...l }
        if (isB && legCurl && legCurlAssis && line.exerciseId === legCurl) line.exerciseId = legCurlAssis
        if (isC && incline && inclineDb && line.exerciseId === incline) line.exerciseId = inclineDb
        if (rowing && line.exerciseId === rowing && line.perSide === undefined) line.perSide = true
        for (const [from, to] of alternatives) {
          if (from && to && line.exerciseId === from && !line.alternativeIds?.length) line = { ...line, alternativeIds: [to] }
        }
        return line
      }),
    }
  })

  const sessions = data.sessions.map((s) =>
    rowing && s.entries.some((e) => e.exerciseId === rowing && e.target && e.target.perSide === undefined)
      ? {
          ...s,
          entries: s.entries.map((e) =>
            e.exerciseId === rowing && e.target && e.target.perSide === undefined ? { ...e, target: { ...e.target, perSide: true } } : e,
          ),
        }
      : s,
  )

  return { added, exercises, templates, sessions }
}
