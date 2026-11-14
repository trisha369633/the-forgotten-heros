import { useEffect, useRef, useState } from 'react'

function AudioPlayer({ src }) {
  const audioRef = useRef(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    return () => {
      audio?.pause()
    }
  }, [])

  return (
    <div className="narration-player">
      <div className="narration-heading">
        <span className="narration-label">LISTEN TO THE CHAPTER</span>
        {unavailable && <span className="audio-status">Narration audio not added yet</span>}
      </div>
      <audio
        ref={audioRef}
        className="audio-controls"
        controls
        preload="none"
        src={src}
        aria-label="Chapter narration"
        onError={() => setUnavailable(true)}
      >
        Your browser does not support audio playback.
      </audio>
    </div>
  )
}

export default AudioPlayer