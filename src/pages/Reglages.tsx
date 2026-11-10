import { Link } from 'react-router-dom'
import PageHeader, { Placeholder } from '../components/PageHeader'

export default function Reglages() {
  return (
    <>
      <PageHeader
        title="Réglages"
        action={
          <Link to="/" className="rounded-full px-4 py-3 text-lime-400 active:bg-neutral-800">
            Fermer
          </Link>
        }
      />
      <Placeholder>Sauvegarde et valeurs par défaut (étape 6).</Placeholder>
      <p className="mt-6 text-center text-sm text-neutral-500">Version {__APP_VERSION__}</p>
    </>
  )
}
