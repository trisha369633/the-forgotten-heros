import { useState } from 'react'

function VideoPlayer({ src, poster, title }) {
  const [unavailable, setUnavailable] = useState(false)

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
      className="chapter-video"
      controls
      preload="metadata"
      poster={poster}
      aria-label={title}
      onError={() => setUnavailable(true)}
    >
      <source src={src} />
      Your browser does not support video playback.
    </video>
  )
}

export default VideoPlayer