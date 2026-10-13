import type { BodyCategory, BodyId, ScaleMode } from './types'

const DEG = Math.PI / 180

// ---------------------------------------------------------------------------
// 换算与标尺（必须排在 bodies 之前：天体条目要用它们推导 radius/orbit/speed）
// ---------------------------------------------------------------------------

// 默认视图的距离压缩：orbit = 88 × AU^0.55，真实顺序与远近关系不变。
export const artisticOrbit = (au: number) => 88 * au ** .55
// 大小：radius = radiusEarth × .30，天体之间严格保持真实比例（太阳直径 = 109 个地球）。
export const artisticRadius = (radiusEarth: number) => radiusEarth * .30
// 行星公转：speed = .15 / AU^1.5，开普勒第三定律的真实相对周期（地球一年约 42 秒）。
export const artisticSpeed = (au: number) => au > 0 ? .15 / au ** 1.5 : 0
// 自转：spin 为真实自转周期（地球日），1 个地球日 ≈ 10 秒演示时间。
// 卫星公转也走这条标尺（月球 27.32 天 ≈ 273 秒），所以卫星不会被行星公转的加速甩掉。
export const SPIN = { daySeconds: 10 } as const
export const spinRate = (body: { spin: number }) => Math.PI * 2 / (body.spin * SPIN.daySeconds)
export const satelliteSpeed = (periodDays: number) => Math.PI * 2 / (periodDays * SPIN.daySeconds)

// ---------------------------------------------------------------------------
// 「进入时是今天的格局」：JPL J2000 线性根数按当日日期外推
// ---------------------------------------------------------------------------
// Standish, "Keplerian Elements for Approximate Positions of the Major Planets"。
// 每行 = [a, ȧ, e, ė, i, i̇, L, L̇, ϖ, ϖ̇, Ω, Ω̇]，角度单位为度、变化率为每儒略世纪。
// L 是平黄经、ϖ 是近日点黄经 (Ω + ω)，因此平近点角 M = L − ϖ，与 meanAnomaly/orbitFrame 的约定一致。
// 旧实现只用 NASA NSSDCA 的瞬时值、没有变化率，且 angle 是手调的观感值——这里全部换成真实值。
export const centuriesSinceJ2000 = (time: number = Date.now()) => (time / 86400000 + 2440587.5 - 2451545) / 36525
const T0 = centuriesSinceJ2000()

type JplRow = readonly [number, number, number, number, number, number, number, number, number, number, number, number]
const JPL: Record<string, JplRow> = {
  mercury: [.38709927, .00000037, .20563593, .00001906, 7.00497902, -.00594749, 252.25032350, 149472.67411175, 77.45779628, .16047689, 48.33076593, -.12534081],
  venus: [.72333566, .00000390, .00677672, -.00004107, 3.39467605, -.00078890, 181.97909950, 58517.81538729, 131.60246718, .00268329, 76.67984255, -.27769418],
  earth: [1.00000261, .00000562, .01671123, -.00004392, -.00001531, -.01294668, 100.46457166, 35999.37244981, 102.93768193, .32327364, 0, 0],
  mars: [1.52371034, .00001847, .09339410, .00007882, 1.84969142, -.00813131, -4.55343205, 19140.30268499, -23.94362959, .44441088, 49.55953891, -.29257343],
  jupiter: [5.20288700, -.00011607, .04838624, -.00013253, 1.30439695, -.00183714, 34.39644051, 3034.74612775, 14.72847983, .21252668, 100.47390909, .20469106],
  saturn: [9.53667594, -.00125060, .05386179, -.00050991, 2.48599187, .00193609, 49.95424423, 1222.49362201, 92.59887831, -.41897216, 113.66242448, -.28867794],
  uranus: [19.18916464, -.00196176, .04725744, -.00004397, .77263783, -.00242939, 313.23810451, 428.48202785, 170.95427630, .40805281, 74.01692503, .04240589],
  neptune: [30.06992276, .00026291, .00859048, .00005105, 1.77004347, .00035372, -55.12002969, 218.45945325, 44.96476227, -.32241464, 131.78422574, -.00508664],
}

