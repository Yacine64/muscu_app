/** Logique du minuteur de repos, basée sur une heure de fin (résiste à la fermeture de l'app). */

export interface TimerState {
  endAt: number // ms
  totalSec: number
}

export function remainingSec(t: TimerState | null, now: number): number {
  if (!t) return 0
  return Math.max(0, Math.ceil((t.endAt - now) / 1000))
}

export function startTimer(seconds: number, now: number): TimerState {
  return { endAt: now + seconds * 1000, totalSec: seconds }
}

/** +15 s / −15 s ; on ne descend pas sous « maintenant ». */
export function adjustTimer(t: TimerState, deltaSec: number, now: number): TimerState {
  const endAt = Math.max(now, t.endAt + deltaSec * 1000)
  return { endAt, totalSec: Math.max(1, t.totalSec + deltaSec) }
}

/** « 83 » → « 1:23 ». */
export function formatClock(sec: number): string {
  const m = Math.floor(sec / 60)
  return `${m}:${String(sec % 60).padStart(2, '0')}`
}
