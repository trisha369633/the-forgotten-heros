import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Mic, Move, Volume2, VolumeX } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import VideoPlayer from './VideoPlayer.jsx'
import { chapters } from '../data/chapters.js'
import { questions } from '../data/quiz.js'
import './StoryBook.css'

const QUIZ_QUESTIONS_PER_PAGE = 3
const QUIZ_PAGES = 2
const BACKGROUND_MUSIC_VOLUME = 0.3
const DUCKED_BACKGROUND_MUSIC_VOLUME = 0.2
const mediaAvailabilityCache = new Map()
const narrationStopHandlers = new Set()
const activeNarrations = new Set()
const supportsVoiceContentType = (contentType) => (
  contentType.startsWith('audio/') || contentType === 'video/mp4'
)
const supportsVideoContentType = (contentType) => contentType.startsWith('video/')

function updateBackgroundMusicVolume() {
  const audio = document.getElementById('background-music')
  if (audio) {
    audio.volume = activeNarrations.size
      ? DUCKED_BACKGROUND_MUSIC_VOLUME
      : BACKGROUND_MUSIC_VOLUME
  }
}

function setNarrationActive(audio, isActive) {
  if (!audio) return
  if (isActive) {
    activeNarrations.add(audio)
  } else {
    activeNarrations.delete(audio)
  }
  updateBackgroundMusicVolume()
}

function stopActiveNarrations() {
  narrationStopHandlers.forEach((stop) => stop())
}

const displayedQuizQuestions = questions.slice(0, QUIZ_QUESTIONS_PER_PAGE * QUIZ_PAGES)
const quizPages = Array.from({ length: QUIZ_PAGES }, (_, pageIndex) => {
  const questionStart = pageIndex * QUIZ_QUESTIONS_PER_PAGE
  return {
    questionStart,
    questions: displayedQuizQuestions.slice(questionStart, questionStart + QUIZ_QUESTIONS_PER_PAGE),
  }
})

const chapterFirstSpreads = new Map()
const bookSpreads = [{ chapter: null, type: 'contents' }]

chapters.forEach((chapter) => {
  chapterFirstSpreads.set(chapter.number, bookSpreads.length)
  if (chapter.number === 10) {
    quizPages.forEach((quizPage, quizPageIndex) => {
      bookSpreads.push({ chapter, type: 'quiz', quizPageIndex, ...quizPage })
    })
  } else {
    bookSpreads.push({ chapter, type: 'chapter' })
  }
})

const lastSpreadIndex = bookSpreads.length - 1
const firstSpreadForChapter = (chapterNumber) => chapterFirstSpreads.get(chapterNumber) ?? 0
const chapterNumberForSpread = (spreadIndex) => bookSpreads[spreadIndex]?.chapter?.number ?? 1

