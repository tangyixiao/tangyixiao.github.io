import type { BufferGeometry, Material, Object3D, Texture, WebGLRenderer } from 'three'
import type { DeepSeaCanvasProps, DeepSeaController, ScenePhase } from './types'
import { createResourceScope } from './resourceScope'

export const PARTICLE_COUNT = 360

type PhaseTarget = {
  cameraX: number
  cameraY: number
  cameraZ: number
  nucleusX: number
  nucleusY: number
  nucleusZ: number
  orbitTilt: number
  particleDrift: number
}

const PHASE_TARGETS: Record<ScenePhase, PhaseTarget> = {
  hero: { cameraX: 0.1, cameraY: 0.1, cameraZ: 11, nucleusX: 3.3, nucleusY: 0.2, nucleusZ: 0, orbitTilt: 0.2, particleDrift: 0.25 },
  orbit: { cameraX: -0.8, cameraY: 0.5, cameraZ: 10.5, nucleusX: 1.5, nucleusY: 0.8, nucleusZ: -0.3, orbitTilt: 0.55, particleDrift: 0.42 },
  focus: { cameraX: 0.9, cameraY: -0.6, cameraZ: 12, nucleusX: -1.8, nucleusY: 0.3, nucleusZ: 0.4, orbitTilt: -0.35, particleDrift: 0.62 },
  archive: { cameraX: -0.35, cameraY: -0.15, cameraZ: 10, nucleusX: 2.25, nucleusY: -1.2, nucleusZ: 0.2, orbitTilt: 0.8, particleDrift: 0.78 },
  links: { cameraX: 0.35, cameraY: 0.75, cameraZ: 11.5, nucleusX: -2.1, nucleusY: 1.5, nucleusZ: -0.5, orbitTilt: -0.7, particleDrift: 0.92 },
  workbench: { cameraX: 0, cameraY: 0, cameraZ: 9.5, nucleusX: 0, nucleusY: 0, nucleusZ: 0, orbitTilt: 0, particleDrift: 1 },
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum)

const seeded = (index: number) => {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453
  return value - Math.floor(value)
}

