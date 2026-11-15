import { useEffect, useRef, useState } from 'react'

function VideoPlayer({ src, poster, title, onError, autoPlay = false }) {
  const videoRef = useRef(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    return () => {
      video?.pause()
      if (video) video.currentTime = 0
    }
  }, [])

  function handleError() {
    setUnavailable(true)
    onError?.()
  }

  if (!src || unavailable) {
    return (
      <div className="media-placeholder" role="status">
        <span className="media-placeholder-mark" aria-hidden="true">✦</span>
        <span>{unavailable ? 'Chapter video not available yet' : 'Chapter media will appear here'}</span>
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      className="chapter-video"
      controls
      playsInline
      preload="metadata"
      autoPlay={autoPlay}
      poster={poster}
      aria-label={title}
      onError={handleError}
    >
      <source src={src} />
      Your browser does not support video playback.
    </video>
  )
}

export default VideoPlayer