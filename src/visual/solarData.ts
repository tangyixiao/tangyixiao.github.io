import type { BodyId, ScaleMode } from './types'

const DEG = Math.PI / 180

export const bodies: Array<{ id: BodyId; radius: number; orbit: number; speed: number; spin: number; angle: number; color: string; kind: 'sun' | 'rock' | 'earth' | 'gas'; orbitAU: number; radiusEarth: number; ecc: number; inc: number; node: number; peri: number; zh: [string, string]; en: [string, string] }> = [
  // 默认视图：radius = radiusEarth × .30（大小按真实比例，太阳直径 = 109 个地球），
  // orbit = 88 × AU^0.55（保持真实顺序与远近关系的压缩距离），speed = .15 / AU^1.5（开普勒第三定律的真实相对周期），
  // spin = 自转周期（地球日，负值为逆行自转，金星/天王星），按真实比例驱动（1 个地球日 ≈ 10 秒）。
  // ecc/inc/node/peri：J2000 离心率、轨道倾角、升交点经度与近日点经度（NASA NSSDCA）。
  { id: 'sun', radius: 32.76, orbit: 0, speed: 0, spin: 25.38, angle: 0, color: '#ffb547', kind: 'sun', orbitAU: 0, radiusEarth: 109.2, ecc: 0, inc: 0, node: 0, peri: 0, zh: ['太阳', '太阳系中央的恒星。这里用金色日冕与流动的光表现它的能量。'], en: ['Sun', 'The star at the center of our solar system, imagined here with a flowing golden corona.'] },
  { id: 'mercury', radius: .115, orbit: 52.2, speed: .623, spin: 58.65, angle: .5, color: '#bdb5c6', kind: 'rock', orbitAU: .387, radiusEarth: .383, ecc: .20563, inc: 7.005, node: 48.331, peri: 77.456, zh: ['水星', '最靠近太阳的行星，岩石表面布满撞击坑。'], en: ['Mercury', 'The closest planet to the Sun, with a rocky, cratered surface.'] },
  { id: 'venus', radius: .285, orbit: 73.6, speed: .244, spin: -243.02, angle: 2.1, color: '#e7b887', kind: 'gas', orbitAU: .723, radiusEarth: .949, ecc: .00677, inc: 3.395, node: 76.68, peri: 131.564, zh: ['金星', '浓密云层包裹的岩石行星，在这里呈现为温暖的琥珀色。'], en: ['Venus', 'A rocky planet wrapped in thick clouds, rendered here in warm amber.'] },
  { id: 'earth', radius: .3, orbit: 88, speed: .15, spin: 1, angle: 4.4, color: '#529dff', kind: 'earth', orbitAU: 1, radiusEarth: 1, ecc: .01671, inc: 0, node: 0, peri: 102.947, zh: ['地球', '我们的蓝色家园。海洋、陆地与云层之外，月球沿着自己的轨道运行。'], en: ['Earth', 'Our blue home: oceans, land and clouds, with the Moon on its own orbit.'] },
  { id: 'mars', radius: .16, orbit: 110.9, speed: .0797, spin: 1.026, angle: 3.4, color: '#f07661', kind: 'rock', orbitAU: 1.524, radiusEarth: .532, ecc: .09339, inc: 1.85, node: 49.558, peri: 336.604, zh: ['火星', '这颗红色岩石行星的表面拥有沙漠、火山与峡谷。'], en: ['Mars', 'A red rocky world with deserts, volcanoes and canyons.'] },
  { id: 'jupiter', radius: 3.36, orbit: 218, speed: .0126, spin: .414, angle: .85, color: '#e9a779', kind: 'gas', orbitAU: 5.203, radiusEarth: 11.21, ecc: .04839, inc: 1.303, node: 100.464, peri: 14.728, zh: ['木星', '太阳系最大的行星，层叠云带构成它鲜明的外观。'], en: ['Jupiter', 'The largest planet in our solar system, distinguished by its layered cloud bands.'] },
  { id: 'saturn', radius: 2.84, orbit: 304.2, speed: .0051, spin: .444, angle: 2.6, color: '#f2d89f', kind: 'gas', orbitAU: 9.537, radiusEarth: 9.45, ecc: .05386, inc: 2.485, node: 113.665, peri: 92.598, zh: ['土星', '宽阔的环围绕这颗气态巨行星，是这片星空中醒目的轮廓。'], en: ['Saturn', 'Wide rings encircle this gas giant, making an unmistakable silhouette.'] },
  { id: 'uranus', radius: 1.2, orbit: 446.9, speed: .0018, spin: -.718, angle: 5.8, color: '#79e6df', kind: 'gas', orbitAU: 19.19, radiusEarth: 4.01, ecc: .04726, inc: .773, node: 74.006, peri: 170.954, zh: ['天王星', '青蓝色的冰巨星，自转轴具有很大的倾斜。'], en: ['Uranus', 'A cyan ice giant with a dramatically tilted rotation axis.'] },
  { id: 'neptune', radius: 1.16, orbit: 572, speed: .0009, spin: .671, angle: 4.5, color: '#7486ff', kind: 'gas', orbitAU: 30.07, radiusEarth: 3.88, ecc: .00859, inc: 1.77, node: 131.784, peri: 44.971, zh: ['海王星', '八大行星中距离太阳最远的一颗，以深蓝色外观呈现。'], en: ['Neptune', 'The most distant of the eight planets, rendered in deep blue.'] },
]

