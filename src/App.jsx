import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Story from './pages/Story.jsx'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="story-world">
        <Routes>
          <Route path="/" element={<Navigate to="/chapter/01" replace />} />
          <Route path="/chapter/:chapterId" element={<Story />} />
          <Route path="*" element={<Navigate to="/chapter/01" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
