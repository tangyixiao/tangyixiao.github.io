import type { OrbitControls as OrbitControlsType } from 'three/addons/controls/OrbitControls.js'
import { createResourceScope } from './resourceScope'
import { createSolarSystem } from './createSolarSystem'
import { bodies } from './solarData'
import type { BodyId, SceneMode, ScenePhase, SceneTheme, UniverseCanvasProps, UniverseController } from './types'

export const particleCountForWidth = (width: number) => width <= 760 ? 420 : 1100
const profiles = {
  hero: { x: 15, tilt: .68, turn: -.15, scale: .95, cameraZ: 60 },
  projects: { x: 9, tilt: .48, turn: .35, scale: .7, cameraZ: 61 },
  focus: { x: 8, tilt: 1.04, turn: -.3, scale: .65, cameraZ: 63 },
  about: { x: -9, tilt: .57, turn: .6, scale: .64, cameraZ: 62 },
  links: { x: 8, tilt: .8, turn: -.5, scale: .58, cameraZ: 66 },
} as const

export async function createUniverseController(canvas: HTMLCanvasElement, props: UniverseCanvasProps, onContextLost: () => void, onRender?: (count: number) => void, signal?: AbortSignal): Promise<UniverseController> {
  const [T, { OrbitControls }] = await Promise.all([import('three'), import('three/addons/controls/OrbitControls.js')])
  const scope = createResourceScope()
  const assetAbort = new AbortController()
  const abort = () => { assetAbort.abort(); try { scope.cleanup() } catch { /* Finish every disposer. */ } }
  if (signal?.aborted) throw new DOMException('Scene disposed', 'AbortError')
  signal?.addEventListener('abort', abort, { once: true })
  scope.add(() => signal?.removeEventListener('abort', abort))
  scope.add(() => assetAbort.abort())
  const mobile = window.innerWidth <= 760 || matchMedia('(pointer: coarse)').matches
  let renderer: import('three').WebGLRenderer
  try { renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: !mobile, powerPreference: 'high-performance' }) }
  catch (error) { scope.cleanup(); throw error }
  scope.add(() => { renderer.setAnimationLoop(null); renderer.renderLists.dispose(); renderer.dispose() })
  let stopRendering = () => {}
  const onLost = (event: Event) => { event.preventDefault(); assetAbort.abort(); stopRendering(); onContextLost() }
  canvas.addEventListener('webglcontextlost', onLost, { passive: false })
  scope.add(() => canvas.removeEventListener('webglcontextlost', onLost))
  try {
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(42, 1, .03, 600)
    const loadTimeout = window.setTimeout(() => assetAbort.abort(), 20000)
    scope.add(() => clearTimeout(loadTimeout))
    const solar = await createSolarSystem(T, scope, mobile, assetAbort.signal)
    clearTimeout(loadTimeout)
    if (assetAbort.signal.aborted) throw new DOMException('Scene disposed', 'AbortError')
    scene.add(solar.world)
    const skyGeometry = scope.track(new T.SphereGeometry(280, 48, 32), g => g.dispose())
    const skyMaterial = scope.track(new T.MeshBasicMaterial({ map: solar.skyMap, side: T.BackSide, transparent: true, opacity: .2, depthWrite: false, toneMapped: false }), m => m.dispose())
    const sky = new T.Mesh(skyGeometry, skyMaterial); sky.rotation.set(.45, .6, .2); scene.add(sky)
    const starGeometry = scope.track(new T.BufferGeometry(), g => g.dispose())
    const positions = new Float32Array(1100 * 3)
    const colors = new Float32Array(1100 * 3)
    for (let i = 0; i < 1100; i++) {
      const a = i * 2.399963, y = 1 - (i / 1100) * 2, r = Math.sqrt(1 - y * y), distance = 210 + Math.sin(i * 11.1) * 35
      positions.set([Math.cos(a) * r * distance, y * distance, Math.sin(a) * r * distance], i * 3)
      new T.Color(i % 5 ? '#cbdcff' : '#ffd6a0').toArray(colors, i * 3)
    }
    starGeometry.setAttribute('position', new T.BufferAttribute(positions, 3)); starGeometry.setAttribute('color', new T.BufferAttribute(colors, 3))
    const starMaterial = scope.track(new T.ShaderMaterial({
      uniforms: { opacity: { value: .8 }, tint: { value: new T.Color('#ffffff') }, density: { value: devicePixelRatio } },
      vertexShader: `attribute vec3 color; varying vec3 vColor; uniform float density; void main(){vColor=color; vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=(1.2+2.2*fract(position.x*17.3))*density;}`,
      fragmentShader: `varying vec3 vColor; uniform vec3 tint; uniform float opacity; void main(){float d=length(gl_PointCoord-.5); float a=exp(-d*d*22.)*(1.-smoothstep(.35,.5,d)); gl_FragColor=vec4(vColor*tint,a*opacity);
        #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    }), m => m.dispose())
    const stars = new T.Points(starGeometry, starMaterial); stars.frustumCulled = false; scene.add(stars)
    const root = canvas.parentElement!
    const labels = bodies.map(body => {
      const label = document.createElement('div'); label.className = 'celestial-label'; label.dataset.body = body.id
      const zh = document.createElement('span'); zh.className = 'label-zh'; zh.textContent = body.zh[0]
      const en = document.createElement('span'); en.className = 'label-en'; en.textContent = body.en[0]
      label.append(zh, en); label.style.setProperty('--body-color', body.color); root.append(label); scope.add(() => label.remove())
      return label
    })
    const projected = new T.Vector3(), projectionOffset = new T.Vector3()
    let destroyed = false, animationFrame = 0, renderCount = 0, simulationTime = 0, lastTime: number | null = null
    let phase: ScenePhase = props.phase, theme: SceneTheme = props.theme, mode: SceneMode = 'browse', paused = props.paused
    let selected: BodyId | null = null, hovered: BodyId | null = null, pulseEnergy = 0
    let flight: { fromPosition: import('three').Vector3; fromTarget: import('three').Vector3; offset: import('three').Vector3; progress: number } | null = null
    let controls: OrbitControlsType | null = null, releaseInteraction: (() => void) | null = null, interactionElement: HTMLElement | null = null
    const pointer = new T.Vector2(), raycaster = new T.Raycaster(), targetPosition = new T.Vector3(), previousTarget = new T.Vector3()
    const visible = () => !document.hidden
    const diagnostic = (key: string, value: string) => root.setAttribute('data-scene-' + key, value)
    diagnostic('bodies', String(solar.planets.size)); diagnostic('planets', '8'); diagnostic('moon', 'true'); diagnostic('saturn-rings', 'true')
    diagnostic('textures', String(solar.textureCount))
    diagnostic('ready', 'true'); diagnostic('mode', 'browse'); diagnostic('selected', 'none'); diagnostic('paused', String(paused))

    const applyTheme = () => {
      solar.setTheme(theme)
      starMaterial.uniforms.opacity.value = theme === 'dark' ? .8 : .35
      starMaterial.uniforms.tint.value.set(theme === 'dark' ? '#ffffff' : '#375878')
      skyMaterial.opacity = theme === 'dark' ? .24 : .04
      starMaterial.blending = theme === 'dark' ? T.AdditiveBlending : T.NormalBlending; starMaterial.needsUpdate = true
    }
    const profile = () => {
      const p = profiles[phase]
      const compact = innerWidth <= 760 || innerWidth <= 1000 && innerHeight > innerWidth
      if (!compact) return { ...p, y: 0 }
      const scale = Math.min(innerWidth * .85, 410) * 57 * Math.tan(T.MathUtils.degToRad(21)) / (17.8 * innerHeight)
      const y = (innerHeight * .5 - 195) * 2 * Math.tan(T.MathUtils.degToRad(21)) * 57 / innerHeight
      return { ...p, x: 0, y: phase === 'hero' ? y : 0, tilt: phase === 'hero' ? .5 : p.tilt, scale: phase === 'hero' ? scale : .39, cameraZ: 57 }
    }
    const render = (time: number, immediate = false) => {
      if (destroyed) return
      const delta = lastTime === null ? 0 : Math.min(Math.max((time - lastTime) / 1000, 0), .05)
      lastTime = time
      if (!paused && !props.reducedMotion && visible()) simulationTime += delta
      const rate = immediate || props.reducedMotion ? 1 : 1 - Math.exp(-delta * 5)
      if (mode === 'browse') {
        const p = profile()
        solar.world.position.lerp(new T.Vector3(p.x, p.y, 0), rate)
        solar.world.scale.setScalar(T.MathUtils.lerp(solar.world.scale.x, p.scale, rate))
        solar.world.rotation.x = T.MathUtils.lerp(solar.world.rotation.x, p.tilt + pointer.y * .035, rate)
        solar.world.rotation.y = T.MathUtils.lerp(solar.world.rotation.y, p.turn + pointer.x * .06, rate)
        camera.position.lerp(new T.Vector3(0, 0, p.cameraZ), rate); camera.lookAt(0, 0, 0)
      }
      solar.update(simulationTime, pulseEnergy)
      if (mode === 'explore' && controls) {
        if (selected) {
          solar.world.updateMatrixWorld(true)
          solar.planets.get(selected)!.anchor.getWorldPosition(targetPosition)
          if (flight) {
            flight.progress = Math.min(flight.progress + delta / 1.25, 1)
            const t = flight.progress, ease = t * t * (3 - 2 * t)
            controls.target.copy(flight.fromTarget).lerp(targetPosition, ease)
            camera.position.copy(flight.fromPosition).lerp(projectionOffset.copy(targetPosition).add(flight.offset), ease)
            if (t === 1) flight = null
          } else { camera.position.add(projectionOffset.copy(targetPosition).sub(previousTarget)); controls.target.copy(targetPosition) }
          previousTarget.copy(targetPosition)
        }
        controls.update(delta)
      }
      if (!paused && !props.reducedMotion) pulseEnergy *= Math.exp(-delta * 5)
      renderer.render(scene, camera)
      const outside: BodyId[] = []
      bodies.forEach((body, index) => {
        const label = labels[index]
        solar.planets.get(body.id)!.anchor.getWorldPosition(projected)
        const distance = camera.position.distanceTo(projected)
        const radiusPixels = body.radius * solar.world.scale.x / distance * innerHeight / (2 * Math.tan(T.MathUtils.degToRad(21)))
        projected.project(camera)
        if (solar.planets.get(body.id)!.anchor.visible && (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || projected.z < -1 || projected.z > 1)) outside.push(body.id)
        const x = (projected.x * .5 + .5) * innerWidth, y = (-projected.y * .5 + .5) * innerHeight
        const shown = projected.z > -1 && projected.z < 1 && x > 10 && x < innerWidth - 100 && y > 85 && y < innerHeight - (mode === 'explore' ? 185 : 220) && (mode === 'explore' ? !selected : phase === 'hero' && innerWidth > 760 && x > innerWidth * .48)
        label.hidden = !shown
        if (shown) label.style.transform = `translate(${(x + radiusPixels + 10).toFixed(1)}px,${(y - 5).toFixed(1)}px)`
      })
      diagnostic('outside-bodies', outside.join(',') || 'none')
      renderCount++; onRender?.(renderCount)
      diagnostic('time', simulationTime.toFixed(4)); diagnostic('camera', camera.position.toArray().map(v => v.toFixed(3)).join(','))
      diagnostic('camera-distance', controls ? controls.getDistance().toFixed(3) : camera.position.length().toFixed(3))
      diagnostic('flight-progress', flight ? flight.progress.toFixed(3) : '1.000')
    }
    const frame = (time: number) => { animationFrame = 0; if (destroyed || !visible() || props.reducedMotion) return; render(time); animationFrame = requestAnimationFrame(frame) }
    const start = () => { if (!destroyed && visible() && !props.reducedMotion && !animationFrame) { lastTime = null; animationFrame = requestAnimationFrame(frame) } }
    const stop = () => { if (animationFrame) cancelAnimationFrame(animationFrame); animationFrame = 0; lastTime = null }
    stopRendering = stop
    let invalidationQueued = false
    const invalidate = () => {
      if (!visible() || !props.reducedMotion || invalidationQueued || destroyed) return
      invalidationQueued = true
      queueMicrotask(() => { invalidationQueued = false; if (!destroyed && visible()) render(performance.now(), true) })
    }
    const resize = (initial = false) => {
      const width = Math.max(innerWidth, 1), height = Math.max(innerHeight, 1)
      camera.aspect = width / height
      camera.filmOffset = mode === 'explore' && height <= 500 && width > 760 ? -.35 * camera.filmGauge * Math.tan(T.MathUtils.degToRad(21)) * camera.aspect : 0
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile || width <= 760 ? 1.35 : 1.8)); renderer.setSize(width, height, false)
      const particles = particleCountForWidth(mobile ? Math.min(width, 760) : width)
      starGeometry.setDrawRange(0, particles); diagnostic('particles', String(particles))
      if (!initial) {
        if (mode === 'explore') { if (selected) selectBody(selected, true); else overview() }
        invalidate()
      }
    }
    const overview = () => {
      flight = null
      solar.setFocus(null)
      selected = null; hovered = null; diagnostic('selected', 'none'); solar.highlight(null)
      if (controls) { controls.enableDamping = false; controls.update() }
      const halfFov = Math.min(T.MathUtils.degToRad(21), Math.atan(Math.tan(T.MathUtils.degToRad(21)) * camera.aspect))
      const distance = 19 / Math.sin(halfFov)
      camera.position.set(0, .75, 1).normalize().multiplyScalar(distance)
      camera.lookAt(0, 0, 0)
      if (controls) { controls.target.set(0, 0, 0); controls.minDistance = 4; controls.maxDistance = Math.min(distance * 1.65, 190); controls.update() }
      if (controls) controls.enableDamping = !props.reducedMotion
      previousTarget.set(0, 0, 0)
    }
    const selectBody = (id: BodyId | null, preserveDirection = false) => {
      if (mode !== 'explore') return
      if (!id) { overview(); invalidate(); return }
      selected = id; diagnostic('selected', id); solar.highlight(id)
      solar.setFocus(id)
      solar.world.updateMatrixWorld(true)
      solar.planets.get(id)!.anchor.getWorldPosition(targetPosition)
      const radius = bodies.find(body => body.id === id)!.radius
      const direction = preserveDirection ? (flight?.offset.clone() ?? camera.position.clone().sub(controls?.target ?? targetPosition)).normalize() : id === 'sun' ? new T.Vector3(0, .3, 1).normalize() : targetPosition.clone().negate().normalize().applyAxisAngle(new T.Vector3(0, 1, 0), id === 'saturn' ? -.65 : .7)
      if (!preserveDirection) direction.y = id === 'saturn' ? .65 : .35
      direction.normalize()
      const framingRadius = id === 'saturn' ? 1.75 : radius
      const halfFov = Math.min(T.MathUtils.degToRad(21), Math.atan(Math.tan(T.MathUtils.degToRad(21)) * camera.aspect))
      const landscape = innerHeight <= 500 && innerWidth > 760
      const baseFraming = innerWidth <= 760 ? 1.5 : id === 'saturn' ? 1.4 : 1.85
      const availableHalfHeight = Math.max(innerHeight * .5 - (landscape ? 130 : 190), 45)
      const framing = innerWidth > 760 ? Math.max(baseFraming, innerHeight * .47 / availableHalfHeight) : baseFraming
      const distance = framingRadius / Math.sin(halfFov) * framing
      if (props.reducedMotion) { camera.position.copy(targetPosition).addScaledVector(direction, distance); controls?.target.copy(targetPosition) }
      else flight = { fromPosition: camera.position.clone(), fromTarget: controls?.target.clone() ?? new T.Vector3(), offset: direction.multiplyScalar(distance), progress: 0 }
      previousTarget.copy(targetPosition)
      if (controls) { controls.minDistance = radius * 1.6; controls.update() }
      invalidate()
    }
    const pick = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      const point = new T.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1)
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); raycaster.setFromCamera(point, camera)
      const hit = raycaster.intersectObjects(Array.from(solar.planets.values()).filter(body => body.anchor.visible).map(body => body.mesh), false)[0]
      return hit ? hit.object.userData.bodyId as BodyId : null
    }
    const setMode = (next: SceneMode, element: HTMLElement | null) => {
      if (next === mode && element === interactionElement) return
      releaseInteraction?.(); releaseInteraction = null; controls?.dispose(); controls = null; interactionElement = element
      mode = next; diagnostic('mode', mode)
      resize(true)
      if (mode === 'explore' && element) {
        solar.world.position.set(0, 0, 0); solar.world.scale.setScalar(1); solar.world.rotation.set(0, 0, 0)
        controls = new OrbitControls(camera, element); controls.enablePan = false; controls.enableDamping = !props.reducedMotion; controls.dampingFactor = .09
        overview()
        let down: { x: number; y: number; id: number } | null = null, dragged = false
        const onDown = (event: PointerEvent) => { flight = null; if (down) dragged = true; else { down = { x: event.clientX, y: event.clientY, id: event.pointerId }; dragged = false } }
        const onMove = (event: PointerEvent) => {
          if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) dragged = true
          if (!down && event.pointerType === 'mouse') { hovered = pick(event); solar.highlight(hovered ?? selected); element.style.cursor = hovered ? 'pointer' : 'grab'; invalidate() }
        }
        const onUp = (event: PointerEvent) => {
          if (down && down.id === event.pointerId && !dragged) { const id = pick(event); if (id) props.onSelect(id) }
          down = null
        }
        const onCancel = () => { down = null; dragged = true }
        const onLeave = () => { hovered = null; solar.highlight(selected); invalidate() }
        const onKey = (event: KeyboardEvent) => {
          if (!controls || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
          flight = null; event.preventDefault(); if (event.key.includes('Left') || event.key.includes('Right')) controls.rotateLeft(event.key === 'ArrowLeft' ? .15 : -.15)
          else controls.rotateUp(event.key === 'ArrowUp' ? .15 : -.15)
          controls.update(); invalidate()
        }
        element.addEventListener('pointerdown', onDown); element.addEventListener('pointermove', onMove); element.addEventListener('pointerup', onUp); element.addEventListener('pointercancel', onCancel); element.addEventListener('pointerleave', onLeave); element.addEventListener('keydown', onKey)
        controls.addEventListener('change', invalidate)
        controls.addEventListener('start', () => { flight = null })
        releaseInteraction = () => { element.removeEventListener('pointerdown', onDown); element.removeEventListener('pointermove', onMove); element.removeEventListener('pointerup', onUp); element.removeEventListener('pointercancel', onCancel); element.removeEventListener('pointerleave', onLeave); element.removeEventListener('keydown', onKey) }
      } else {
        flight = null; selected = null; diagnostic('selected', 'none'); solar.highlight(null); solar.setFocus(null); render(performance.now(), true)
      }
      invalidate()
    }
    const setPhase = (next: ScenePhase) => { if (phase === next) return; phase = next; invalidate() }
    const setTheme = (next: SceneTheme) => { if (theme === next) return; theme = next; applyTheme(); invalidate() }
    const pulse = (seed: number) => { pulseEnergy = Number.isFinite(seed) ? 1 + Math.sin(seed) * .1 : 0; invalidate() }
    const setPaused = (next: boolean) => { if (paused === next) return; paused = next; diagnostic('paused', String(paused)); invalidate() }
    const resetView = () => { if (mode === 'explore') { overview(); invalidate() } }
    const zoomBy = (direction: number) => { if (!controls) return; flight = null; if (direction > 0) controls.dollyIn(1 / 1.2); else controls.dollyOut(1 / 1.2); controls.update(); invalidate() }
    const onVisibility = () => { if (visible()) { lastTime = null; render(performance.now()); start() } else stop() }
    const onPointer = (event: PointerEvent) => { if (mode !== 'browse' || props.reducedMotion || !matchMedia('(hover:hover) and (pointer:fine)').matches) return; pointer.set(event.clientX / Math.max(innerWidth, 1) * 2 - 1, 1 - event.clientY / Math.max(innerHeight, 1) * 2) }
    const onResize = () => resize()
    window.addEventListener('resize', onResize, { passive: true }); scope.add(() => window.removeEventListener('resize', onResize))
    window.addEventListener('pointermove', onPointer, { passive: true }); scope.add(() => window.removeEventListener('pointermove', onPointer))
    document.addEventListener('visibilitychange', onVisibility); scope.add(() => document.removeEventListener('visibilitychange', onVisibility))
    scope.add(() => { releaseInteraction?.(); controls?.dispose() })
    renderer.setClearColor(0x000000, 0); applyTheme(); resize(true); render(0, true); start()
    const destroy = () => { if (destroyed) return; destroyed = true; diagnostic('ready', 'false'); stop(); try { scope.cleanup() } catch { /* Release all resources even when a driver disposer fails. */ } }
    return { setPhase, setTheme, pulse, setMode, selectBody, setPaused, resetView, zoomBy, destroy }
  } catch (error) { try { scope.cleanup() } catch { /* Preserve initialization error. */ } throw error }
}
