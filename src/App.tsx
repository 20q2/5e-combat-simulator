import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { CharacterPage } from '@/pages/CharacterPage'
import { EncounterPage } from '@/pages/EncounterPage'
import { CombatPage } from '@/pages/CombatPage'

// Use basename for GitHub Pages deployment (matches vite.config.ts base)
const basename = import.meta.env.BASE_URL

function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="character" element={<CharacterPage />} />
          <Route path="encounter" element={<EncounterPage />} />
          <Route path="combat" element={<CombatPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
