import { useSyncExternalStore } from 'react'
import { adjustTimer, remainingSec, startTimer, type TimerState } from './timer'

/**
 * Minuteur de repos global (visible depuis tous les onglets).
 * L'heure de fin est gardée dans le stockage du navigateur : fermer et rouvrir l'app ne le perd pas.
 */
const KEY = 'muscu.restTimer'
type Stored = TimerState & { fired?: boolean }

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}
function persist(s: Stored | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    /* stockage indisponible : le minuteur marche quand même tant que l'app est ouverte */
  }
}

let state: Stored | null = load()
let now = Date.now()
const listeners = new Set<() => void>()
let tick: ReturnType<typeof setInterval> | undefined
let endTimeout: ReturnType<typeof setTimeout> | undefined
let snapshot = { state, now }

function emit() {
  snapshot = { state, now }
  listeners.forEach((l) => l())
}

function set(next: Stored | null) {
  state = next
  persist(next)
  schedule()
  emit()
}

// Le bandeau « C'est reparti » reste affiché quelques secondes après la fin.
const LINGER_MS = 5000

function schedule() {
  clearInterval(tick)
  clearTimeout(endTimeout)
  if (!state) return
  tick = setInterval(() => {
    now = Date.now()
    if (state && !state.fired && now >= state.endAt) fire()
    if (state && now >= state.endAt + LINGER_MS) set(null)
    else emit()
  }, 250)
  const delay = state.endAt - Date.now()
  if (delay > 0 && !state.fired) endTimeout = setTimeout(fire, delay)
}

// ---------- Fin du repos : vibration, son, notification ----------

let audio: AudioContext | undefined

/** À appeler pendant un appui (geste utilisateur) : sinon le navigateur bloque le son. */
export function unlockAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    /* pas de son disponible */
  }
}

function beep() {
  if (!audio) return
  try {
    const t0 = audio.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.35)
      gain.gain.exponentialRampToValueAtTime(0.5, t0 + i * 0.35 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.35 + 0.25)
      osc.connect(gain).connect(audio.destination)
      osc.start(t0 + i * 0.35)
      osc.stop(t0 + i * 0.35 + 0.3)
    }
  } catch {
    /* ignore */
  }
}

function fire() {
  if (!state || state.fired) return
  set({ ...state, fired: true })
  try {
    navigator.vibrate?.([400, 150, 400, 150, 400])
  } catch {
    /* ignore */
  }
  beep()
  if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
    void navigator.serviceWorker?.ready
      .then((reg) => reg.showNotification('Repos terminé', { body: 'C’est reparti pour la série suivante !', tag: 'repos' }))
      .catch(() => undefined)
  }
}

/** Demande l'autorisation d'afficher une notification (une seule fois, sur un appui). */
export async function askNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

// ---------- API ----------

export const restTimer = {
  start(seconds: number) {
    unlockAudio()
    if (seconds <= 0) return set(null)
    now = Date.now()
    set(startTimer(seconds, now))
  },
  adjust(deltaSec: number) {
    if (!state || state.fired) return
    now = Date.now()
    set({ ...adjustTimer(state, deltaSec, now) })
  },
  skip() {
    set(null)
  },
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useRestTimer() {
  const snap = useSyncExternalStore(subscribe, () => snapshot)
  const s = snap.state
  return {
    active: !!s,
    finished: !!s && snap.now >= s.endAt,
    remaining: remainingSec(s, snap.now),
    totalSec: s?.totalSec ?? 0,
  }
}

// Au démarrage de l'app : reprendre un minuteur en cours (ou oublier un minuteur fini depuis longtemps).
if (state && Date.now() > state.endAt + LINGER_MS) set(null)
else schedule()