const jpl = (id: keyof typeof JPL) => {
  const r = JPL[id]
  return {
    orbitAU: r[0] + r[1] * T0, ecc: r[2] + r[3] * T0, inc: r[4] + r[5] * T0,
    // angle 用弧度（meanAnomaly 直接把它当平近点角基准），其余角度用度（orbitFrame 内部换算）。
    angle: (r[6] + r[7] * T0) * DEG, peri: r[8] + r[9] * T0, node: r[10] + r[11] * T0,
  }
}

// ---------------------------------------------------------------------------
// 天体表
// ---------------------------------------------------------------------------

interface BodySeed {
  id: BodyId
  category: BodyCategory
  kind: 'sun' | 'rock' | 'earth' | 'gas'
  color: string
  radiusEarth: number
  orbitAU: number
  spin: number
  angle: number
  ecc: number
  inc: number
  node: number
  peri: number
  zh: [string, string]
  en: [string, string]
  /** 贴图名（assets/solar/<map>.webp）。没有贴图的天体走程序化材质。 */
  map?: string
  /** 卫星：母天体。卫星的 orbit 是「母天体半径的倍数」，不是日心距离。 */
  parent?: BodyId
  /** 覆盖 radius/orbit/speed 的默认推导。 */
  radius?: number
  orbit?: number
  speed?: number
}

