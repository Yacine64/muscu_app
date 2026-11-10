import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Mode hash (#/...) : compatible avec GitHub Pages, sans configuration serveur. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