function BackgroundMusic({ isModalOpen }) {
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const modalWasOpenRef = useRef(false)
  const wasPlayingBeforeModalRef = useRef(false)
  const playbackAttemptRef = useRef(0)

  useEffect(() => {
    const audio = document.getElementById('background-music')
    if (!audio) return

    const attempt = ++playbackAttemptRef.current
    updateBackgroundMusicVolume()
    audio.play()
      .then(() => {
        if (attempt !== playbackAttemptRef.current) return
        setEnabled(true)
        setMessage('')
      })
      .catch((error) => {
        if (attempt !== playbackAttemptRef.current) return
        setEnabled(false)
        setMessage(
          error?.name === 'NotAllowedError'
            ? 'Autoplay was blocked. Click to start background sound.'
            : 'Background sound could not be played.',
        )
      })

    return () => {
      playbackAttemptRef.current += 1
      audio.pause()
    }
  }, [])

  useEffect(() => {
    const audio = document.getElementById('background-music')

    if (isModalOpen && !modalWasOpenRef.current) {
      modalWasOpenRef.current = true
      wasPlayingBeforeModalRef.current = enabled
      playbackAttemptRef.current += 1
      if (enabled && audio) {
        audio.pause()
      }
      return
    }

    if (!isModalOpen && modalWasOpenRef.current) {
      modalWasOpenRef.current = false
      if (!wasPlayingBeforeModalRef.current) return

      wasPlayingBeforeModalRef.current = false
      if (!audio) return

      const attempt = ++playbackAttemptRef.current
      updateBackgroundMusicVolume()
      audio.play()
        .then(() => {
          if (attempt !== playbackAttemptRef.current) return
          setEnabled(true)
          setMessage('')
        })
        .catch((error) => {
          if (attempt !== playbackAttemptRef.current) return
          setEnabled(false)
          setMessage(
            error?.name === 'NotAllowedError'
              ? 'Click to resume background sound.'
              : 'Background sound could not be played.',
          )
        })
    }
  }, [enabled, isModalOpen])

  async function toggleMusic() {
    const audio = document.getElementById('background-music')
    if (!audio) return

    if (enabled) {
      playbackAttemptRef.current += 1
      audio.pause()
      setEnabled(false)
      setMessage('')
      return
    }

    const attempt = ++playbackAttemptRef.current
    try {
      updateBackgroundMusicVolume()
      await audio.play()
      if (attempt !== playbackAttemptRef.current) return
      setEnabled(true)
      setMessage('')
    } catch (error) {
      if (attempt !== playbackAttemptRef.current) return
      setEnabled(false)
      setMessage(
        error?.name === 'NotAllowedError'
          ? 'Click to allow background sound.'
          : 'Background sound could not be played.',
      )
    }
  }

  return (
    <div className="sound-control">
      <audio
        id="background-music"
        src="/backgrounds/backgroundsound.wav"
        loop
        preload="none"
        onError={() => {
          setEnabled(false)
          setMessage('Background sound could not be loaded.')
        }}
      />
      <button
        className="music-toggle"
        type="button"
        onClick={toggleMusic}
        aria-pressed={enabled}
        aria-label={enabled ? 'Mute background sound' : 'Play background sound'}
        title={message || (enabled ? 'Mute background sound' : 'Play background sound')}
      >
        {enabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
        <span>Background sound</span>
      </button>
    </div>
  )
}

function useMediaAvailable(src, supportsContentType) {
  const [result, setResult] = useState(null)

  useEffect(() => {
    let active = true

    if (!src || mediaAvailabilityCache.has(src)) return () => {
      active = false
    }

    fetch(src, { method: 'HEAD' })
      .then((response) => {
        const contentType = response.headers.get('content-type')?.toLowerCase() || ''
        const available = response.ok && supportsContentType(contentType)
        mediaAvailabilityCache.set(src, available)
        if (active) setResult({ src, available })
      })
      .catch(() => {
        mediaAvailabilityCache.set(src, false)
        if (active) setResult({ src, available: false })
      })

    return () => {
      active = false
    }
  }, [src, supportsContentType])

  if (!src) return false
  if (mediaAvailabilityCache.has(src)) return mediaAvailabilityCache.get(src)
  return result?.src === src && result.available
}

function ChapterMedia({ chapter, onOpenVideo }) {
  const [imageUnavailable, setImageUnavailable] = useState(false)
  const [isVideo, setIsVideo] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const videoAvailable = useMediaAvailable(chapter.media.video, supportsVideoContentType)
  const usesVideoDialog = chapter.number >= 3 && chapter.number <= 8

  const handleVideoError = () => {
    if (usesVideoDialog) return
    setIsVideo(false)
    setVideoFailed(true)
    if (chapter.media.video) mediaAvailabilityCache.set(chapter.media.video, false)
  }

  return (
    <div className="chapter-media-block">
      <div className="media-frame">
        {isVideo ? (
          <VideoPlayer
            src={chapter.media.video}
            poster={chapter.media.src}
            title={`Chapter ${chapter.number} video`}
            onError={handleVideoError}
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
            src={chapter.media.src}
            alt={`Illustration for ${chapter.title || `chapter ${chapter.number}`}`}
            loading="eager"
            decoding="async"
            onError={() => setImageUnavailable(true)}
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
      {videoAvailable && !videoFailed && (
        usesVideoDialog ? (
          <button
            className="nasa-video-button book-type"
            type="button"
            aria-label={`Play NASA's real video for chapter ${chapter.number}`}
            aria-haspopup="dialog"
            onClick={(event) => {
              event.stopPropagation()
              onOpenVideo?.({
                chapter,
                src: chapter.media.video,
                poster: chapter.media.src,
                trigger: event.currentTarget,
                onError: handleVideoError,
              })
            }}
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 1.8v8.4L10 6 3 1.8Z" fill="currentColor" />
            </svg>
            <span>NASA's real video</span>
          </button>
        ) : chapter.number === 1 ? (
          <button
            className="watch-video-button book-type"
            type="button"
            aria-label={`${isVideo ? 'Show image' : 'Watch video'} for chapter ${chapter.number}`}
            onClick={(event) => {
              event.stopPropagation()
              setIsVideo((visible) => !visible)
            }}
          >
            {!isVideo && (
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 1.8v8.4L10 6 3 1.8Z" fill="currentColor" />
              </svg>
            )}
            <span>{isVideo ? 'Show image' : 'Watch video'}</span>
          </button>
        ) : null
      )}
    </div>
  )
}

function VideoModal({ video, onClose, reduceMotion }) {
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      if (video.trigger?.isConnected) video.trigger.focus()
    }
  }, [video.trigger])

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = [...dialogRef.current.querySelectorAll(
      'button:not(:disabled), video[controls], a[href], [tabindex]:not([tabindex="-1"])',
    )]
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className={`video-modal-backdrop${reduceMotion ? ' reduced-motion' : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="video-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`NASA's real video, Chapter ${video.chapter.number}`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <p className="video-modal-caption">
          NASA's real video · Chapter {video.chapter.number}: {video.chapter.title}
        </p>
        <div className="video-modal-frame">
          <button
            ref={closeButtonRef}
            className="video-modal-close"
            type="button"
            aria-label="Close video"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
          {loadError ? (
            <div className="video-modal-error" role="status">
              This video could not be loaded.
            </div>
          ) : (
            <VideoPlayer
              src={video.src}
              poster={video.poster}
              title={`NASA's real video, Chapter ${video.chapter.number}`}
              autoPlay
              onError={() => {
                setLoadError(true)
                video.onError?.()
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ChapterNarration({ chapter }) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioFailed, setAudioFailed] = useState(false)
  const audioAvailable = useMediaAvailable(chapter.audio, supportsVoiceContentType)
  const canListen = Boolean(chapter.audio) && audioAvailable && !audioFailed

  const stop = useCallback((updateState = true) => {
    if (audioRef.current) {
      setNarrationActive(audioRef.current, false)
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (updateState) setIsPlaying(false)
  }, [])

  useEffect(() => {
    narrationStopHandlers.add(stop)
    return () => {
      narrationStopHandlers.delete(stop)
      stop(false)
    }
  }, [stop])

  async function togglePlayback(e) {
    e.stopPropagation()
    if (isPlaying) {
      stop()
      return
    }

    const audio = audioRef.current
    if (!audio || !audioAvailable || audioFailed) return

    try {
      audio.currentTime = 0
      const playback = audio.play()
      setNarrationActive(audio, true)
      setIsPlaying(true)
      await playback
    } catch {
      setNarrationActive(audio, false)
      audio.pause()
      audio.currentTime = 0
      mediaAvailabilityCache.set(chapter.audio, false)
      setAudioFailed(true)
      setIsPlaying(false)
    }
  }

  if (!canListen) return null

  return (
    <div className="chapter-narration" onClick={(e) => e.stopPropagation()}>
      <audio
        ref={audioRef}
        className="narration-audio"
        src={chapter.audio}
        preload="none"
        onError={() => {
          setNarrationActive(audioRef.current, false)
          mediaAvailabilityCache.set(chapter.audio, false)
          setAudioFailed(true)
          setIsPlaying(false)
        }}
        onEnded={() => {
          setNarrationActive(audioRef.current, false)
          setIsPlaying(false)
        }}
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        className={`speech-toggle${isPlaying ? ' playing' : ''}`}
        type="button"
        aria-pressed={isPlaying}
        onClick={togglePlayback}
        title={isPlaying ? 'Stop listening' : 'Listen to the story'}
      >
        <Mic size={15} strokeWidth={2} aria-hidden="true" />
        <span>{isPlaying ? 'Stop listening' : 'Listen to the story'}</span>
      </button>
    </div>
  )
}

function QuizQuestion({ item, questionIndex, spreadIndex, selectedAnswer, onAnswer }) {
  const isAnswered = selectedAnswer !== undefined
  const isCorrect = selectedAnswer === item.answer
  const optionLetter = (index) => String.fromCharCode(65 + index)

  return (
    <section
      className="quiz-question"
      role="group"
      aria-labelledby={`quiz-question-${spreadIndex}-${questionIndex}`}
    >
      <h3
        className="quiz-question-text"
        id={`quiz-question-${spreadIndex}-${questionIndex}`}
      >
        {questionIndex + 1}. {item.question}
      </h3>
      <div className="quiz-options">
        {item.options.map((option, optionIndex) => {
          const isSelected = selectedAnswer === optionIndex
          const isRightAnswer = item.answer === optionIndex
          const optionClass = [
            'quiz-option',
            isAnswered && isRightAnswer ? 'is-correct' : '',
            isAnswered && isSelected && !isRightAnswer ? 'is-wrong' : '',
          ].filter(Boolean).join(' ')

          return (
            <button
              className={optionClass}
              key={option}
              type="button"
              disabled={isAnswered}
              aria-pressed={isAnswered ? isSelected : undefined}
              onClick={() => onAnswer(questionIndex, optionIndex)}
            >
              <span className="quiz-option-letter">{optionLetter(optionIndex)})</span>
              <span className="quiz-option-text">{option}</span>
              {isAnswered && isRightAnswer && (
                <svg className="quiz-option-icon" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m3 8 3.2 3.2L13 4.5" />
                </svg>
              )}
              {isAnswered && isSelected && !isRightAnswer && (
                <svg className="quiz-option-icon" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m4 4 8 8m0-8-8 8" />
                </svg>
              )}
            </button>
          )
        })}
      </div>
      <div className="quiz-answer-feedback" aria-live="polite">
        {isAnswered && isCorrect && 'Correct!'}
        {isAnswered && !isCorrect &&
          `Not quite — the answer is ${optionLetter(item.answer)}) ${item.options[item.answer]}.`}
      </div>
    </section>
  )
}

function PageNumber({ children }) {
  return <div className="page-number">{children}</div>
}

function QuizCompletion({ quizAnswers, onTryAgain }) {
  const answeredCount = displayedQuizQuestions.reduce(
    (count, _, index) => count + (quizAnswers[index] !== undefined ? 1 : 0),
    0,
  )

  if (answeredCount !== displayedQuizQuestions.length || displayedQuizQuestions.length === 0) return null

  const score = displayedQuizQuestions.reduce(
    (count, question, index) => count + (quizAnswers[index] === question.answer ? 1 : 0),
    0,
  )

  return (
    <div className="quiz-completion">
      <p>You scored {score} of {displayedQuizQuestions.length}</p>
      <button
        className="speech-toggle quiz-try-again"
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onTryAgain()
        }}
      >
        Try again
      </button>
    </div>
  )
}

function BackCover({ onReopen }) {
  return (
    <div
      className="back-cover"
      role="group"
      aria-label="Back cover of The Forgotten Heroes"
    >
      <div className="back-cover-spine-edge" aria-hidden="true" />
      <div className="back-cover-inner">
        <svg className="back-cover-illustration" viewBox="0 0 300 220" aria-hidden="true">
          <defs>
            <radialGradient id="back-cover-planet" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#94add8" />
              <stop offset="60%" stopColor="#2b4170" />
              <stop offset="100%" stopColor="#101935" />
            </radialGradient>
            <filter id="back-cover-glow" x="-20%" y="-20%" width="140%" height="140%">
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
          <circle cx="150" cy="110" r="58" fill="url(#back-cover-planet)" />
          <circle cx="262" cy="73" r="6" fill="#f3ece0" filter="url(#back-cover-glow)" />
        </svg>
        <h2 className="back-cover-title">The Forgotten Heroes</h2>
        <p className="back-cover-subtitle">Inspired by NASA’s open space data</p>
      </div>
      <button
        className="book-arrow book-arrow-previous cover-navigation back-cover-reopen"
        type="button"
        aria-label="Reopen book"
        onClick={(event) => {
          event.stopPropagation()
          onReopen?.()
        }}
      >
        <span className="book-arrow-icon" aria-hidden="true">‹</span>
        <span className="book-arrow-text">RETURN</span>
      </button>
    </div>
  )
}

function PageLeft({ spreadIndex, quizAnswers, onQuizAnswer }) {
  const spread = bookSpreads[spreadIndex]

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

  const chapter = spread?.chapter
  if (!chapter) return <article className="book-page story-page" />

  if (chapter.number === 10) {
    const isFirstQuizPage = spread.quizPageIndex === 0
    return (
      <article className="book-page story-page book-type quiz-page">
        <div className="page-inner">
          {isFirstQuizPage ? (
            <div className="chapter-header-group">
              <h1 className="chapter-heading">Chapter {chapter.number}</h1>
              <h2 className="chapter-subtitle">{chapter.title}</h2>
            </div>
          ) : (
            <div className="quiz-page-header">Chapter 10 · {chapter.title}</div>
          )}
          <div className="quiz-content">
            <div className="quiz-questions">
              {spread.questions.map((item, index) => {
                const questionIndex = spread.questionStart + index
                return (
                  <QuizQuestion
                    key={questionIndex}
                    item={item}
                    questionIndex={questionIndex}
                    spreadIndex={spreadIndex}
                    selectedAnswer={quizAnswers[questionIndex]}
                    onAnswer={onQuizAnswer}
                  />
                )
              })}
            </div>
          </div>
          <PageNumber>{spreadIndex * 2 + 1}</PageNumber>
        </div>
      </article>
    )
  }

  const ChapterContent = chapter.Content

  return (
    <article className="book-page story-page book-type">
      <div className="page-inner">
        <div className="chapter-header-group">
          <h1 className="chapter-heading">Chapter {chapter.number}</h1>
          <h2 className="chapter-subtitle">{chapter.title || 'Original title pending'}</h2>
        </div>
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
          <ChapterNarration
            key={`${chapter.id}-${spreadIndex}`}
            chapter={chapter}
          />
        )}
        <PageNumber>{spreadIndex * 2 + 1}</PageNumber>
      </div>
    </article>
  )
}

