import { Navigate, Route, Routes } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Accueil from './pages/Accueil'
import Seance from './pages/Seance'
import SeanceResume from './pages/SeanceResume'
import RestTimerBanner from './components/RestTimerBanner'
import Programmes from './pages/Programmes'
import ProgrammeEdit from './pages/ProgrammeEdit'
import SeanceModele from './pages/SeanceModele'
import Exercices from './pages/Exercices'
import ExerciceFiche from './pages/ExerciceFiche'
import ExerciceForm from './pages/ExerciceForm'
import Progres from './pages/Progres'
import Reglages from './pages/Reglages'

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto pb-24">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/seance" element={<Seance />} />
          <Route path="/seance/resume/:id" element={<SeanceResume />} />
          <Route path="/programmes" element={<Programmes />} />
          <Route path="/programmes/:id" element={<ProgrammeEdit />} />
          <Route path="/programmes/seance/:id" element={<SeanceModele />} />
          <Route path="/exercices" element={<Exercices />} />
          <Route path="/exercices/nouveau" element={<ExerciceForm />} />
          <Route path="/exercices/:id" element={<ExerciceFiche />} />
          <Route path="/exercices/:id/modifier" element={<ExerciceForm />} />
          <Route path="/progres" element={<Progres />} />
          <Route path="/progres/seance/:id" element={<SeanceResume />} />
          <Route path="/reglages" element={<Reglages />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <RestTimerBanner />
      <BottomNav />
    </div>
  )
}
