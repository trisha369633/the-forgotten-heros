import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import VideoPlayer from './VideoPlayer.jsx'
import { chapters } from '../data/chapters.js'
import './StoryBook.css'

function MicrophoneIcon({ muted }) {
  return (
    <svg
      className="sound-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2.5" width="6" height="12" rx="3" />
      <path d="M5.5 10.5v1.5a6.5 6.5 0 0 0 13 0v-1.5M12 18.5V22M8.5 22h7" />
      {muted && <path d="m4 4 16 16" />}
    </svg>
  )
}

function BackgroundMusic() {
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')

  async function toggleMusic() {
    const audio = document.getElementById('background-music')
    if (!audio) return

    if (enabled) {
      audio.pause()
      setEnabled(false)
      setMessage('')
      return
    }

    try {
      await audio.play()
      setEnabled(true)
      setMessage('')
    } catch {
      setEnabled(false)
      setMessage('Background music is not available yet')
    }
  }

  return (
    <div className="sound-control">
      <audio
        id="background-music"
        src="/media/background-music.mp3"
        loop
        preload="none"
        onError={() => {
          if (enabled) {
            setEnabled(false)
            setMessage('Background music is not available yet')
          }
        }}
      />
      <button
        className="music-toggle"
        type="button"
        onClick={toggleMusic}
        aria-pressed={enabled}
        aria-label={enabled ? 'Turn sound off' : 'Turn sound on'}
        title={message || (enabled ? 'Turn sound off' : 'Turn sound on')}
      >
        <MicrophoneIcon muted={!enabled} />
      </button>
    </div>
  )
}

function ChapterMedia({ chapter }) {
  const [imageUnavailable, setImageUnavailable] = useState(false)
  const isVideo = chapter.media.type === 'video'

  return (
    <>
      <div className="media-frame">
        {isVideo ? (
          <VideoPlayer
            src={chapter.media.video}
            title={`Chapter ${chapter.number} video`}
          />
        ) : imageUnavailable ? (
          <div className="media-placeholder" role="status">
            <span className="media-placeholder-mark" aria-hidden="true">✦</span>
            <span>Chapter image will appear here</span>
            <span className="media-placeholder-note">Original media not added yet</span>
          </div>
        ) : (
          <img
            className="chapter-image"
            src={chapter.media.src}
            alt={`Illustration for chapter ${chapter.number}`}
            onError={() => setImageUnavailable(true)}
          />
        )}
        <span className="media-caption">
          {chapter.kind === 'puzzle' ? 'A PLACE FOR WHAT COMES NEXT' : `THE FORGOTTEN HEROES · ${chapter.id}`}
        </span>
      </div>
      <NASADataCard chapter={chapter} />
    </>
  )
}

function NASADataCard({ chapter }) {
  const nasaData = chapter.nasaData

  if (!nasaData) {
    return (
      <div className="data-card data-card-placeholder">
        <strong>NASA's real data</strong>
        <p>NASA reference coming soon for this chapter.</p>
      </div>
    )
  }

  return (
    <a className="data-card" href={nasaData.url} target="_blank" rel="noopener">
      <strong>NASA's real data</strong>
      <p>{nasaData.fact}</p>
      <small>Open on nasa.gov</small>
    </a>
  )
}

