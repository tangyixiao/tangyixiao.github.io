import type { BodyId, ScaleMode } from './types'

const DEG = Math.PI / 180

export const bodies: Array<{ id: BodyId; radius: number; orbit: number; speed: number; angle: number; color: string; kind: 'sun' | 'rock' | 'earth' | 'gas'; orbitAU: number; radiusEarth: number; ecc: number; inc: number; node: number; peri: number; zh: [string, string]; en: [string, string] }> = [
  // ecc/inc/node/peri：J2000 离心率、轨道倾角、升交点经度与近日点经度（NASA NSSDCA）。
  { id: 'sun', radius: 1.25, orbit: 0, speed: 0, angle: 0, color: '#ffb547', kind: 'sun', orbitAU: 0, radiusEarth: 109.2, ecc: 0, inc: 0, node: 0, peri: 0, zh: ['太阳', '太阳系中央的恒星。这里用金色日冕与流动的光表现它的能量。'], en: ['Sun', 'The star at the center of our solar system, imagined here with a flowing golden corona.'] },
  { id: 'mercury', radius: .2, orbit: 3.2, speed: .24, angle: .5, color: '#bdb5c6', kind: 'rock', orbitAU: .387, radiusEarth: .383, ecc: .20563, inc: 7.005, node: 48.331, peri: 77.456, zh: ['水星', '最靠近太阳的行星，岩石表面布满撞击坑。'], en: ['Mercury', 'The closest planet to the Sun, with a rocky, cratered surface.'] },
  { id: 'venus', radius: .34, orbit: 4.5, speed: .19, angle: 2.1, color: '#e7b887', kind: 'gas', orbitAU: .723, radiusEarth: .949, ecc: .00677, inc: 3.395, node: 76.68, peri: 131.564, zh: ['金星', '浓密云层包裹的岩石行星，在这里呈现为温暖的琥珀色。'], en: ['Venus', 'A rocky planet wrapped in thick clouds, rendered here in warm amber.'] },
  { id: 'earth', radius: .37, orbit: 5.9, speed: .15, angle: 4.4, color: '#529dff', kind: 'earth', orbitAU: 1, radiusEarth: 1, ecc: .01671, inc: 0, node: 0, peri: 102.947, zh: ['地球', '我们的蓝色家园。海洋、陆地与云层之外，月球沿着自己的轨道运行。'], en: ['Earth', 'Our blue home: oceans, land and clouds, with the Moon on its own orbit.'] },
  { id: 'mars', radius: .28, orbit: 7.2, speed: .12, angle: 3.4, color: '#f07661', kind: 'rock', orbitAU: 1.524, radiusEarth: .532, ecc: .09339, inc: 1.85, node: 49.558, peri: 336.604, zh: ['火星', '这颗红色岩石行星的表面拥有沙漠、火山与峡谷。'], en: ['Mars', 'A red rocky world with deserts, volcanoes and canyons.'] },
  { id: 'jupiter', radius: .87, orbit: 9.7, speed: .075, angle: .85, color: '#e9a779', kind: 'gas', orbitAU: 5.203, radiusEarth: 11.21, ecc: .04839, inc: 1.303, node: 100.464, peri: 14.728, zh: ['木星', '太阳系最大的行星，层叠云带构成它鲜明的外观。'], en: ['Jupiter', 'The largest planet in our solar system, distinguished by its layered cloud bands.'] },
  { id: 'saturn', radius: .71, orbit: 12.1, speed: .055, angle: 2.6, color: '#f2d89f', kind: 'gas', orbitAU: 9.537, radiusEarth: 9.45, ecc: .05386, inc: 2.485, node: 113.665, peri: 92.598, zh: ['土星', '宽阔的环围绕这颗气态巨行星，是这片星空中醒目的轮廓。'], en: ['Saturn', 'Wide rings encircle this gas giant, making an unmistakable silhouette.'] },
  { id: 'uranus', radius: .51, orbit: 14.6, speed: .04, angle: 5.8, color: '#79e6df', kind: 'gas', orbitAU: 19.19, radiusEarth: 4.01, ecc: .04726, inc: .773, node: 74.006, peri: 170.954, zh: ['天王星', '青蓝色的冰巨星，自转轴具有很大的倾斜。'], en: ['Uranus', 'A cyan ice giant with a dramatically tilted rotation axis.'] },
  { id: 'neptune', radius: .49, orbit: 17.2, speed: .03, angle: 4.5, color: '#7486ff', kind: 'gas', orbitAU: 30.07, radiusEarth: 3.88, ecc: .00859, inc: 1.77, node: 131.784, peri: 44.971, zh: ['海王星', '八大行星中距离太阳最远的一颗，以深蓝色外观呈现。'], en: ['Neptune', 'The most distant of the eight planets, rendered in deep blue.'] },
]

export const solarCopy = {
  zh: { explore: '探索太阳系', title: '太阳系', subtitle: '一片可以亲手探索的星空。', disclaimer: '艺术化演示：大小与距离非真实比例；轨道倾角与离心率为真实值，行星沿真实的三维椭圆轨道运行。', trueScale: '真实比例', artisticScale: '艺术模式', trueDisclaimer: '距离按 1:1 真实比例（1 AU ≈ 1.55 单位），公转速度遵循开普勒第三定律，轨道倾角与离心率为真实值。太阳放大 20 倍、行星放大 160 倍以保持可见——按真实尺寸，地球在这幅全景里不足 0.01 像素。', threebody: '三体', threebodyCta: '探访半人马座α', unavailable: '当前设备无法显示动态太阳系，可继续浏览主页。', loading: '正在点亮星空…', pause: '暂停', resume: '继续', reset: '重置视角', exit: '退出探索', zoomIn: '放大', zoomOut: '缩小', select: '选择', overview: '太阳与八大行星', hint: '拖动旋转 · 滚轮缩放 · 点选行星', touchHint: '单指旋转 · 双指缩放 · 轻触行星', tracking: '正在追踪', sceneLabel: '太阳系交互视图', rotateLeft: '向左旋转', rotateRight: '向右旋转', blackhole: '黑洞', blackholeCta: '跃迁至黑洞' },
  en: { explore: 'Explore the solar system', title: 'Solar system', subtitle: 'A sky you can explore for yourself.', disclaimer: 'Artistic sizes and distances. Orbital inclinations and eccentricities are real — planets follow true three-dimensional elliptical orbits.', trueScale: 'True scale', artisticScale: 'Artistic', trueDisclaimer: 'Distances are 1:1 to reality (1 AU ≈ 1.55 units), orbital speeds follow Kepler\'s third law, and inclinations and eccentricities are real. The Sun is enlarged 20× and planets 160× to stay visible — at true size, Earth would be under 0.01 pixels in this panorama.', threebody: 'Three-body', threebodyCta: 'Visit Alpha Centauri', unavailable: 'Animated solar system unavailable on this device. You can still browse the homepage.', loading: 'Lighting up the sky…', pause: 'Pause', resume: 'Resume', reset: 'Reset view', exit: 'Exit exploration', zoomIn: 'Zoom in', zoomOut: 'Zoom out', select: 'Select', overview: 'The Sun and eight planets', hint: 'Drag to rotate · Scroll to zoom · Select a planet', touchHint: 'One finger to rotate · Pinch to zoom · Tap a planet', tracking: 'Following', sceneLabel: 'Interactive solar system view', rotateLeft: 'Rotate left', rotateRight: 'Rotate right', blackhole: 'Black hole', blackholeCta: 'Enter the black hole' },
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