export const solarCopy = {
  zh: { explore: '探索太阳系', title: '太阳系', subtitle: '一片可以亲手探索的星空。', disclaimer: '天体大小按真实比例（太阳直径 = 109 个地球）；公转与自转周期均按真实相对比例推进，距离经艺术化压缩。金色轨道环是太阳绕银河系中心的公转路径（真实一周约 2.3 亿年，演示约 25 分钟）：银道面与黄道面夹角 60.19°，太阳带着整个太阳系沿银道面朝银经 90°（天鹅座方向）前进，背景里的银河就铺在同一个银道面上。', trueScale: '真实比例', artisticScale: '艺术模式', trueDisclaimer: '距离按 1:1 真实比例（1 AU ≈ 1.55 单位），公转速度遵循开普勒第三定律，轨道倾角与离心率为真实值。太阳放大 20 倍、行星放大 160 倍以保持可见——按真实尺寸，地球在这幅全景里不足 0.01 像素。', threebody: '三体', threebodyCta: '探访半人马座α', unavailable: '当前设备无法显示动态太阳系，可继续浏览主页。', loading: '正在点亮星空…', pause: '暂停', resume: '继续', reset: '重置视角', exit: '退出探索', zoomIn: '放大', zoomOut: '缩小', select: '选择', overview: '太阳与八大行星', hint: '拖动旋转 · 滚轮缩放 · 点选行星', touchHint: '单指旋转 · 双指缩放 · 轻触行星', tracking: '正在追踪', sceneLabel: '太阳系交互视图', rotateLeft: '向左旋转', rotateRight: '向右旋转', blackhole: '黑洞', blackholeCta: '跃迁至黑洞' },
  en: { explore: 'Explore the solar system', title: 'Solar system', subtitle: 'A sky you can explore for yourself.', disclaimer: 'Body sizes are in true proportion (the Sun spans 109 Earths); orbital and rotation periods keep their real ratios, distances are compressed for legibility. The golden ring is the Sun\'s orbit around the galactic centre (230 million years in reality, ~25 minutes here): the galactic plane meets the ecliptic at 60.19°, and the Sun carries the solar system along that plane toward galactic longitude 90° (Cygnus). The Milky Way in the background lies in the very same plane.', trueScale: 'True scale', artisticScale: 'Artistic', trueDisclaimer: 'Distances are 1:1 to reality (1 AU ≈ 1.55 units), orbital speeds follow Kepler\'s third law, and inclinations and eccentricities are real. The Sun is enlarged 20× and planets 160× to stay visible — at true size, Earth would be under 0.01 pixels in this panorama.', threebody: 'Three-body', threebodyCta: 'Visit Alpha Centauri', unavailable: 'Animated solar system unavailable on this device. You can still browse the homepage.', loading: 'Lighting up the sky…', pause: 'Pause', resume: 'Resume', reset: 'Reset view', exit: 'Exit exploration', zoomIn: 'Zoom in', zoomOut: 'Zoom out', select: 'Select', overview: 'The Sun and eight planets', hint: 'Drag to rotate · Scroll to zoom · Select a planet', touchHint: 'One finger to rotate · Pinch to zoom · Tap a planet', tracking: 'Following', sceneLabel: 'Interactive solar system view', rotateLeft: 'Rotate left', rotateRight: 'Rotate right', blackhole: 'Black hole', blackholeCta: 'Enter the black hole' },
}

