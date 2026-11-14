import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Move } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import VideoPlayer from './VideoPlayer.jsx'
import ThinkingOrb from './ThinkingOrb.jsx'
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

const resolvedImageCache = new Map()

function ChapterMedia({ chapter }) {
  const isVideo = chapter.media.type === 'video'

  const candidates = [
    `/media/chapter-${chapter.id}/images/chapter${chapter.number}.jpeg`,
    `/media/chapter-${chapter.id}/images/chapter-${chapter.id}.jpeg`,
    `/media/chapter-${chapter.id}/images/chapter-${chapter.id}.jpg`,
    `/media/chapter-01/images/chapter${chapter.number}.jpeg`,
    chapter.media.src,
  ]

  const cachedSrc = resolvedImageCache.get(chapter.id)
  const [currentSrc, setCurrentSrc] = useState(cachedSrc || candidates[0])
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [imageUnavailable, setImageUnavailable] = useState(false)

  const handleImageLoad = (e) => {
    resolvedImageCache.set(chapter.id, e.currentTarget.src)
  }

  const handleImageError = () => {
    const nextIdx = candidateIndex + 1
    if (nextIdx < candidates.length) {
      setCandidateIndex(nextIdx)
      setCurrentSrc(candidates[nextIdx])
    } else {
      setImageUnavailable(true)
    }
  }

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
            <span className="media-placeholder-note">Waiting for new illustrations</span>
          </div>
        ) : (
          <img
            className="chapter-image"
            src={currentSrc}
            alt={`Illustration for chapter ${chapter.number}`}
            loading="eager"
            decoding="async"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        <span className="media-caption">
          {chapter.kind === 'puzzle'
            ? 'A PLACE FOR WHAT COMES NEXT'
            : chapter.kind === 'back'
            ? 'THE FORGOTTEN HEROES · EPILOGUE'
            : `THE FORGOTTEN HEROES · ${chapter.id}`}
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
    <a
      className="data-card"
      href={nasaData.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="data-card-badge">NASA Real Data</div>
      <p>{nasaData.fact}</p>
      <small>Open on nasa.gov ↗</small>
    </a>
  )
}

