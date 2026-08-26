import { useEffect, useRef, useState } from 'react'
import { createDeepSeaController } from './createDeepSeaController'
import type { DeepSeaCanvasProps, DeepSeaController } from './types'

const ASCII_ATOM = '   ·  .  ·\n .  /\\ /\\  .\n·  <  ◉  >  ·\n .  \/\/ \/\/  .\n   ·  |  ·'

export interface DeepSeaCanvasRuntimeProps extends DeepSeaCanvasProps {
  onFallback?: () => void
}

export default function DeepSeaCanvas({ variant, phase, pulse, reducedMotion, onFallback }: DeepSeaCanvasRuntimeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controllerRef = useRef<DeepSeaController | null>(null)
  const latestPropsRef = useRef({ variant, phase, pulse, reducedMotion })
  const [fallback, setFallback] = useState(false)
  latestPropsRef.current = { variant, phase, pulse, reducedMotion }

  useEffect(() => {
    let disposed = false
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const showFallback = () => {
      if (disposed) return
      controllerRef.current?.destroy()
      controllerRef.current = null
      setFallback(true)
      onFallback?.()
    }

    createDeepSeaController(canvas, latestPropsRef.current, showFallback)
      .then((controller) => {
        if (disposed) {
          controller.destroy()
          return
        }
        controllerRef.current = controller
      })
      .catch(showFallback)

    return () => {
      disposed = true
      controllerRef.current?.destroy()
      controllerRef.current = null
    }
  }, [onFallback, reducedMotion, variant])

  useEffect(() => {
    controllerRef.current?.setPhase(phase)
  }, [phase])

  useEffect(() => {
    if (pulse > 0) controllerRef.current?.pulse(pulse)
  }, [pulse])

  return (
    <div
      className="deep-sea-scene"
      data-scene-root=""
      data-scene-variant={variant}
      data-scene-phase={phase}
      data-scene-motion={reducedMotion ? 'reduced' : 'full'}
      data-scene-animation={reducedMotion ? 'static' : 'running'}
      data-scene-pulse={pulse.toFixed(3)}
      data-scene-fallback={fallback ? 'active' : 'inactive'}
      data-scene-particles="360"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="deep-sea-canvas" data-scene-canvas="" />
      <div className="deep-sea-fallback" role={fallback ? 'status' : undefined} aria-label={fallback ? 'Deep-sea scene fallback' : undefined}>
        <span className="deep-sea-fallback-gradient" />
        <pre>{ASCII_ATOM}</pre>
      </div>
    </div>
  )
}
