import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Story from './pages/Story.jsx'
import './App.css'

function App() {
  const [reduceMotion, setReduceMotion] = useState(() => (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ))

  return (
    <BrowserRouter>
      <div className="story-world">
        <Routes>
          <Route
            path="/"
            element={
              <Story
                startClosed
                reduceMotion={reduceMotion}
                onReduceMotionChange={setReduceMotion}
              />
            }
          />
          <Route
            path="/chapter/:chapterId"
            element={
              <Story
                reduceMotion={reduceMotion}
                onReduceMotionChange={setReduceMotion}
              />
            }
          />
          <Route path="*" element={<Navigate to="/chapter/01" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
