import { useEffect, useRef, useState } from 'react'
import { createUniverseController, particleCountForWidth } from './createUniverseController'
import type { ScenePhase, SceneTheme, UniverseCanvasProps, UniverseController } from './types'

export default function UniverseCanvas(props: UniverseCanvasProps) {
  const { phase, theme, pulse, reducedMotion, mode, selected, paused, reset, zoom, interactionElement, onAvailability } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<UniverseController | null>(null)
  const latestRef = useRef(props)
  const appliedReset = useRef(reset)
  const appliedZoom = useRef(0)
  const appliedPulseRef = useRef<number | null>(null)
  const [fallback, setFallback] = useState(false)
  const [controllerPhase, setControllerPhase] = useState<ScenePhase | 'loading'>('loading')
  const [controllerTheme, setControllerTheme] = useState<SceneTheme | 'loading'>('loading')
  const [controllerPulse, setControllerPulse] = useState<number | null>(null)
  latestRef.current = props

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    let disposed = false
    let failed = false
    const abort = new AbortController()
    appliedPulseRef.current = null
    setFallback(false)
    setControllerPhase('loading')
    setControllerTheme('loading')
    setControllerPulse(null)
    rootRef.current?.setAttribute('data-scene-render-count', '0')
    rootRef.current?.setAttribute('data-scene-controller-pulse-count', '0')

    const showFallback = () => {
      if (disposed || failed) return
      failed = true
      controllerRef.current?.destroy()
      controllerRef.current = null
      setFallback(true)
      latestRef.current.onAvailability(false)
    }
    const onRender = (count: number) => rootRef.current?.setAttribute('data-scene-render-count', String(count))

    createUniverseController(canvas, latestRef.current, showFallback, onRender, abort.signal).then((controller) => {
      if (disposed || failed) { controller.destroy(); return }
      controllerRef.current = controller
      const current = latestRef.current
      controller.setTheme(current.theme)
      controller.setPhase(current.phase)
      controller.setMode(current.mode, current.interactionElement)
      controller.selectBody(current.selected)
      controller.setPaused(current.paused)
      appliedReset.current = current.reset
      if (current.zoom !== 0) for (let i = 0; i < Math.abs(current.zoom); i++) controller.zoomBy(current.zoom)
      appliedZoom.current = current.zoom
      current.onAvailability(true)
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
      abort.abort()
      controllerRef.current?.destroy()
      controllerRef.current = null
    }
  }, [reducedMotion])

  useEffect(() => { controllerRef.current?.setMode(mode, interactionElement); appliedZoom.current = zoom }, [mode, interactionElement])
  useEffect(() => { controllerRef.current?.selectBody(selected) }, [selected])
  useEffect(() => { controllerRef.current?.setPaused(paused) }, [paused])
  useEffect(() => {
    if (controllerRef.current && reset !== appliedReset.current) { controllerRef.current.resetView(); appliedReset.current = reset }
  }, [reset])
  useEffect(() => {
    if (!controllerRef.current) return
    const delta = zoom - appliedZoom.current
    for (let i = 0; i < Math.abs(delta); i++) controllerRef.current.zoomBy(delta)
    appliedZoom.current = zoom
  }, [zoom])

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
    <div className="universe-fallback"><span className="universe-fallback-gradient" /><div className="fallback-solar"><b />{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--orbit': index } as import('react').CSSProperties}><span /></i>)}</div></div>
  </div>
}