function ChapterNarration({ chapter }) {
  const audioRef = useRef(null)
  const utteranceRef = useRef(null)
  const [playbackMode, setPlaybackMode] = useState(null)
  const [speechError, setSpeechError] = useState('')
  const [audioAvailable, setAudioAvailable] = useState(Boolean(chapter.audio))

  const speechIsAvailable =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'

  const storyText = chapter.paragraphs?.join(' ') || ''
  const canListen = (storyText.length > 0 || audioAvailable) && (audioAvailable || speechIsAvailable)

  function startSpeech() {
    if (!storyText || !speechIsAvailable) return

    const utterance = new window.SpeechSynthesisUtterance(storyText)
    utterance.lang = 'en-US'
    utterance.rate = 0.92
    utterance.onend = () => {
      utteranceRef.current = null
      setPlaybackMode(null)
    }
    utterance.onerror = () => {
      utteranceRef.current = null
      setSpeechError('Speech narration could not be played.')
      setPlaybackMode(null)
    }
    window.speechSynthesis.cancel()
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setPlaybackMode('speech')
  }

  const stopAll = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    if (speechIsAvailable) {
      window.speechSynthesis.cancel()
    }
    utteranceRef.current = null
    setPlaybackMode(null)
  }, [speechIsAvailable])

  useEffect(() => {
    return () => {
      stopAll()
    }
  }, [chapter.id, stopAll])

  async function togglePlayback(e) {
    e.stopPropagation()
    if (playbackMode) {
      stopAll()
      return
    }

    setSpeechError('')
    if (audioAvailable && audioRef.current) {
      try {
        await audioRef.current.play()
        setPlaybackMode('audio')
        return
      } catch {
        audioRef.current.pause()
        setAudioAvailable(false)
      }
    }
    startSpeech()
  }

  if (!canListen) return null

  return (
    <div className="chapter-narration" onClick={(e) => e.stopPropagation()}>
      {chapter.audio && (
        <audio
          ref={audioRef}
          className="narration-audio"
          src={chapter.audio}
          preload="none"
          onError={() => setAudioAvailable(false)}
          onEnded={() => setPlaybackMode(null)}
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
      <button
        className={`speech-toggle${playbackMode ? ' playing' : ''}`}
        type="button"
        aria-pressed={Boolean(playbackMode)}
        onClick={togglePlayback}
      >
        {playbackMode ? (
          <>
            <ThinkingOrb state="listening" size={20} theme="dark" ariaLabel="Narration playing" />
            <span>Pause narration</span>
          </>
        ) : (
          <>
            <Mic size={15} strokeWidth={2} aria-hidden="true" />
            <span>Listen to story</span>
          </>
        )}
      </button>
      {speechError && <span className="narration-placeholder" role="status">{speechError}</span>}
    </div>
  )
}

function PageNumber({ children }) {
  return <div className="page-number">{children}</div>
}

function PageLeft({ spreadIndex, chapters }) {
  if (spreadIndex === 0) {
    return (
      <article className="book-page story-page credit-page">
        <div className="page-inner credit-content">
          <span className="credit-badge">NASA Space Apps Project</span>
          <h1 className="credit-title">Contributed to NASA</h1>
          <span className="credit-rule" aria-hidden="true" />
          <p className="credit-description">
            A tribute to humanity's robotic pioneers, rovers, and voyagers scattered across the cosmos.
            Though silent and distant, their journeys illuminate our understanding of the universe.
          </p>
          <PageNumber>1</PageNumber>
        </div>
      </article>
    )
  }

  if (spreadIndex === 11) {
    const chapter = chapters[10]
    return (
      <article className="book-page story-page epilogue-page">
        <div className="page-inner">
          <div className="chapter-header-group">
            <span className="chapter-number-kicker">EPILOGUE</span>
            <h1 className="chapter-heading">{chapter?.title || 'The Hall of Heroes'}</h1>
          </div>
          <div className="chapter-divider" aria-hidden="true" />
          <div className="chapter-prose">
            {chapter?.paragraphs?.map((paragraph, index) => (
              <p className="chapter-copy" key={`epilogue-${index}`}>
                {paragraph}
              </p>
            ))}
          </div>
          {chapter && <ChapterNarration key={chapter.id} chapter={chapter} />}
          <PageNumber>23</PageNumber>
        </div>
      </article>
    )
  }

  const chapterIndex = spreadIndex - 1
  const chapter = chapters[chapterIndex]
  if (!chapter) return <article className="book-page story-page" />

  const ChapterContent = chapter.Content
  const pageNum = chapter.number * 2 + 1

  return (
    <article className="book-page story-page">
      <div className="page-inner">
        <div className="chapter-header-group">
          <span className="chapter-number-kicker">Chapter {String(chapter.number).padStart(2, '0')}</span>
          <h1 className="chapter-heading">{chapter.title || 'Original title pending'}</h1>
        </div>
        <div className="chapter-divider" aria-hidden="true" />
        <div className="chapter-prose">
          {chapter.paragraphs
            ? chapter.paragraphs.map((paragraph, index) => (
                <p className="chapter-copy" key={`${chapter.id}-${index}`}>
                  {paragraph}
                </p>
              ))
            : <ChapterContent />}
        </div>
        {chapter.kind === 'story' && (
          <ChapterNarration key={chapter.id} chapter={chapter} />
        )}
        <PageNumber>{pageNum}</PageNumber>
      </div>
    </article>
  )
}

function BlankEndpaperPage() {
  return (
    <article className="book-page media-page endpaper-page">
      <div className="page-inner endpaper-inner">
        <div className="endpaper-center-art">
          <span className="endpaper-symbol" aria-hidden="true">✦</span>
          <span className="endpaper-title">THE END</span>
          <span className="endpaper-sub">Ad astra per aspera</span>
        </div>
        <div className="endpaper-close-hint">
          <span>Click Next › to close book</span>
        </div>
        <PageNumber>24</PageNumber>
      </div>
    </article>
  )
}

function BackCover({ onRestart, onContents, onReopen }) {
  return (
    <div
      className="back-cover"
      onClick={onReopen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onReopen?.()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Reopen The Forgotten Heroes book"
    >
      <div className="back-cover-spine-edge" aria-hidden="true" />
      <div className="back-cover-inner">
        <span className="back-cover-badge">NASA SPACE APPS CHALLENGE</span>
        <h2 className="back-cover-title">The Forgotten Heroes</h2>
        <div className="back-cover-rule" aria-hidden="true" />

        <p className="back-cover-synopsis">
          Far beyond the warm glow of Earth, silent sentinels wander through dark celestial seas.
          From the dusty crimson plains of Mars to the interstellar void beyond our solar system,
          this story honors the pioneers that never came home—our forgotten heroes.
        </p>

        <div className="back-cover-missions">
          <span className="mission-tag">Spirit &amp; Opportunity</span>
          <span className="mission-tag">Hubble</span>
          <span className="mission-tag">Voyager 1 &amp; 2</span>
          <span className="mission-tag">Viking 1 &amp; 2</span>
          <span className="mission-tag">Pioneer 10 &amp; 11</span>
          <span className="mission-tag">Apollo 11</span>
        </div>

        <div className="back-cover-actions">
          <button
            type="button"
            className="back-cover-btn primary"
            onClick={(e) => {
              e.stopPropagation()
              onRestart?.()
            }}
          >
            ↺ Read from Beginning
          </button>
          <button
            type="button"
            className="back-cover-btn secondary"
            onClick={(e) => {
              e.stopPropagation()
              onContents?.()
            }}
          >
            Table of Contents
          </button>
        </div>

        <div className="back-cover-footer">
          <div className="back-cover-citation">
            <strong>NASA Open Data</strong>
            <small>Inspired by real exploration archives</small>
          </div>
          <div className="back-cover-barcode" aria-hidden="true">
            <div className="barcode-bars">
              <span /><span /><span /><span /><span /><span /><span /><span />
              <span /><span /><span /><span /><span /><span /><span /><span />
              <span /><span /><span /><span /><span /><span /><span /><span />
            </div>
            <span className="isbn-label">ISBN 978-0-NASA-HEROES</span>
          </div>
        </div>

        <span className="back-cover-cta">Click or press to open</span>
      </div>
    </div>
  )
}

function PageRight({ spreadIndex, chapters, onSelectChapter }) {
  if (spreadIndex === 0) {
    return (
      <article className="book-page media-page contents-page">
        <div className="page-inner contents-content">
          <h1 className="contents-heading">Chapters</h1>
          <ol className="contents-list">
            {chapters.map((item) => {
              const isAvailable = Boolean(item.title)
              const title = isAvailable ? item.title : 'Coming soon'
              const page = item.number * 2 + 1

              return (
                <li key={item.id}>
                  <button
                    className="contents-entry"
                    type="button"
                    disabled={!isAvailable}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectChapter(item.number)
                    }}
                  >
                    <span className="entry-title">
                      <span className="entry-num">{String(item.number).padStart(2, '0')}</span>
                      <span className="entry-text">{title}</span>
                    </span>
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
    )
  }

  if (spreadIndex === 11) {
    return <BlankEndpaperPage />
  }

  const chapterIndex = spreadIndex - 1
  const chapter = chapters[chapterIndex]
  if (!chapter) return <article className="book-page media-page" />

  const pageNum = chapter.number * 2 + 2

  return (
    <article className="book-page media-page">
      <div className="page-inner media-content">
        <ChapterMedia key={chapter.id} chapter={chapter} />
        <PageNumber>{pageNum}</PageNumber>
      </div>
    </article>
  )
}

function CoverIllustration() {
  return (
    <svg
      className="cover-illustration"
      viewBox="0 0 300 220"
      role="img"
      aria-label="A deep blue planet encircled by a warm orbit"
    >
      <defs>
        <radialGradient id="cover-planet" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#94add8" />
          <stop offset="60%" stopColor="#2b4170" />
          <stop offset="100%" stopColor="#101935" />
        </radialGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <g fill="#f3ece0" opacity="0.65" aria-hidden="true">
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
        opacity="0.9"
        transform="rotate(-22 150 110)"
      />
      <circle cx="150" cy="110" r="58" fill="url(#cover-planet)" />
      <circle cx="262" cy="73" r="6" fill="#f3ece0" filter="url(#glow)" />
    </svg>
  )
}

function StoryBook({ chapter, startClosed = false, reduceMotion, onReduceMotionChange }) {
  const navigate = useNavigate()
  const initialOpen = !startClosed && Boolean(chapter && chapter.number)
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [isBackCover, setIsBackCover] = useState(false)
  const [spread, setSpread] = useState(() => (
    !startClosed && chapter?.number ? chapter.number : 0
  ))
  const [flipState, setFlipState] = useState(null)
  const [isFlipping, setIsFlipping] = useState(false)

  const isFlippingRef = useRef(false)
  const bookRef = useRef(null)
  const coverRef = useRef(null)
  const leafRef = useRef(null)
  const leftShadowRef = useRef(null)
  const rightShadowRef = useRef(null)
  const leafLightingFrontRef = useRef(null)
  const leafLightingBackRef = useRef(null)

  const chapterPath = (number) =>
    number === 0 ? '/chapter/01' : `/chapter/${String(number).padStart(2, '0')}`

  const applyMotionPreference = useCallback((timeline) => {
    if (reduceMotion) {
      timeline.progress(1)
    } else if (window.matchMedia('(max-width: 768px)').matches) {
      timeline.timeScale(3)
    }
  }, [reduceMotion])

  // Synchronize on direct URL navigation and mount
  useEffect(() => {
    if (!startClosed && !isFlippingRef.current && chapter?.number) {
      setIsOpen(true)
      setIsBackCover(false)
      setSpread(chapter.number)
      if (bookRef.current) {
        gsap.set(bookRef.current, { xPercent: 0, x: 0 })
      }
      if (coverRef.current) {
        gsap.set(coverRef.current, { rotationY: -180 })
      }
    }
  }, [chapter?.id, chapter?.number, startClosed])

  // Open the book from closed cover
  const openBook = useCallback((targetSpread = 0) => {
    if (isFlippingRef.current) return
    isFlippingRef.current = true
    setIsFlipping(true)
    setIsBackCover(false)

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setIsOpen(true)
        setIsBackCover(false)
        setSpread(targetSpread)
        setIsFlipping(false)
        isFlippingRef.current = false
        if (targetSpread > 0) {
          navigate(chapterPath(targetSpread))
        }
      },
    })

    tl.to(bookRef.current, {
      xPercent: 0,
      duration: 0.85,
      ease: 'power2.inOut',
    }, 0)

    if (coverRef.current) {
      tl.to(coverRef.current, {
        rotationY: -180,
        duration: 0.85,
        ease: 'power2.inOut',
      }, 0)
    }
    applyMotionPreference(tl)
  }, [applyMotionPreference, navigate])

  // Close the book back to cover
  const closeBook = useCallback(() => {
    if (isFlippingRef.current) return
    isFlippingRef.current = true
    setIsFlipping(true)

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setIsOpen(false)
        setIsBackCover(false)
        setSpread(0)
        setIsFlipping(false)
        isFlippingRef.current = false
      },
    })

    if (coverRef.current) {
      tl.to(coverRef.current, {
        rotationY: 0,
        duration: 0.85,
        ease: 'power2.inOut',
      }, 0)
    }

    tl.to(bookRef.current, {
      xPercent: window.matchMedia('(max-width: 768px)').matches ? 0 : -25,
      duration: 0.85,
      ease: 'power2.inOut',
    }, 0)
    applyMotionPreference(tl)
  }, [applyMotionPreference])

  // Close the book forward to the Back Cover
  const closeToBackCover = useCallback(() => {
    if (isFlippingRef.current) return
    isFlippingRef.current = true
    setIsFlipping(true)

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    setFlipState({
      direction: 'close-back',
      fromSpread: 11,
      toSpread: 11,
    })
  }, [])

  // Reopen the book from the Back Cover
  const openFromBackCover = useCallback((targetSpread = 11) => {
    if (isFlippingRef.current) return
    isFlippingRef.current = true
    setIsFlipping(true)

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    setIsOpen(true)
    setSpread(targetSpread)
    setFlipState({
      direction: 'open-back',
      fromSpread: 11,
      toSpread: targetSpread,
    })
  }, [])

  // Turn page forward or backward with 3D leaf flip
  const turnToSpread = useCallback((targetSpread) => {
    if (isFlippingRef.current || targetSpread === spread) return
    const direction = targetSpread > spread ? 'next' : 'prev'

    isFlippingRef.current = true
    setIsFlipping(true)
    setFlipState({ fromSpread: spread, toSpread: targetSpread, direction })
  }, [spread])

  // GSAP animation for 3D leaf flip
  useEffect(() => {
    if (!flipState || !leafRef.current) return

    const { direction, toSpread } = flipState
    const leaf = leafRef.current
    const leftShadow = leftShadowRef.current
    const rightShadow = rightShadowRef.current
    const frontLighting = leafLightingFrontRef.current
    const backLighting = leafLightingBackRef.current

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    if (direction === 'close-back') {
      gsap.set(leaf, { transformOrigin: 'left center', rotationY: 0 })
      gsap.set(bookRef.current, { xPercent: 0 })
      const isMobileLayout = window.matchMedia('(max-width: 768px)').matches
      if (frontLighting) gsap.set(frontLighting, { opacity: 0 })
      if (backLighting) gsap.set(backLighting, { opacity: 0.45 })

      const tl = gsap.timeline({
        onComplete: () => {
          setIsOpen(false)
          setIsBackCover(true)
          setFlipState(null)
          setIsFlipping(false)
          isFlippingRef.current = false
        },
      })

      tl.to(leaf, {
        rotationY: -180,
        duration: 0.85,
        ease: 'power2.inOut',
      }, 0)

      tl.to(bookRef.current, {
        xPercent: isMobileLayout ? 0 : 25,
        duration: 0.85,
        ease: 'power2.inOut',
      }, 0)

      if (frontLighting) {
        tl.to(frontLighting, { opacity: 0.45, duration: 0.42, ease: 'power1.in' }, 0)
      }
      if (backLighting) {
        tl.to(backLighting, { opacity: 0, duration: 0.42, ease: 'power1.out' }, 0.42)
      }
      if (rightShadow) {
        tl.fromTo(rightShadow, { opacity: 0 }, { opacity: 0.38, duration: 0.3, ease: 'power1.in' }, 0)
        tl.to(rightShadow, { opacity: 0, duration: 0.55, ease: 'power1.out' }, 0.3)
      }
      if (leftShadow) {
        tl.fromTo(leftShadow, { opacity: 0 }, { opacity: 0.38, duration: 0.35, ease: 'power1.in' }, 0.4)
        tl.to(leftShadow, { opacity: 0, duration: 0.2, ease: 'power1.out' }, 0.65)
      }

      applyMotionPreference(tl)

      return () => {
        tl.kill()
      }
    }

    if (direction === 'open-back') {
      gsap.set(leaf, { transformOrigin: 'left center', rotationY: -180 })
      const isMobileLayout = window.matchMedia('(max-width: 768px)').matches
      gsap.set(bookRef.current, { xPercent: isMobileLayout ? 0 : 25 })
      if (frontLighting) gsap.set(frontLighting, { opacity: 0.45 })
      if (backLighting) gsap.set(backLighting, { opacity: 0 })

      const tl = gsap.timeline({
        onComplete: () => {
          setIsOpen(true)
          setIsBackCover(false)
          setSpread(toSpread)
          setFlipState(null)
          setIsFlipping(false)
          isFlippingRef.current = false
          navigate(chapterPath(toSpread))
        },
      })

      tl.to(leaf, {
        rotationY: 0,
        duration: 0.85,
        ease: 'power2.inOut',
      }, 0)

      tl.to(bookRef.current, {
        xPercent: 0,
        duration: 0.85,
        ease: 'power2.inOut',
      }, 0)

      if (backLighting) {
        tl.to(backLighting, { opacity: 0.45, duration: 0.42, ease: 'power1.in' }, 0)
      }
      if (frontLighting) {
        tl.to(frontLighting, { opacity: 0, duration: 0.42, ease: 'power1.out' }, 0.42)
      }
      if (leftShadow) {
        tl.fromTo(leftShadow, { opacity: 0 }, { opacity: 0.38, duration: 0.3, ease: 'power1.in' }, 0)
        tl.to(leftShadow, { opacity: 0, duration: 0.55, ease: 'power1.out' }, 0.3)
      }
      if (rightShadow) {
        tl.fromTo(rightShadow, { opacity: 0 }, { opacity: 0.38, duration: 0.35, ease: 'power1.in' }, 0.4)
        tl.to(rightShadow, { opacity: 0, duration: 0.2, ease: 'power1.out' }, 0.65)
      }

      applyMotionPreference(tl)

      return () => {
        tl.kill()
      }
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setSpread(toSpread)
        setFlipState(null)
        setIsFlipping(false)
        isFlippingRef.current = false
        navigate(chapterPath(toSpread))
      },
    })

    if (direction === 'next') {
      // Rotating from right page (0deg) to left page (-180deg)
      gsap.set(leaf, { transformOrigin: 'left center', rotationY: 0 })
      if (frontLighting) gsap.set(frontLighting, { opacity: 0 })
      if (backLighting) gsap.set(backLighting, { opacity: 0.45 })

      tl.to(leaf, {
        rotationY: -180,
        duration: 0.72,
        ease: 'power2.inOut',
      }, 0)

      if (frontLighting) {
        tl.to(frontLighting, {
          opacity: 0.45,
          duration: 0.36,
          ease: 'power1.in',
        }, 0)
      }

      if (backLighting) {
        tl.to(backLighting, {
          opacity: 0,
          duration: 0.36,
          ease: 'power1.out',
        }, 0.36)
      }

      if (rightShadow) {
        tl.fromTo(rightShadow, { opacity: 0 }, {
          opacity: 0.38,
          duration: 0.26,
          ease: 'power1.in',
        }, 0)
        tl.to(rightShadow, {
          opacity: 0,
          duration: 0.46,
          ease: 'power1.out',
        }, 0.26)
      }

      if (leftShadow) {
        tl.fromTo(leftShadow, { opacity: 0 }, {
          opacity: 0.38,
          duration: 0.3,
          ease: 'power1.in',
        }, 0.36)
        tl.to(leftShadow, {
          opacity: 0,
          duration: 0.16,
          ease: 'power1.out',
        }, 0.56)
      }
    } else {
      // Rotating from left page (0deg) to right page (180deg)
      gsap.set(leaf, { transformOrigin: 'right center', rotationY: 0 })
      if (frontLighting) gsap.set(frontLighting, { opacity: 0 })
      if (backLighting) gsap.set(backLighting, { opacity: 0.45 })

      tl.to(leaf, {
        rotationY: 180,
        duration: 0.72,
        ease: 'power2.inOut',
      }, 0)

      if (frontLighting) {
        tl.to(frontLighting, {
          opacity: 0.45,
          duration: 0.36,
          ease: 'power1.in',
        }, 0)
      }

      if (backLighting) {
        tl.to(backLighting, {
          opacity: 0,
          duration: 0.36,
          ease: 'power1.out',
        }, 0.36)
      }

      if (leftShadow) {
        tl.fromTo(leftShadow, { opacity: 0 }, {
          opacity: 0.38,
          duration: 0.26,
          ease: 'power1.in',
        }, 0)
        tl.to(leftShadow, {
          opacity: 0,
          duration: 0.46,
          ease: 'power1.out',
        }, 0.26)
      }

      if (rightShadow) {
        tl.fromTo(rightShadow, { opacity: 0 }, {
          opacity: 0.38,
          duration: 0.3,
          ease: 'power1.in',
        }, 0.36)
        tl.to(rightShadow, {
          opacity: 0,
          duration: 0.16,
          ease: 'power1.out',
        }, 0.56)
      }
    }

    applyMotionPreference(tl)

    return () => {
      tl.kill()
    }
  }, [applyMotionPreference, flipState, navigate])

  const maxSpread = 11

  const goNext = useCallback(() => {
    if (isFlippingRef.current) return
    if (!isOpen) {
      if (isBackCover) {
        openFromBackCover(11)
      } else {
        openBook(0)
      }
    } else if (spread < maxSpread) {
      turnToSpread(spread + 1)
    } else if (spread === maxSpread) {
      closeToBackCover()
    }
  }, [closeToBackCover, isBackCover, isOpen, maxSpread, openBook, openFromBackCover, spread, turnToSpread])

  const goPrevious = useCallback(() => {
    if (isFlippingRef.current) return
    if (!isOpen) {
      if (isBackCover) {
        openFromBackCover(11)
      }
    } else if (spread === 0) {
      closeBook()
    } else {
      turnToSpread(spread - 1)
    }
  }, [closeBook, isBackCover, isOpen, openFromBackCover, spread, turnToSpread])

  const goToChapter = useCallback((number) => {
    if (!isOpen) {
      if (isBackCover) {
        openFromBackCover(number)
      } else {
        openBook(number)
      }
    } else {
      turnToSpread(number)
    }
  }, [isBackCover, isOpen, openBook, openFromBackCover, turnToSpread])

  // Native Apple Books edge click
  const handleSpreadClick = (e) => {
    if (isFlippingRef.current) return
    // Don't turn if user clicked an interactive control
    if (e.target.closest('button, a, audio, video, input, select, textarea, .data-card, .speech-toggle, .back-cover-btn')) {
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    if (clickX > rect.width * 0.58) {
      goNext()
    } else if (clickX < rect.width * 0.42) {
      goPrevious()
    }
  }

  // Keyboard navigation
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
      if (event.key === 'ArrowRight') {
        if (!isOpen && !isBackCover) {
          openBook(0)
        } else if (!isOpen && isBackCover) {
          openFromBackCover(11)
        } else if (isOpen) {
          goNext()
        }
      }
      if (event.key === 'ArrowLeft') {
        if (!isOpen && isBackCover) {
          openFromBackCover(11)
        } else if (isOpen) {
          goPrevious()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrevious, isBackCover, isOpen, openBook, openFromBackCover])

  const showPrevButton = isOpen || (!isOpen && isBackCover)
  const showNextButton = isOpen || (!isOpen && !isBackCover)

  return (
    <main className={`storybook-shell${reduceMotion ? ' reduced-motion' : ''}`}>
      <div className="storybook-controls">
        <BackgroundMusic />
        <button
          className="motion-toggle"
          type="button"
          aria-pressed={reduceMotion}
          aria-label={reduceMotion ? 'Allow full motion' : 'Reduce motion'}
          title={reduceMotion ? 'Allow full motion' : 'Reduce motion'}
          onClick={() => onReduceMotionChange((value) => !value)}
        >
          <Move size={18} strokeWidth={2} aria-hidden="true" />
          <span>{reduceMotion ? 'Motion reduced' : 'Reduce motion'}</span>
        </button>
      </div>

      <section
        ref={bookRef}
        className={`book${isOpen ? ' open' : ''}${!isOpen && isBackCover ? ' back-active' : ''}${isFlipping ? ' is-flipping' : ''}`}
        aria-label={
          isOpen
            ? `The Forgotten Heroes, ${spread === 0 ? 'contents' : `chapter ${spread}`}`
            : isBackCover
            ? 'The Forgotten Heroes, back cover'
            : 'The Forgotten Heroes, closed book'
        }
      >
        <div className="page-stack" aria-hidden="true" />

        {/* Stationary Spread */}
        <div
          className="book-spread"
          aria-hidden={!isOpen}
          style={{ visibility: (isOpen || isFlipping) && !(isBackCover && !isFlipping) ? 'visible' : 'hidden' }}
          onClick={handleSpreadClick}
        >
          {/* Left Stationary Page */}
          <div className="spread-half spread-half-left">
            <PageLeft
              spreadIndex={
                isFlipping && flipState
                  ? flipState.direction === 'next' || flipState.direction === 'close-back'
                    ? flipState.fromSpread
                    : flipState.toSpread
                  : spread
              }
              chapters={chapters}
            />
            <div ref={leftShadowRef} className="page-shadow-overlay shadow-left" aria-hidden="true" />
          </div>

          {/* Center Spine */}
          <div className="book-spine" aria-hidden="true" />

          {/* Right Stationary Page */}
          <div className="spread-half spread-half-right">
            <PageRight
              spreadIndex={
                isFlipping && flipState
                  ? flipState.direction === 'next'
                    ? flipState.toSpread
                    : flipState.direction === 'close-back'
                    ? 11
                    : flipState.fromSpread
                  : spread
              }
              chapters={chapters}
              onSelectChapter={goToChapter}
            />
            <div ref={rightShadowRef} className="page-shadow-overlay shadow-right" aria-hidden="true" />
          </div>
        </div>

        {/* Flipping Leaf (active during 3D page turn) */}
        {isFlipping && flipState && (
          <div
            ref={leafRef}
            className={`flip-leaf flip-${flipState.direction}`}
            aria-hidden="true"
          >
            <div className="leaf-face leaf-face-front">
              {flipState.direction === 'close-back' || flipState.direction === 'open-back' ? (
                <BlankEndpaperPage />
              ) : flipState.direction === 'next' ? (
                <PageRight
                  spreadIndex={flipState.fromSpread}
                  chapters={chapters}
                  onSelectChapter={() => {}}
                />
              ) : (
                <PageLeft
                  spreadIndex={flipState.fromSpread}
                  chapters={chapters}
                />
              )}
              <div className="leaf-shadow-crease" />
              <div ref={leafLightingFrontRef} className="leaf-lighting-overlay" />
            </div>
            <div className="leaf-face leaf-face-back">
              {flipState.direction === 'close-back' || flipState.direction === 'open-back' ? (
                <BackCover
                  onRestart={() => openFromBackCover(1)}
                  onContents={() => openFromBackCover(0)}
                  onReopen={() => openFromBackCover(11)}
                />
              ) : flipState.direction === 'next' ? (
                <PageLeft
                  spreadIndex={flipState.toSpread}
                  chapters={chapters}
                />
              ) : (
                <PageRight
                  spreadIndex={flipState.toSpread}
                  chapters={chapters}
                  onSelectChapter={() => {}}
                />
              )}
              <div className="leaf-shadow-crease" />
              <div ref={leafLightingBackRef} className="leaf-lighting-overlay" />
            </div>
          </div>
        )}

        {/* Front Cover */}
        {!isBackCover && (
          <div
            ref={coverRef}
            className="cover"
            onClick={!isOpen ? () => openBook(0) : undefined}
            onKeyDown={(event) => {
              if (!isOpen && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault()
                openBook(0)
              }
            }}
            role={!isOpen ? 'button' : undefined}
            tabIndex={!isOpen ? 0 : -1}
            aria-label={!isOpen ? 'Open The Forgotten Heroes book' : undefined}
          >
            <div className="cover-inner">
              <span className="cover-kicker">A NASA SPACE APPS STORY</span>
              <h1>The Forgotten Heroes</h1>
              <CoverIllustration />
              <p className="cover-subtitle">Inspired by NASA's open space data</p>
              {!isOpen && (
                <span className="cover-cta">Click or press → to open</span>
              )}
            </div>
          </div>
        )}

        {/* Closed Back Cover */}
        {!isOpen && isBackCover && !isFlipping && (
          <>
            <div className="page-stack-back" aria-hidden="true" />
            <BackCover
              onRestart={() => openFromBackCover(1)}
              onContents={() => openFromBackCover(0)}
              onReopen={() => openFromBackCover(11)}
            />
          </>
        )}

        {/* Navigation Arrows */}
        {showPrevButton && (
          <button
            className="book-arrow book-arrow-previous"
            type="button"
            aria-label={
              !isOpen && isBackCover
                ? 'Reopen book'
                : spread === 0
                ? 'Close book'
                : 'Previous page'
            }
            onClick={(e) => {
              e.stopPropagation()
              goPrevious()
            }}
            disabled={isFlipping}
          >
            <span className="book-chevron" aria-hidden="true">‹</span>
          </button>
        )}
        {showNextButton && (
          <button
            className="book-arrow book-arrow-next"
            type="button"
            aria-label={!isOpen ? 'Open book' : spread === maxSpread ? 'Close book' : 'Next page'}
            disabled={isFlipping}
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
          >
            <span className="book-chevron" aria-hidden="true">›</span>
          </button>
        )}
      </section>
    </main>
  )
}

export default StoryBook