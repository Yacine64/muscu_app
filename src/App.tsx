import { Navigate, Route, Routes } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Accueil from './pages/Accueil'
import Seance from './pages/Seance'
import Programmes from './pages/Programmes'
import Exercices from './pages/Exercices'
import Progres from './pages/Progres'
import Reglages from './pages/Reglages'

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto pb-24">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/seance" element={<Seance />} />
          <Route path="/programmes" element={<Programmes />} />
          <Route path="/exercices" element={<Exercices />} />
          <Route path="/progres" element={<Progres />} />
          <Route path="/reglages" element={<Reglages />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
