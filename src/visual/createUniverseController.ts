import type { BufferGeometry, Material, Texture, WebGLRenderer } from 'three'
import { createResourceScope } from './resourceScope'
import type { ScenePhase, SceneTheme, UniverseCanvasProps, UniverseController } from './types'

export const particleCountForWidth = (width: number) => width <= 760 ? 420 : 1100

type Profile = { x: number; y: number; scale: number; cameraZ: number; tilt: number; spin: number }
const PROFILES: Record<ScenePhase, Profile> = {
  hero: { x: 2.75, y: .15, scale: 1, cameraZ: 10, tilt: -.12, spin: .12 },
  projects: { x: 2.3, y: -.1, scale: 1.08, cameraZ: 10.7, tilt: .3, spin: .08 },
  focus: { x: 2.1, y: .2, scale: 1, cameraZ: 11, tilt: -.18, spin: .1 },
  about: { x: -2.15, y: .15, scale: .93, cameraZ: 11, tilt: .2, spin: .07 },
  links: { x: 2.2, y: .2, scale: 1.06, cameraZ: 11.4, tilt: -.26, spin: .06 },
}

const PALETTES = {
  dark: { background: 0x08131f, teal: 0x6dd8d4, blue: 0x7e9bd7, gold: 0xd5c29b },
  light: { background: 0xf5f8fc, teal: 0x006f77, blue: 0x2b4d87, gold: 0x796238 },
} as const

function hash(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function targetPosition(index: number, phase: ScenePhase): [number, number, number] {
  const a = hash(index, 1) * Math.PI * 2
  const b = Math.acos(2 * hash(index, 2) - 1)
  const radius = 2.25 + hash(index, 3) * .65
  const group = index % 3
  if (phase === 'hero') return [Math.sin(b) * Math.cos(a) * radius, Math.cos(b) * radius, Math.sin(b) * Math.sin(a) * radius]
  if (phase === 'projects') {
    const ring = 1.15 + hash(index, 3) * .85
    return [Math.cos(a) * ring * 1.75, (group - 1) * 1.35 + Math.sin(a) * ring * .34, Math.sin(a) * ring * 1.4]
  }
  if (phase === 'focus') {
    const x = [-2.05, 0, 2.05][group]
    const y = [.8, -1, .8][group]
    const r = .43 + hash(index, 3) * .52
    return [x + Math.sin(b) * Math.cos(a) * r, y + Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r]
  }
  if (phase === 'about') {
    const y = (hash(index, 4) - .5) * 5.6
    const turn = y * 1.9 + group * Math.PI * 2 / 3 + a * .16
    const r = 1.15 + hash(index, 3) * .5
    return [Math.cos(turn) * r, y, Math.sin(turn) * r]
  }
  const distance = 1.8 + hash(index, 3) * 3.4
  return [Math.sin(b) * Math.cos(a) * distance, Math.cos(b) * distance, Math.sin(b) * Math.sin(a) * distance]
}

function positionsFor(phase: ScenePhase, count: number) {
  const positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) positions.set(targetPosition(index, phase), index * 3)
  return positions
}