const seeds: BodySeed[] = [
  { id: 'sun', category: 'star', kind: 'sun', color: '#ffb547', radiusEarth: 109.2, orbitAU: 0, spin: 25.38, angle: 0, ecc: 0, inc: 0, node: 0, peri: 0, map: 'sun',
    zh: ['太阳', '太阳系中央的恒星。这里用金色日冕与流动的光表现它的能量。'], en: ['Sun', 'The star at the center of our solar system, imagined here with a flowing golden corona.'] },
  { id: 'mercury', category: 'planet', kind: 'rock', color: '#bdb5c6', radiusEarth: .383, spin: 58.65, map: 'mercury', ...jpl('mercury'),
    zh: ['水星', '最靠近太阳的行星，岩石表面布满撞击坑。'], en: ['Mercury', 'The closest planet to the Sun, with a rocky, cratered surface.'] },
  { id: 'venus', category: 'planet', kind: 'gas', color: '#e7b887', radiusEarth: .949, spin: -243.02, map: 'venus_atmosphere', ...jpl('venus'),
    zh: ['金星', '浓密云层包裹的岩石行星，在这里呈现为温暖的琥珀色。'], en: ['Venus', 'A rocky planet wrapped in thick clouds, rendered here in warm amber.'] },
  { id: 'earth', category: 'planet', kind: 'earth', color: '#529dff', radiusEarth: 1, spin: 1, map: 'earth_daymap', ...jpl('earth'),
    zh: ['地球', '我们的蓝色家园。海洋、陆地与云层之外，月球沿着自己的轨道运行。'], en: ['Earth', 'Our blue home: oceans, land and clouds, with the Moon on its own orbit.'] },
  { id: 'mars', category: 'planet', kind: 'rock', color: '#f07661', radiusEarth: .532, spin: 1.026, map: 'mars', ...jpl('mars'),
    zh: ['火星', '这颗红色岩石行星的表面拥有沙漠、火山与峡谷。'], en: ['Mars', 'A red rocky world with deserts, volcanoes and canyons.'] },
  { id: 'jupiter', category: 'planet', kind: 'gas', color: '#e9a779', radiusEarth: 11.21, spin: .414, map: 'jupiter', ...jpl('jupiter'),
    zh: ['木星', '太阳系最大的行星，层叠云带构成它鲜明的外观。'], en: ['Jupiter', 'The largest planet in our solar system, distinguished by its layered cloud bands.'] },
  { id: 'saturn', category: 'planet', kind: 'gas', color: '#f2d89f', radiusEarth: 9.45, spin: .444, map: 'saturn', ...jpl('saturn'),
    zh: ['土星', '宽阔的环围绕这颗气态巨行星，是这片星空中醒目的轮廓。'], en: ['Saturn', 'Wide rings encircle this gas giant, making an unmistakable silhouette.'] },
  { id: 'uranus', category: 'planet', kind: 'gas', color: '#79e6df', radiusEarth: 4.01, spin: -.718, map: 'uranus', ...jpl('uranus'),
    zh: ['天王星', '青蓝色的冰巨星，自转轴具有很大的倾斜。'], en: ['Uranus', 'A cyan ice giant with a dramatically tilted rotation axis.'] },
  { id: 'neptune', category: 'planet', kind: 'gas', color: '#7486ff', radiusEarth: 3.88, spin: .671, map: 'neptune', ...jpl('neptune'),
    zh: ['海王星', '八大行星中距离太阳最远的一颗，以深蓝色外观呈现。'], en: ['Neptune', 'The most distant of the eight planets, rendered in deep blue.'] },
  // 矮行星与小天体：a/e/i/Ω 为 J2000 实测值（此处不再逐项外推——它们没有 JPL 那种线性根数表）。
  { id: 'pluto', category: 'dwarf', kind: 'rock', color: '#c9b8a3', radiusEarth: .186, orbitAU: 39.482, spin: -6.387, angle: -.4, ecc: .2488, inc: 17.16, node: 110.299, peri: 224.075,
    zh: ['冥王星', '柯伊伯带的矮行星，轨道倾斜 17°，与海王星形成 3:2 共振。'], en: ['Pluto', 'A Kuiper-belt dwarf planet on a 17°-tilted orbit locked in 3:2 resonance with Neptune.'] },
  { id: 'ceres', category: 'dwarf', kind: 'rock', color: '#8d8781', radiusEarth: .0737, orbitAU: 2.7675, spin: .3781, angle: 2.8, ecc: .0758, inc: 10.593, node: 80.305, peri: 73.597,
    zh: ['谷神星', '主带里最大的天体，也是唯一位于内太阳系的矮行星。'], en: ['Ceres', 'The largest body in the main belt, and the only dwarf planet in the inner solar system.'] },
  { id: 'pallas', category: 'asteroid', kind: 'rock', color: '#7f8a86', radiusEarth: .0762, orbitAU: 2.773, spin: .3255, angle: 1.1, ecc: .231, inc: 34.84, node: 173.096, peri: 310.049,
    zh: ['智神星', '主带第三大天体，34.8° 的轨道倾角让它几乎脱离带子的平面。'], en: ['Pallas', 'The third-largest body in the belt, swung 34.8° out of the belt plane.'] },
  { id: 'eris', category: 'dwarf', kind: 'rock', color: '#d8d4cc', radiusEarth: .182, orbitAU: 67.78, spin: 15.786, angle: 5.2, ecc: .4407, inc: 44.04, node: 35.951, peri: 151.639,
    zh: ['阋神星', '散射盘的矮行星，44° 的倾角与 0.44 的离心率把它远远甩在行星轨道之外。'], en: ['Eris', 'A scattered-disc dwarf planet, flung far outside the planets by a 44° tilt and 0.44 eccentricity.'] },
  // 哈雷的 radiusEarth 是真实彗核（约 11 km，在这个标尺下不足十万分之一单位，选中的取景会塌到
  // 相机距离 0.001）。所以这里给 radius 一个显式值：一颗彗星在肉眼与照片里可见的是彗发而不是彗核，
  // 真实彗发直径可达十万公里量级，把它画成 .022 单位既保住了「大小按真实比例」的说法，也让
  // 彗尾与取景都有可依托的尺度。
  { id: 'halley', category: 'comet', kind: 'rock', color: '#8a8f96', radiusEarth: .00086, orbitAU: 17.834, spin: 2.2, angle: 0, ecc: .96714, inc: 162.26, node: 58.42, peri: 169.75, radius: .022,
    zh: ['哈雷彗星', '周期 76 年的逆行彗星，近日点在水星轨道以内，远日点越出海王星。'], en: ['Halley', 'A retrograde comet with a 76-year period, diving inside Mercury\'s orbit and reaching past Neptune.'] },
  // 卫星：orbit 是「母天体半径的倍数」（真实距离会缩到看不见），speed 走 10 秒 = 1 天的标尺。
  { id: 'moon', category: 'satellite', parent: 'earth', kind: 'rock', color: '#b9b6b0', radiusEarth: .2727, orbitAU: .002570, spin: 27.32, orbit: 9, speed: satelliteSpeed(27.32), angle: 0, ecc: .0549, inc: 5.145, node: 125.08, peri: 318.15, map: 'moon',
    zh: ['月球', '地球唯一的天然卫星，以 5.1° 的倾斜绕行，升交点每 18.6 年退行一周。'], en: ['Moon', 'Earth\'s only natural satellite, tilted 5.1° with a node that regresses every 18.6 years.'] },
  { id: 'io', category: 'satellite', parent: 'jupiter', kind: 'rock', color: '#e8d27a', radiusEarth: .286, orbitAU: .002819, spin: 1.769, orbit: 3.4, speed: satelliteSpeed(1.769), angle: 1.4, ecc: .0041, inc: .036, node: 0, peri: 0,
    zh: ['木卫一', '太阳系火山活动最剧烈的天体，硫化物把表面染成黄色。'], en: ['Io', 'The most volcanically active world we know, its surface stained yellow by sulfur.'] },
  { id: 'europa', category: 'satellite', parent: 'jupiter', kind: 'rock', color: '#d9cdb8', radiusEarth: .245, orbitAU: .004485, spin: 3.551, orbit: 5.4, speed: satelliteSpeed(3.551), angle: 3.9, ecc: .009, inc: .466, node: 0, peri: 0,
    zh: ['木卫二', '冰壳之下可能藏着液态海洋，是太阳系里最受关注的生命候选地。'], en: ['Europa', 'A liquid ocean may hide beneath its ice shell — the most watched candidate for life.'] },
  { id: 'ganymede', category: 'satellite', parent: 'jupiter', kind: 'rock', color: '#a89c8e', radiusEarth: .413, orbitAU: .007155, spin: 7.155, orbit: 8.6, speed: satelliteSpeed(7.155), angle: .6, ecc: .0013, inc: .177, node: 0, peri: 0,
    zh: ['木卫三', '太阳系最大的卫星，比水星还大，并且拥有自己的磁场。'], en: ['Ganymede', 'The largest moon in the solar system — bigger than Mercury, with a magnetic field of its own.'] },
  { id: 'callisto', category: 'satellite', parent: 'jupiter', kind: 'rock', color: '#8c8073', radiusEarth: .378, orbitAU: .012585, spin: 16.689, orbit: 15.2, speed: satelliteSpeed(16.689), angle: 5.1, ecc: .0074, inc: .192, node: 0, peri: 0,
    zh: ['木卫四', '布满撞击坑的古老冰岩天体，是伽利略卫星中最外侧的一颗。'], en: ['Callisto', 'An ancient ice-and-rock moon saturated with craters, the outermost of the Galilean four.'] },
  { id: 'titan', category: 'satellite', parent: 'saturn', kind: 'rock', color: '#d99a4e', radiusEarth: .404, orbitAU: .008168, spin: 15.945, orbit: 11, speed: satelliteSpeed(15.945), angle: 2.3, ecc: .0288, inc: .35, node: 0, peri: 0,
    zh: ['土卫六', '唯一拥有浓密大气层的卫星，橙色雾霭之下有甲烷的湖与河。'], en: ['Titan', 'The only moon with a thick atmosphere — methane lakes and rivers under an orange haze.'] },
  { id: 'triton', category: 'satellite', parent: 'neptune', kind: 'rock', color: '#c7d3d8', radiusEarth: .212, orbitAU: .002371, spin: -5.877, orbit: 9, speed: satelliteSpeed(5.877), angle: 4.6, ecc: .000016, inc: 157, node: 0, peri: 0,
    zh: ['海卫一', '沿 157° 的逆行轨道环绕海王星，很可能是被捕获的柯伊伯带天体。'], en: ['Triton', 'It circles Neptune on a 157° retrograde orbit — most likely a captured Kuiper-belt object.'] },
]

