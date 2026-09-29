import { useEffect, useRef, useState } from 'react'
import { createUniverseController, particleCountForWidth } from './createUniverseController'
import type { ScenePhase, SceneTheme, UniverseCanvasProps, UniverseController } from './types'

export default function UniverseCanvas({ phase, theme, pulse, reducedMotion }: UniverseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<UniverseController | null>(null)
  const latestRef = useRef({ phase, theme, pulse, reducedMotion })
  const appliedPulseRef = useRef<number | null>(null)
  const [fallback, setFallback] = useState(false)
  const [controllerPhase, setControllerPhase] = useState<ScenePhase | 'loading'>('loading')
  const [controllerTheme, setControllerTheme] = useState<SceneTheme | 'loading'>('loading')
  const [controllerPulse, setControllerPulse] = useState<number | null>(null)
  latestRef.current = { phase, theme, pulse, reducedMotion }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    let disposed = false
    appliedPulseRef.current = null
    setFallback(false)
    setControllerPhase('loading')
    setControllerTheme('loading')
    setControllerPulse(null)
    rootRef.current?.setAttribute('data-scene-render-count', '0')
    rootRef.current?.setAttribute('data-scene-controller-pulse-count', '0')

    const showFallback = () => {
      if (disposed) return
      controllerRef.current?.destroy()
      controllerRef.current = null
      setFallback(true)
    }
    const onRender = (count: number) => rootRef.current?.setAttribute('data-scene-render-count', String(count))

    createUniverseController(canvas, latestRef.current, showFallback, onRender).then((controller) => {
      if (disposed) { controller.destroy(); return }
      controllerRef.current = controller
      const current = latestRef.current
      controller.setTheme(current.theme)
      controller.setPhase(current.phase)
      setControllerTheme(current.theme)
      setControllerPhase(current.phase)
      if (current.pulse > 0) {
        controller.pulse(current.pulse)
        appliedPulseRef.current = current.pulse
        setControllerPulse(current.pulse)
        rootRef.current?.setAttribute('data-scene-controller-pulse-count', '1')
      }
    }).catch(showFallback)

    return () => {
      disposed = true
      controllerRef.current?.destroy()
      controllerRef.current = null
    }
  }, [reducedMotion])

  useEffect(() => {
    controllerRef.current?.setPhase(phase)
    if (controllerRef.current) setControllerPhase(phase)
  }, [phase])

  useEffect(() => {
    controllerRef.current?.setTheme(theme)
    if (controllerRef.current) setControllerTheme(theme)
  }, [theme])

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller || pulse <= 0 || appliedPulseRef.current === pulse) return
    controller.pulse(pulse)
    appliedPulseRef.current = pulse
    setControllerPulse(pulse)
    const root = rootRef.current
    if (root) root.setAttribute('data-scene-controller-pulse-count', String(Number(root.getAttribute('data-scene-controller-pulse-count') || 0) + 1))
  }, [pulse])

  return <div ref={rootRef} className="universe-scene" data-scene-root="" data-scene-phase={phase} data-scene-theme={theme} data-scene-motion={reducedMotion ? 'reduced' : 'full'} data-scene-animation={reducedMotion ? 'static' : 'running'} data-scene-pulse={pulse.toFixed(3)} data-scene-render-count="0" data-scene-controller-phase={controllerPhase} data-scene-controller-theme={controllerTheme} data-scene-controller-pulse={controllerPulse === null ? 'loading' : controllerPulse.toFixed(3)} data-scene-controller-pulse-count="0" data-scene-fallback={fallback ? 'active' : 'inactive'} data-scene-particles={particleCountForWidth(window.innerWidth)} aria-hidden="true">
    <canvas ref={canvasRef} className="universe-canvas" data-scene-canvas="" />
    <div className="universe-fallback"><span className="universe-fallback-gradient" /><i /><i /><b /></div>
  </div>
}