export async function createUniverseController(
  canvas: HTMLCanvasElement,
  props: UniverseCanvasProps,
  onContextLost: () => void,
  onRender?: (renderCount: number) => void,
): Promise<UniverseController> {
  const THREE = await import('three')
  let renderer: WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: window.innerWidth > 760, powerPreference: 'high-performance' })
  } catch (error) {
    throw new Error('Particle universe renderer could not initialize', { cause: error })
  }

  const scope = createResourceScope()
  scope.add(() => { renderer.setAnimationLoop(null); renderer.renderLists.dispose(); renderer.dispose() })
  try {
    const count = particleCountForWidth(window.innerWidth)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 80)
    const world = new THREE.Group()
    const orbitGroup = new THREE.Group()
    scene.add(world)
    world.add(orbitGroup)

    const rememberGeometry = <T extends BufferGeometry>(geometry: T) => { scope.add(() => geometry.dispose()); return geometry }
    const rememberMaterial = <T extends Material>(material: T) => {
      scope.add(() => {
        for (const value of Object.values(material) as unknown[]) if (value && typeof value === 'object' && 'isTexture' in value) (value as Texture).dispose()
        material.dispose()
      })
      return material
    }

    const current = positionsFor(props.phase, count)
    const displayed = current.slice()
    let target = positionsFor(props.phase, count)
    const colors = new Float32Array(count * 3)
    const geometry = rememberGeometry(new THREE.BufferGeometry())
    const positionAttribute = new THREE.BufferAttribute(displayed, 3)
    const colorAttribute = new THREE.BufferAttribute(colors, 3)
    geometry.setAttribute('position', positionAttribute)
    geometry.setAttribute('color', colorAttribute)
    const material = rememberMaterial(new THREE.PointsMaterial({ size: .057, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: .9, depthWrite: false }))
    const particles = new THREE.Points(geometry, material)
    particles.frustumCulled = false
    world.add(particles)

    const orbitMaterials: Material[] = []
    for (const [radiusX, radiusY, rotation] of [
      [3.8, 1.55, [0.48, .2, -.38]], [3.25, 2.55, [-.23, .64, .17]], [4.4, 2.5, [.8, -.3, .42]],
    ] as [number, number, [number, number, number]][]) {
      const points = new THREE.EllipseCurve(0, 0, radiusX, radiusY).getPoints(120).map((point) => new THREE.Vector3(point.x, point.y, 0))
      const lineGeometry = rememberGeometry(new THREE.BufferGeometry().setFromPoints(points))
      const lineMaterial = rememberMaterial(new THREE.LineBasicMaterial({ transparent: true, opacity: .23, depthWrite: false }))
      const line = new THREE.LineLoop(lineGeometry, lineMaterial)
      line.rotation.set(...rotation)
      orbitGroup.add(line)
      orbitMaterials.push(lineMaterial)
    }

    const coreGeometry = rememberGeometry(new THREE.IcosahedronGeometry(1.4, 1))
    const coreMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: .08, depthWrite: false }))
    const core = new THREE.Mesh(coreGeometry, coreMaterial)
    world.add(core)

    let phase = props.phase
    let theme = props.theme
    let destroyed = false
    let visible = !document.hidden
    let animationFrame = 0
    let renderCount = 0
    let pulseEnergy = 0
    let pulseSeed = 0
    const pointer = { x: 0, y: 0 }
    const pointerTarget = { x: 0, y: 0 }

    const applyTheme = () => {
      const palette = PALETTES[theme]
      scene.fog = new THREE.FogExp2(palette.background, theme === 'dark' ? .045 : .029)
      const choices = [palette.teal, palette.blue, palette.gold]
      for (let index = 0; index < count; index += 1) {
        const color = new THREE.Color(choices[index % 3])
        color.toArray(colors, index * 3)
      }
      colorAttribute.needsUpdate = true
      material.opacity = theme === 'dark' ? .9 : .8
      material.blending = theme === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending
      material.needsUpdate = true
      coreMaterial.color.setHex(palette.teal)
      orbitMaterials.forEach((lineMaterial, index) => {
        const line = lineMaterial as import('three').LineBasicMaterial
        line.color.setHex(index === 1 ? palette.gold : palette.teal)
        line.opacity = theme === 'dark' ? .3 : .22
      })
    }

    const profileForWidth = () => {
      const profile = PROFILES[phase]
      return window.innerWidth <= 760 ? { ...profile, x: phase === 'hero' ? .1 : .35, y: phase === 'hero' ? 1.25 : .1, scale: profile.scale * .72, cameraZ: 11.2 } : profile
    }

    const resize = (initial = false) => {
      const width = Math.max(window.innerWidth, 1)
      const height = Math.max(window.innerHeight, 1)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width <= 760 ? 1.35 : 1.8))
      renderer.setSize(width, height, false)
      geometry.setDrawRange(0, Math.min(count, particleCountForWidth(width)))
      if (props.reducedMotion && !initial) render(performance.now())
    }

    const render = (time: number) => {
      if (destroyed) return
      const seconds = time / 1000
      const profile = profileForWidth()
      const rate = props.reducedMotion ? 1 : .045
      pointer.x += (pointerTarget.x - pointer.x) * rate
      pointer.y += (pointerTarget.y - pointer.y) * rate
      world.position.x += (profile.x - world.position.x) * rate
      world.position.y += (profile.y - world.position.y) * rate
      world.scale.setScalar(world.scale.x + (profile.scale * (1 + pulseEnergy * .05) - world.scale.x) * rate)
      world.rotation.x += (profile.tilt + pointer.y * .055 - world.rotation.x) * rate
      world.rotation.y += (pointer.x * .085 - world.rotation.y) * rate
      camera.position.z += (profile.cameraZ - camera.position.z) * rate
      camera.lookAt(0, 0, 0)
      for (let index = 0; index < count; index += 1) {
        const offset = index * 3
        const drift = props.reducedMotion ? 0 : Math.sin(seconds * .45 + index * .71) * .035
        for (let axis = 0; axis < 3; axis += 1) {
          current[offset + axis] += (target[offset + axis] - current[offset + axis]) * rate
          displayed[offset + axis] = current[offset + axis] + (axis === 1 ? drift : 0)
        }
      }
      positionAttribute.needsUpdate = true
      orbitGroup.rotation.z = props.reducedMotion ? 0 : seconds * .014
      orbitGroup.rotation.y = props.reducedMotion ? 0 : seconds * profile.spin * .2
      core.rotation.y = props.reducedMotion ? 0 : seconds * .035
      pulseEnergy *= props.reducedMotion ? 0 : .94
      renderer.render(scene, camera)
      renderCount += 1
      onRender?.(renderCount)
    }

    const frame = (time: number) => {
      if (destroyed || !visible || props.reducedMotion) { animationFrame = 0; return }
      render(time)
      animationFrame = requestAnimationFrame(frame)
    }
    const start = () => { if (!destroyed && visible && !props.reducedMotion && !animationFrame) animationFrame = requestAnimationFrame(frame) }
    const stop = () => { if (animationFrame) cancelAnimationFrame(animationFrame); animationFrame = 0 }
    const handleVisibility = () => { visible = !document.hidden; if (visible) { render(performance.now()); start() } else stop() }
    const handlePointer = (event: PointerEvent) => {
      if (props.reducedMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return
      pointerTarget.x = (event.clientX / Math.max(innerWidth, 1) - .5) * 2
      pointerTarget.y = (.5 - event.clientY / Math.max(innerHeight, 1)) * 2
    }
    const handleContextLoss = (event: Event) => { event.preventDefault(); stop(); onContextLost() }
    const setPhase = (next: ScenePhase) => { if (next === phase) return; phase = next; target = positionsFor(phase, count); if (props.reducedMotion) render(performance.now()) }
    const setTheme = (next: SceneTheme) => { if (next === theme) return; theme = next; applyTheme(); if (props.reducedMotion) render(performance.now()) }
    const pulse = (seed: number) => { pulseSeed = Number.isFinite(seed) ? seed : 0; pulseEnergy = 1 + Math.sin(pulseSeed) * .1; if (props.reducedMotion) render(performance.now()) }
    const destroy = () => { if (destroyed) return; destroyed = true; stop(); try { scope.cleanup() } catch { /* Continue releasing resources when one driver fails. */ } }

    const handleResize = () => resize()
    window.addEventListener('resize', handleResize, { passive: true })
    scope.add(() => window.removeEventListener('resize', handleResize))
    window.addEventListener('pointermove', handlePointer, { passive: true })
    scope.add(() => window.removeEventListener('pointermove', handlePointer))
    document.addEventListener('visibilitychange', handleVisibility)
    scope.add(() => document.removeEventListener('visibilitychange', handleVisibility))
    canvas.addEventListener('webglcontextlost', handleContextLoss, { passive: false })
    scope.add(() => canvas.removeEventListener('webglcontextlost', handleContextLoss))
    renderer.setClearColor(0x000000, 0)
    applyTheme()
    const initialProfile = profileForWidth()
    world.position.set(initialProfile.x, initialProfile.y, 0)
    world.scale.setScalar(initialProfile.scale)
    world.rotation.x = initialProfile.tilt
    camera.position.z = initialProfile.cameraZ
    resize(true)
    render(0)
    start()
    return { setPhase, setTheme, pulse, destroy }
  } catch (error) {
    try { scope.cleanup() } catch { /* Keep the initialization error. */ }
    throw error
  }
}