export type Body = BodySeed & { radius: number; orbit: number; speed: number }

export const bodies: Body[] = seeds.map(seed => ({
  ...seed,
  radius: seed.radius ?? artisticRadius(seed.radiusEarth),
  orbit: seed.orbit ?? artisticOrbit(seed.orbitAU),
  speed: seed.speed ?? artisticSpeed(seed.orbitAU),
}))

export const bodyById = (id: BodyId) => bodies.find(body => body.id === id)!

export const solarCopy = {
  zh: { explore: '探索太阳系', title: '太阳系', subtitle: '一片可以亲手探索的星空。', disclaimer: '天体大小按真实比例（太阳直径 = 109 个地球）；公转与自转周期均按真实相对比例推进，距离经艺术化压缩，各天体的轨道位置按今天的真实日期就位。太阳带着整个太阳系沿银道面朝银经 90°（天鹅座方向）前进——银道面与黄道面夹角 60.19°，工具栏里的「银道环」可以画出这条公转路径（真实一周约 2.3 亿年，演示约 25 分钟）。背景里的银河就铺在同一个银道面上。', trueScale: '真实比例', artisticScale: '艺术模式', trueDisclaimer: '距离按 1:1 真实比例（1 AU ≈ 1.55 单位），公转速度遵循开普勒第三定律，轨道倾角与离心率为真实值。太阳放大 20 倍、行星放大 160 倍以保持可见——按真实尺寸，地球在这幅全景里不足 0.01 像素。', threebody: '三体', threebodyCta: '探访半人马座α', unavailable: '当前设备无法显示动态太阳系，可继续浏览主页。', loading: '正在点亮星空…', pause: '暂停', resume: '继续', reset: '重置视角', exit: '退出探索', zoomIn: '放大', zoomOut: '缩小', select: '选择', overview: '太阳与八大行星', hint: '拖动旋转 · 滚轮缩放 · 点选行星', touchHint: '单指旋转 · 双指缩放 · 轻触行星', tracking: '正在追踪', sceneLabel: '太阳系交互视图', rotateLeft: '向左旋转', rotateRight: '向右旋转', blackhole: '黑洞', blackholeCta: '跃迁至黑洞', timeScale: '时间流速', galacticRing: '银道环' },
  en: { explore: 'Explore the solar system', title: 'Solar system', subtitle: 'A sky you can explore for yourself.', disclaimer: 'Body sizes are in true proportion (the Sun spans 109 Earths); orbital and rotation periods keep their real ratios, distances are compressed for legibility, and every orbit starts from its real position on today\'s date. The Sun carries the solar system along the galactic plane toward galactic longitude 90° (Cygnus) — the galactic plane meets the ecliptic at 60.19°, and the "Galactic ring" control in the toolbar draws that orbit (230 million years in reality, ~25 minutes here). The Milky Way in the background lies in the very same plane.', trueScale: 'True scale', artisticScale: 'Artistic', trueDisclaimer: 'Distances are 1:1 to reality (1 AU ≈ 1.55 units), orbital speeds follow Kepler\'s third law, and inclinations and eccentricities are real. The Sun is enlarged 20× and planets 160× to stay visible — at true size, Earth would be under 0.01 pixels in this panorama.', threebody: 'Three-body', threebodyCta: 'Visit Alpha Centauri', unavailable: 'Animated solar system unavailable on this device. You can still browse the homepage.', loading: 'Lighting up the sky…', pause: 'Pause', resume: 'Resume', reset: 'Reset view', exit: 'Exit exploration', zoomIn: 'Zoom in', zoomOut: 'Zoom out', select: 'Select', overview: 'The Sun and eight planets', hint: 'Drag to rotate · Scroll to zoom · Select a planet', touchHint: 'One finger to rotate · Pinch to zoom · Tap a planet', tracking: 'Following', sceneLabel: 'Interactive solar system view', rotateLeft: 'Rotate left', rotateRight: 'Rotate right', blackhole: 'Black hole', blackholeCta: 'Enter the black hole', timeScale: 'Time scale', galacticRing: 'Galactic ring' },
}

