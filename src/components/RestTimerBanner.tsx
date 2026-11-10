import { restTimer, useRestTimer } from '../lib/restTimer'
import { formatClock } from '../lib/timer'

/** Bandeau du minuteur de repos, juste au-dessus de la barre d'onglets. */
export default function RestTimerBanner() {
  const t = useRestTimer()
  if (!t.active) return null
  const progress = t.totalSec ? Math.min(1, t.remaining / t.totalSec) : 0

  return (
    <div
      className="fixed inset-x-0 z-10 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      role="timer"
      aria-live="polite"
    >
      <div className="h-1 bg-lime-400 transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
      <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2">
        {t.finished ? (
          <p className="flex-1 text-2xl font-bold text-lime-400">C’est reparti !</p>
        ) : (
          <p className="flex-1">
            <span className="block text-xs uppercase tracking-wide text-neutral-400">Repos</span>
            <span className="text-4xl font-bold tabular-nums">{formatClock(t.remaining)}</span>
          </p>
        )}
        {!t.finished && (
          <>
            <button type="button" onClick={() => restTimer.adjust(-15)} className="h-14 w-16 rounded-xl bg-neutral-800 text-lg font-semibold active:bg-neutral-700">
              −15
            </button>
            <button type="button" onClick={() => restTimer.adjust(15)} className="h-14 w-16 rounded-xl bg-neutral-800 text-lg font-semibold active:bg-neutral-700">
              +15
            </button>
          </>
        )}
        <button type="button" onClick={() => restTimer.skip()} className="h-14 rounded-xl bg-lime-400 px-4 text-lg font-semibold text-neutral-950 active:bg-lime-300">
          {t.finished ? 'OK' : 'Passer'}
        </button>
      </div>
    </div>
  )
}
