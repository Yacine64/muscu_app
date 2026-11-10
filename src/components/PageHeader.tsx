import type { ReactNode } from 'react'

export default function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header
      className="flex items-center justify-between px-4 pb-2 pt-4"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
    >
      <h1 className="text-2xl font-bold">{title}</h1>
      {action}
    </header>
  )
}

export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="mx-4 mt-4 rounded-2xl border border-dashed border-neutral-700 p-6 text-center text-neutral-400">
      {children}
    </div>
  )
}
