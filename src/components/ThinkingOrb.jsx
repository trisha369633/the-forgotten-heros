import { useEffect, useRef } from 'react'
import { thinkingOrbs } from '../utils/thinkingOrbs.js'

export function ThinkingOrb({
  state = 'listening',
  size = 24,
  speed = 1,
  theme = 'auto',
  paused = false,
  ariaLabel,
  className = '',
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const destroy = thinkingOrbs(canvas, {
      state,
      size,
      speed,
      theme,
      paused,
    })

    return () => {
      destroy()
    }
  }, [state, size, speed, theme, paused])

  return (
    <canvas
      ref={canvasRef}
      className={`thinking-orb-canvas ${className}`.trim()}
      data-thinking-orb
      data-orb-state={state}
      data-orb-size={size}
      data-orb-speed={speed}
      data-orb-theme={theme}
      data-orb-paused={paused}
      aria-label={ariaLabel || `Agent ${state}`}
    />
  )
}

export default ThinkingOrb
