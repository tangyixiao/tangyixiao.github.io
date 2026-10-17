import type { OrbitControls as OrbitControlsType } from 'three/addons/controls/OrbitControls.js'
import { createResourceScope } from './resourceScope'
import { createSolarSystem } from './createSolarSystem'
import { bodies, GALAXY, TRUE_SCALE } from './solarData'
import type { BodyId, ScaleMode, SceneMode, ScenePhase, SceneTheme, UniverseCanvasProps, UniverseController } from './types'

export const particleCountForWidth = (width: number) => width <= 760 ? 420 : 1100
const profiles = {
  hero: { x: 15, tilt: .68, turn: -.15, scale: .026, cameraZ: 60 },
  projects: { x: 9, tilt: .48, turn: .35, scale: .021, cameraZ: 61 },
  focus: { x: 8, tilt: 1.04, turn: -.3, scale: .02, cameraZ: 63 },
  about: { x: -9, tilt: .57, turn: .6, scale: .019, cameraZ: 62 },
  links: { x: 8, tilt: .8, turn: -.5, scale: .018, cameraZ: 66 },
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
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(42, 1, .02, 12000)
    const loadTimeout = window.setTimeout(() => assetAbort.abort(), 20000)
    scope.add(() => clearTimeout(loadTimeout))
    const solar = await createSolarSystem(T, scope, mobile, assetAbort.signal)
    clearTimeout(loadTimeout)
    if (assetAbort.signal.aborted) throw new DOMException('Scene disposed', 'AbortError')
    scene.add(solar.world)
    const skyGeometry = scope.track(new T.SphereGeometry(280, 48, 32), g => g.dispose())
    const skyMaterial = scope.track(new T.MeshBasicMaterial({ map: solar.skyMap, side: T.BackSide, transparent: true, opacity: .2, depthWrite: false, toneMapped: false }), m => m.dispose())
    // 天球用与银道环同一个四元数：Milky Way 因此横贯真正的银道面，与金色轨道环共面。
    // 旧代码 sky.rotation.set(.45,.6,.2) 是手调欧拉角，银河的朝向与计算出来的银道面无关。
    const sky = new T.Mesh(skyGeometry, skyMaterial); sky.quaternion.copy(solar.skyQuaternion); scene.add(sky)
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
    // 星空环境随当前取景距离缩放，保证拉到最远时相机仍处于天球内部。
    // 「星系视角」要把整条银心轨道（直径 2R）装进画面，环境半径必须跟着一起放大，
    // 否则相机退到环外时会直接穿出天球，银河背景反而消失。
    const environmentSpan = () => galacticView && mode === 'explore' ? solar.galacticRadius() * 2.6 : solar.span()
    const frameEnvironment = () => {
      const grow = environmentSpan() / Math.sin(T.MathUtils.degToRad(21)) * 1.65 * 1.08 / 210
      sky.scale.setScalar(grow); stars.scale.setScalar(grow)
    }
    const root = canvas.parentElement!
    // 只有太阳与八大行星常驻标签，常驻标签总数是 9（测试断言 .celestial-label 的计数）。
    // 「银心」标签与它指向的银心标记一起删除：那是一处人为的示意点，不是天体。
    // 矮行星/小行星/彗星/卫星的标签按需创建，只在被选中时挂进 DOM，否则默认画面会被标签淹没。
    const primary = bodies.filter(body => body.category === 'star' || body.category === 'planet')
    const makeLabel = (body: (typeof bodies)[number]) => {
      const label = document.createElement('div'); label.className = 'celestial-label'; label.dataset.body = body.id
      const zh = document.createElement('span'); zh.className = 'label-zh'; zh.textContent = body.zh[0]
      const en = document.createElement('span'); en.className = 'label-en'; en.textContent = body.en[0]
      label.append(zh, en); label.style.setProperty('--body-color', body.color); scope.add(() => label.remove())
      return label
    }
    const labels = new Map<BodyId, HTMLElement>()
    for (const body of primary) { const label = makeLabel(body); root.append(label); labels.set(body.id, label) }
    // 真实比例模式下天体小到看不见（地球在全景里约 0.02 像素），但位置仍然要能被找到、被点中，
    // 所以每个常驻天体再多一个固定 11 像素的标记环。环是空心的：它标的是位置，不是天体大小——
    // 天体的真实像素直径由 update 写出的 data-scene-body-pixels 给出，两者不会互相冒充。
    // 只在真实比例模式显示：艺术模式下行星本来就有球面大小，再加环只是噪声，也违反「主视图不动」。
    const makeMarker = (body: (typeof bodies)[number]) => {
      const marker = document.createElement('div'); marker.className = 'celestial-marker'; marker.dataset.body = body.id
      marker.hidden = true; marker.style.setProperty('--body-color', body.color); scope.add(() => marker.remove())
      return marker
    }
    const markers = new Map<BodyId, HTMLElement>()
    for (const body of primary) { const marker = makeMarker(body); root.append(marker); markers.set(body.id, marker) }
    // 星系视角里整个太阳系只占画面宽度的百分之几，九颗行星的标签会叠成一片，谁也读不出来；
    // 这个尺度上有意义的位置只有一个——「太阳系在哪里」。所以在这个视角里换成一个跟随太阳
    // 世界坐标的亮点：环是静止的轨道，亮点沿环走完一圈，就是「整个体系真的在公转」本身。
    const systemMarker = document.createElement('div')
    systemMarker.className = 'system-marker'; systemMarker.hidden = true
    root.append(systemMarker); scope.add(() => systemMarker.remove())
    const extraMarkers = new Map<BodyId, HTMLElement>()
    const extraMarker = (id: BodyId) => {
      const cached = extraMarkers.get(id)
      if (cached) return cached
      const marker = makeMarker(bodies.find(entry => entry.id === id)!); extraMarkers.set(id, marker)
      return marker
    }
    const extraLabels = new Map<BodyId, HTMLElement>()
    const extraLabel = (id: BodyId) => {
      const cached = extraLabels.get(id)
      if (cached) return cached
      const label = makeLabel(bodies.find(entry => entry.id === id)!); extraLabels.set(id, label)
      return label
    }
    const projected = new T.Vector3(), projectionOffset = new T.Vector3()
    const sunScenePosition = new T.Vector3()
    let mountedExtra: HTMLElement | null = null, mountedMarker: HTMLElement | null = null
    // 巡游跟随的向量。太阳系真的在星空里位移（system.position），相机再跟掉其中大部分：
    // residualScene 是留在画面上的那一段（也就是天体在屏幕上真正走过的距离），
    // shiftScene 是相机必须自己跟掉的其余部分，followApplied 记录已经跟掉多少，
    // 探索模式里用户手动转视角时才不会被逐帧重设的相机位置顶掉。
    const cruiseScene = new T.Vector3(), residualScene = new T.Vector3(), shiftScene = new T.Vector3()
    const shiftDelta = new T.Vector3(), followApplied = new T.Vector3(), followScratch = new T.Vector3()
    // 星系视角取景用的暂存向量：环心、环面法线、视线方向。它们每帧由 createSolarSystem 刷新，
    // 单独开暂存是因为取景要把法线单位化、把环心取反，改写原对象会把场景里的基准改坏。
    const galacticCentreScratch = new T.Vector3(), galacticNormalScratch = new T.Vector3(), galacticDirScratch = new T.Vector3()
    let destroyed = false, animationFrame = 0, renderCount = 0, simulationTime = 0, lastTime: number | null = null
    let phase: ScenePhase = props.phase, theme: SceneTheme = props.theme, mode: SceneMode = 'browse', paused = props.paused
    let scaleMode: ScaleMode = 'artistic'
    let timeScale = props.timeScale, galacticRing = props.galacticRing, galacticView = props.galacticView
    let selected: BodyId | null = null, hovered: BodyId | null = null, pulseEnergy = 0
    let flight: { fromPosition: import('three').Vector3; fromTarget: import('three').Vector3; offset: import('three').Vector3; progress: number } | null = null
    let controls: OrbitControlsType | null = null, releaseInteraction: (() => void) | null = null, interactionElement: HTMLElement | null = null
    const pointer = new T.Vector2(), raycaster = new T.Raycaster(), targetPosition = new T.Vector3(), previousTarget = new T.Vector3()
    const visible = () => !document.hidden
    const diagnostic = (key: string, value: string) => root.setAttribute('data-scene-' + key, value)
    diagnostic('bodies', String(solar.planets.size)); diagnostic('planets', '8'); diagnostic('moon', 'true'); diagnostic('saturn-rings', 'true')
    diagnostic('textures', String(solar.textureCount))
    diagnostic('ready', 'true'); diagnostic('mode', 'browse'); diagnostic('selected', 'none'); diagnostic('paused', String(paused)); diagnostic('scale', 'artistic')
    diagnostic('time-scale', String(timeScale)); diagnostic('galactic-ring', String(galacticRing)); diagnostic('view', 'system')

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
      const scale = Math.min(innerWidth * .85, 410) * 57 * Math.tan(T.MathUtils.degToRad(21)) / (600 * innerHeight)
      const y = (innerHeight * .5 - 195) * 2 * Math.tan(T.MathUtils.degToRad(21)) * 57 / innerHeight
      return { ...p, x: 0, y: phase === 'hero' ? y : 0, tilt: phase === 'hero' ? .5 : p.tilt, scale: phase === 'hero' ? scale : .012, cameraZ: 57 }
    }
    // 把「太阳系已经走了多远」拆成两部分：留在画面上的 residualScene（有上限）与相机跟掉的
    // shiftScene（其余部分）。cruise 是 system 在 world 局部空间的位移，先换算到场景空间
    // （world 的朝向 + 缩放），再按预算截断。上限同时受两条约束：屏幕上最多走过可视宽度的
    // 一个比例，以及「全景取景本来留给最外侧轨道的余量」——后者保证探索模式的全景里，
    // 外行星不会被这点位移顶出画面。
    const narrowHalf = (viewDistance: number) => viewDistance * Math.tan(Math.min(T.MathUtils.degToRad(21), Math.atan(Math.tan(T.MathUtils.degToRad(21)) * camera.aspect)))
    // 残差预算 = 画面上留下多少公转位移。这是「太阳动没动」的可见性旋钮：
    // 旧值（.18/.22）加上海王星余量项会把 86–95% 的位移跟掉，1× 下一圈 25 分钟屏幕上只漂几十像素——
    // 用户看到的就是"太阳不动、行星围着它转"的日心说画面。现在留下两到三成的可视宽度，
    // 太阳带着整个体系在画面里走出肉眼可见的一段弧；外行星被顶出画面的风险由取景距离
    // 在 explore 侧预留 22% 余量（overview 的 span/sin(21°) → ×1.22）吸收。
    const cruiseBudget = (viewDistance: number, fraction: number) => {
      const half = narrowHalf(viewDistance)
      return fraction * half
    }
    // 残差跟随状态：旧实现把残差硬钳在预算圈内，方向随银道角极慢地旋转，1× 下太阳
    // 几秒后就停在画面上不动了（实测 36 秒只漂 28px）。现在残差改为「限速追赶 + 周期回拢」：
    // 追赶速度远低于巡游速度，太阳以巡游速率的一小部分持续横穿画面（公转的可见读数），
    // 残差滑到预算圈边缘时平滑地拽回起点——像摄影师每隔一阵把镜头摇回主体，观感是
    // 有意的运镜而不是跳变。回收期只有残差被拉回，画面其他元素不动。
    const residualState = { recycle: 0 }
    const RESIDUAL_FOLLOW = .55            // 残差追赶速率占巡游速率的比例（其余被相机跟掉）
    const RESIDUAL_RECYCLE = 1.6           // 回拢时长（秒）：残差沿直线滑回巡航反向的一端
    const computeShift = (viewDistance: number, fraction: number, delta: number, follow = true) => {
      cruiseScene.copy(solar.cruise).applyQuaternion(solar.world.quaternion).multiplyScalar(solar.world.scale.x)
      // 星系视角里相机不跟：整圈公转正是要看的东西，位移必须原原本本留在画面上，
      // 否则相机会像主视图那样跟掉 86%，一圈走完屏幕上才挪几十像素。
      if (!follow) { residualState.recycle = 0; residualScene.copy(cruiseScene); shiftScene.set(0, 0, 0); return }
      const budgetScene = cruiseBudget(viewDistance, fraction)
      const cruiseLength = Math.max(cruiseScene.length(), 1e-9)
      const dir = followScratch.copy(cruiseScene).divideScalar(cruiseLength)
      // 回拢进行中：残差沿当前巡游方向从 -budget 滑到 +budget（2 个预算深的往返），
      // 太阳在画面上快速但平滑地走完一段；没在回拢时按固定比例追赶巡游位移。
      if (residualState.recycle > 0) {
        residualState.recycle = Math.max(residualState.recycle - delta, 0)
        const phase = 1 - residualState.recycle / RESIDUAL_RECYCLE
        residualScene.copy(dir).multiplyScalar((phase * 2 - 1) * budgetScene)
      } else {
        residualScene.addScaledVector(dir, cruiseLength * RESIDUAL_FOLLOW * delta)
        if (residualScene.length() >= budgetScene) residualState.recycle = RESIDUAL_RECYCLE
      }
      shiftScene.copy(cruiseScene).sub(residualScene)
    }
    const render = (time: number, immediate = false) => {
      if (destroyed) return
      const delta = lastTime === null ? 0 : Math.min(Math.max((time - lastTime) / 1000, 0), .05)
      lastTime = time
      // 时间流速：档位只缩放模拟时间的推进速度，几何、取景与光照都不受影响。
      if (!paused && !props.reducedMotion && visible()) simulationTime += delta * timeScale
      const rate = immediate || props.reducedMotion ? 1 : 1 - Math.exp(-delta * 5)
      const p = mode === 'browse' ? profile() : null
      if (p) {
        // 浏览模式的构图先落位：ρ 的换算要用到本帧 world 的朝向与缩放。
        solar.world.position.lerp(followScratch.set(p.x, p.y, 0), rate)
        solar.world.scale.setScalar(T.MathUtils.lerp(solar.world.scale.x, p.scale, rate))
        solar.world.rotation.x = T.MathUtils.lerp(solar.world.rotation.x, p.tilt + pointer.y * .035, rate)
        solar.world.rotation.y = T.MathUtils.lerp(solar.world.rotation.y, p.turn + pointer.x * .06, rate)
      }
      solar.update(simulationTime, pulseEnergy)
      // 拖尾着色器要相机在 model 空间的位置：渲染前同步一次，1px 线才抬得出亮带。
      solar.setTrailCamera(camera.position, solar.world.quaternion, solar.world.scale.x)
      solar.world.updateMatrixWorld(true)
      // 行进光束的近景淡出：分母「光束长度」= 太阳半径×12.5（与 createSolarSystem 的
      // sunBeamLength 同式），分子是相机-太阳的世界距离。太阳世界坐标 = solar.world 下的
      // system 原点，update() 之后逐帧刷新；相机贴近太阳（选中近景、真实比例拉近）时把
      // 409 单位长的金色巨楔完全收掉，0.85→1.2 倍光束长之间平滑恢复，全景不受影响。
      sunScenePosition.set(0, 0, 0).applyMatrix4(solar.world.matrixWorld)
      solar.setBeamFade(T.MathUtils.clamp((camera.position.distanceTo(sunScenePosition) / (solar.metrics('sun').radius * 12.5) - solar.beamFadeScale) / .35, 0, 1))
      // 太阳系沿银道面绕银心公转：solar.cruise 是 system 组在 world 局部空间的位移（t=0 时为零）。
      // 换算到场景空间后按当前取景预算截留一小段：相机跟掉其余部分（shift），天体因此在画面上
      // 恰好只走过 residual——太阳系确实在星空里挪动，构图却不会跑掉。相机平移本身还带来
      // 星空视差：拉远的星点会缓缓流过，这是「整个太阳系正在银河里前进」最直接的读数。
      const viewDistance = p ? p.cameraZ : controls ? camera.position.distanceTo(controls.target) : solar.span()
      computeShift(viewDistance, p ? .3 : .28, delta, !galacticView)
      if (p) {
        // 相机整体平移 shiftScene、朝向仍锁在原点：太阳系在画面里只挪动 residual，天球与背景星不动，
        // 视向随位移微微转动——那点视差就是「整个太阳系正在银河里前进」的读数。
        camera.position.lerp(followScratch.set(0, 0, p.cameraZ).add(shiftScene), rate)
        camera.lookAt(0, 0, 0)
        followApplied.copy(shiftScene)
      } else {
        // 探索模式有选中天体时，相机已经在逐帧跟踪它的世界坐标（天体本身随巡游移动），
        // 这里再叠加一次跟随会把位移算两遍；只有全景视角才需要自己跟掉 shift。
        if (!selected && controls) {
          shiftDelta.copy(shiftScene).sub(followApplied)
          camera.position.add(shiftDelta); controls.target.add(shiftDelta)
        }
        followApplied.copy(shiftScene)
      }
      // 天球跟随 world 一起旋转：黄道面与银道面的夹角是固定的物理事实，浏览模式为了构图
      // 会旋转整个模型，此时银河必须同步倾斜，否则会和金色银道环错开一个 profile 的倾角。
      // 只同步朝向与位置、不同步缩放——天球的缩放是"相机始终保持在天球内部"的取景参数。
      sky.position.copy(solar.world.position)
      sky.quaternion.copy(solar.world.quaternion).multiply(solar.skyQuaternion)
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
      // 常驻标签只服务太阳与八大行星：`outside-bodies` 诊断也只统计这九个，
      // 否则矮行星与彗星（艺术压缩下被放在 600 单位全景之外）会让「全景是否装得下」永远报错。
      for (const body of primary) {
        const label = labels.get(body.id)!, marker = markers.get(body.id)!, entry = solar.planets.get(body.id)
        if (!entry) continue
        entry.anchor.getWorldPosition(projected)
        const distance = camera.position.distanceTo(projected)
        // 用 metrics(半径) 而不是 body.radius：真实比例模式下 live 里的半径是统一放大后的值，
        // body.radius 仍是艺术模式的半径，标签偏移量必须跟当前模式一致。
        const radiusPixels = solar.metrics(body.id).radius * solar.world.scale.x / distance * innerHeight / (2 * Math.tan(T.MathUtils.degToRad(21)))
        projected.project(camera)
        if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || projected.z < -1 || projected.z > 1) outside.push(body.id)
        const x = (projected.x * .5 + .5) * innerWidth, y = (-projected.y * .5 + .5) * innerHeight
        const shown = !galacticView && projected.z > -1 && projected.z < 1 && x > 10 && x < innerWidth - 100 && y > 85 && y < innerHeight - (mode === 'explore' ? 185 : 220) && (mode === 'explore' || phase === 'hero' && innerWidth > 760 && x > innerWidth * .48)
        label.hidden = !shown
        if (shown) label.style.transform = `translate(${(x + radiusPixels + 10).toFixed(1)}px,${(y - 5).toFixed(1)}px)`
        // 标记环只在真实比例模式出现，且与标签共用同一个「在画面内」判定，两者不会各自错位。
        const marked = shown && scaleMode === 'true'
        marker.hidden = !marked
        if (marked) marker.style.transform = `translate(${(x - 5.5).toFixed(1)}px,${(y - 5.5).toFixed(1)}px)`
      }
      // 星系视角里九个天体的标签会挤在同一小块像素上，所以整体让位给一个跟随太阳的亮点：
      // 那个亮点就是「太阳系」，它沿静止的环走一圈，公转因此看得见，也不必读任何文字。
      systemMarker.hidden = !(galacticView && mode === 'explore')
      if (!systemMarker.hidden) {
        solar.world.updateMatrixWorld(true)
        solar.planets.get('sun')!.anchor.getWorldPosition(projected)
        projected.project(camera)
        const mx = (projected.x * .5 + .5) * innerWidth, my = (-projected.y * .5 + .5) * innerHeight
        systemMarker.style.transform = `translate(${(mx - 4).toFixed(1)}px,${(my - 4).toFixed(1)}px)`
      }
      diagnostic('outside-bodies', outside.join(',') || 'none')
      // 小天体与卫星没有常驻标签，只在被选中时临时挂一个进 DOM（默认画面因此不会被标签淹没）。
      // 银心标签与银心标记一起删除：那是一处人为的示意点，不是天体。
      const selectedExtra = selected && !labels.has(selected) ? extraLabel(selected) : null
      if (mountedExtra && mountedExtra !== selectedExtra) mountedExtra.remove()
      mountedExtra = null
      const selectedMarker = selected && !markers.has(selected) ? extraMarker(selected) : null
      if (mountedMarker && mountedMarker !== selectedMarker) mountedMarker.remove()
      mountedMarker = null
      if (selectedExtra && selected) {
        const entry = solar.planets.get(selected)
        if (entry) {
          root.append(selectedExtra); mountedExtra = selectedExtra
          entry.anchor.getWorldPosition(projected)
          const distance = camera.position.distanceTo(projected)
          const radiusPixels = solar.metrics(selected).radius * solar.world.scale.x / distance * innerHeight / (2 * Math.tan(T.MathUtils.degToRad(21)))
          projected.project(camera)
          const x = (projected.x * .5 + .5) * innerWidth, y = (-projected.y * .5 + .5) * innerHeight
          const shown = projected.z > -1 && projected.z < 1 && x > 10 && x < innerWidth - 100 && y > 85 && y < innerHeight - (mode === 'explore' ? 185 : 220)
          selectedExtra.hidden = !shown
          if (shown) selectedExtra.style.transform = `translate(${(x + radiusPixels + 10).toFixed(1)}px,${(y - 5).toFixed(1)}px)`
          if (selectedMarker) {
            root.append(selectedMarker); mountedMarker = selectedMarker
            const marked = shown && scaleMode === 'true'
            selectedMarker.hidden = !marked
            if (marked) selectedMarker.style.transform = `translate(${(x - 5.5).toFixed(1)}px,${(y - 5.5).toFixed(1)}px)`
          }
        }
      }
      // 真实比例下的诚实读数：选中天体「在本视图里真实的像素直径」与「画面像素/世界单位」。
      // 面板只读这两个数，不必自己重算取景，也就不会和场景里的实际相机互相打架。
      const pixelScale = innerHeight / (2 * Math.tan(T.MathUtils.degToRad(21)) * Math.max(camera.position.distanceTo(controls?.target ?? previousTarget), 1e-9))
      diagnostic('pixel-scale', pixelScale.toPrecision(4))
      if (selected) {
        const pixels = 2 * solar.metrics(selected).radius * solar.world.scale.x * pixelScale
        diagnostic('body-pixels', pixels.toPrecision(4))
      } else diagnostic('body-pixels', 'none')
      renderCount++; onRender?.(renderCount)
      diagnostic('time', simulationTime.toFixed(4)); diagnostic('camera', camera.position.toArray().map(v => v.toFixed(3)).join(','))
      // 「绕行进度」：沿银道环走过的角度（度）。它是「整个体系真的在公转」最直接的读数——
      // 星系视角里环是可见的，读数与画面上的位移同源，不是另算的一套进度条。
      diagnostic('galactic-angle', (simulationTime * GALAXY.omega * 180 / Math.PI % 360).toFixed(2))
      // 比例尺要写「画面里这一圈的半径」：除以 world 的缩放才是模型自身的半径，
      // 否则浏览模式的构图缩放会混进读数里（那不是天体的尺度，是相机的尺度）。
      // 单位跟着模式走：艺术模式的世界单位没有真实含义，就直接报单位；真实模式下
      // 1 单位 = 1.55 AU，所以必须换算成 AU，否则面板会拿世界单位去冒充 AU（实测会差 1.55 倍）。
      const radiusWorld = solar.galacticRadius() / Math.max(solar.world.scale.x, 1e-9)
      diagnostic('galactic-radius', (scaleMode === 'true' ? radiusWorld / TRUE_SCALE.AU : radiusWorld).toPrecision(4))
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
      // 拖尾的线宽在 WebGL 里是 1px，颜色亮度不随分辨率补偿的话，高分屏上会比参考视频里
      // 「每颗行星拖着一条亮带」的观感淡一倍以上；把像素比交给 uniform，着色器自己提亮。
      solar.setPixelScale(renderer.getPixelRatio())
      const particles = particleCountForWidth(mobile ? Math.min(width, 760) : width)
      starGeometry.setDrawRange(0, particles); diagnostic('particles', String(particles))
      if (!initial) {
        if (mode === 'explore') { if (selected) selectBody(selected, true); else frameView() }
        invalidate()
      }
    }
    // 相机裁剪面：星系视角的机位在主视图之外四个数量级（艺术模式下 85,000 单位），
    // 固定的 far = 12000 会把整个画面裁空。裁剪面因此跟着当前机位走，而不是重新取景一次。
    const setCameraRange = (distance: number) => {
      camera.near = Math.max(distance / 1e4, .02)
      camera.far = Math.max(distance * 4, 12000)
      camera.updateProjectionMatrix()
    }
    const overview = () => {
      flight = null
      selected = null; hovered = null; diagnostic('selected', 'none'); solar.highlight(null)
      if (controls) { controls.enableDamping = false; controls.update() }
      const halfFov = Math.min(T.MathUtils.degToRad(21), Math.atan(Math.tan(T.MathUtils.degToRad(21)) * camera.aspect))
      // 探索全景在标准取景距离上再退 22%：公转位移如今只被相机跟掉七成（residual .28），
      // 太阳系会整体滑出标准取景的边框，多退的距离就是给这段滑行留的余量。
      // 相机保持"看向外行星轨道的边缘"，构图仍是同一张全景，只是更宽。
      const distance = solar.span() / Math.sin(halfFov) * 1.22
      frameEnvironment()
      setCameraRange(distance)
      camera.position.set(0, .75, 1).normalize().multiplyScalar(distance)
      camera.lookAt(0, 0, 0)
      if (controls) { controls.target.set(0, 0, 0); controls.minDistance = scaleMode === 'true' ? .017 : .05; controls.maxDistance = distance * 1.65; controls.update() }
      if (controls) controls.enableDamping = !props.reducedMotion
      previousTarget.set(0, 0, 0)
      // 相机被重设到「不含巡游跟随」的标准机位，所以已跟随量清零：下一帧会按当前 shift
      // 重新把整个太阳系跟回来。否则重设后只剩残差级别的跟随量，太阳系会整块飞出画面。
      followApplied.set(0, 0, 0)
    }
    // 「星系视角」的取景：把整条银心轨道（直径 2R）装进画面，环心居中，相机从环面斜上方看，
    // 于是金色环是一个椭圆、太阳系是环上的一个点，一圈公转在屏幕上真的走完整。
    // 主视图（浏览模式的首页构图与探索模式的全景）完全不受影响——它是另一个机位，不是一个新场景。
    const galacticOverview = () => {
      flight = null
      selected = null; hovered = null; diagnostic('selected', 'none'); solar.highlight(null)
      if (controls) { controls.enableDamping = false; controls.update() }
      // 环心与环面法线由 createSolarSystem 每帧刷新；这里先补一次 update，保证刚切过来时
      // 拿到的是当前 world 变换下的值（浏览模式的位移/缩放刚被重置，不能读上一次的缓存）。
      solar.update(simulationTime, pulseEnergy)
      const centre = galacticCentreScratch.copy(solar.galacticCentre), normal = galacticNormalScratch.copy(solar.galacticNormal).normalize()
      const halfFov = Math.min(T.MathUtils.degToRad(21), Math.atan(Math.tan(T.MathUtils.degToRad(21)) * camera.aspect))
      const radius = Math.max(solar.galacticRadius(), 1e-6)
      // 视线方向 = 环面法线为主 + 一点「从环心看向太阳系」的分量：纯法线是正俯视，
      // 环会退化成一条线；掺入面内分量后是一个有透视的椭圆，进深方向的前进也看得出来。
      const direction = galacticDirScratch.copy(centre).negate().normalize().multiplyScalar(.62).addScaledVector(normal, .82).normalize()
      const distance = radius * 2.12 / Math.sin(halfFov)
      setCameraRange(distance)
      camera.position.copy(centre).addScaledVector(direction, distance)
      camera.lookAt(centre)
      if (controls) { controls.target.copy(centre); controls.minDistance = Math.max(solar.span() * .05, camera.near * 3); controls.maxDistance = distance * 2.2; controls.update() }
      if (controls) controls.enableDamping = !props.reducedMotion
      previousTarget.copy(centre)
      followApplied.set(0, 0, 0)
    }
    // 「当前视角该用哪个机位」只有一个入口：主视图与星系视角共用复位、换比例、换模式、
    // 取消选中等所有路径，任何一处漏接都会出现「切过去还是主视图构图」的半截状态。
    const frameView = () => { if (galacticView) galacticOverview(); else overview() }
    const selectBody = (id: BodyId | null, preserveDirection = false) => {
      if (mode !== 'explore') return
      if (!id) { frameView(); invalidate(); return }
      selected = id; diagnostic('selected', id); solar.highlight(id)
      solar.world.updateMatrixWorld(true)
      solar.planets.get(id)!.anchor.getWorldPosition(targetPosition)
      const radius = solar.metrics(id).radius
      const direction = preserveDirection ? (flight?.offset.clone() ?? camera.position.clone().sub(controls?.target ?? targetPosition)).normalize() : id === 'sun' ? new T.Vector3(0, .3, 1).normalize() : targetPosition.clone().negate().normalize().applyAxisAngle(new T.Vector3(0, 1, 0), id === 'saturn' ? -.65 : .7)
      if (!preserveDirection) direction.y = id === 'saturn' ? .65 : .35
      direction.normalize()
      const framingRadius = id === 'saturn' ? radius * 2.46 : radius
      const halfFov = Math.min(T.MathUtils.degToRad(21), Math.atan(Math.tan(T.MathUtils.degToRad(21)) * camera.aspect))
      const landscape = innerHeight <= 500 && innerWidth > 760
      const baseFraming = innerWidth <= 760 ? 1.5 : id === 'saturn' ? 1.4 : 1.85
      const availableHalfHeight = Math.max(innerHeight * .5 - (landscape ? 130 : 190), 45)
      const framing = innerWidth > 760 ? Math.max(baseFraming, innerHeight * .47 / availableHalfHeight) : baseFraming
      const distance = framingRadius / Math.sin(halfFov) * framing
      setCameraRange(distance)
      // 真实比例的小天体（智神星 .0005、谷神星 .0016、哈雷 .00007）贴脸距离比 setCameraRange
      // 的 near 下限 .02 还小几十到几百倍——near 平面会把整颗球裁出画面：面板按几何报
      // 454px、渲染出来却全空（艺术模式距离 .12–.23 高于下限，所以只有真实比例出事）。
      // 取景时把 near 压到天体半径的 1/8：用户缩到 controls.minDistance(radius*1.6) 时
      // 最近表面仍有 .6r 余量，不会被裁；其余机位维持 setCameraRange 的原值不动。
      camera.near = Math.min(camera.near, radius / 8)
      camera.updateProjectionMatrix()
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
      const meshes = Array.from(solar.planets.values()).map(body => body.mesh)
      const hit = raycaster.intersectObjects(meshes, false)[0]
      if (hit) return hit.object.userData.bodyId as BodyId
      // 公转位移如今留在画面上（residual 预算），真实比例下行星可能只有零点几个像素，
      // 射线永远打不中 mesh；以光标为中心、阈值随相机距离放宽的最近邻拾取兜底，
      // 「点到天体附近就是它」在 1px 和 1000px 的尺度上都成立。命中 mesh 优先。
      const origin = raycaster.ray.origin, direction = raycaster.ray.direction
      let best: { id: BodyId; score: number } | null = null
      for (const body of meshes) {
        const radius = solar.metrics(body.userData.bodyId as BodyId).radius * solar.world.scale.x
        const distance = raycaster.ray.distanceToPoint(body.getWorldPosition(followScratch))
        // 屏幕阈值：天体直径的 3 倍，最少 0.02 个视角单位——选中的交互目标永远比像素大一点。
        const threshold = Math.max(radius * 3, origin.distanceTo(body.getWorldPosition(followScratch)) * .02)
        if (distance > threshold) continue
        const score = distance + Math.max(0, origin.distanceTo(followScratch) - radius)
        if (!best || score < best.score) best = { id: body.userData.bodyId as BodyId, score }
      }
      return best ? best.id : null
    }
    const setMode = (next: SceneMode, element: HTMLElement | null) => {
      if (next === mode && element === interactionElement) return
      releaseInteraction?.(); releaseInteraction = null; controls?.dispose(); controls = null; interactionElement = element
      mode = next; diagnostic('mode', mode)
      resize(true)
      if (mode === 'explore' && element) {
        solar.world.position.set(0, 0, 0); solar.world.scale.setScalar(1); solar.world.rotation.set(0, 0, 0)
        controls = new OrbitControls(camera, element); controls.enablePan = false; controls.enableDamping = !props.reducedMotion; controls.dampingFactor = .09
        frameView()
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
        flight = null; selected = null; diagnostic('selected', 'none'); solar.highlight(null); render(performance.now(), true)
      }
      invalidate()
    }
    const setPhase = (next: ScenePhase) => { if (phase === next) return; phase = next; invalidate() }
    const setTheme = (next: SceneTheme) => { if (theme === next) return; theme = next; applyTheme(); invalidate() }
    // 真实比例切换后，探索模式需要重新取景：选中天体就地重飞，否则回到全景。
    const setScaleMode = (next: ScaleMode) => {
      if (scaleMode === next) return
      scaleMode = next
      solar.setScaleMode(next)
      frameEnvironment()
      diagnostic('scale', next)
      if (mode === 'explore') { if (selected) selectBody(selected, true); else frameView() }
      else render(performance.now(), true)
      invalidate()
    }
    const pulse = (seed: number) => { pulseEnergy = Number.isFinite(seed) ? 1 + Math.sin(seed) * .1 : 0; invalidate() }
    const setPaused = (next: boolean) => { if (paused === next) return; paused = next; diagnostic('paused', String(paused)); invalidate() }
    // 时间流速只改模拟时间的推进倍率：几何、取景、光照与巡游位移都由 simulationTime 推导，
    // 所以换挡等价于「同样的画面、更快的时钟」，不会出现天体跳位。
    // 值没变时直接返回：初始化会把当前值灌进来一次，reduced-motion 下多渲染一帧就破坏了
    // 「只渲染一帧」的约定。
    const setTimeScale = (next: number) => { if (timeScale === next) return; timeScale = next as typeof timeScale; diagnostic('time-scale', String(timeScale)); invalidate() }
    // 银道环保留但默认隐藏，这里只切它的可见性——它标的是太阳绕银心的公转路径，不是常驻装饰。
    const setGalacticRing = (next: boolean) => { if (galacticRing === next) return; galacticRing = next; solar.galacticAnchor.visible = next; diagnostic('galactic-ring', String(next)); invalidate() }
    // 「星系视角」：只换机位与光的可见性，不改场景内容，也不动主视图的任何取景参数。
    // 进入时把银道环显形——这个视角里整条环就是画面主体，藏起来就只剩一片空星空。
    // 半径要比行星系统大得多：环半径只有 0.97×span，而 span 恰好是海王星轨道（艺术模式下
    // 600 对 572），两者几乎重合，拉远后画面上是两个套在一起的圆，看不出"轨道上的一点"。
    const setGalacticView = (active: boolean) => {
      if (galacticView === active) return
      galacticView = active; diagnostic('view', active ? 'galactic' : 'system')
      solar.setGalacticExtent(active)
      solar.galacticAnchor.visible = active || galacticRing
      // 环境（银河背景球与星点）必须按新取景重新缩放：星系视角的相机退到环外，
      // 尺寸不变的话会直接穿出天球，银河背景反而消失。
      frameEnvironment()
      if (active && mode === 'browse') {
        // 星系视角是探索面板里的东西，但浏览模式也可能被要求切（面板与画布的生命周期不同步），
        // 这时把 world 归位到 1:1：环面法线只在 world 无缩放、无位移时才等于真实银道面朝向。
        solar.world.position.set(0, 0, 0); solar.world.scale.setScalar(1); solar.world.rotation.set(0, 0, 0)
      }
      // 换视角就重新取景并清掉选中：选中的天体属于主视图的叙事，跟着一起切过去会让相机
      // 又飞回行星尺度，星系视角刚建立起来的"整条轨道"立刻消失。
      if (mode === 'explore') frameView()
      else render(performance.now(), true)
      invalidate()
    }
    const resetView = () => { if (mode === 'explore') { frameView(); invalidate() } }
    const zoomBy = (direction: number) => { if (!controls) return; flight = null; if (direction > 0) controls.dollyIn(1 / 1.2); else controls.dollyOut(1 / 1.2); controls.update(); invalidate() }
    const onVisibility = () => { if (visible()) { lastTime = null; render(performance.now()); start() } else stop() }
    const onPointer = (event: PointerEvent) => { if (mode !== 'browse' || props.reducedMotion || !matchMedia('(hover:hover) and (pointer:fine)').matches) return; pointer.set(event.clientX / Math.max(innerWidth, 1) * 2 - 1, 1 - event.clientY / Math.max(innerHeight, 1) * 2) }
    const onResize = () => resize()
    window.addEventListener('resize', onResize, { passive: true }); scope.add(() => window.removeEventListener('resize', onResize))
    window.addEventListener('pointermove', onPointer, { passive: true }); scope.add(() => window.removeEventListener('pointermove', onPointer))
    document.addEventListener('visibilitychange', onVisibility); scope.add(() => document.removeEventListener('visibilitychange', onVisibility))
    scope.add(() => { releaseInteraction?.(); controls?.dispose() })
    solar.galacticAnchor.visible = galacticRing
    renderer.setClearColor(0x000000, 0); applyTheme(); frameEnvironment(); resize(true); render(0, true); start()
    const destroy = () => { if (destroyed) return; destroyed = true; diagnostic('ready', 'false'); stop(); try { scope.cleanup() } catch { /* Release all resources even when a driver disposer fails. */ } }
    return { setPhase, setTheme, pulse, setMode, setScaleMode, selectBody, setPaused, setTimeScale, setGalacticRing, setGalacticView, resetView, zoomBy, destroy }
  } catch (error) { try { scope.cleanup() } catch { /* Preserve initialization error. */ } throw error }
}
