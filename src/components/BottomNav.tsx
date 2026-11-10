import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

type Tab = { to: string; label: string; icon: ReactNode }

// Icônes dessinées en SVG simple (pas de bibliothèque en plus).
const svg = (d: string) => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const tabs: Tab[] = [
  { to: '/', label: 'Accueil', icon: svg('M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10') },
  { to: '/seance', label: 'Séance', icon: svg('M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12') },
  { to: '/programmes', label: 'Programmes', icon: svg('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01') },
  { to: '/exercices', label: 'Exercices', icon: svg('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5') },
  { to: '/progres', label: 'Progrès', icon: svg('M3 20h18M5 16l5-5 4 4 6-7') },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-800 bg-neutral-900"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                  isActive ? 'text-lime-400' : 'text-neutral-400'
                }`
              }
            >
              {t.icon}
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
