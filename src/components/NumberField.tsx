import { useState } from 'react'

/**
 * Champ numérique qui ouvre le pavé numérique du téléphone.
 * Garde le texte tapé tel quel (on peut vider le champ) et ne transmet que les nombres valides.
 */
export default function NumberField({
  label,
  value,
  onChange,
  decimal = false,
  suffix,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  decimal?: boolean
  suffix?: string
}) {
  const [text, setText] = useState(String(value))
  const [lastValue, setLastValue] = useState(value)
  // Si la valeur change de l'extérieur (ex. correction), on met le texte à jour.
  if (value !== lastValue) {
    setLastValue(value)
    if (Number(text.replace(',', '.')) !== value) setText(String(value))
  }

  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</span>
      <span className="flex items-center rounded-xl border border-neutral-700 bg-neutral-950 focus-within:border-lime-400">
        <input
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={text}
          onChange={(e) => {
            const t = e.target.value
            setText(t)
            const n = Number(t.replace(',', '.'))
            if (t.trim() !== '' && Number.isFinite(n)) {
              setLastValue(n)
              onChange(n)
            }
          }}
          onBlur={() => setText(String(value))}
          onFocus={(e) => e.target.select()}
          className="min-h-12 w-full min-w-0 bg-transparent px-3 text-center text-xl font-semibold text-neutral-100 focus:outline-none"
        />
        {suffix && <span className="pr-3 text-neutral-400">{suffix}</span>}
      </span>
    </label>
  )
}