export async function createDeepSeaController(
  canvas: HTMLCanvasElement,
  props: DeepSeaCanvasProps,
  onContextLost: () => void,
  onRender?: (renderCount: number) => void,
): Promise<DeepSeaController> {
  const THREE = await import('three')

  let renderer: WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
  } catch (error) {
    throw new Error('Deep-sea WebGL renderer could not initialize', { cause: error })
  }

  const scope = createResourceScope()
  scope.add(() => {
    renderer.setAnimationLoop(null)
    renderer.renderLists.dispose()
    renderer.dispose()
  })

  try {
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x041522, 0.055)
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80)
    const world = new THREE.Group()
    const nucleusGroup = new THREE.Group()
    const orbitGroup = new THREE.Group()
    const signalGroup = new THREE.Group()
    const objects: Object3D[] = [world, nucleusGroup, orbitGroup, signalGroup]
    scope.add(() => {
      for (const object of objects) object.clear()
    })

    const rememberGeometry = <T extends BufferGeometry>(geometry: T) => {
      scope.add(() => geometry.dispose())
      return geometry
    }
    const disposeMaterial = (material: Material) => {
      const values = Object.values(material) as unknown[]
      for (const value of values) {
        if (value && typeof value === 'object' && 'isTexture' in value) (value as Texture).dispose()
      }
      material.dispose()
    }
    const rememberMaterial = <T extends Material>(material: T) => {
      scope.add(() => disposeMaterial(material))
      return material
    }

    const nucleusGeometry = rememberGeometry(new THREE.IcosahedronGeometry(1.12, 3))
    const nucleusMaterial = rememberMaterial(new THREE.MeshBasicMaterial({
      color: 0x6ee9ff,
      transparent: true,
      opacity: 0.78,
      wireframe: true,
    }))
    const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial)
    const haloGeometry = rememberGeometry(new THREE.SphereGeometry(1.82, 28, 18))
    const haloMaterial = rememberMaterial(new THREE.MeshBasicMaterial({
      color: 0x44c9ff,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }))
    const halo = new THREE.Mesh(haloGeometry, haloMaterial)
    const nucleusLight = new THREE.PointLight(0x55eaff, 4.2, 16, 2)
    const ionLight = new THREE.PointLight(0x7770ff, 2.2, 14, 2)
    nucleusGroup.add(nucleus, halo, nucleusLight, ionLight)
    objects.push(nucleus, halo, nucleusLight, ionLight)
    world.add(nucleusGroup)

    const createOrbit = (radiusX: number, radiusY: number, color: number, opacity: number, rotation: [number, number, number]) => {
      const curve = new THREE.EllipseCurve(0, 0, radiusX, radiusY, 0, Math.PI * 2, false, 0)
      const points = curve.getPoints(96).map((point) => new THREE.Vector3(point.x, point.y, 0))
      const geometry = rememberGeometry(new THREE.BufferGeometry().setFromPoints(points))
      const material = rememberMaterial(new THREE.LineBasicMaterial({ color, transparent: true, opacity }))
      const line = new THREE.LineLoop(geometry, material)
      line.rotation.set(...rotation)
      orbitGroup.add(line)
      objects.push(line)
    }

    createOrbit(4.6, 1.45, 0x61e5ff, 0.35, [0.55, 0.2, 0.12])
    createOrbit(3.5, 2.3, 0x7f78ff, 0.32, [-0.25, 0.8, -0.32])
    createOrbit(5.8, 3.5, 0x95b3d6, 0.14, [1.15, -0.45, 0.42])
    world.add(orbitGroup)

    const particlePositions = new Float32Array(PARTICLE_COUNT * 3)
    const particleBases = new Float32Array(PARTICLE_COUNT * 3)
    const particleSeeds = new Float32Array(PARTICLE_COUNT)
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const seed = seeded(index)
      const angle = seeded(index + 1000) * Math.PI * 2
      const radius = 2.8 + seeded(index + 2000) * 6.2
      const x = Math.cos(angle) * radius
      const y = (seeded(index + 3000) - 0.5) * 7
      const z = Math.sin(angle) * radius - 1.5
      const offset = index * 3
      particleBases[offset] = x
      particleBases[offset + 1] = y
      particleBases[offset + 2] = z
      particlePositions[offset] = x
      particlePositions[offset + 1] = y
      particlePositions[offset + 2] = z
      particleSeeds[index] = seed
    }
    const particleGeometry = rememberGeometry(new THREE.BufferGeometry())
    const particleAttribute = new THREE.BufferAttribute(particlePositions, 3)
    particleGeometry.setAttribute('position', particleAttribute)
    const particleMaterial = rememberMaterial(new THREE.PointsMaterial({
      color: 0x78d9f4,
      size: 0.045,
      transparent: true,
      opacity: 0.63,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }))
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    particles.frustumCulled = false
    objects.push(particles)
    world.add(particles)

    const signalGeometry = rememberGeometry(new THREE.TorusGeometry(1.7, 0.012, 8, 96))
    const signalMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0x62ddff, transparent: true, opacity: 0.8 }))
    const signal = new THREE.Mesh(signalGeometry, signalMaterial)
    signal.rotation.set(Math.PI / 2, 0.2, 0.4)
    signalGroup.add(signal)
    objects.push(signal)
    world.add(signalGroup)
    scene.add(world)

    const pointer = { x: 0, y: 0 }
    const pointerTarget = { x: 0, y: 0 }
    let activePhase = props.phase
    let activeTarget = PHASE_TARGETS[activePhase]
    let pulseEnergy = 0
    let pulseSeed = props.pulse
    let destroyed = false
    let running = false
    let visible = !document.hidden
    let animationFrame = 0
    let renderCount = 0

    const resize = () => {
      const width = Math.max(window.innerWidth, 1)
      const height = Math.max(window.innerHeight, 1)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      const pixelRatio = Math.min(window.devicePixelRatio, 2)
      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(width, height, false)
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointerTarget.x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2
      pointerTarget.y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * -2
    }

    const render = (time: number) => {
      if (destroyed) return
      const seconds = time * 0.001
      const target = activeTarget
      const phaseRate = props.reducedMotion ? 1 : 0.055
      camera.position.x += ((target.cameraX + pointer.x * 0.24) - camera.position.x) * phaseRate
      camera.position.y += ((target.cameraY + pointer.y * 0.18) - camera.position.y) * phaseRate
      camera.position.z += (target.cameraZ - camera.position.z) * phaseRate
      camera.position.x += props.reducedMotion ? 0 : Math.sin(seconds * 0.16) * 0.003
      camera.position.y += props.reducedMotion ? 0 : Math.cos(seconds * 0.14) * 0.003
      camera.lookAt(0, 0, 0)

      pointer.x += (pointerTarget.x - pointer.x) * (props.reducedMotion ? 1 : 0.045)
      pointer.y += (pointerTarget.y - pointer.y) * (props.reducedMotion ? 1 : 0.045)
      world.rotation.y += ((pointer.x * 0.08 + target.orbitTilt * 0.05) - world.rotation.y) * phaseRate
      world.rotation.x += ((pointer.y * 0.045) - world.rotation.x) * phaseRate
      nucleusGroup.position.x += (target.nucleusX - nucleusGroup.position.x) * phaseRate
      nucleusGroup.position.y += (target.nucleusY - nucleusGroup.position.y) * phaseRate
      nucleusGroup.position.z += (target.nucleusZ - nucleusGroup.position.z) * phaseRate
      nucleusGroup.rotation.y = seconds * (props.reducedMotion ? 0 : 0.12)
      const pulseScale = 1 + pulseEnergy * (0.15 + Math.sin(pulseSeed * 1.7) * 0.035)
      nucleusGroup.scale.setScalar(pulseScale)
      pulseEnergy *= props.reducedMotion ? 0 : 0.94
      signalGroup.rotation.z = seconds * (props.reducedMotion ? 0 : 0.08)
      signal.scale.setScalar(1 + pulseEnergy * 0.45)

      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const offset = index * 3
        const seed = particleSeeds[index]
        const flow = seconds * (0.08 + seed * 0.08) * target.particleDrift
        particlePositions[offset] = particleBases[offset] + Math.sin(flow + seed * 12) * 0.25 + pointer.x * seed * 0.08
        particlePositions[offset + 1] = particleBases[offset + 1] + Math.cos(flow * 1.3 + seed * 8) * 0.2 + pointer.y * seed * 0.08
        particlePositions[offset + 2] = particleBases[offset + 2] + Math.sin(flow * 0.7 + seed * 15) * 0.35
      }
      particleAttribute.needsUpdate = true
      renderer.render(scene, camera)
      renderCount += 1
      onRender?.(renderCount)
    }

    const frame = (time: number) => {
      if (destroyed || !visible || props.reducedMotion) {
        running = false
        animationFrame = 0
        return
      }
      render(time)
      animationFrame = window.requestAnimationFrame(frame)
    }

    const startLoop = () => {
      if (destroyed || !visible || props.reducedMotion || running) return
      running = true
      animationFrame = window.requestAnimationFrame(frame)
    }

    const stopLoop = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
      running = false
    }

    const handleVisibilityChange = () => {
      visible = !document.hidden
      if (!visible) {
        stopLoop()
        return
      }
      render(performance.now())
      startLoop()
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      stopLoop()
      onContextLost()
    }

    const setPhase = (phase: ScenePhase) => {
      activePhase = phase
      activeTarget = PHASE_TARGETS[phase]
    }

    const pulse = (seed: number) => {
      pulseSeed = Number.isFinite(seed) ? seed : 0
      pulseEnergy = 1
    }

    const destroy = () => {
      if (destroyed) return
      destroyed = true
      stopLoop()
      try {
        scope.cleanup()
      } catch {
        // Teardown is best effort: a single driver disposal error must not strand the rest.
      }
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })
    scope.add(() => window.removeEventListener('resize', resize))
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    scope.add(() => window.removeEventListener('pointermove', handlePointerMove))
    document.addEventListener('visibilitychange', handleVisibilityChange)
    scope.add(() => document.removeEventListener('visibilitychange', handleVisibilityChange))
    canvas.addEventListener('webglcontextlost', handleContextLost, { passive: false })
    scope.add(() => canvas.removeEventListener('webglcontextlost', handleContextLost))
    renderer.setClearColor(0x000000, 0)
    render(0)
    startLoop()

    return { setPhase, pulse, destroy }
  } catch (error) {
    try {
      scope.cleanup()
    } catch {
      // Preserve the initialization error while still attempting every registered cleanup.
    }
    throw error
  }
}