// 探索面板里的天体分类。太阳单列「恒星」，八大行星是默认页，小天体与卫星各自成类。
export const categoryCopy: Record<BodyCategory, [string, string]> = {
  star: ['恒星', 'Star'], planet: ['行星', 'Planets'], dwarf: ['矮行星', 'Dwarf planets'],
  asteroid: ['小行星', 'Asteroids'], comet: ['彗星', 'Comets'], satellite: ['卫星', 'Moons'],
}

// 赤道直径、平均距离与类型。行星距离 = 与太阳的平均距离；卫星距离 = 与母天体的平均距离。
// 直径与距离单位 km / 百万 km，来源 NASA NSSDCA Planetary Fact Sheet 与 JPL 卫星参数页。
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
  pluto: { diameter: '2,377', distance: '5,906.4', type: ['矮行星', 'Dwarf planet'] },
  ceres: { diameter: '939', distance: '413.7', type: ['矮行星', 'Dwarf planet'] },
  pallas: { diameter: '513', distance: '414.6', type: ['小行星', 'Asteroid'] },
  eris: { diameter: '2,326', distance: '10,139.0', type: ['矮行星', 'Dwarf planet'] },
  halley: { diameter: '11', distance: '2,667.9', type: ['周期彗星', 'Periodic comet'] },
  moon: { diameter: '3,475', distance: '0.384', type: ['卫星 · 地球', 'Moon of Earth'] },
  io: { diameter: '3,643', distance: '0.422', type: ['卫星 · 木星', 'Moon of Jupiter'] },
  europa: { diameter: '3,122', distance: '0.671', type: ['卫星 · 木星', 'Moon of Jupiter'] },
  ganymede: { diameter: '5,268', distance: '1.070', type: ['卫星 · 木星', 'Moon of Jupiter'] },
  callisto: { diameter: '4,821', distance: '1.883', type: ['卫星 · 木星', 'Moon of Jupiter'] },
  titan: { diameter: '5,150', distance: '1.222', type: ['卫星 · 土星', 'Moon of Saturn'] },
  triton: { diameter: '2,707', distance: '0.355', type: ['卫星 · 海王星', 'Moon of Neptune'] },
}

