import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Quita la pantalla de arranque del index.html cuando React ya tiene algo
// que mostrar.
document.getElementById('arranque')?.remove()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
