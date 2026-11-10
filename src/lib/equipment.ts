import type { Equipment } from '../db/types'

export const EQUIPMENT_LIST: Equipment[] = ['barre', 'halteres', 'machine', 'poulie', 'poids_du_corps', 'autre']

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barre: 'Barre',
  halteres: 'Haltères',
  machine: 'Machine',
  poulie: 'Poulie',
  poids_du_corps: 'Poids du corps',
  autre: 'Autre',
}

export function isEquipment(value: unknown): value is Equipment {
  return typeof value === 'string' && (EQUIPMENT_LIST as string[]).includes(value)
}

/** Matériel proposé par défaut en séance : la machine si elle fait partie des choix, sinon le premier. */
export function defaultEquipment(choices: Equipment[]): Equipment {
  if (choices.includes('machine')) return 'machine'
  return choices[0] ?? 'autre'
}

export function equipmentLabel(list: Equipment[]): string {
  return list.map((e) => EQUIPMENT_LABELS[e]).join(' ou ')
}
