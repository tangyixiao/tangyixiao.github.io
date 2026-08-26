import { useEffect, useRef, useState } from 'react'
import { createDeepSeaController } from './createDeepSeaController'
import type { DeepSeaCanvasProps, DeepSeaController } from './types'

const ASCII_ATOM = '   ·  .  ·\n .  /\\ /\\  .\n·  <  ◉  >  ·\n .  \/\/ \/\/  .\n   ·  |  ·'

export interface DeepSeaCanvasRuntimeProps extends DeepSeaCanvasProps {
  onFallback?: () => void
}

export default function DeepSeaCanvas({ variant, phase, pulse, reducedMotion, onFallback }: DeepSeaCanvasRuntimeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<DeepSeaController | null>(null)
  const latestPropsRef = useRef({ variant, phase, pulse, reducedMotion })
  const latestPhaseRef = useRef(phase)
  const latestPulseRef = useRef(pulse)
  const appliedPulseRef = useRef<number | null>(null)
  const pulseCountRef = useRef(0)
  const renderCountRef = useRef(0)
  const [fallback, setFallback] = useState(false)
  const [controllerPhase, setControllerPhase] = useState<string | null>(null)
  const [controllerPulse, setControllerPulse] = useState<number | null>(null)
  latestPropsRef.current = { variant, phase, pulse, reducedMotion }
  latestPhaseRef.current = phase
  latestPulseRef.current = pulse

  const applyLatestControllerState = (controller: DeepSeaController) => {
    const nextPhase = latestPhaseRef.current
    controller.setPhase(nextPhase)
    setControllerPhase(nextPhase)

    const nextPulse = latestPulseRef.current
    if (nextPulse > 0 && appliedPulseRef.current !== nextPulse) {
      controller.pulse(nextPulse)
      appliedPulseRef.current = nextPulse
      pulseCountRef.current += 1
      setControllerPulse(nextPulse)
    }
  }

  const handleRender = (renderCount: number) => {
    renderCountRef.current = renderCount
    rootRef.current?.setAttribute('data-scene-render-count', String(renderCount))
  }

  useEffect(() => {
    let disposed = false
    const canvas = canvasRef.current
    if (!canvas) return undefined

    appliedPulseRef.current = null
    pulseCountRef.current = 0
    renderCountRef.current = 0
    setControllerPhase(null)
    setControllerPulse(null)
    rootRef.current?.setAttribute('data-scene-controller-pulse-count', '0')
    rootRef.current?.setAttribute('data-scene-render-count', '0')

    const showFallback = () => {
      if (disposed) return
      controllerRef.current?.destroy()
      controllerRef.current = null
      setFallback(true)
      onFallback?.()
    }

    createDeepSeaController(canvas, latestPropsRef.current, showFallback, handleRender)
      .then((controller) => {
        if (disposed) {
          controller.destroy()
          return
        }
        controllerRef.current = controller
        applyLatestControllerState(controller)
        rootRef.current?.setAttribute('data-scene-controller-pulse-count', String(pulseCountRef.current))
      })
      .catch(showFallback)

    return () => {
      disposed = true
      controllerRef.current?.destroy()
      controllerRef.current = null
    }
  }, [onFallback, reducedMotion, variant])

  useEffect(() => {
    latestPhaseRef.current = phase
    const controller = controllerRef.current
    if (!controller) return
    controller.setPhase(phase)
    setControllerPhase(phase)
  }, [phase])

  useEffect(() => {
    latestPulseRef.current = pulse
    const controller = controllerRef.current
    if (!controller || pulse <= 0 || appliedPulseRef.current === pulse) return
    controller.pulse(pulse)
    appliedPulseRef.current = pulse
    pulseCountRef.current += 1
    setControllerPulse(pulse)
    rootRef.current?.setAttribute('data-scene-controller-pulse-count', String(pulseCountRef.current))
  }, [pulse])

  return (
    <div
      ref={rootRef}
      className="deep-sea-scene"
      data-scene-root=""
      data-scene-variant={variant}
      data-scene-phase={phase}
      data-scene-motion={reducedMotion ? 'reduced' : 'full'}
      data-scene-animation={reducedMotion ? 'static' : 'running'}
      data-scene-pulse={pulse.toFixed(3)}
      data-scene-render-count={String(renderCountRef.current)}
      data-scene-controller-phase={controllerPhase ?? 'loading'}
      data-scene-controller-pulse={controllerPulse === null ? 'loading' : controllerPulse.toFixed(3)}
      data-scene-controller-pulse-count={String(pulseCountRef.current)}
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