function QuizEndPage({ quizAnswers, onTryAgain }) {
  return (
    <article className="book-page media-page book-type quiz-end-page">
      <div className="page-inner quiz-end-inner">
        <div className="quiz-end-content">
          <span className="quiz-end-divider" aria-hidden="true" />
          <h1>The End</h1>
          <span className="quiz-end-divider" aria-hidden="true" />
          <QuizCompletion quizAnswers={quizAnswers} onTryAgain={onTryAgain} />
        </div>
      </div>
    </article>
  )
}

function PageRight({ spreadIndex, chapters, onSelectChapter, onOpenVideo, quizAnswers, onTryAgain }) {
  if (spreadIndex === 0) {
    return (
      <article className="book-page media-page contents-page book-type">
        <div className="page-inner contents-content">
          <h1 className="contents-heading">Chapters</h1>
          <ol className="contents-list">
            {chapters.map((item) => {
              const isAvailable = Boolean(item.title)
              const title = isAvailable ? item.title : 'Coming soon'
              const firstSpread = chapterFirstSpreads.get(item.number)
              const page = firstSpread * 2 + 1

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
                      <span className="entry-text">Chapter {item.number}: {title}</span>
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

  const spread = bookSpreads[spreadIndex]
  const chapter = spread?.chapter
  if (!chapter) return <article className="book-page media-page" />

  if (spread.type === 'quiz' && spread.quizPageIndex === QUIZ_PAGES - 1) {
    return <QuizEndPage quizAnswers={quizAnswers} onTryAgain={onTryAgain} />
  }

  return (
    <article className="book-page media-page">
      <div className="page-inner media-content">
        <ChapterMedia key={chapter.id} chapter={chapter} onOpenVideo={onOpenVideo} />
        <PageNumber>{spreadIndex * 2 + 2}</PageNumber>
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
    !startClosed && chapter?.number ? firstSpreadForChapter(chapter.number) : 0
  ))
  const [quizAnswers, setQuizAnswers] = useState({})
  const [activeVideo, setActiveVideo] = useState(null)
  const [flipState, setFlipState] = useState(null)
  const [isFlipping, setIsFlipping] = useState(false)

  const isFlippingRef = useRef(false)
  const pendingSpreadRef = useRef(null)
  const bookRef = useRef(null)
  const coverRef = useRef(null)
  const leafRef = useRef(null)
  const leftShadowRef = useRef(null)
  const rightShadowRef = useRef(null)
  const leafLightingFrontRef = useRef(null)
  const leafLightingBackRef = useRef(null)

  const openVideo = useCallback((video) => {
    stopActiveNarrations()
    setActiveVideo({ ...video, spreadIndex: spread })
  }, [spread])
  const closeVideo = useCallback(() => setActiveVideo(null), [])

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
      const pendingSpread = pendingSpreadRef.current
      const pendingChapter = pendingSpread === null
        ? null
        : bookSpreads[pendingSpread]?.chapter?.number
      const targetSpread = pendingChapter === chapter.number
        ? pendingSpread
        : firstSpreadForChapter(chapter.number)
      pendingSpreadRef.current = null
      setIsOpen(true)
      setSpread(targetSpread)
      if (bookRef.current) {
        gsap.set(bookRef.current, { xPercent: 0, x: 0 })
      }
      if (coverRef.current) {
        gsap.set(coverRef.current, { rotationY: -180 })
      }
    }
  }, [activeVideo, chapter?.id, chapter?.number, startClosed])

  useLayoutEffect(() => {
    if (isOpen && spread === 0 && coverRef.current) {
      gsap.set(coverRef.current, { rotationY: -180 })
    }
  }, [isOpen, spread])

  // Open the book from closed cover
  const openBook = useCallback((targetSpread = 0) => {
    if (isFlippingRef.current) return
    stopActiveNarrations()
    setActiveVideo(null)
    isFlippingRef.current = true
    setIsFlipping(true)

    const tl = gsap.timeline({
      onComplete: () => {
        setIsOpen(true)
        setSpread(targetSpread)
        setIsFlipping(false)
        isFlippingRef.current = false
        if (targetSpread > 0) {
          pendingSpreadRef.current = targetSpread
          navigate(chapterPath(chapterNumberForSpread(targetSpread)))
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
    stopActiveNarrations()
    setActiveVideo(null)
    isFlippingRef.current = true
    setIsFlipping(true)
    setIsBackCover(false)

    const tl = gsap.timeline({
      onComplete: () => {
        setIsOpen(false)
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

  // Close the book forward to the back cover
  const closeToBackCover = useCallback(() => {
    if (isFlippingRef.current) return
    stopActiveNarrations()
    setActiveVideo(null)
    isFlippingRef.current = true
    setIsFlipping(true)

    setFlipState({
      direction: 'close-back',
      fromSpread: lastSpreadIndex,
      toSpread: lastSpreadIndex,
    })
  }, [])

  // Reopen the book from the back cover
  const openFromBackCover = useCallback((targetSpread = lastSpreadIndex) => {
    if (isFlippingRef.current) return
    stopActiveNarrations()
    setActiveVideo(null)
    isFlippingRef.current = true
    setIsFlipping(true)

    setIsOpen(true)
    setIsBackCover(false)
    setSpread(targetSpread)
    setFlipState({
      direction: 'open-back',
      fromSpread: lastSpreadIndex,
      toSpread: targetSpread,
    })
  }, [])

  // Turn page forward or backward with 3D leaf flip
  const turnToSpread = useCallback((targetSpread) => {
    if (isFlippingRef.current || targetSpread === spread) return
    stopActiveNarrations()
    setActiveVideo(null)
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
        xPercent: isMobileLayout ? 0 : -25,
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
      gsap.set(bookRef.current, { xPercent: isMobileLayout ? 0 : -25 })
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
          pendingSpreadRef.current = toSpread
          navigate(chapterPath(chapterNumberForSpread(toSpread)))
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
        pendingSpreadRef.current = toSpread
        navigate(chapterPath(chapterNumberForSpread(toSpread)))
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

  const maxSpread = lastSpreadIndex
  const activeChapter = bookSpreads[spread]?.chapter
  const activeChapterLabel = activeChapter?.number === 10
    ? `chapter 10: ${activeChapter.title}`
    : `chapter ${chapterNumberForSpread(spread)}`

  const goNext = useCallback(() => {
    if (isFlippingRef.current) return
    if (!isOpen) {
      openBook(0)
    } else if (spread < maxSpread) {
      turnToSpread(spread + 1)
    } else if (spread === maxSpread) {
      closeToBackCover()
    }
  }, [closeToBackCover, isOpen, maxSpread, openBook, spread, turnToSpread])

  const goPrevious = useCallback(() => {
    if (isFlippingRef.current) return
    if (!isOpen && isBackCover) {
      openFromBackCover(lastSpreadIndex)
      return
    }
    if (!isOpen) return
    if (spread === 0) {
      closeBook()
    } else {
      turnToSpread(spread - 1)
    }
  }, [closeBook, isBackCover, isOpen, openFromBackCover, spread, turnToSpread])

  const goToChapter = useCallback((number) => {
    const targetSpread = firstSpreadForChapter(number)
    if (!isOpen) {
      openBook(targetSpread)
    } else {
      turnToSpread(targetSpread)
    }
  }, [isOpen, openBook, turnToSpread])

  const handleQuizAnswer = useCallback((questionIndex, answerIndex) => {
    setQuizAnswers((currentAnswers) => (
      currentAnswers[questionIndex] === undefined
        ? { ...currentAnswers, [questionIndex]: answerIndex }
        : currentAnswers
    ))
  }, [])

  const handleTryAgain = useCallback(() => {
    setQuizAnswers({})
    goToChapter(10)
  }, [goToChapter])

  // Native Apple Books edge click
  const handleSpreadClick = (e) => {
    if (isFlippingRef.current) return
    // Don't turn if user clicked an interactive control
    if (e.target.closest('button, a, audio, video, input, select, textarea, .data-card, .speech-toggle')) {
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
      if (activeVideo) return
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
        } else if (isOpen) {
          if (spread === maxSpread) {
            closeToBackCover()
          } else {
            goNext()
          }
        }
      }
      if (event.key === 'ArrowLeft') {
        if (!isOpen && isBackCover) {
          openFromBackCover(lastSpreadIndex)
        } else if (isOpen) {
          goPrevious()
        }
      }
    }

    function handlePopState() {
      closeVideo()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [activeVideo, closeToBackCover, closeVideo, goNext, goPrevious, isBackCover, isOpen, maxSpread, openBook, openFromBackCover, spread])

  const showPrevButton = isOpen
  const showNextButton = isOpen || (!isOpen && !isBackCover)

  return (
    <main className={`storybook-shell${reduceMotion ? ' reduced-motion' : ''}`}>
      <div className="storybook-controls">
        <BackgroundMusic isModalOpen={Boolean(activeVideo)} />
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
            ? `The Forgotten Heroes, ${spread === 0 ? 'contents' : activeChapterLabel}`
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
          style={{ visibility: isOpen || isFlipping ? 'visible' : 'hidden' }}
          onClick={handleSpreadClick}
        >
          {/* Left Stationary Page */}
          <div className="spread-half spread-half-left">
            <PageLeft
              spreadIndex={
                isFlipping && flipState
                  ? flipState.direction === 'next'
                    ? flipState.fromSpread
                    : flipState.toSpread
                  : spread
              }
              quizAnswers={quizAnswers}
              onQuizAnswer={handleQuizAnswer}
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
                    : flipState.fromSpread
                  : spread
              }
              chapters={chapters}
              onSelectChapter={goToChapter}
              onOpenVideo={openVideo}
              quizAnswers={quizAnswers}
              onTryAgain={handleTryAgain}
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
              {flipState.direction === 'next' ? (
                <PageRight
                  spreadIndex={flipState.fromSpread}
                  chapters={chapters}
                  onSelectChapter={() => {}}
                  quizAnswers={quizAnswers}
                  onTryAgain={handleTryAgain}
                />
              ) : (
                <PageLeft
                  spreadIndex={flipState.fromSpread}
                  quizAnswers={quizAnswers}
                  onQuizAnswer={handleQuizAnswer}
                />
              )}
              <div className="leaf-shadow-crease" />
              <div ref={leafLightingFrontRef} className="leaf-lighting-overlay" />
            </div>
            <div className="leaf-face leaf-face-back">
              {flipState.direction === 'next' ? (
                <PageLeft
                  spreadIndex={flipState.toSpread}
                  quizAnswers={quizAnswers}
                  onQuizAnswer={handleQuizAnswer}
                />
              ) : (
                <PageRight
                  spreadIndex={flipState.toSpread}
                  chapters={chapters}
                  onSelectChapter={() => {}}
                  quizAnswers={quizAnswers}
                  onTryAgain={handleTryAgain}
                />
              )}
              <div className="leaf-shadow-crease" />
              <div ref={leafLightingBackRef} className="leaf-lighting-overlay" />
            </div>
          </div>
        )}

        {/* Front Cover */}
        {(!isOpen || spread === 0) && !isBackCover && (
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
            </div>
          </div>
        )}

        {!isOpen && isBackCover && !isFlipping && (
          <BackCover onReopen={() => openFromBackCover(lastSpreadIndex)} />
        )}

        {/* Navigation Arrows */}
        {showPrevButton && (
          <button
            className={`book-arrow book-arrow-previous${!isOpen ? ' cover-navigation' : ''}`}
            type="button"
            aria-label={!isOpen && isBackCover ? 'Reopen book' : spread === 0 ? 'Close book' : 'Previous page'}
            onClick={(e) => {
              e.stopPropagation()
              goPrevious()
            }}
            disabled={isFlipping || Boolean(activeVideo)}
          >
            <span className="book-arrow-icon" aria-hidden="true">‹</span>
            <span className="book-arrow-text">{!isOpen && isBackCover ? 'RETURN' : 'BACK'}</span>
          </button>
        )}
        {showNextButton && (
          <button
            className={`book-arrow book-arrow-next${!isOpen ? ' cover-navigation' : ''}`}
            type="button"
            aria-label={!isOpen ? 'Open book' : spread === maxSpread ? 'Close book' : 'Next page'}
            disabled={isFlipping || Boolean(activeVideo) || (!isOpen && isBackCover)}
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
          >
            <span className="book-arrow-text">{!isOpen ? 'OPEN BOOK' : 'NEXT'}</span>
            <span className="book-arrow-icon" aria-hidden="true">›</span>
          </button>
        )}
      </section>
      {activeVideo && (
        <VideoModal
          key={activeVideo.src}
          video={activeVideo}
          onClose={closeVideo}
          reduceMotion={reduceMotion}
        />
      )}
    </main>
  )
}

export default StoryBook