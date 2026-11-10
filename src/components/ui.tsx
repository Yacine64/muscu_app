import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Chip({
  active,
  children,
  ...props
}: { active: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`min-h-11 shrink-0 rounded-full border px-4 text-base font-medium whitespace-nowrap ${
        active ? 'border-lime-400 bg-lime-400 text-neutral-950' : 'border-neutral-700 bg-neutral-900 text-neutral-200'
      }`}
      {...props}
    >
      {children}
    </button>
  )
}

type Variant = 'primary' | 'secondary' | 'danger'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-lime-400 text-neutral-950 active:bg-lime-300',
  secondary: 'bg-neutral-800 text-neutral-100 active:bg-neutral-700',
  danger: 'bg-red-900/60 text-red-200 active:bg-red-900',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`min-h-14 rounded-2xl px-5 text-lg font-semibold disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-2 block text-sm font-medium uppercase tracking-wide text-neutral-400">{children}</span>
}

export const inputClass =
  'w-full min-h-14 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 text-lg text-neutral-100 placeholder:text-neutral-500 focus:border-lime-400 focus:outline-none'

/** Petit bouton carré (↑, ↓, ✕) assez grand pour le doigt. */
export function IconButton({ label, children, ...props }: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-xl text-neutral-200 active:bg-neutral-700 disabled:opacity-30"
      {...props}
    >
      {children}
    </button>
  )
}
