import type * as Three from 'three'
import type { ResourceScope } from './resourceScope'
import { bodies } from './solarData'
import type { BodyId, SceneTheme } from './types'

export function createSolarSystem(T: typeof Three, scope: ResourceScope, mobile: boolean) {
  const geometry = <G extends Three.BufferGeometry>(g: G) => scope.track(g, g => g.dispose())
  const material = <M extends Three.Material>(m: M) => scope.track(m, m => m.dispose())
  const texture = <X extends Three.Texture>(t: X) => scope.track(t, t => t.dispose())
  const world = new T.Group()
  const planets = new Map<BodyId, { anchor: Three.Group; mesh: Three.Mesh; halo: Three.Mesh }>()
  const orbits: Three.LineLoop[] = []
  const trails: Three.Line[] = []
  const sphere = geometry(new T.SphereGeometry(1, mobile ? 24 : 48, mobile ? 16 : 32))
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = glowCanvas.height = 128
  const gc = glowCanvas.getContext('2d')!
  const gradient = gc.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, '#fffbe7'); gradient.addColorStop(.16, '#ffc56cbb'); gradient.addColorStop(.4, '#ff922e44'); gradient.addColorStop(1, '#ff7b0000')
  gc.fillStyle = gradient; gc.fillRect(0, 0, 128, 128)
  const glow = new T.Sprite(material(new T.SpriteMaterial({ map: texture(new T.CanvasTexture(glowCanvas)), color: '#ffbf6e', transparent: true, blending: T.AdditiveBlending, depthWrite: false })))
  glow.scale.set(10, 10, 1); world.add(glow)
  const light = new T.PointLight('#fff0df', 25, 0, 2)
  world.add(light, new T.AmbientLight('#c3d9ff', 1.3))

  for (const [index, body] of bodies.entries()) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256
    const context = canvas.getContext('2d')!
    context.fillStyle = body.color; context.fillRect(0, 0, 512, 256)
    const noise = (n: number) => { const x = Math.sin(n * 127.1 + index * 311.7) * 43758.5453; return x - Math.floor(x) }
    for (let y = 0; y < 256; y++) {
      const alpha = body.kind === 'gas' ? .15 + Math.sin(y * .14 + index) * .12 : .06
      context.fillStyle = `rgba(${y % 5 ? '255,236,205' : '51,25,68'},${alpha})`; context.fillRect(0, y, 512, 1)
    }
    if (body.kind === 'rock' || body.kind === 'sun') for (let j = 0; j < 700; j++) {
      context.beginPath(); context.ellipse(noise(j + 1) * 512, noise(j + 901) * 256, 1 + noise(j + 301) * 10, 1 + noise(j + 501) * 5, 0, 0, Math.PI * 2)
      context.fillStyle = body.kind === 'sun' ? `rgba(255,240,112,${noise(j + 80) * .6})` : `rgba(50,26,42,${noise(j + 80) * .3})`; context.fill()
    }
    if (body.kind === 'earth') {
      for (let j = 0; j < 150; j++) {
        const x = noise(j + 50) * 512, y = noise(j + 400) * 256
        if (Math.sin(x * .023 + Math.cos(y * .04) * 2) > -.05) {
          context.beginPath(); context.ellipse(x, y, 5 + noise(j + 55) * 22, 3 + noise(j + 90) * 10, noise(j) * 2, 0, Math.PI * 2); context.fillStyle = '#60cfa3'; context.fill()
        }
      }
      for (let j = 0; j < 45; j++) { context.fillStyle = '#ffffff88'; context.fillRect(noise(j + 400) * 512, noise(j + 501) * 256, 10 + noise(j) * 50, 2) }
    }
    const map = texture(new T.CanvasTexture(canvas)); map.colorSpace = T.SRGBColorSpace
    const surface = body.kind === 'sun' ? material(new T.MeshBasicMaterial({ map, color: '#ffcf74' })) : material(new T.MeshStandardMaterial({ map, roughness: .75, metalness: .08, emissive: body.color, emissiveIntensity: .13 }))
    const mesh = new T.Mesh(sphere, surface); mesh.scale.setScalar(body.radius); mesh.userData.bodyId = body.id
    const anchor = new T.Group(); anchor.add(mesh); world.add(anchor)
    const halo = new T.Mesh(sphere, material(new T.ShaderMaterial({
      uniforms: { glowColor: { value: new T.Color(body.color) }, intensity: { value: 0 } },
      vertexShader: 'varying vec3 vNormal; varying vec3 vView; void main(){ vec4 p = modelViewMatrix * vec4(position,1.0); vNormal = normalize(normalMatrix * normal); vView = normalize(-p.xyz); gl_Position = projectionMatrix * p; }',
      fragmentShader: 'uniform vec3 glowColor; uniform float intensity; varying vec3 vNormal; varying vec3 vView; void main(){ float rim = pow(1.0 - abs(dot(normalize(vNormal),normalize(vView))), 2.5); gl_FragColor = vec4(glowColor, rim * intensity); }',
      transparent: true, side: T.FrontSide, depthWrite: false, blending: T.AdditiveBlending,
    })))
    halo.scale.setScalar(body.radius * 1.2); anchor.add(halo)
    planets.set(body.id, { anchor, mesh, halo })
    if (body.orbit) {
      const points = Array.from({ length: 160 }, (_, j) => new T.Vector3(Math.cos(j / 160 * Math.PI * 2) * body.orbit, 0, Math.sin(j / 160 * Math.PI * 2) * body.orbit))
      const orbit = new T.LineLoop(geometry(new T.BufferGeometry().setFromPoints(points)), material(new T.LineBasicMaterial({ color: body.color, transparent: true, opacity: .24, depthWrite: false })))
      world.add(orbit); orbits.push(orbit)
      const trailGeometry = geometry(new T.BufferGeometry())
      trailGeometry.setAttribute('position', new T.BufferAttribute(new Float32Array(32 * 3), 3))
      const colors = new Float32Array(32 * 3)
      for (let j = 0; j < 32; j++) new T.Color(body.color).multiplyScalar(j / 32).toArray(colors, j * 3)
      trailGeometry.setAttribute('color', new T.BufferAttribute(colors, 3))
      const trail = new T.Line(trailGeometry, material(new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false })))
      world.add(trail); trails.push(trail)
    }
    if (body.id === 'saturn') {
      const rings = new T.Group(); rings.rotation.x = Math.PI / 2 - .32; rings.rotation.y = .3
      for (let j = 0; j < 5; j++) rings.add(new T.Mesh(geometry(new T.RingGeometry(.95 + j * .13, 1.02 + j * .13, mobile ? 64 : 128)), material(new T.MeshBasicMaterial({ color: j % 2 ? '#bf8cec' : '#f8dfb2', side: T.DoubleSide, transparent: true, opacity: .8 - j * .09 }))))
      anchor.add(rings)
    }
    if (body.id === 'uranus') mesh.rotation.z = 1.7
  }
  const moon = new T.Mesh(geometry(new T.SphereGeometry(.1, 16, 12)), material(new T.MeshStandardMaterial({ color: '#d8d9f4', roughness: 1 })))
  planets.get('earth')!.anchor.add(moon)
  const asteroidCount = mobile ? 120 : 480
  const asteroids = new T.InstancedMesh(geometry(new T.IcosahedronGeometry(.045, 0)), material(new T.MeshStandardMaterial({ color: '#b8a3bd', roughness: 1 })), asteroidCount)
  const dummy = new T.Object3D()
  for (let j = 0; j < asteroidCount; j++) {
    const angle = j * 2.399963, radius = 8.1 + Math.sin(j * 13.3) * .4
    dummy.position.set(Math.cos(angle) * radius, Math.sin(j * 7.6) * .15, Math.sin(angle) * radius)
    dummy.rotation.set(j, j * .7, j * .4); dummy.scale.setScalar(.5 + (j % 7) / 5); dummy.updateMatrix(); asteroids.setMatrixAt(j, dummy.matrix)
  }
  scope.add(() => asteroids.dispose()); world.add(asteroids)
  const highlight = (id: BodyId | null) => planets.forEach((planet, key) => { (planet.halo.material as Three.ShaderMaterial).uniforms.intensity.value = key === id ? .8 : key === 'earth' || key === 'neptune' ? .2 : 0 })
  const update = (time: number, energy: number) => {
    for (const [index, body] of bodies.entries()) {
      const planet = planets.get(body.id)!, angle = body.angle + time * body.speed
      planet.anchor.position.set(Math.cos(angle) * body.orbit, 0, Math.sin(angle) * body.orbit)
      planet.mesh.rotation.y = time * (body.id === 'venus' ? -.1 : .18)
      if (index) {
        const positions = trails[index - 1].geometry.getAttribute('position')
        for (let j = 0; j < 32; j++) { const a = angle - (31 - j) * .012; positions.setXYZ(j, Math.cos(a) * body.orbit, 0, Math.sin(a) * body.orbit) }
        positions.needsUpdate = true
      }
    }
    moon.position.set(Math.cos(time * .7) * .7, .08, Math.sin(time * .7) * .7)
    asteroids.rotation.y = time * .013
    glow.scale.setScalar(8.8 + Math.sin(time * .7) * .4 + energy * .7)
  }
  const setTheme = (theme: SceneTheme) => {
    orbits.forEach(line => { (line.material as Three.LineBasicMaterial).opacity = theme === 'dark' ? .25 : .4 })
    ;(glow.material as Three.SpriteMaterial).blending = theme === 'dark' ? T.AdditiveBlending : T.NormalBlending
    ;(glow.material as Three.SpriteMaterial).opacity = theme === 'dark' ? 1 : .65
  }
  update(0, 0); highlight(null)
  return { world, planets, update, highlight, setTheme }
}