// 面板圆点用的表面缩略图。没有贴图的小天体返回 null，UI 回退成纯色圆点。
export const surfaceFor = (id: BodyId): string | null => {
  const map = bodyById(id)?.map
  return map ? `/assets/solar/${map}.webp` : null
}

// 真实比例模式的换算：1 AU = 1.55 单位（地球轨道与艺术模式的 5.9 对齐，切换不跳变）。
// 太阳放大 20 倍、行星放大 160 倍仅保可见，比例关系在行星之间严格保持。
export const TRUE_SCALE = { AU: 1.55, sunMag: 20, planetMag: 160, minSize: .011, earthSpeed: .15, sunRadiusAU: .00465, earthRadiusAU: 4.2588e-5 } as const

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
// 8 个数量级，无法同框，故半径只能取示意值；但环面（银道面）、环心方向与前进方向都取真实值——
// 环必然穿过太阳，太阳沿环朝银经 90° 前进。太阳离银道面只有 17.4 pc / 8277 pc ≈ 0.2%，
// 画面上不足一个像素，故不单独偏移。
// radiusRatio = .97：环必须落在海王星轨道之外、又在全景取景半径之内。艺术模式下海王星在
// 572/600 = .953，真实模式下在 46.6/51 = .914，取 .97 两种模式都在环内且贴边可见。
export const GALAXY = { omega: Math.PI * 2 / 1500, radiusRatio: .97 } as const

