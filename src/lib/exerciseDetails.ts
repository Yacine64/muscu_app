import rawDetails from '../data/exerciseDetails.json'
import type { Exercise } from '../db/types'
import { normalize } from './text'

/** Fiche détaillée d'un exercice (consignes, points de vigilance, image), fournie par l'utilisateur. */
export interface ExerciseDetail {
  name: string
  instructions?: string[]
  warnings?: string[]
  mediaUrl?: string
  mediaType?: 'image' | 'gif' | 'video'
  mediaSource?: string
}

export const EXERCISE_DETAILS = rawDetails as ExerciseDetail[]

/** Nom sans la précision entre parenthèses : « Gainage (planche) » → « gainage ». */
function baseName(name: string): string {
  return normalize(name.replace(/\s*\([^)]*\)\s*$/, ''))
}

/** Retrouve la fiche d'un exercice par son nom (accents, casse et parenthèse finale ignorés). */
export function findDetail(exerciseName: string, details: ExerciseDetail[] = EXERCISE_DETAILS): ExerciseDetail | undefined {
  const exact = details.find((d) => normalize(d.name) === normalize(exerciseName))
  return exact ?? details.find((d) => baseName(d.name) === baseName(exerciseName))
}

/**
 * Complète un exercice avec sa fiche. Seuls les champs encore vides sont remplis :
 * une consigne ou une image déjà saisie à la main n'est jamais écrasée.
 */
export function applyDetail(ex: Exercise, d: ExerciseDetail | undefined): Exercise {
  if (!d) return ex
  const out = { ...ex }
  if (!out.instructions?.trim() && d.instructions?.length) out.instructions = d.instructions.join('\n')
  if (!out.warnings?.length && d.warnings?.length) out.warnings = [...d.warnings]
  if (!out.mediaUrl && d.mediaUrl) {
    out.mediaUrl = d.mediaUrl
    out.mediaType = d.mediaType ?? 'image'
    if (d.mediaSource) out.mediaSource = d.mediaSource
  }
  return out
}

/** Les lignes non vides d'un texte (consignes saisies une par ligne). */
export function lines(text: string | undefined): string[] {
  return (text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Adresse d'un média : un lien web reste tel quel ; un fichier de l'app est relatif à son adresse de base. */
export function resolveMediaUrl(url: string, base: string): string {
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  return base.replace(/\/?$/, '/') + url.replace(/^\/+/, '')
}
