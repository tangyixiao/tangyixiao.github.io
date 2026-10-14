import type * as Three from 'three'
import type { ResourceScope } from './resourceScope'
import { artisticOrbit, BELT, beltEccentricAnomaly, beltPoint, bodies, ellipsePoint, GALACTIC, GALAXY, keplerE, meanAnomaly, MOON, orbitFrame, rayleigh, scaleValue, SPIN, spinRate, TROJANS, TRUE_SCALE, type OrbitFrame } from './solarData'
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

// 没有贴图文件的天体（冥王星/谷神星/智神星/阋神星/哈雷彗星与除月球外的卫星）走程序化表面：
// assets/solar 里只有 15 张贴图且都不描绘这些天体，用噪声起伏代替贴图既不必新增图片
// （贴图数断言保持 14），也不会凭空编造一张"看起来像"的照片。ambient 与 surfaceFragment
// 共用同一个 uniform 对象，两者的明暗基准因此严格一致。
const proceduralFragment = `
uniform vec3 baseColor; uniform vec3 sunPosition; uniform float ambient; uniform float mottle;
varying vec2 vUv; varying vec3 vPosition,vNormal;
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float noise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
void main(){ vec3 n=normalize(vNormal);
  float shade=noise(normalize(vPosition)*4.5)*.55 + noise(normalize(vPosition)*11.)*.3;
  vec3 base=baseColor*(.72+shade*mottle);
  float daylight=max(dot(n, normalize(sunPosition-vPosition)),0.);
  gl_FragColor=vec4(base*(ambient+1.65*daylight),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

// 太阳的表面流动与色球日珥共用一套三维值噪声。太阳是流体：米粒组织、黑子与日珥都没有
// 固定的 UV 边界，而球面 UV 在两极被压成一条线、接缝处还要 wrap，直接在 UV 上做噪声会在
// 极点拉出条纹。改用「顶点自身的朝向」当坐标（单位球，顶点坐标即方向），噪声天然无缝，
// 也不新增任何贴图文件（贴图数断言保持 14）。
// 三层八度是刻意压过的最低配置：足以撑出"颗粒—团块—大区"的层次，再多就在软件光栅化
// （浏览器测试用的 swiftshader）上把帧率拖垮，从而拖慢依赖飞行进度的断言。
const solarNoise = `
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float vnoise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5, s=0.; for(int k=0;k<3;k++){ s+=a*vnoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s; }
`

// 太阳的顶点着色器比共享版多输出一个 vObject：顶点在单位球上的坐标就是它自身的朝向，
// 且不随自转改变。表面上的黑子与日珥因此长在星体上、随自转一起转——光球贴图本身近乎
// 各向同性，只转 mesh 看不出来，必须让"结构"跟着星体走。
const sunVertex = `
varying vec2 vUv;
varying vec3 vPosition, vNormal, vObject;
void main() {
  vUv = uv;
  vObject = position;
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * vec4(vPosition, 1.0);
}`

// 太阳表面：在 NASA 光球照片之上叠一层会翻滚的对流。两层噪声互相推挤（域扭曲）才有
// "沸腾"的读感，单层噪声只会整体明暗变化、看着像云不像流体。亮纹是上升的热气体、暗纹是
// 下沉的冷气体；黑子用低频单层噪声即可（本影压到接近全黑），它随星体自转进出视野，
// 这是"这颗恒星在自转"最直接的读数。边缘再叠一层色球的暖边，把轮廓钉出来。
const sunSurfaceFragment = `
uniform sampler2D surfaceMap; uniform float clock;
varying vec2 vUv; varying vec3 vPosition, vNormal, vObject;
${solarNoise}
void main(){
  vec3 dir = normalize(vObject);
  float warp = vnoise(dir * 3.0 + vec3(0.0, clock * .035, 0.0));
  float cells = fbm(dir * 9.0 + vec3(warp * 1.6, warp * .8, clock * .02));
  float granule = smoothstep(.30, .80, cells);
  float spots = smoothstep(.60, .80, vnoise(dir * 2.3 + vec3(11.3, 4.7, 2.9)));
  vec2 uv = vUv + vec2(sin(vUv.y * 28. + clock * .12) * .0015, 0.);
  vec3 map = texture2D(surfaceMap, uv).rgb;
  float limb = pow(max(dot(normalize(vNormal), normalize(cameraPosition - vPosition)), 0.), .25);
  vec3 color = mix(vec3(1.2, .18, .015), map * vec3(2.6, 1.45, .65), limb);
  color *= 1.0 + (granule - .45) * .55;
  color = mix(color, vec3(.20, .03, .01), spots * .85);
  color += vec3(1.0, .34, .08) * pow(1.0 - limb, 4.0) * .30;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

// 太阳的色球与日珥。halo 是一层 1.16 倍半径的 BackSide 球壳：不透明光球挡住了壳的正中，
// 只剩贴边的一圈露出来，那一圈正好就是色球的位置。日珥是沿磁力线拱起又落下的等离子体环，
// 用两个不同速度的噪声场相乘得到"此起彼伏"的生长—衰落，而不是整圈同时呼吸。
// 日珥长在 vObject（星体自身）上，所以它随自转一起扫过边缘。
const sunHaloFragment = `
uniform float clock, intensity;
varying vec2 vUv; varying vec3 vPosition, vNormal, vObject;
${solarNoise}
void main(){
  vec3 n = normalize(vNormal);
  vec3 eye = normalize(cameraPosition - vPosition);
  float rim = pow(1.0 - abs(dot(n, eye)), 2.4);
  vec3 dir = normalize(vObject);
  float arcs = vnoise(dir * 3.0 + vec3(0.0, clock * .04, 0.0));
  float arcs2 = vnoise(dir * 6.5 + vec3(arcs * 2.0, clock * .022, 0.0));
  float prom = smoothstep(.45, .80, arcs) * smoothstep(.30, .85, arcs2);
  float edge = pow(1.0 - abs(dot(n, eye)), 3.0);
  vec3 color = mix(vec3(1.0, .30, .06), vec3(1.0, .80, .42), prom);
  gl_FragColor = vec4(color, (rim + prom * edge * 1.6) * intensity);
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
  // 轨道线与拖尾都按天体 id 索引：新天体加入后「太阳之后每个天体都有一条拖尾」这个下标假设
  // 不再成立（无轨道的太阳、只有日心轨道的彗星、绕母天体的卫星各自缺项），下标会整体错位。
  const orbits = new Map<BodyId, Three.LineLoop>(), trails = new Map<BodyId, Three.Line>()
  const sunPosition = new T.Vector3()
  const ambient = { value: .045 }, clock = { value: 0 }, cloudOffset = { value: 0 }
  let scaleMode: ScaleMode = 'artistic'
  // 浅色主题下把太阳的发光统一压暗：主题只切换了 glow 的混合方式与不透明度，
  // 加法混合下的日珥在浅色背景上会白成一片，所以色球强度与点光源都要跟着主题走。
  let themeDim = 1
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
  // 点光源留着句柄：update() 里要让它跟着日冕一起呼吸，否则日冕在缩放时整个太阳系的
  // 明暗却一成不变，呼吸就只发生在贴图上而不是"这颗恒星"上。
  // 太阳的 halo 也先取到：update() 每帧要写它的色球强度，而 highlight() 不能再碰它
  // （见下方 highlight 的注释），所以这里把 material 取出来复用。
  const sunLight = new T.PointLight('#fff4df', 12, 0, 1)
  let sunHalo: Three.ShaderMaterial
  system.add(sunLight, new T.AmbientLight('#b4c4dd', .2))
  // 太阳绕银心公转的轨道环：环在银道面内（与黄道面夹角严格等于 60.19°），半径略大于海王星
  // 轨道、小于全景取景半径，因此环与整个太阳系能同框。环静止、环心固定在世界空间的 R·centre，
  // 环半径也是 R，所以环必然穿过世界原点——也就是太阳零位移时的位置。太阳（连同整个系统）
  // 沿这条环前进，环就是那条可见的轨道。
  // 真实尺度下 8.277 kpc 与 51 单位相差 8 个数量级，半径只能是示意值，但环面与前进方向是真实值。
  const ringPoints = Array.from({ length: 512 }, (_, j) => {
    const a = j / 512 * Math.PI * 2
    return new T.Vector3(Math.cos(a), 0, Math.sin(a))
  })
  const galacticRing = new T.LineLoop(geometry(new T.BufferGeometry().setFromPoints(ringPoints)), material(new T.LineBasicMaterial({ color: '#d5c29b', transparent: true, opacity: .22, depthWrite: false })))
  galacticDisc.add(galacticRing)
  // 环默认隐藏：它是巡游的轨道参考，不是常驻装饰，由工具栏的「银道环」开关按需揭示。
  // 隐藏标记打在 galacticDisc（也就是返回给调用方的 galacticAnchor）上，而不是 galacticRing 上：
  // 渲染时父级不可见会整棵子树被裁掉，反过来父级可见也救不回 visible=false 的子节点。
  // 调用方（createUniverseController 的 setGalacticRing）正是切 galacticAnchor.visible，
  // 若把标记打在环自己身上，开关就会永远打不开——实测开关前后截图逐字节相同。
  // galacticDisc 只有环这一个子节点，所以隐藏它等价于隐藏环。
  galacticDisc.visible = false
  // 示意轨道半径随比例模式缩放：环必须始终落在当前取景之内，否则"绕银心公转"看不见。
  // 环心固定在世界空间的 R·centre。环的几何是局部 xz 平面上的单位圆 (cos a, 0, sin a)，
  // 而 galacticDisc/galaxy 之间没有别的变换，galaxy 的四元数把局部 +x 送到 centre，
  // 所以把环沿局部 +x 平移 R，环心就落在世界空间的 R·centre（局部 +z 映到 −l90，见下）。
  const galacticRadius = () => GALAXY.radiusRatio * (scaleMode === 'true' ? 51 : 600)
  const sizeGalaxy = () => {
    galacticRing.scale.setScalar(galacticRadius())
    galacticRing.position.set(galacticRadius(), 0, 0)
  }
  let clouds: Three.Mesh | null = null
  const ringCenter = new T.Vector3(), ringNormal = new T.Vector3(0, 1, 0), ringRadius = { value: .71 }, systemScale = { value: 1 }
  let saturnRing: Three.Mesh | null = null
  const ringUniforms = { ringMap: { value: atlas.saturn_ring_alpha }, ringCenter: { value: ringCenter }, ringNormal: { value: ringNormal }, systemScale }
  for (const body of bodies) {
    // 贴图名直接取 body.map（地球/金星的特例已经写进 solarData 的 map 字段）。
    // 没有贴图的天体走 proceduralFragment，不再依赖任何图片文件。
    const name = body.map as typeof maps[number] | undefined
    const surface = body.id === 'sun' ? material(new T.ShaderMaterial({
      uniforms: { surfaceMap: { value: atlas.sun }, clock }, vertexShader: sunVertex, fragmentShader: sunSurfaceFragment,
    })) : body.map ? material(new T.ShaderMaterial({
      uniforms: { surfaceMap: { value: atlas[name!] }, nightMap: { value: atlas.earth_nightmap }, cloudMap: { value: atlas.earth_clouds }, sunPosition: { value: sunPosition }, isEarth: { value: body.id === 'earth' ? 1 : 0 }, relief: { value: body.kind === 'rock' ? 2.5 : 0 }, ambient, cloudOffset, ...ringUniforms, hasRing: { value: body.id === 'saturn' ? 1 : 0 } },
      vertexShader: vertex, fragmentShader: surfaceFragment,
    })) : material(new T.ShaderMaterial({
      // 气体类给更低的 mottle，否则大尺度噪声会把云带状的球面揉成麻点。
      uniforms: { baseColor: { value: new T.Color(body.color) }, sunPosition: { value: sunPosition }, ambient, mottle: { value: body.kind === 'gas' ? .45 : 1 } },
      vertexShader: vertex, fragmentShader: proceduralFragment,
    }))
    const mesh = new T.Mesh(sphere, surface); mesh.scale.setScalar(live.get(body.id)!.radius); mesh.userData.bodyId = body.id
    const anchor = new T.Group(); anchor.add(mesh)
    // 卫星（body.parent 存在）挂到母天体的 anchor 下：它的 orbit 是「母天体半径的倍数」，
    // 挂在母天体下就不必每帧再叠加母天体的日心位置。bodies 的顺序保证母天体先建好。
    if (body.parent) planets.get(body.parent)!.anchor.add(anchor)
    else system.add(anchor)
    const atmosphere = body.id === 'earth' ? '#479eff' : body.id === 'venus' ? '#eccb91' : body.id === 'neptune' ? '#3656e3' : body.color
    const halo = new T.Mesh(sphere, material(new T.ShaderMaterial({
      uniforms: body.id === 'sun'
        // 太阳的色球强度不给 highlight 用：highlight(null) 会把强度写回天然值 0，那一下会让
        // 日珥瞬间熄灭再亮回来，所以太阳的 halo 强度改由 update() 自己按呼吸节奏驱动。
        ? { clock, intensity: { value: 0 } }
        : { glowColor: { value: new T.Color(atmosphere) }, sunPosition: { value: sunPosition }, intensity: { value: 0 }, solar: { value: 0 } },
      vertexShader: body.id === 'sun' ? sunVertex : vertex,
      fragmentShader: body.id === 'sun' ? sunHaloFragment : `uniform vec3 glowColor,sunPosition; uniform float intensity,solar; varying vec3 vPosition,vNormal;
        void main(){ vec3 n=normalize(vNormal); vec3 eye=normalize(cameraPosition-vPosition); float rim=pow(1.-abs(dot(n,eye)),3.5);
        float day=smoothstep(-.3,.8,dot(n,normalize(sunPosition-vPosition))); vec3 hue=mix(vec3(1.,.26,.06),glowColor,smoothstep(0.,.35,day));
        gl_FragColor=vec4(mix(hue,glowColor,solar),rim*intensity*mix(.16+day*.84,1.,solar));
        #include <colorspace_fragment>
        }`,
      transparent: true, side: T.BackSide, depthWrite: false, blending: T.AdditiveBlending,
    })))
    halo.scale.setScalar(live.get(body.id)!.radius * (body.id === 'sun' ? 1.16 : 1.035)); anchor.add(halo)
    planets.set(body.id, { anchor, mesh, halo })
    // 太阳的 halo material 在这里拿到：bodies 里太阳第一个，此时它已经建好。
    if (body.id === 'sun') sunHalo = halo.material as Three.ShaderMaterial
    // 只有以太阳为焦点的天体才有日心轨道线与拖尾。卫星的 orbit 是母天体半径的倍数，
    // 按日心椭圆去画会得到一条穿过母天体的错误曲线，所以卫星两者都不建。
    if (body.orbit && !body.parent) {
      const frame = frames.get(body.id)!
      const points = Array.from({ length: 256 }, (_, j) => {
        const p = ellipsePoint(live.get(body.id)!.orbit, body.ecc, frame, j / 256 * Math.PI * 2, [0, 0, 0])
        return new T.Vector3(p[0], p[1], p[2])
      })
      const orbit = new T.LineLoop(geometry(new T.BufferGeometry().setFromPoints(points)), material(new T.LineBasicMaterial({ color: body.color, transparent: true, opacity: .14, depthWrite: false })))
      system.add(orbit); orbits.set(body.id, orbit); orbitLines.set(body.id, orbit)
      const trailGeometry = geometry(new T.BufferGeometry())
      trailGeometry.setAttribute('position', new T.BufferAttribute(new Float32Array(64 * 3), 3))
      const colors = new Float32Array(64 * 3)
      for (let j = 0; j < 64; j++) new T.Color(body.color).multiplyScalar(Math.pow(j / 64, 2)).toArray(colors, j * 3)
      trailGeometry.setAttribute('color', new T.BufferAttribute(colors, 3))
      const trail = new T.Line(trailGeometry, material(new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .6, blending: T.AdditiveBlending, depthWrite: false })))
      system.add(trail); trails.set(body.id, trail)
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
  // 哈雷彗星的离子尾：一个挂在它 anchor 上的圆锥，每帧把 +y 轴指向背离太阳的方向。
  // 用 MeshBasicMaterial 而不是自定义着色器——尾巴是一块方向性很强的辉光，掺进
  // surfaceFragment 那套昼夜光照只会让它变暗、失去"离子尾"的读感。
  const halleyAnchor = planets.get('halley')!.anchor
  const halleyTail = new T.Mesh(geometry(new T.ConeGeometry(.6, 1, mobile ? 10 : 18, 1, true)), material(new T.MeshBasicMaterial({ color: '#9fd8ff', transparent: true, opacity: .25, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })))
  // 圆锥默认以原点为中心、底面在 −y：沿 +y 平移半个高度，锥底就落在彗核、锥尖指向 +y，
  // 于是每帧把 +y 对齐「背离太阳」即可，不必再补一次偏移。
  halleyTail.geometry.translate(0, .5, 0); halleyTail.frustumCulled = false
  halleyAnchor.add(halleyTail)
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
  const halleyScratch = new T.Vector3()
  const UP = new T.Vector3(0, 1, 0)
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
  // 木星特洛伊群（L4 希腊营 / L5 特洛伊营）：与木星共用同一条轨道，平黄经领先/落后它 60°，
  // 每个团簇沿轨道展宽约 ±30°（天平动）。以木星为参照而不是钉死在固定坐标上，两个营才会
  // 跟着木星一起走——忽略木星的固定小行星群一近看就会露馅。
  // 分裂常数与主带用不同的乘子，两套抽样互不相关。倾角沿用主带同款 Rayleigh 分布
  // （TROJANS.sigma 略高，观测上特洛伊群的倾角确实比主带厚）。
  const jupiterBody = bodies.find(body => body.id === 'jupiter')!
  const halleyBody = bodies.find(body => body.id === 'halley')!
  const jupiterFrame = frames.get('jupiter')!
  const jupiterAU = jupiterBody.orbitAU, jupiterEcc = jupiterBody.ecc
  const trojanCount = mobile ? TROJANS.count >> 1 : TROJANS.count
  const trojanOrbits = Array.from({ length: trojanCount }, (_, j) => {
    const rand = (n: number) => { const s = Math.sin(j * 269.5 + n * 183.3) * 12345.6789; return s - Math.floor(s) }
    return {
      group: j % 2,                                        // 0 = L4（领先 60°）、1 = L5（落后 60°）
      spread: (rand(1) * 2 - 1) * TROJANS.spread,
      jitter: 1 + (rand(2) * 2 - 1) * .06,                 // 半长轴的少量散布，避免落在同一条椭圆上
      incl: rayleigh(rand(3), TROJANS.sigma * DEG),
      ecc: TROJANS.ecc + rand(4) * TROJANS.eccSpread,
      size: .35 + rand(5) ** 2.2 * 1.85,
      tumble: rand(6) * Math.PI * 2,
      shade: .55 + rand(7) * .6,
    }
  })
  const trojans = new T.InstancedMesh(geometry(new T.IcosahedronGeometry(.03, 0)), material(new T.MeshStandardMaterial({ color: '#8a8276', roughness: 1 })), trojanCount)
  for (let j = 0; j < trojanCount; j++) { tone.setScalar(trojanOrbits[j].shade); trojans.setColorAt(j, tone) }
  if (trojans.instanceColor) trojans.instanceColor.needsUpdate = true
  scope.add(() => trojans.dispose()); system.add(trojans)
  const trojanScratch: [number, number, number] = [0, 0, 0]
  const placeTrojans = (mode: ScaleMode, time: number) => {
    // 半长轴按当前比例模式映射：艺术模式压缩、真实模式 1:1，与木星轨道线用的是同一个标尺。
    const aJ = mode === 'true' ? jupiterAU * TRUE_SCALE.AU : artisticOrbit(jupiterAU)
    const jupiterSpeed = live.get('jupiter')!.speed
    const jupiterM = meanAnomaly(jupiterBody, jupiterSpeed, time)
    for (let j = 0; j < trojanCount; j++) {
      const t = trojanOrbits[j]
      // 平黄经领先/落后 60°，再叠加各自的天平动展宽；开普勒方程与椭圆点都复用木星的根数，
      // 所以两个营与木星轨道线严格共面、共形，不会出现"特洛伊群飘在木星轨道外"的错位。
      const M = jupiterM + (t.group === 0 ? 1 : -1) * (TROJANS.lag + t.spread)
      ellipsePoint(aJ * t.jitter, jupiterEcc, jupiterFrame, keplerE(jupiterEcc, M), trojanScratch)
      // ellipsePoint 给的是木星轨道面内的点；倾角把每颗粒子抬离该平面，与主带的约定一致
      // （黄道面 = XY 平面、法线 = +z，倾角只动 z）。
      dummy.position.set(trojanScratch[0], trojanScratch[1], trojanScratch[2] + aJ * Math.sin(t.incl))
      dummy.rotation.set(t.tumble + time * .1, t.tumble * .7, t.tumble * .4); dummy.scale.set(t.size, t.size * .9, t.size * 1.1); dummy.updateMatrix(); trojans.setMatrixAt(j, dummy.matrix)
    }
    trojans.instanceMatrix.needsUpdate = true
  }
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
    // 太阳的色球强度由 update() 按呼吸节奏自己驱动（见 update 内 sunLight 附近），
    // 这里不能再写它的 intensity：highlight(null) 会把日珥直接掐灭。
    if (key === 'sun') return
    const natural = key === 'earth' ? .55 : key === 'venus' || key === 'neptune' || key === 'uranus' ? .25 : .015
    ;(planet.halo.material as Three.ShaderMaterial).uniforms.intensity.value = natural + (key === id ? .12 : 0)
  })
  const update = (time: number, energy: number) => {
    clock.value = time; cloudOffset.value = time * .003 / (Math.PI * 2)
    // 整个太阳系沿银道环真正地位移（不是转视角，也不是让环绕着太阳转）。公式来自环的
    // 几何：环心固定在世界空间的 R·centre、环半径 = R、环穿过世界原点，于是原点到环上
    // 角度 θ 那一点的向量正好是 centre·R(1−cosθ) + l90·R·sinθ。
    // θ=0 时位移严格为 0——太阳就停在环穿过的那个点上，初始构图不变，运动是从当前画面长出来的；
    // 速度方向是 +l90（银经 90°、天鹅座，即 Sgr A* 相对太阳的自行方向）。
    // 轨迹张成于 centre 与 l90，其法线是银极，所以运动平面与黄道面的夹角严格是 60.19°，
    // 这是真实天文角度而不是观感调参。system 里装着太阳、行星、小行星、尘埃、glow 与光源，
    // 它们作为刚体一起被搬运，太阳系内部的相对几何完全不受影响。
    const galacticAngle = time * GALAXY.omega
    const R = galacticRadius()
    system.position.copy(gCentre).multiplyScalar(R * (1 - Math.cos(galacticAngle))).addScaledVector(gL90, R * Math.sin(galacticAngle))
    dustMaterial.uniforms.uTime.value = time
    for (const body of bodies) {
      const planet = planets.get(body.id)!, metrics = live.get(body.id)!
      // 自转周期按真实比例（金星/天王星逆行自转），只有整体时间标尺被放慢到可观赏。
      planet.mesh.rotation.y = time * spinRate(body) + (body.id === 'earth' ? 2.4 : .25)
      if (!body.orbit) continue
      const frame = frames.get(body.id)!
      // 卫星：orbit 是「母天体半径的倍数」，锚点挂在母天体的 anchor 下，所以这里写的是
      // 母天体的局部坐标，不必再叠加母天体的日心位置。轨道线与拖尾都不建——按日心椭圆
      // 去画会得到一条穿过母天体的错误曲线。
      // 月球保留实测的升交点退行（18.6 年一周）；其余卫星用 body.node 常量，轨道面固定。
      if (body.parent) {
        const r = live.get(body.parent)!.radius * body.orbit
        const node = body.id === 'moon' ? -(time / (MOON.nodeYears * 365.25 * SPIN.daySeconds)) * Math.PI * 2 : body.node * DEG
        beltPoint(r, body.ecc, keplerE(body.ecc, meanAnomaly(body, metrics.speed, time)), body.inc * DEG, node, moonScratch)
        planet.anchor.position.set(moonScratch[0], moonScratch[1], moonScratch[2])
        continue
      }
      // 真实三维开普勒轨道：倾角、升交点与离心率取 J2000 值，近日点处可见加速。
      const M = meanAnomaly(body, metrics.speed, time)
      const E = keplerE(body.ecc, M)
      const px = metrics.orbit * (Math.cos(E) - body.ecc), py = metrics.orbit * Math.sqrt(1 - body.ecc * body.ecc) * Math.sin(E)
      planet.anchor.position.set(frame.X * px + frame.Y * py, frame.U * px + frame.V * py, frame.Z * px + frame.R * py)
      // 拖尾按 id 取：新加入的天体并非「太阳之后每个都有一条」，下标会整体错位。
      const trail = trails.get(body.id)
      if (trail) {
        const positions = trail.geometry.getAttribute('position')
        for (let j = 0; j < 64; j++) {
          const Ej = keplerE(body.ecc, M - (63 - j) * .012)
          const tx = metrics.orbit * (Math.cos(Ej) - body.ecc), ty = metrics.orbit * Math.sqrt(1 - body.ecc * body.ecc) * Math.sin(Ej)
          positions.setXYZ(j, frame.X * tx + frame.Y * ty, frame.U * tx + frame.V * ty, frame.Z * tx + frame.R * ty)
        }
        positions.needsUpdate = true
      }
    }
    if (clouds) clouds.rotation.y = time * spinRate({ spin: 1 }) * 1.12 + 2.4
    // 哈雷的离子尾：+y 对齐「背离太阳」的方向，长度按 1/r——越近日点越长（太阳风与辐射压的
    // 通量随日心距平方衰减）。长度用「近日点距离 / 当前日心距」这个无量纲比值乘以若干个彗核
    // 半径：两种比例模式下所有长度同比缩放，比值不变，所以观感完全一致，也不依赖任何绝对常数。
    // 上限 12 个核半径，否则选中彗星、相机飞到核旁边时尾巴会糊满整个屏幕。
    const halley = planets.get('halley')!.anchor, halleyMetrics = live.get('halley')!
    const halleyDistance = Math.max(halley.position.length(), 1e-9)
    const halleyTailLength = halleyMetrics.radius * Math.min(12, 8 * halleyMetrics.orbit * (1 - halleyBody.ecc) / halleyDistance)
    halleyTail.scale.set(halleyTailLength * .22, halleyTailLength, halleyTailLength * .22)
    halleyTail.quaternion.setFromUnitVectors(UP, halleyScratch.copy(halley.position).negate().normalize())
    placeAsteroids(scaleMode, time)
    placeTrojans(scaleMode, time)
    // 太阳的自转：真实周期是 25.38 天，按 SPIN.daySeconds=10 折算成 253.8 秒一圈，
    // 直播里几乎看不出动。这里单独给 12 秒一圈的视觉化倍率——黑子与日珥随星体转过，
    // 表面流动仍在跑，两者叠起来才读得出"这颗恒星在自转"。
    // 倍数不写进 spinRate：那个函数被所有天体共用，改它会连带改变其他行星的自转速度。
    planets.get('sun')!.mesh.rotation.y = time * Math.PI * 2 / 12
    // 呼吸节拍：日冕的缩放、点光源的亮度与色球的强度共用 solarPulse 这一个低频正弦，
    // 于是行星的受光面也随太阳脉动，而不只是贴片在闪；三者同相，太阳才像同一个光源。
    const solarPulse = .5 + .5 * Math.sin(time * .3)
    glow.scale.setScalar(live.get('sun')!.radius * (2.3 + solarPulse * .05 + energy * .12))
    sunLight.intensity = 12 * (.92 + solarPulse * .08) + energy * 1.4
    sunHalo.uniforms.intensity.value = (.34 + solarPulse * .07 + energy * .16) * themeDim
    // 光照与土星环阴影都以太阳的世界坐标为准。system 现在带着整个太阳系位移，
    // 所以太阳不再是世界原点的 world 位置，而是「太阳 anchor」的世界坐标——太阳的 anchor
    // 就在 system 原点，这一句必须在写 system.position 之后、updateMatrixWorld 之后取。
    world.updateMatrixWorld(true)
    planets.get('sun')!.anchor.getWorldPosition(sunPosition)
    planets.get('saturn')!.anchor.getWorldPosition(ringCenter); ringRadius.value = live.get('saturn')!.radius * world.scale.x
    systemScale.value = world.scale.x
    if (saturnRing) ringNormal.set(0, 0, 1).transformDirection(saturnRing.matrixWorld)
  }
  const setTheme = (theme: SceneTheme) => {
    ambient.value = theme === 'dark' ? .045 : .12
    orbits.forEach(line => { (line.material as Three.LineBasicMaterial).opacity = theme === 'dark' ? .16 : .3 })
    ;(glow.material as Three.SpriteMaterial).blending = theme === 'dark' ? T.AdditiveBlending : T.NormalBlending
    ;(glow.material as Three.SpriteMaterial).opacity = theme === 'dark' ? .7 : .45
    themeDim = theme === 'dark' ? 1 : .55
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
    // 卫星在真实比例模式下隐藏：那里 1:1 的距离会把月球甩到地球轨道之外，卫星的
    // 「母天体半径倍数」轨道只在距离被压缩时才成立（月球以前就跟着这个开关一起隐藏）。
    for (const body of bodies) if (body.parent) planets.get(body.id)!.anchor.visible = mode === 'artistic'
    if (saturnRing) saturnRing.scale.setScalar(live.get('saturn')!.radius / .71)
    dustMaterial.uniforms.uTrueMix.value = mode === 'true' ? 1 : 0
    placeTrojans(mode, clock.value)
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
  return {
    world, planets, update, highlight, setTheme, setScaleMode, metrics: (id: BodyId) => live.get(id)!, span: () => scaleMode === 'true' ? 51 : 600, scaleMode: () => scaleMode, skyMap: atlas.stars_milky_way, skyQuaternion, textureCount: loaded.length,
    // galacticAnchor 仍然返回 galacticDisc：调用方只用它切换整体显隐（银道环开关），
    // 环的可见性由 createSolarSystem 自己在 sizeGalaxy 之外管不好，所以这里保持原样。
    galacticAnchor: galacticDisc,
    // 巡游位移向量由 update() 每帧原地更新，调用方按引用读取即可拿到最新的值（不要存副本）。
    cruise: system.position,
    // 1× 时间流速下、世界单位/秒的巡游速率。圆周长 2πR、一周 2π/ω 秒，所以速率就是 R·ω。
    // 调用方用它把位移换算成像素再夹住镜头余量。
    cruiseSpeed: () => galacticRadius() * GALAXY.omega,
  }
}
