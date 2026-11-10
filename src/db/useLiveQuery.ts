import { liveQuery } from 'dexie'
import { useEffect, useState, type DependencyList } from 'react'

/**
 * Lit la base et se met à jour automatiquement quand les données changent.
 * Renvoie `undefined` pendant le premier chargement.
 * (Petite version maison de dexie-react-hooks, pour ne pas ajouter de bibliothèque.)
 */
export function useLiveQuery<T>(query: () => Promise<T> | T, deps: DependencyList = []): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined)
  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: setValue,
      error: (err) => console.error(err),
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}
