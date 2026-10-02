import type { BodyId } from './types'

export const bodies: Array<{ id: BodyId; radius: number; orbit: number; speed: number; angle: number; color: string; kind: 'sun' | 'rock' | 'earth' | 'gas'; zh: [string, string]; en: [string, string] }> = [
  { id: 'sun', radius: 1.25, orbit: 0, speed: 0, angle: 0, color: '#ffb547', kind: 'sun', zh: ['太阳', '太阳系中央的恒星。这里用金色日冕与流动的光表现它的能量。'], en: ['Sun', 'The star at the center of our solar system, imagined here with a flowing golden corona.'] },
  { id: 'mercury', radius: .2, orbit: 3.2, speed: .24, angle: .5, color: '#bdb5c6', kind: 'rock', zh: ['水星', '最靠近太阳的行星，岩石表面布满撞击坑。'], en: ['Mercury', 'The closest planet to the Sun, with a rocky, cratered surface.'] },
  { id: 'venus', radius: .34, orbit: 4.5, speed: .19, angle: 2.1, color: '#e7b887', kind: 'gas', zh: ['金星', '浓密云层包裹的岩石行星，在这里呈现为温暖的琥珀色。'], en: ['Venus', 'A rocky planet wrapped in thick clouds, rendered here in warm amber.'] },
  { id: 'earth', radius: .37, orbit: 5.9, speed: .15, angle: 4.4, color: '#529dff', kind: 'earth', zh: ['地球', '我们的蓝色家园。海洋、陆地与云层之外，月球沿着自己的轨道运行。'], en: ['Earth', 'Our blue home: oceans, land and clouds, with the Moon on its own orbit.'] },
  { id: 'mars', radius: .28, orbit: 7.2, speed: .12, angle: 3.4, color: '#f07661', kind: 'rock', zh: ['火星', '这颗红色岩石行星的表面拥有沙漠、火山与峡谷。'], en: ['Mars', 'A red rocky world with deserts, volcanoes and canyons.'] },
  { id: 'jupiter', radius: .87, orbit: 9.7, speed: .075, angle: .85, color: '#e9a779', kind: 'gas', zh: ['木星', '太阳系最大的行星，层叠云带构成它鲜明的外观。'], en: ['Jupiter', 'The largest planet in our solar system, distinguished by its layered cloud bands.'] },
  { id: 'saturn', radius: .71, orbit: 12.1, speed: .055, angle: 2.6, color: '#f2d89f', kind: 'gas', zh: ['土星', '宽阔的环围绕这颗气态巨行星，是这片星空中醒目的轮廓。'], en: ['Saturn', 'Wide rings encircle this gas giant, making an unmistakable silhouette.'] },
  { id: 'uranus', radius: .51, orbit: 14.6, speed: .04, angle: 5.8, color: '#79e6df', kind: 'gas', zh: ['天王星', '青蓝色的冰巨星，自转轴具有很大的倾斜。'], en: ['Uranus', 'A cyan ice giant with a dramatically tilted rotation axis.'] },
  { id: 'neptune', radius: .49, orbit: 17.2, speed: .03, angle: 4.5, color: '#7486ff', kind: 'gas', zh: ['海王星', '八大行星中距离太阳最远的一颗，以深蓝色外观呈现。'], en: ['Neptune', 'The most distant of the eight planets, rendered in deep blue.'] },
]

export const solarCopy = {
  zh: { explore: '探索太阳系', title: '太阳系', subtitle: '一片可以亲手探索的星空。', disclaimer: '艺术化演示，大小、距离与速度非真实比例。', unavailable: '当前设备无法显示动态太阳系，可继续浏览主页。', loading: '正在点亮星空…', pause: '暂停', resume: '继续', reset: '重置视角', exit: '退出探索', zoomIn: '放大', zoomOut: '缩小', select: '选择', overview: '太阳与八大行星', hint: '拖动旋转 · 滚轮缩放 · 点选行星', touchHint: '单指旋转 · 双指缩放 · 轻触行星', tracking: '正在追踪', sceneLabel: '太阳系交互视图', rotateLeft: '向左旋转', rotateRight: '向右旋转' },
  en: { explore: 'Explore the solar system', title: 'Solar system', subtitle: 'A sky you can explore for yourself.', disclaimer: 'Artistic visualization. Sizes, distances and speeds are not to scale.', unavailable: 'Animated solar system unavailable on this device. You can still browse the homepage.', loading: 'Lighting up the sky…', pause: 'Pause', resume: 'Resume', reset: 'Reset view', exit: 'Exit exploration', zoomIn: 'Zoom in', zoomOut: 'Zoom out', select: 'Select', overview: 'The Sun and eight planets', hint: 'Drag to rotate · Scroll to zoom · Select a planet', touchHint: 'One finger to rotate · Pinch to zoom · Tap a planet', tracking: 'Following', sceneLabel: 'Interactive solar system view', rotateLeft: 'Rotate left', rotateRight: 'Rotate right' },
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
