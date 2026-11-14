import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { chapters } from '../data/chapters.js'

function ChapterNavigation({ chapterNumber }) {
  const previous = chapterNumber > 1 ? chapterNumber - 1 : null
  const next = chapterNumber < 10 ? chapterNumber + 1 : null
  const chapterPath = (number) => `/chapter/${String(number).padStart(2, '0')}`

  return (
    <nav className="chapter-navigation" aria-label="Chapter navigation">
      <div className="chapter-step">
        {previous ? (
          <Link className="step-button" to={chapterPath(previous)} aria-label="Previous chapter">
            <ArrowLeft size={17} strokeWidth={1.7} />
            <span>Previous</span>
          </Link>
        ) : <span className="step-spacer" />}
      </div>

      <div className="chapter-indicators" aria-label="Choose a chapter">
        {Array.from({ length: 10 }, (_, index) => {
          const number = index + 1
          const current = number === chapterNumber
          const chapter = chapters[index]
          const title = chapter.kind === 'story' && chapter.title ? chapter.title : 'Coming soon'
          const label = `Chapter ${String(number).padStart(2, '0')}: ${title}`

          return (
            <Link
              key={number}
              className={`chapter-indicator${current ? ' is-active' : ''}`}
              to={chapterPath(number)}
              aria-label={label}
              aria-current={current ? 'page' : undefined}
              title={label}
            >
              {String(number).padStart(2, '0')}
            </Link>
          )
        })}
      </div>

      <div className="chapter-step chapter-step-next">
        {next ? (
          <Link className="step-button" to={chapterPath(next)} aria-label="Next chapter">
            <span>Next</span>
            <ArrowRight size={17} strokeWidth={1.7} />
          </Link>
        ) : <span className="step-spacer" />}
      </div>
    </nav>
  )
}

export default ChapterNavigation