// Equatorial diameters and mean distances: NASA NSSDCA Planetary Fact Sheet.
export const planetFacts: Record<BodyId, { diameter: string; distance: string; type: [string, string] }> = {
  sun: { diameter: '1,391,400', distance: '—', type: ['G 型主序星', 'G-type main-sequence star'] },
  mercury: { diameter: '4,879', distance: '57.9', type: ['岩石行星', 'Terrestrial planet'] },
  venus: { diameter: '12,104', distance: '108.2', type: ['岩石行星', 'Terrestrial planet'] },
  earth: { diameter: '12,756', distance: '149.6', type: ['岩石行星', 'Terrestrial planet'] },
  mars: { diameter: '6,792', distance: '228.0', type: ['岩石行星', 'Terrestrial planet'] },
  jupiter: { diameter: '142,984', distance: '778.5', type: ['气态巨行星', 'Gas giant'] },
  saturn: { diameter: '120,536', distance: '1,432.0', type: ['气态巨行星', 'Gas giant'] },
  uranus: { diameter: '51,118', distance: '2,867.0', type: ['冰巨星', 'Ice giant'] },
  neptune: { diameter: '49,528', distance: '4,515.0', type: ['冰巨星', 'Ice giant'] },
}

export const surfaceFor = (id: BodyId) => `/assets/solar/${id === 'earth' ? 'earth_daymap' : id === 'venus' ? 'venus_atmosphere' : id}.webp`

// 真实比例模式的换算：1 AU = 1.55 单位（地球轨道与艺术模式的 5.9 对齐，切换不跳变）。
// 太阳放大 20 倍、行星放大 160 倍仅保可见，比例关系在行星之间严格保持。
export const TRUE_SCALE = { AU: 1.55, sunMag: 20, planetMag: 160, minSize: .011, earthSpeed: .15, sunRadiusAU: .00465, earthRadiusAU: 4.2588e-5 } as const

// 默认视图的距离压缩：orbit = 88 × AU^0.55，真实顺序与远近关系不变。
export const artisticOrbit = (au: number) => 88 * au ** .55
// 自转：spin 为真实自转周期（地球日），1 个地球日 ≈ 10 秒演示时间。
export const SPIN = { daySeconds: 10 } as const
export const spinRate = (body: { spin: number }) => Math.PI * 2 / (body.spin * SPIN.daySeconds)
// 银道坐标系在黄道坐标系（也是场景坐标系：+x 为黄经 0°、+y 为黄经 90°、+z 为黄北极）中的基向量，
// 由 J2000 北银极（β = +29.8114°）与银心（β = −5.5363°，λ = 266.8396°）换算：
// centre = 太阳指向银心的单位向量，l90 = 银经 90° 方向（天鹅座，即太阳公转速度方向），
// pole = 北银极。三者是右手正交基，因此黄道面与银道面的夹角 = 90° − 29.8114° = 60.19°。
// 用基向量而不是欧拉角，是因为欧拉角（旧代码的 tilt/sway）无法表达 IAU 的银道节点，
// 实测旧朝向把夹角做成了 29.8°，与界面文案宣称的 60° 不符。
export const GALACTIC = {
  centre: [-0.054873959, -0.993821478, -0.096476517],
  l90: [0.494109477, -0.110989843, 0.862285962],
  pole: [-0.867666149, -0.000351590, 0.497147192],
} as const