// 月球轨道：对黄道倾斜 5.145°，升交点每 18.6 年沿黄道退行一周（都是真实值）。
// 公转周期与倾角已并入 bodies 的 moon 条目，这里只保留交点退行需要的时间常数。
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

// 木星特洛伊群：与木星共用同一条轨道，平黄经领先/落后木星 60°（L4 希腊营 / L5 特洛伊营）。
// 观测上两个团簇沿轨道方向各展宽约 ±30°（天平动），成员倾角与主带同量级、偏心率略高。
// 总数为桌面端数量，移动端按比例缩减。
export const TROJANS = { lag: 60 * DEG, spread: 30 * DEG, count: 300, ecc: .05, eccSpread: .08, sigma: 13 } as const

export const trueOrbit = (body: { orbitAU: number }) => body.orbitAU * TRUE_SCALE.AU
export const trueRadius = (body: { id: BodyId; radiusEarth: number }) => body.id === 'sun'
  ? TRUE_SCALE.sunRadiusAU * TRUE_SCALE.AU * TRUE_SCALE.sunMag
  : Math.max(body.radiusEarth * TRUE_SCALE.earthRadiusAU * TRUE_SCALE.AU * TRUE_SCALE.planetMag, TRUE_SCALE.minSize)
export const trueSpeed = (body: { orbitAU: number }) => body.orbitAU ? TRUE_SCALE.earthSpeed / body.orbitAU ** 1.5 : 0
export const scaleValue = (body: Body, mode: ScaleMode) => mode === 'true'
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
// 哈雷彗星的 e = 0.967 需要更多次迭代才能把残差压到 1e-12 以下。
export const keplerE = (ecc: number, M: number) => {
  let E = M
  for (let k = 0; k < 12; k++) E -= (E - ecc * Math.sin(E) - M) / (1 - ecc * Math.cos(E))
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

// 平近点角：angle 是 t=0 时的平黄经（弧度，由 J2000 根数按当日日期外推得到），speed 为平近点角速率。
export const meanAnomaly = (body: Body, speed: number, time: number) => body.angle + speed * time - body.peri * DEG

// 小行星带与尘埃必须和行星共用同一个参考面：黄道面 = 场景 XY 平面，轨道法线 = +z。
// 旧实现把带子建在 XZ 平面上（法线 +y、倾角加到 y 上），于是整条带子与所有行星轨道
// 垂直——这就是用户看到的「小行星带垂直」。这里给出与 orbitFrame/ellipsePoint 完全一致的
// 显式公式（近日点幅角取 0），倾角 i 与升交点 Ω 用弧度，与行星轨道逐项对齐：
//   X = cosΩ, Y = −sinΩ cos i, U = sinΩ, V = cosΩ cos i, Z = 0, R = sin i
// 因此 inc = 0 时 out[2] 严格为 0（带子落在黄道面内），inc ≠ 0 时轨道法线恰好偏离
// 黄道法线 inc 角。卫星轨道也复用这条公式（inc > 90° 时自动成为逆行轨道）。
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
