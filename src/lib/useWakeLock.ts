import { useEffect } from 'react'

/** Garde l'écran allumé tant que `enabled` est vrai (API Wake Lock, si le navigateur la propose). */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const request = async () => {
      try {
        if (document.visibilityState === 'visible' && !cancelled) lock = await navigator.wakeLock.request('screen')
      } catch {
        /* refusé (batterie faible, etc.) : tant pis */
      }
    }
    // Le verrou est perdu quand on quitte l'app : on le redemande au retour.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }
    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => undefined)
    }
  }, [enabled])
}