// 银心公转：太阳带着整个系统绕银河系中心约 2.3 亿年一圈（真实速率在演示里不可感知，
// 这里以 25 分钟一圈的艺术化速率呈现这一运动）。
// radiusRatio = 示意轨道环半径 / 全景跨度：真实 8.277 kpc 与真实比例下 51 单位的太阳系相差
// 8 个数量级，无法同框，故半径只能取示意值；但环面（银道面）、环心（银心标记）与前进方向
// 都取真实值——环必然穿过太阳，银心标记在真实的银心方向上行进，太阳则沿环朝银经 90° 前进。
// 太阳离银道面只有 17.4 pc / 8277 pc ≈ 0.2%，在画面上不足一个像素，故不再单独偏移。
// radiusRatio = .97：环必须落在海王星轨道之外、又在全景取景半径之内。艺术模式下海王星在
// 572/600 = .953，真实模式下在 46.6/51 = .914，取 .97 两种模式都在环内且贴边可见。
export const GALAXY = { omega: Math.PI * 2 / 1500, radiusRatio: .97 } as const

// 月球轨道：对黄道倾斜 5.145°，升交点每 18.6 年沿黄道退行一周（都是真实值）。
export const MOON = { incl: 5.145 * DEG, nodeYears: 18.6, periodDays: 27.32 } as const

// 主小行星带：内缘 2.065 AU（木星 4:1 共振）、外缘 3.279 AU（2:1 共振，Hecuba 空隙），
// 中间是木星共振清空的 Kirkwood 空隙（3:1 / 5:2 / 7:3，半径为真实共振位置，缝宽为示意值）。
// 倾角用双成分 Rayleigh 近似观测分布：主体低倾角（峰值在 4° 以下、多数 < 10°），
// 另有少量高倾角成员形成晕——观测文献给出的是分布形状，并没有单一的均值/标准差可引用。
// 偏心率同样取真实量级（主带平均 e ≈ 0.14，峰值约 0.07）。
export const BELT = {
  innerAU: 2.065, outerAU: 3.279,
  gaps: [[2.502, .045], [2.825, .040], [2.958, .035]] as Array<[number, number]>,
  coreFraction: .72, coreSigma: 4.5, haloSigma: 11.5,
  eccBase: .04, eccSpread: .18,
} as const

export const trueOrbit = (body: { orbitAU: number }) => body.orbitAU * TRUE_SCALE.AU
export const trueRadius = (body: { id: BodyId; radiusEarth: number }) => body.id === 'sun'
  ? TRUE_SCALE.sunRadiusAU * TRUE_SCALE.AU * TRUE_SCALE.sunMag
  : Math.max(body.radiusEarth * TRUE_SCALE.earthRadiusAU * TRUE_SCALE.AU * TRUE_SCALE.planetMag, TRUE_SCALE.minSize)
export const trueSpeed = (body: { orbitAU: number }) => body.orbitAU ? TRUE_SCALE.earthSpeed / body.orbitAU ** 1.5 : 0
export const scaleValue = (body: (typeof bodies)[number], mode: ScaleMode) => mode === 'true'
  ? { orbit: trueOrbit(body), radius: trueRadius(body), speed: trueSpeed(body) }
  : { orbit: body.orbit, radius: body.radius, speed: body.speed }

