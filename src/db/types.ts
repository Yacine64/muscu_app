// Modèle de données de l'app (voir CLAUDE.md, section « Modèle de données »).

export type Equipment = 'barre' | 'halteres' | 'machine' | 'poulie' | 'poids_du_corps' | 'autre'

export interface Exercise {
  id: string
  name: string
  primaryMuscle: string
  secondaryMuscles: string[]
  equipment: Equipment[]
  instructions?: string // plus tard
  mediaUrl?: string // plus tard : image, GIF ou vidéo
  mediaType?: 'image' | 'gif' | 'video'
  isCustom: boolean
  archived: boolean
}

export interface Program {
  id: string
  name: string
  isActive: boolean
  templateIds: string[] // ordre des séances
}

export interface TemplateExercise {
  exerciseId: string
  sets: number
  repsMin: number // en secondes si isTimed
  repsMax: number // en secondes si isTimed
  restSeconds: number
  isTimed?: boolean // gainage : durée au lieu de répétitions
}

export interface WorkoutTemplate {
  id: string
  name: string
  exercises: TemplateExercise[]
}

export interface SessionSet {
  weightKg: number
  reps: number
  durationSec?: number
  done: boolean
}

/** Objectif copié depuis la séance modèle au démarrage (la séance modèle peut changer ensuite). */
export interface EntryTarget {
  repsMin: number // en secondes si isTimed
  repsMax: number
  restSeconds: number
  isTimed?: boolean
}

export interface SessionEntry {
  exerciseId: string
  // Matériel réellement utilisé (décision utilisateur : historique séparé par matériel).
  equipment: Equipment
  target?: EntryTarget
  sets: SessionSet[]
}

export interface WorkoutSession {
  id: string
  templateId?: string
  templateName?: string // gardé pour l'historique, même si la séance modèle est supprimée
  startedAt: string
  endedAt?: string // vide = séance en cours
  note?: string
  entries: SessionEntry[]
}

export interface BodyWeight {
  id: string
  date: string
  weightKg: number
}

export interface Measurement {
  id: string
  date: string
  type: string
  valueCm: number
}

export interface Settings {
  id: 'settings'
  defaultRestSeconds: number
  incrementBarbellKg: number
  incrementDumbbellKg: number
  measurementTypes: string[]
  lastBackupAt?: string
}
