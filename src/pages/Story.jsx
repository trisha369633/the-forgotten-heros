import { Navigate, useParams } from 'react-router-dom'
import StoryBook from '../components/StoryBook.jsx'
import { getChapterById } from '../data/chapters.js'

function Story({ startClosed = false, reduceMotion, onReduceMotionChange }) {
  const { chapterId } = useParams()
  const chapterNumber = Number(chapterId || '01')
  const normalizedId = Number.isInteger(chapterNumber)
    ? String(chapterNumber).padStart(2, '0')
    : ''
  const chapter = getChapterById(normalizedId)

  if (!chapter) {
    return <Navigate to="/chapter/01" replace />
  }

  return (
    <StoryBook
      chapter={chapter}
      startClosed={startClosed}
      reduceMotion={reduceMotion}
      onReduceMotionChange={onReduceMotionChange}
    />
  )
}

export default Story