// 轨道面 → 黄道坐标的旋转（Rz(Ω)·Rx(i)·Rz(ω)，ω = ϖ − Ω），焦点在太阳。
export interface OrbitFrame { X: number; Y: number; U: number; V: number; Z: number; R: number }
export const orbitFrame = (body: { inc: number; node: number; peri: number }): OrbitFrame => {
  const ci = Math.cos(body.inc * DEG), si = Math.sin(body.inc * DEG)
  const cO = Math.cos(body.node * DEG), sO = Math.sin(body.node * DEG)
  const w = (body.peri - body.node) * DEG, cw = Math.cos(w), sw = Math.sin(w)
  return {
    X: cO * cw - sO * sw * ci, Y: -cO * sw - sO * cw * ci,
    U: sO * cw + cO * sw * ci, V: -sO * sw + cO * cw * ci,
    Z: sw * si, R: cw * si,
  }
}

// 开普勒方程：平近点角 → 偏近点角（牛顿迭代，行星离心率下三步内收敛）。
export const keplerE = (ecc: number, M: number) => {
  let E = M
  for (let k = 0; k < 6; k++) E -= (E - ecc * Math.sin(E) - M) / (1 - ecc * Math.cos(E))
  return E
}

// 椭圆上一点（焦点在原点，E 为偏近点角），写入 out=[x,y,z]。
export const ellipsePoint = (a: number, ecc: number, f: OrbitFrame, E: number, out: [number, number, number]) => {
  const px = a * (Math.cos(E) - ecc), py = a * Math.sqrt(1 - ecc * ecc) * Math.sin(E)
  out[0] = f.X * px + f.Y * py
  out[1] = f.U * px + f.V * py
  out[2] = f.Z * px + f.R * py
  return out
}

// 平近点角：angle 为 t=0 时的平黄经，speed 为平近点角速率。
export const meanAnomaly = (body: (typeof bodies)[number], speed: number, time: number) => body.angle + speed * time - body.peri * DEG

// 小行星带与尘埃必须和行星共用同一个参考面：黄道面 = 场景 XY 平面，轨道法线 = +z。
// 旧实现把带子建在 XZ 平面上（法线 +y、倾角加到 y 上），于是整条带子与所有行星轨道
// 垂直——这就是用户看到的「小行星带垂直」。这里给出与 orbitFrame/ellipsePoint 完全一致的
// 显式公式（近日点幅角取 0），倾角 i 与升交点 Ω 用弧度，与行星轨道逐项对齐：
//   X = cosΩ, Y = −sinΩ cos i, U = sinΩ, V = cosΩ cos i, Z = 0, R = sin i
// 因此 inc = 0 时 out[2] 严格为 0（带子落在黄道面内），inc ≠ 0 时轨道法线恰好偏离
// 黄道法线 inc 角。
export const beltPoint = (a: number, ecc: number, E: number, inc: number, node: number, out: [number, number, number]) => {
  const px = a * (Math.cos(E) - ecc), py = a * Math.sqrt(1 - ecc * ecc) * Math.sin(E)
  const ci = Math.cos(inc), si = Math.sin(inc)
  const cO = Math.cos(node), sO = Math.sin(node)
  out[0] = cO * px - sO * py * ci
  out[1] = sO * px + cO * py * ci
  out[2] = py * si
  return out
}

// 一阶偏近点角展开（E ≈ M + e·sin M，主带 e ≲ 0.2 时相对误差 < 2%），
// 让每颗小行星每帧只多一次三角函数，却保留了离心率带来的径向散布。
export const beltEccentricAnomaly = (M: number, ecc: number) => M + ecc * Math.sin(M)

// 瑞利分布逆变换抽样：Rayleigh(σ) 的峰值在 σ、均值 σ√(π/2)，用于小行星带倾角——
// 观测上主带倾角就是这种形状（多数 < 10°，另有高倾角晕），而不是均匀分布。
export const rayleigh = (u: number, sigma: number) => sigma * Math.sqrt(-2 * Math.log(Math.max(1e-9, 1 - u)))
