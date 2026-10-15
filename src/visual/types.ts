export type ScenePhase = 'hero' | 'projects' | 'focus' | 'about' | 'links'
export type SceneTheme = 'light' | 'dark'
export type SceneMode = 'browse' | 'explore'
export type ScaleMode = 'artistic' | 'true'
export type BodyCategory = 'star' | 'planet' | 'dwarf' | 'asteroid' | 'comet' | 'satellite'
export type BodyId =
  | 'sun' | 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'
  | 'moon' | 'io' | 'europa' | 'ganymede' | 'callisto' | 'titan' | 'triton'
  | 'pluto' | 'ceres' | 'pallas' | 'eris' | 'halley'
// 时间流速挡位。1× 是真实相对周期（地球一天 = 10 秒、一圈银河 25 分钟）；越往上越适合看长周期动作：
// 240×（一圈银河 6.3 秒）与 720×（2.1 秒）是为「星系视角」看公转整圈加的。
export type TimeScale = 1 | 4 | 16 | 60 | 240 | 720

export const timeScales: readonly TimeScale[] = [1, 4, 16, 60, 240, 720]
export const bodyCategories: readonly BodyCategory[] = ['star', 'planet', 'dwarf', 'asteroid', 'comet', 'satellite']

export interface UniverseCanvasProps {
  phase: ScenePhase
  theme: SceneTheme
  pulse: number
  reducedMotion: boolean
  mode: SceneMode
  scaleMode: ScaleMode
  selected: BodyId | null
  paused: boolean
  reset: number
  zoom: number
  timeScale: TimeScale
  galacticRing: boolean
  galacticView: boolean
  interactionElement: HTMLElement | null
  onSelect: (body: BodyId | null) => void
  onAvailability: (available: boolean) => void
}

export interface UniverseController {
  setPhase(phase: ScenePhase): void
  setTheme(theme: SceneTheme): void
  pulse(seed: number): void
  setMode(mode: SceneMode, element: HTMLElement | null): void
  setScaleMode(mode: ScaleMode): void
  selectBody(body: BodyId | null): void
  setPaused(paused: boolean): void
  setTimeScale(scale: TimeScale): void
  setGalacticRing(visible: boolean): void
  setGalacticView(active: boolean): void
  resetView(): void
  zoomBy(direction: number): void
  destroy(): void
}
