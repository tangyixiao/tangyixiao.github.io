import type * as Three from 'three'
import type { ResourceScope } from './resourceScope'
import { bodies } from './solarData'
import type { BodyId, SceneTheme } from './types'

const maps = ['sun', 'mercury', 'venus_atmosphere', 'earth_daymap', 'earth_nightmap', 'earth_clouds', 'mars', 'jupiter', 'saturn', 'saturn_ring_alpha', 'uranus', 'neptune', 'moon', 'stars_milky_way'] as const
const vertex = `
varying vec2 vUv;
varying vec3 vPosition, vNormal;
void main() {
  vUv = uv;
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * vec4(vPosition, 1.0);
}`

// The Sun illuminates all bodies. A restrained ambient floor preserves the terminator.
const surfaceFragment = `
uniform sampler2D surfaceMap, nightMap, cloudMap;
uniform vec3 sunPosition;
uniform float isEarth, relief, ambient, cloudOffset;
uniform sampler2D ringMap;
uniform vec3 ringCenter, ringNormal;
uniform float hasRing, systemScale;
varying vec2 vUv;
varying vec3 vPosition, vNormal;
void main() {
  vec3 base = texture2D(surfaceMap, vUv).rgb;
  vec3 n = normalize(vNormal);
  if (relief > 0.0) {
    float center = dot(base, vec3(.299,.587,.114));
    float dx = dot(texture2D(surfaceMap, vUv + vec2(.0008,0.)).rgb,vec3(.299,.587,.114)) - center;
    float dy = dot(texture2D(surfaceMap, vUv + vec2(0.,.0016)).rgb,vec3(.299,.587,.114)) - center;
    vec3 tangent = normalize(cross(vec3(0.,1.,0.), n) + vec3(.0001));
    n = normalize(n - relief * (tangent * dx + cross(n,tangent) * dy));
  }
  vec3 light = normalize(sunPosition - vPosition);
  vec3 view = normalize(cameraPosition - vPosition);
  float incidence = dot(n, light);
  float daylight = max(incidence, 0.0);
  if (hasRing > .5) {
    float denominator = dot(light,ringNormal);
    if (abs(denominator) > .001) {
      float t = dot(ringCenter-vPosition,ringNormal)/denominator;
      float radial = length(vPosition+light*t-ringCenter)/systemScale;
      if (t>0. && radial>.88 && radial<1.7) {
        float shadow=texture2D(ringMap,vec2((radial-.88)/.82,.5)).a;
        daylight *= 1.-shadow*.82;
      }
    }
  }
  vec3 color = base * (ambient + 1.65 * daylight);
  if (isEarth > .5) {
    float cloud = texture2D(cloudMap, vUv + vec2(cloudOffset + .003, 0.)).r;
    color *= 1.0 - cloud * .22 * daylight;
    float ocean = smoothstep(.02,.12,base.b - max(base.r,base.g));
    float spec = pow(max(dot(n, normalize(light + view)),0.),56.);
    color += vec3(.4,.6,.8) * spec * ocean * daylight;
    color += texture2D(nightMap,vUv).rgb * (1.0 - smoothstep(-.15,.1,incidence)) * 1.8;
  }
  gl_FragColor = vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export async function createSolarSystem(T: typeof Three, scope: ResourceScope, mobile: boolean, signal: AbortSignal) {
  const geometry = <G extends Three.BufferGeometry>(g: G) => scope.track(g, g => g.dispose())
  const material = <M extends Three.Material>(m: M) => scope.track(m, m => m.dispose())
  const texture = <X extends Three.Texture>(t: X) => scope.track(t, t => t.dispose())
  const loaded = await Promise.all(maps.map(async name => {
    const response = await fetch(`/assets/solar/${name}.webp`, { signal })
    if (!response.ok) throw new Error(`Solar map unavailable: ${name}`)
    const blob = await response.blob()
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none', ...(mobile ? { resizeWidth: 1024, resizeHeight: name === 'saturn_ring_alpha' ? 32 : 512 } : {}) })
    scope.add(() => bitmap.close())
    if (signal.aborted) throw new DOMException('Scene disposed', 'AbortError')
    const map = texture(new T.Texture(bitmap))
    map.colorSpace = name === 'earth_clouds' ? T.NoColorSpace : T.SRGBColorSpace
    map.wrapS = T.RepeatWrapping; map.anisotropy = mobile ? 2 : 4; map.needsUpdate = true
    return [name, map] as const
  }))
  const atlas = Object.fromEntries(loaded) as Record<typeof maps[number], Three.Texture>
  const world = new T.Group()
  const planets = new Map<BodyId, { anchor: Three.Group; mesh: Three.Mesh; halo: Three.Mesh }>()
  const orbits: Three.LineLoop[] = [], trails: Three.Line[] = []
  const sunPosition = new T.Vector3()
  const ambient = { value: .045 }, clock = { value: 0 }, cloudOffset = { value: 0 }
  const sphere = geometry(new T.SphereGeometry(1, mobile ? 40 : 80, mobile ? 28 : 56))
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 256
  const gc = glowCanvas.getContext('2d')!
  const gradient = gc.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, '#fff5cc'); gradient.addColorStop(.12, '#ffde91cc'); gradient.addColorStop(.25, '#ffb34a50'); gradient.addColorStop(.55, '#f7771312'); gradient.addColorStop(1, '#ff7b0000')
  gc.fillStyle = gradient; gc.fillRect(0, 0, 256, 256)
  const glow = new T.Sprite(material(new T.SpriteMaterial({ map: texture(new T.CanvasTexture(glowCanvas)), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: .7, toneMapped: false })))
  glow.scale.set(11, 11, 1); glow.renderOrder = -1; world.add(glow)
  world.add(new T.PointLight('#fff4df', 12, 0, 1), new T.AmbientLight('#b4c4dd', .2))
  let clouds: Three.Mesh | null = null
  const ringCenter = new T.Vector3(), ringNormal = new T.Vector3(0, 1, 0), ringRadius = { value: .71 }, systemScale = { value: 1 }
  let saturnRing: Three.Mesh | null = null
  const ringUniforms = { ringMap: { value: atlas.saturn_ring_alpha }, ringCenter: { value: ringCenter }, ringNormal: { value: ringNormal }, systemScale }
  for (const [index, body] of bodies.entries()) {
    const name = body.id === 'earth' ? 'earth_daymap' : body.id === 'venus' ? 'venus_atmosphere' : body.id
    const surface = body.id === 'sun' ? material(new T.ShaderMaterial({
      uniforms: { surfaceMap: { value: atlas.sun }, clock }, vertexShader: vertex,
      fragmentShader: `uniform sampler2D surfaceMap; uniform float clock; varying vec2 vUv; varying vec3 vPosition,vNormal;
        void main(){ vec2 uv=vUv + vec2(sin(vUv.y*28.+clock*.12)*.0015,0.); vec3 map=texture2D(surfaceMap,uv).rgb;
        float limb=pow(max(dot(normalize(vNormal),normalize(cameraPosition-vPosition)),0.),.25);
        vec3 color=mix(vec3(1.2,.18,.015),map*vec3(2.6,1.45,.65),limb);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    })) : material(new T.ShaderMaterial({
      uniforms: { surfaceMap: { value: atlas[name] }, nightMap: { value: atlas.earth_nightmap }, cloudMap: { value: atlas.earth_clouds }, sunPosition: { value: sunPosition }, isEarth: { value: body.id === 'earth' ? 1 : 0 }, relief: { value: body.kind === 'rock' ? 2.5 : 0 }, ambient, cloudOffset, ...ringUniforms, hasRing: { value: body.id === 'saturn' ? 1 : 0 } },
      vertexShader: vertex, fragmentShader: surfaceFragment,
    }))
    const mesh = new T.Mesh(sphere, surface); mesh.scale.setScalar(body.radius); mesh.userData.bodyId = body.id
    const anchor = new T.Group(); anchor.add(mesh); world.add(anchor)
    const atmosphere = body.id === 'earth' ? '#479eff' : body.id === 'venus' ? '#eccb91' : body.id === 'neptune' ? '#3656e3' : body.color
    const halo = new T.Mesh(sphere, material(new T.ShaderMaterial({
      uniforms: { glowColor: { value: new T.Color(atmosphere) }, sunPosition: { value: sunPosition }, intensity: { value: 0 }, solar: { value: body.id === 'sun' ? 1 : 0 } }, vertexShader: vertex,
      fragmentShader: `uniform vec3 glowColor,sunPosition; uniform float intensity,solar; varying vec3 vPosition,vNormal;
        void main(){ vec3 n=normalize(vNormal); vec3 eye=normalize(cameraPosition-vPosition); float rim=pow(1.-abs(dot(n,eye)),3.5);
        float day=smoothstep(-.3,.8,dot(n,normalize(sunPosition-vPosition))); vec3 hue=mix(vec3(1.,.26,.06),glowColor,smoothstep(0.,.35,day));
        gl_FragColor=vec4(mix(hue,glowColor,solar),rim*intensity*mix(.16+day*.84,1.,solar));
        #include <colorspace_fragment>
        }`,
      transparent: true, side: T.BackSide, depthWrite: false, blending: T.AdditiveBlending,
    })))
    halo.scale.setScalar(body.radius * (body.id === 'sun' ? 1.16 : 1.035)); anchor.add(halo)
    planets.set(body.id, { anchor, mesh, halo })
    if (body.orbit) {
      const points = Array.from({ length: 256 }, (_, j) => new T.Vector3(Math.cos(j / 256 * Math.PI * 2) * body.orbit, 0, Math.sin(j / 256 * Math.PI * 2) * body.orbit))
      const orbit = new T.LineLoop(geometry(new T.BufferGeometry().setFromPoints(points)), material(new T.LineBasicMaterial({ color: body.color, transparent: true, opacity: .14, depthWrite: false })))
      world.add(orbit); orbits.push(orbit)
      const trailGeometry = geometry(new T.BufferGeometry())
      trailGeometry.setAttribute('position', new T.BufferAttribute(new Float32Array(64 * 3), 3))
      const colors = new Float32Array(64 * 3)
      for (let j = 0; j < 64; j++) new T.Color(body.color).multiplyScalar(Math.pow(j / 64, 2)).toArray(colors, j * 3)
      trailGeometry.setAttribute('color', new T.BufferAttribute(colors, 3))
      const trail = new T.Line(trailGeometry, material(new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .6, blending: T.AdditiveBlending, depthWrite: false })))
      world.add(trail); trails.push(trail)
    }
    if (body.id === 'earth') {
      mesh.rotation.z = .409
      clouds = new T.Mesh(sphere, material(new T.ShaderMaterial({
        uniforms: { cloudMap: { value: atlas.earth_clouds }, sunPosition: { value: sunPosition }, ambient }, vertexShader: vertex,
        fragmentShader: `uniform sampler2D cloudMap; uniform vec3 sunPosition; uniform float ambient; varying vec2 vUv; varying vec3 vPosition,vNormal;
          void main(){float density=texture2D(cloudMap,vUv).r; float light=max(dot(normalize(vNormal),normalize(sunPosition-vPosition)),0.);
          gl_FragColor=vec4(vec3(ambient+light*1.7),density*.9);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }`, transparent: true, depthWrite: false,
      })))
      clouds.scale.setScalar(body.radius * 1.009); clouds.rotation.z = .409; anchor.add(clouds)
    }
    if (body.id === 'saturn') {
      const ringGeometry = geometry(new T.RingGeometry(.88, 1.7, mobile ? 128 : 256, 1))
      const positions = ringGeometry.getAttribute('position'), uv = ringGeometry.getAttribute('uv')
      for (let j = 0; j < positions.count; j++) uv.setXY(j, (Math.hypot(positions.getX(j), positions.getY(j)) - .88) / .82, .5)
      const ring = new T.Mesh(ringGeometry, material(new T.ShaderMaterial({
        uniforms: { ringMap: { value: atlas.saturn_ring_alpha }, sunPosition: { value: sunPosition }, center: { value: ringCenter }, radius: ringRadius }, vertexShader: vertex,
        fragmentShader: `uniform sampler2D ringMap; uniform vec3 sunPosition,center; uniform float radius; varying vec2 vUv; varying vec3 vPosition,vNormal;
          void main(){vec4 tex=texture2D(ringMap,vUv); vec3 light=normalize(sunPosition-vPosition); vec3 toCenter=center-vPosition;
          float along=dot(toCenter,light); float clearance=length(toCenter-light*max(along,0.)); float shadow=along>0.?smoothstep(radius*.95,radius*1.03,clearance):1.;
          float lit=.4+.85*abs(dot(normalize(vNormal),light)); gl_FragColor=vec4(tex.rgb*lit*mix(.09,1.,shadow),tex.a*.92);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }`, side: T.DoubleSide, transparent: true, depthWrite: false,
      })))
      ring.rotation.x = Math.PI / 2 - .47; ring.rotation.y = .18; mesh.rotation.z = .47; anchor.add(ring); saturnRing = ring
    }
    if (body.id === 'uranus') mesh.rotation.z = 1.7
  }
  const moon = new T.Mesh(geometry(new T.SphereGeometry(.1, mobile ? 24 : 40, mobile ? 16 : 28)), material(new T.ShaderMaterial({
    uniforms: { surfaceMap: { value: atlas.moon }, nightMap: { value: atlas.earth_nightmap }, cloudMap: { value: atlas.earth_clouds }, sunPosition: { value: sunPosition }, isEarth: { value: 0 }, relief: { value: 3 }, ambient, cloudOffset, ...ringUniforms, hasRing: { value: 0 } }, vertexShader: vertex, fragmentShader: surfaceFragment,
  })))
  planets.get('earth')!.anchor.add(moon)
  const asteroidCount = mobile ? 180 : 900
  const asteroids = new T.InstancedMesh(geometry(new T.IcosahedronGeometry(.025, 0)), material(new T.MeshStandardMaterial({ color: '#807970', roughness: 1 })), asteroidCount)
  const dummy = new T.Object3D()
  for (let j = 0; j < asteroidCount; j++) {
    const angle = j * 2.399963, radius = 8.1 + Math.sin(j * 13.3) * .5
    dummy.position.set(Math.cos(angle) * radius, Math.sin(j * 7.6) * .12, Math.sin(angle) * radius)
    dummy.rotation.set(j, j * .7, j * .4); dummy.scale.set(.5 + j % 7 / 5, .45 + j % 3 / 3, .6 + j % 5 / 4); dummy.updateMatrix(); asteroids.setMatrixAt(j, dummy.matrix)
  }
  scope.add(() => asteroids.dispose()); world.add(asteroids)
  const highlight = (id: BodyId | null) => planets.forEach((planet, key) => {
    const natural = key === 'sun' ? 0 : key === 'earth' ? .55 : key === 'venus' || key === 'neptune' || key === 'uranus' ? .25 : .015
    ;(planet.halo.material as Three.ShaderMaterial).uniforms.intensity.value = natural + (key === id && key !== 'sun' ? .12 : 0)
  })
  const update = (time: number, energy: number) => {
    clock.value = time; cloudOffset.value = time * .003 / (Math.PI * 2)
    for (const [index, body] of bodies.entries()) {
      const planet = planets.get(body.id)!, angle = body.angle + time * body.speed
      planet.anchor.position.set(Math.cos(angle) * body.orbit, 0, Math.sin(angle) * body.orbit)
      planet.mesh.rotation.y = time * (body.id === 'venus' ? -.06 : body.id === 'sun' ? .025 : .12) + (body.id === 'earth' ? 2.4 : .25)
      if (index) {
        const positions = trails[index - 1].geometry.getAttribute('position')
        for (let j = 0; j < 64; j++) { const a = angle - (63 - j) * .012; positions.setXYZ(j, Math.cos(a) * body.orbit, 0, Math.sin(a) * body.orbit) }
        positions.needsUpdate = true
      }
    }
    if (clouds) clouds.rotation.y = time * .123 + 2.4
    moon.position.set(Math.cos(time * .7) * .78, .06, Math.sin(time * .7) * .78); moon.rotation.y = time * .7
    asteroids.rotation.y = time * .013
    glow.scale.setScalar(10.5 + Math.sin(time * .3) * .15 + energy * .3)
    world.updateMatrixWorld(true); world.getWorldPosition(sunPosition)
    planets.get('saturn')!.anchor.getWorldPosition(ringCenter); ringRadius.value = .71 * world.scale.x
    systemScale.value = world.scale.x
    if (saturnRing) ringNormal.set(0, 0, 1).transformDirection(saturnRing.matrixWorld)
  }
  const setTheme = (theme: SceneTheme) => {
    ambient.value = theme === 'dark' ? .045 : .12
    orbits.forEach(line => { (line.material as Three.LineBasicMaterial).opacity = theme === 'dark' ? .16 : .3 })
    ;(glow.material as Three.SpriteMaterial).blending = theme === 'dark' ? T.AdditiveBlending : T.NormalBlending
    ;(glow.material as Three.SpriteMaterial).opacity = theme === 'dark' ? .7 : .45
  }
  const setFocus = (id: BodyId | null) => {
    planets.forEach((planet, key) => { planet.anchor.visible = !id || key === id })
    orbits.forEach(orbit => { orbit.visible = !id }); trails.forEach(trail => { trail.visible = !id })
    asteroids.visible = !id; glow.visible = !id || id === 'sun'
  }
  update(0, 0); highlight(null)
  return { world, planets, update, highlight, setTheme, setFocus, skyMap: atlas.stars_milky_way, textureCount: loaded.length }
}
