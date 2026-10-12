import type * as Three from 'three'
import type { ResourceScope } from './resourceScope'
import { artisticOrbit, BELT, beltEccentricAnomaly, beltPoint, bodies, ellipsePoint, GALACTIC, GALAXY, keplerE, meanAnomaly, MOON, orbitFrame, rayleigh, scaleValue, SPIN, spinRate, TRUE_SCALE, type OrbitFrame } from './solarData'
import type { BodyId, ScaleMode, SceneTheme } from './types'

const maps = ['sun', 'mercury', 'venus_atmosphere', 'earth_daymap', 'earth_nightmap', 'earth_clouds', 'mars', 'jupiter', 'saturn', 'saturn_ring_alpha', 'uranus', 'neptune', 'moon', 'stars_milky_way'] as const
const DEG = Math.PI / 180
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
  // world 供浏览/探索模式取景缩放。system 是黄道面上的太阳系本体；
  // galaxy 用真实的银道基向量承载银道面：银心标记与太阳的公转轨道环，太阳带着整个系统沿环前行。
  const world = new T.Group()
  // 基向量来自 J2000 北银极与银心（见 solarData.GALACTIC）。makeBasis(centre, pole, −l90) 把
  // 局部 +x 送到银心方向、+y 送到北银极，于是局部 XZ 平面就是银道面（法线 = +y = 银极），
  // 与黄道面的夹角严格等于 90° − β_NGP = 60.19°（旧代码的欧拉角实际只有 29.8°）。
  // 该矩阵行列式为 +1（右手系），并在数值上验证过：局部 +y → 银极、局部 XZ → 银道面。
  const gCentre = new T.Vector3(...GALACTIC.centre), gL90 = new T.Vector3(...GALACTIC.l90), gPole = new T.Vector3(...GALACTIC.pole)
  const galacticBasis = new T.Matrix4().makeBasis(gCentre, gPole, gL90.clone().negate())
  const galacticQuaternion = new T.Quaternion().setFromRotationMatrix(galacticBasis)
  const galaxy = new T.Group()
  galaxy.quaternion.copy(galacticQuaternion)
  const galacticDisc = new T.Group()
  galaxy.add(galacticDisc)
  const system = new T.Group()
  world.add(galaxy); world.add(system)
  const planets = new Map<BodyId, { anchor: Three.Group; mesh: Three.Mesh; halo: Three.Mesh }>()
  const orbitLines = new Map<BodyId, Three.LineLoop>()
  const orbits: Three.LineLoop[] = [], trails: Three.Line[] = []
  const sunPosition = new T.Vector3()
  const ambient = { value: .045 }, clock = { value: 0 }, cloudOffset = { value: 0 }
  let scaleMode: ScaleMode = 'artistic'
  const live = new Map<BodyId, { orbit: number; radius: number; speed: number }>()
  for (const body of bodies) live.set(body.id, scaleValue(body, scaleMode))
  const frames = new Map<BodyId, OrbitFrame>()
  for (const body of bodies) frames.set(body.id, orbitFrame(body))
  const sphere = geometry(new T.SphereGeometry(1, mobile ? 40 : 80, mobile ? 28 : 56))
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 256
  const gc = glowCanvas.getContext('2d')!
  const gradient = gc.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, '#fff5cc'); gradient.addColorStop(.12, '#ffde91cc'); gradient.addColorStop(.25, '#ffb34a50'); gradient.addColorStop(.55, '#f7771312'); gradient.addColorStop(1, '#ff7b0000')
  gc.fillStyle = gradient; gc.fillRect(0, 0, 256, 256)
  const glow = new T.Sprite(material(new T.SpriteMaterial({ map: texture(new T.CanvasTexture(glowCanvas)), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: .7, toneMapped: false })))
  glow.scale.set(75, 75, 1); glow.renderOrder = -1; system.add(glow)
  system.add(new T.PointLight('#fff4df', 12, 0, 1), new T.AmbientLight('#b4c4dd', .2))
  // 银心公转的轨道环与银心标记：环在银道面内（与黄道面夹角严格等于 60.19°），半径略大于海王星
  // 轨道、小于全景取景半径，因此环、银心标记与整个太阳系能同框。环心在银心方向上、半径为 R，
  // 所以环必然经过原点上的太阳——银心标记绕日缓行，等价于太阳沿银道面绕银心公转。
  // 真实尺度下 8.277 kpc 与 51 单位相差 8 个数量级，半径只能是示意值，但环面与前进方向是真实值。
  const ringPoints = Array.from({ length: 512 }, (_, j) => {
    const a = j / 512 * Math.PI * 2
    return new T.Vector3(Math.cos(a), 0, Math.sin(a))
  })
  const galacticRing = new T.LineLoop(geometry(new T.BufferGeometry().setFromPoints(ringPoints)), material(new T.LineBasicMaterial({ color: '#d5c29b', transparent: true, opacity: .22, depthWrite: false })))
  const centerCanvas = document.createElement('canvas'); centerCanvas.width = centerCanvas.height = 128
  const cc = centerCanvas.getContext('2d')!
  const centerGradient = cc.createRadialGradient(64, 64, 0, 64, 64, 64)
  centerGradient.addColorStop(0, '#fff8ea'); centerGradient.addColorStop(.18, '#ffe3aecc'); centerGradient.addColorStop(.5, '#f7c76e33'); centerGradient.addColorStop(1, '#f7c76e00')
  cc.fillStyle = centerGradient; cc.fillRect(0, 0, 128, 128)
  const galacticCenter = new T.Sprite(material(new T.SpriteMaterial({ map: texture(new T.CanvasTexture(centerCanvas)), transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })))
  galacticDisc.add(galacticRing); galacticDisc.add(galacticCenter)
  // 示意轨道半径随比例模式缩放：环与银心标记必须始终落在当前取景之内，否则"绕银心公转"看不见。
  const galacticRadius = () => GALAXY.radiusRatio * (scaleMode === 'true' ? 51 : 600)
  const sizeGalaxy = () => {
    galacticRing.scale.setScalar(galacticRadius())
    // 银心标记的尺寸跟着跨度走（全景里约 9° 视角），近看时也不会缩成一个点。
    galacticCenter.scale.setScalar(Math.max(galacticRadius() * .2, 1.2))
  }
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
    const mesh = new T.Mesh(sphere, surface); mesh.scale.setScalar(live.get(body.id)!.radius); mesh.userData.bodyId = body.id
    const anchor = new T.Group(); anchor.add(mesh); system.add(anchor)
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
    halo.scale.setScalar(live.get(body.id)!.radius * (body.id === 'sun' ? 1.16 : 1.035)); anchor.add(halo)
    planets.set(body.id, { anchor, mesh, halo })
    if (body.orbit) {
      const frame = frames.get(body.id)!
      const points = Array.from({ length: 256 }, (_, j) => {
        const p = ellipsePoint(live.get(body.id)!.orbit, body.ecc, frame, j / 256 * Math.PI * 2, [0, 0, 0])
        return new T.Vector3(p[0], p[1], p[2])
      })
      const orbit = new T.LineLoop(geometry(new T.BufferGeometry().setFromPoints(points)), material(new T.LineBasicMaterial({ color: body.color, transparent: true, opacity: .14, depthWrite: false })))
      system.add(orbit); orbits.push(orbit); orbitLines.set(body.id, orbit)
      const trailGeometry = geometry(new T.BufferGeometry())
      trailGeometry.setAttribute('position', new T.BufferAttribute(new Float32Array(64 * 3), 3))
      const colors = new Float32Array(64 * 3)
      for (let j = 0; j < 64; j++) new T.Color(body.color).multiplyScalar(Math.pow(j / 64, 2)).toArray(colors, j * 3)
      trailGeometry.setAttribute('color', new T.BufferAttribute(colors, 3))
      const trail = new T.Line(trailGeometry, material(new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .6, blending: T.AdditiveBlending, depthWrite: false })))
      system.add(trail); trails.push(trail)    }
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
  const asteroidCount = mobile ? 500 : 1600
  const asteroids = new T.InstancedMesh(geometry(new T.IcosahedronGeometry(.025, 0)), material(new T.MeshStandardMaterial({ color: '#807970', roughness: 1 })), asteroidCount)
  const dummy = new T.Object3D()
  // 每颗小行星有确定性的轨道半径（主带 2.065–3.279 AU，避开木星共振清空的 Kirkwood 空隙）、
  // 相位、倾角、升交点与偏心率，按开普勒定律差速公转（内快外慢），粒径与反照率按幂律分布。
  // 倾角取双成分瑞利分布：七成多在 σ=4.5° 的低倾角主体里（峰值 3.8°、多数 <10°），
  // 另有小部分在 σ=11.5° 的晕里——这是观测到的形状，不是旧的均匀分布。
  const asteroidOrbits = Array.from({ length: asteroidCount }, (_, j) => {
    const rand = (n: number) => { const s = Math.sin(j * 127.1 + n * 311.7) * 43758.5453; return s - Math.floor(s) }
    let au = BELT.innerAU + rand(1) * (BELT.outerAU - BELT.innerAU)
    for (let k = 0; k < 8 && BELT.gaps.some(gap => Math.abs(au - gap[0]) < gap[1]); k++) au = BELT.innerAU + rand(k + 9) * (BELT.outerAU - BELT.innerAU)
    const sigma = rand(8) < BELT.coreFraction ? BELT.coreSigma : BELT.haloSigma
    return { au, phase: rand(2) * Math.PI * 2, incl: rayleigh(rand(3), sigma) * DEG, node: rand(4) * Math.PI * 2, ecc: BELT.eccBase + rand(9) * BELT.eccSpread, size: .35 + rand(5) ** 2.2 * 1.85, tumble: rand(6) * Math.PI * 2, shade: .55 + rand(7) * .6 }
  })
  const tone = new T.Color()
  const beltScratch: [number, number, number] = [0, 0, 0]
  const moonScratch: [number, number, number] = [0, 0, 0]
  for (let j = 0; j < asteroidCount; j++) { tone.setScalar(asteroidOrbits[j].shade); asteroids.setColorAt(j, tone) }
  if (asteroids.instanceColor) asteroids.instanceColor.needsUpdate = true
  const placeAsteroids = (mode: ScaleMode, time: number) => {
    for (let j = 0; j < asteroidCount; j++) {
      const a = asteroidOrbits[j]
      const radius = mode === 'true' ? a.au * TRUE_SCALE.AU : artisticOrbit(a.au)
      const M = a.phase + time * (TRUE_SCALE.earthSpeed / a.au ** 1.5)
      // beltPoint 与行星的 ellipsePoint 共用「黄道面 = XY 平面、法线 = +z」的约定，
      // 所以带子是躺在行星轨道所在的平面里、按各自的倾角上下起伏，而不是与整个太阳系垂直。
      beltPoint(radius, a.ecc, beltEccentricAnomaly(M, a.ecc), a.incl, a.node, beltScratch)
      dummy.position.set(beltScratch[0], beltScratch[1], beltScratch[2])
      dummy.rotation.set(a.tumble + time * .1, a.tumble * .7, a.tumble * .4); dummy.scale.set(a.size, a.size * .9, a.size * 1.1); dummy.updateMatrix(); asteroids.setMatrixAt(j, dummy.matrix)
    }
    asteroids.instanceMatrix.needsUpdate = true
  }
  scope.add(() => asteroids.dispose()); system.add(asteroids)
  // 远景尘埃层：与岩粒同带同速（顶点着色器内按开普勒差速推进，CPU 零开销），
  // 点径随距离钳制——全景里聚成一条可感知的尘带，飞近时也不会糊成大点。
  const dustCount = mobile ? 900 : 2600
  const dustAU = new Float32Array(dustCount), dustPhase = new Float32Array(dustCount), dustIncl = new Float32Array(dustCount), dustNode = new Float32Array(dustCount), dustEcc = new Float32Array(dustCount), dustShade = new Float32Array(dustCount)
  for (let j = 0; j < dustCount; j++) {
    const rand = (n: number) => { const s = Math.sin(j * 91.7 + n * 413.3) * 24634.6345; return s - Math.floor(s) }
    let au = BELT.innerAU + rand(1) * (BELT.outerAU - BELT.innerAU)
    for (let k = 0; k < 8 && BELT.gaps.some(gap => Math.abs(au - gap[0]) < gap[1]); k++) au = BELT.innerAU + rand(k + 9) * (BELT.outerAU - BELT.innerAU)
    const sigma = rand(6) < BELT.coreFraction ? BELT.coreSigma : BELT.haloSigma
    dustAU[j] = au; dustPhase[j] = rand(2) * Math.PI * 2; dustIncl[j] = rayleigh(rand(3), sigma) * DEG; dustNode[j] = rand(4) * Math.PI * 2
    dustEcc[j] = BELT.eccBase + rand(7) * BELT.eccSpread; dustShade[j] = .35 + rand(5) * .65
  }
  const dustGeometry = geometry(new T.BufferGeometry())
  dustGeometry.setAttribute('position', new T.BufferAttribute(new Float32Array(dustCount * 3), 3))
  dustGeometry.setAttribute('aAU', new T.BufferAttribute(dustAU, 1))
  dustGeometry.setAttribute('aPhase', new T.BufferAttribute(dustPhase, 1))
  dustGeometry.setAttribute('aIncl', new T.BufferAttribute(dustIncl, 1))
  dustGeometry.setAttribute('aNode', new T.BufferAttribute(dustNode, 1))
  dustGeometry.setAttribute('aEcc', new T.BufferAttribute(dustEcc, 1))
  dustGeometry.setAttribute('aShade', new T.BufferAttribute(dustShade, 1))
  const dustMaterial = material(new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uEarth: { value: TRUE_SCALE.earthSpeed }, uArtBase: { value: 88 }, uArtPow: { value: .55 }, uTrueMix: { value: 0 }, uPixel: { value: mobile ? 1.35 : 1.6 }, uOpacity: { value: .5 } },
    vertexShader: `attribute float aAU;
attribute float aPhase;
attribute float aIncl;
attribute float aNode;
attribute float aEcc;
attribute float aShade;
uniform float uTime, uEarth, uArtBase, uArtPow, uTrueMix, uPixel;
varying float vShade;
void main() {
  float r = mix(uArtBase * pow(aAU, uArtPow), aAU * 1.55, uTrueMix);
  float M = aPhase + uTime * uEarth / pow(aAU, 1.5);
  float E = M + aEcc * sin(M);
  float px = r * (cos(E) - aEcc), py = r * sqrt(1.0 - aEcc * aEcc) * sin(E);
  float si = sin(aIncl), ci = cos(aIncl), cn = cos(aNode), sn = sin(aNode);
  // 与 CPU 端 beltPoint 逐项一致：黄道面 = XY 平面、法线 = +z，倾角只把轨道抬离该平面。
  // 旧实现把带子建在 XZ 平面上（法线 +y），于是整条带子与所有行星轨道垂直。
  vec3 pos = vec3(cn * px - sn * py * ci, sn * px + cn * py * ci, py * si);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = clamp(uPixel * 380.0 / max(-mv.z, 1.0), 1.0, 2.8);
  vShade = aShade;
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `varying float vShade;
uniform float uOpacity;
void main() {
  float d = length(gl_PointCoord - .5);
  float a = exp(-d * d * 16.) * (1. - smoothstep(.36, .5, d)) * uOpacity * vShade;
  gl_FragColor = vec4(vec3(.85, .8, .72) * vShade, a);
  #include <colorspace_fragment>
}`,
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
  }))
  const dust = new T.Points(dustGeometry, dustMaterial); dust.frustumCulled = false
  system.add(dust)
  const highlight = (id: BodyId | null) => planets.forEach((planet, key) => {
    const natural = key === 'sun' ? 0 : key === 'earth' ? .55 : key === 'venus' || key === 'neptune' || key === 'uranus' ? .25 : .015
    ;(planet.halo.material as Three.ShaderMaterial).uniforms.intensity.value = natural + (key === id && key !== 'sun' ? .12 : 0)
  })
  const update = (time: number, energy: number) => {
    clock.value = time; cloudOffset.value = time * .003 / (Math.PI * 2)
    // 太阳绕银心公转：银心标记沿银道面内的环绕行（环上一点始终是太阳），等价于太阳带着
    // 整个系统沿银道面朝银经 90°（天鹅座方向）前进。galaxy 的朝向来自真实银道基向量，
    // 所以标记始终停在真实的银心方向上，环面与黄道面的夹角也严格是 60.19°。
    // 方向：环心相对太阳的单位向量为 cosθ·centre − sinθ·l90——t=0 时正对银心，
    // 随后朝银经 270° 漂移，与 Sgr A* 实测自行 μ_l = −6.379 mas/yr 同向。
    const galacticAngle = time * GALAXY.omega
    galacticDisc.position.set(Math.cos(galacticAngle) * galacticRadius(), 0, Math.sin(galacticAngle) * galacticRadius())
    dustMaterial.uniforms.uTime.value = time
    for (const [index, body] of bodies.entries()) {
      const planet = planets.get(body.id)!, metrics = live.get(body.id)!
      // 自转周期按真实比例（金星/天王星逆行自转），只有整体时间标尺被放慢到可观赏。
      planet.mesh.rotation.y = time * spinRate(body) + (body.id === 'earth' ? 2.4 : .25)
      if (!body.orbit) continue
      // 真实三维开普勒轨道：倾角、升交点与离心率取 J2000 值，近日点处可见加速。
      const frame = frames.get(body.id)!
      const M = meanAnomaly(body, metrics.speed, time)
      const E = keplerE(body.ecc, M)
      const px = metrics.orbit * (Math.cos(E) - body.ecc), py = metrics.orbit * Math.sqrt(1 - body.ecc * body.ecc) * Math.sin(E)
      planet.anchor.position.set(frame.X * px + frame.Y * py, frame.U * px + frame.V * py, frame.Z * px + frame.R * py)
      if (index) {
        const positions = trails[index - 1].geometry.getAttribute('position')
        for (let j = 0; j < 64; j++) {
          const Ej = keplerE(body.ecc, M - (63 - j) * .012)
          const tx = metrics.orbit * (Math.cos(Ej) - body.ecc), ty = metrics.orbit * Math.sqrt(1 - body.ecc * body.ecc) * Math.sin(Ej)
          positions.setXYZ(j, frame.X * tx + frame.Y * ty, frame.U * tx + frame.V * ty, frame.Z * tx + frame.R * ty)
        }
        positions.needsUpdate = true
      }
    }
    if (clouds) clouds.rotation.y = time * spinRate({ spin: 1 }) * 1.12 + 2.4
    // 月球：半径是地球的 0.273 倍、公转周期 27.32 天（真实比例），轨道对黄道倾斜 5.145°，
    // 且升交点每 18.6 年沿黄道退行一周。旧实现把 5.1° 直接塞进 y 分量（轨道面固定在 XZ），
    // 与行星轨道的参考面不一致；这里改用与行星相同的黄道面约定：近地点幅角 0、倾角 i、
    // 升交点 Ω(t) 退行，月球按椭圆在面内运行、再按 sin i 抬离黄道面。
    const earthRadius = live.get('earth')!.radius, moonDistance = earthRadius * 9
    const moonMean = time * Math.PI * 2 / (MOON.periodDays * SPIN.daySeconds)
    const moonNode = -(time / (MOON.nodeYears * 365.25 * SPIN.daySeconds)) * Math.PI * 2
    const mn = moonScratch
    beltPoint(moonDistance, 0, moonMean, MOON.incl, moonNode, mn)
    moon.scale.setScalar(earthRadius * 2.73)
    moon.position.set(mn[0], mn[1], mn[2]); moon.rotation.y = moonMean
    placeAsteroids(scaleMode, time)
    glow.scale.setScalar(live.get('sun')!.radius * (2.3 + Math.sin(time * .3) * .05 + energy * .12))
    world.updateMatrixWorld(true); world.getWorldPosition(sunPosition)
    planets.get('saturn')!.anchor.getWorldPosition(ringCenter); ringRadius.value = live.get('saturn')!.radius * world.scale.x
    systemScale.value = world.scale.x
    if (saturnRing) ringNormal.set(0, 0, 1).transformDirection(saturnRing.matrixWorld)
  }
  const setTheme = (theme: SceneTheme) => {
    ambient.value = theme === 'dark' ? .045 : .12
    orbits.forEach(line => { (line.material as Three.LineBasicMaterial).opacity = theme === 'dark' ? .16 : .3 })
    ;(glow.material as Three.SpriteMaterial).blending = theme === 'dark' ? T.AdditiveBlending : T.NormalBlending
    ;(glow.material as Three.SpriteMaterial).opacity = theme === 'dark' ? .7 : .45
  }
  // 真实比例：距离 1:1、行星间大小比例严格保持（太阳 20 倍 / 行星 160 倍放大以保可见）、速度遵循开普勒第三定律。
  const setScaleMode = (mode: ScaleMode) => {
    if (scaleMode === mode) return
    scaleMode = mode
    for (const body of bodies) {
      const metrics = scaleValue(body, mode)
      live.set(body.id, metrics)
      const planet = planets.get(body.id)!
      planet.mesh.scale.setScalar(metrics.radius)
      planet.halo.scale.setScalar(metrics.radius * (body.id === 'sun' ? 1.16 : 1.035))
      const line = orbitLines.get(body.id)
      if (line) {
        const positions = line.geometry.getAttribute('position')
        const frame = frames.get(body.id)!
        const scratch: [number, number, number] = [0, 0, 0]
        for (let j = 0; j < positions.count; j++) {
          ellipsePoint(metrics.orbit, body.ecc, frame, j / positions.count * Math.PI * 2, scratch)
          positions.setXYZ(j, scratch[0], scratch[1], scratch[2])
        }
        positions.needsUpdate = true
      }
    }
    if (clouds) clouds.scale.setScalar(live.get('earth')!.radius * 1.009)
    moon.visible = mode === 'artistic'
    if (saturnRing) saturnRing.scale.setScalar(live.get('saturn')!.radius / .71)
    dustMaterial.uniforms.uTrueMix.value = mode === 'true' ? 1 : 0
    sizeGalaxy()
  }
  sizeGalaxy(); update(0, 0); highlight(null)
  // 天球朝向：stars_milky_way 实测银道带基本是直线——把每列亮度重心拟合一个正弦，
  // 振幅只有 4.2°（图高的 2.3%），所以它是银道面（l/b）投影；另一张 NASA Deep Star Maps
  // 同样拟合出来是 35.7° 的大振幅正弦（图高的 19.8%，赤道投影的理论值是 27.13°/90 = 30.1%），
  // 是赤道 J2000 帧——两张图不能共用同一个旋转，这里选银道帧的 stars_milky_way。
  // 天球网格的局部坐标是 x = −cos(u·2π)、y = cos(θ)、z = sin(u·2π)，UV 的 v 从 +y 向南，
  // 而银道图在 b=0、u≈0.5 处正是银心方向，所以要求局部 +x → 银心、+y → 北银极，
  // 于是局部 +z = cross(centre, pole) = −l90，与银道环共用同一个朝向，
  // 「银河横贯天空」与「太阳沿银道面公转」讲的是同一件事。
  const skyQuaternion = galacticQuaternion.clone()
  return { world, planets, update, highlight, setTheme, setScaleMode, metrics: (id: BodyId) => live.get(id)!, span: () => scaleMode === 'true' ? 51 : 600, scaleMode: () => scaleMode, skyMap: atlas.stars_milky_way, skyQuaternion, textureCount: loaded.length, galacticAnchor: galacticDisc }
}