function ChapterNarration({ chapter, storyRef }) {
  const audioRef = useRef(null)
  const utteranceRef = useRef(null)
  const playbackModeRef = useRef(null)
  const [audioAvailable, setAudioAvailable] = useState(Boolean(chapter.audio))
  const [speechTextAvailable, setSpeechTextAvailable] = useState(false)
  const [playbackMode, setPlaybackMode] = useState(null)
  const [speechError, setSpeechError] = useState('')

  const speechIsAvailable =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  const canListen = speechTextAvailable && (audioAvailable || speechIsAvailable)

  function updatePlaybackMode(mode) {
    playbackModeRef.current = mode
    setPlaybackMode(mode)
  }

  function startSpeech() {
    const text = storyRef.current?.innerText?.trim()
    if (!text || !speechIsAvailable) return

    const utterance = new window.SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.92
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return
      utteranceRef.current = null
      updatePlaybackMode(null)
    }
    utterance.onerror = () => {
      if (utteranceRef.current !== utterance) return
      utteranceRef.current = null
      setSpeechError('Speech narration could not be played.')
      updatePlaybackMode(null)
    }
    window.speechSynthesis.cancel()
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    updatePlaybackMode('speech')
  }

  useEffect(() => {
    const audio = audioRef.current
    const storyNode = storyRef.current
    setSpeechTextAvailable(
      chapter.kind === 'story' &&
      Boolean(storyNode?.innerText?.trim()) &&
      !storyNode?.querySelector('.chapter-missing'),
    )
    const handleAudioError = () => setAudioAvailable(false)
    const handleAudioPlay = () => {
      playbackModeRef.current = 'audio'
      setPlaybackMode('audio')
    }
    const handleAudioPause = () => {
      if (playbackModeRef.current !== 'audio') return
      playbackModeRef.current = null
      setPlaybackMode(null)
    }
    const handleAudioEnded = () => {
      playbackModeRef.current = null
      setPlaybackMode(null)
    }
    audio?.addEventListener('error', handleAudioError)
    audio?.addEventListener('play', handleAudioPlay)
    audio?.addEventListener('pause', handleAudioPause)
    audio?.addEventListener('ended', handleAudioEnded)

    return () => {
      audio?.removeEventListener('error', handleAudioError)
      audio?.removeEventListener('play', handleAudioPlay)
      audio?.removeEventListener('pause', handleAudioPause)
      audio?.removeEventListener('ended', handleAudioEnded)
      audio?.pause()
      const utterance = utteranceRef.current
      if (utterance) {
        utterance.onend = null
        utterance.onerror = null
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [chapter.id, chapter.kind, storyRef])

  async function togglePlayback() {
    if (playbackModeRef.current === 'audio') {
      audioRef.current?.pause()
      updatePlaybackMode(null)
      return
    }

    if (playbackModeRef.current === 'speech') {
      const utterance = utteranceRef.current
      if (utterance) {
        utterance.onend = null
        utterance.onerror = null
      }
      window.speechSynthesis.cancel()
      utteranceRef.current = null
      updatePlaybackMode(null)
      return
    }

    setSpeechError('')
    if (audioAvailable && audioRef.current) {
      try {
        await audioRef.current.play()
        updatePlaybackMode('audio')
        return
      } catch {
        audioRef.current.pause()
        setAudioAvailable(false)
      }
    }
    startSpeech()
  }

  return (
    <div className="chapter-narration">
      {chapter.audio && (
        <audio
          ref={audioRef}
          className="narration-audio"
          src={chapter.audio}
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
      {canListen && (
        <button
          className="speech-toggle"
          type="button"
          aria-pressed={Boolean(playbackMode)}
          onClick={togglePlayback}
        >
          <Mic size={16} strokeWidth={1.8} aria-hidden="true" />
          {playbackMode ? 'Stop listening' : 'Listen to the story'}
        </button>
      )}
      {speechError && <span className="narration-placeholder" role="status">{speechError}</span>}
    </div>
  )
}

function PageNumber({ children }) {
  return <div className="page-number">{children}</div>
}

function ContentsSpread({ chapters, onSelect }) {
  return (
    <>
      <article className="book-page story-page credit-page">
        <div className="page-inner credit-content">
          <h1>Contributed to NASA</h1>
          <span className="credit-rule" aria-hidden="true" />
          <PageNumber>1</PageNumber>
        </div>
      </article>
      <div className="book-spine" aria-hidden="true" />
      <article className="book-page media-page contents-page">
        <div className="page-inner contents-content">
          <h1>Chapters</h1>
          <ol className="contents-list">
            {chapters.map((item) => {
              const isAvailable = item.kind === 'story' && Boolean(item.title)
              const title = isAvailable ? item.title : 'Coming soon'
              const page = item.number * 2 + 1

              return (
                <li key={item.id}>
                  <button
                    className="contents-entry"
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => onSelect(item.number)}
                  >
                    <span>Chapter {item.number}: {title}</span>
                    <i aria-hidden="true" />
                    <b>{page}</b>
                  </button>
                </li>
              )
            })}
          </ol>
          <PageNumber>2</PageNumber>
        </div>
      </article>
    </>
  )
}

function ChapterSpread({ chapter }) {
  const ChapterContent = chapter.Content
  const storyRef = useRef(null)
  const firstPage = chapter.number * 2 + 1

  return (
    <>
      <article className="book-page story-page">
        <div className="page-inner">
          <h1 className="chapter-heading">Chapter {chapter.number}</h1>
          <h2 className="chapter-title">{chapter.title || 'Original title pending'}</h2>
          <div className="chapter-divider" aria-hidden="true" />
          <div className="chapter-prose" ref={storyRef}>
            {chapter.paragraphs
              ? chapter.paragraphs.map((paragraph, index) => (
                <p className="chapter-copy" key={`${chapter.id}-${index}`}>{paragraph}</p>
              ))
              : <ChapterContent />}
          </div>
          {chapter.kind === 'story' && (
            <ChapterNarration key={chapter.id} chapter={chapter} storyRef={storyRef} />
          )}
          <PageNumber>{firstPage}</PageNumber>
        </div>
      </article>
      <div className="book-spine" aria-hidden="true" />
      <article className="book-page media-page">
        <div className="page-inner media-content">
          <ChapterMedia key={chapter.id} chapter={chapter} />
          <PageNumber>{firstPage + 1}</PageNumber>
        </div>
      </article>
    </>
  )
}

function CoverIllustration() {
  return (
    <svg
      className="cover-illustration"
      viewBox="0 0 300 220"
      role="img"
      aria-label="A blue planet encircled by a red orbit"
    >
      <defs>
        <radialGradient id="cover-planet" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#829bd1" />
          <stop offset="1" stopColor="#17264f" />
        </radialGradient>
      </defs>
      <g fill="#f3ece0" aria-hidden="true">
        <circle cx="30" cy="30" r="1.6" />
        <circle cx="260" cy="24" r="1.2" />
        <circle cx="270" cy="150" r="1.6" />
        <circle cx="22" cy="170" r="1.2" />
        <circle cx="150" cy="10" r="1.2" />
        <circle cx="110" cy="205" r="1.4" />
        <circle cx="215" cy="200" r="1" />
      </g>
      <ellipse
        cx="150"
        cy="110"
        rx="128"
        ry="38"
        fill="none"
        stroke="#fc3d21"
        strokeWidth="2.5"
        transform="rotate(-22 150 110)"
      />
      <circle cx="150" cy="110" r="58" fill="url(#cover-planet)" />
      <circle cx="262" cy="73" r="6" fill="#f3ece0" />
    </svg>
  )
}

function StoryBook({ chapter }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [spread, setSpread] = useState(0)
  const previousChapterId = useRef(chapter.id)
  const nextDisabled = isOpen && spread === 10
  const chapterPath = (number) => `/chapter/${String(number).padStart(2, '0')}`

  useEffect(() => {
    if (previousChapterId.current === chapter.id) return
    previousChapterId.current = chapter.id
    setIsOpen(true)
    setSpread(chapter.number)
  }, [chapter.id, chapter.number])

  const goToChapter = useCallback((number) => {
    setIsOpen(true)
    setSpread(number)
    navigate(chapterPath(number))
  }, [navigate])

  const goNext = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true)
      setSpread(0)
    } else if (spread === 0) {
      goToChapter(1)
    } else if (spread < 10) {
      goToChapter(spread + 1)
    }
  }, [goToChapter, isOpen, spread])

  const goPrevious = useCallback(() => {
    if (!isOpen) return
    if (spread === 0) {
      setIsOpen(false)
    } else if (spread === 1) {
      setSpread(0)
    } else {
      goToChapter(spread - 1)
    }
  }, [goToChapter, isOpen, spread])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
      if (
        event.target instanceof Element &&
        event.target.closest('input, textarea, select, audio, video, [contenteditable="true"]')
      ) {
        return
      }
      event.preventDefault()
      if (event.key === 'ArrowRight' && !nextDisabled) goNext()
      if (event.key === 'ArrowLeft' && isOpen) goPrevious()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrevious, isOpen, nextDisabled])

  return (
    <main className="storybook-shell">
      <BackgroundMusic />

      <section
        className={`book${isOpen ? ' open' : ''}`}
        aria-label={isOpen ? `The Forgotten Heroes, ${spread === 0 ? 'contents' : `chapter ${spread}`}` : 'The Forgotten Heroes, closed book'}
      >
        <div className="page-stack" aria-hidden="true" />
        <div className="book-spread" aria-hidden={!isOpen} hidden={!isOpen}>
          {spread === 0 ? (
            <ContentsSpread chapters={chapters} onSelect={goToChapter} />
          ) : (
            <ChapterSpread key={chapter.id} chapter={chapter} />
          )}
        </div>

        <div className="cover" aria-hidden={isOpen}>
          <span className="cover-kicker">A NASA SPACE APPS STORY</span>
          <h1>The Forgotten Heroes</h1>
          <CoverIllustration />
          <p>Inspired by NASA's open space data</p>
        </div>

        {isOpen && (
          <button
            className="book-arrow book-arrow-previous"
            type="button"
            aria-label={spread === 0 ? 'Close book' : 'Previous spread'}
            onClick={goPrevious}
          >
            <span className="book-chevron" aria-hidden="true">‹</span>
          </button>
        )}
        <button
          className="book-arrow book-arrow-next"
          type="button"
          aria-label={!isOpen ? 'Open book' : spread === 10 ? 'Last chapter' : 'Next spread'}
          disabled={nextDisabled}
          onClick={goNext}
        >
          <span className="book-chevron" aria-hidden="true">›</span>
        </button>
      </section>
    </main>
  )
}

export default StoryBook
