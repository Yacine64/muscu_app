import { useNavigate } from 'react-router-dom'

export default function BackButton() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(-1)} className="rounded-full px-4 py-3 text-lg text-lime-400 active:bg-neutral-800">
      ‹ Retour
    </button>
  )
}
