export type ScenePhase = 'hero' | 'projects' | 'focus' | 'about' | 'links'
export type SceneTheme = 'light' | 'dark'
export type SceneMode = 'browse' | 'explore'
export type BodyId = 'sun' | 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'

export interface UniverseCanvasProps {
  phase: ScenePhase
  theme: SceneTheme
  pulse: number
  reducedMotion: boolean
  mode: SceneMode
  selected: BodyId | null
  paused: boolean
  reset: number
  zoom: number
  interactionElement: HTMLElement | null
  onSelect: (body: BodyId | null) => void
  onAvailability: (available: boolean) => void
}

export interface UniverseController {
  setPhase(phase: ScenePhase): void
  setTheme(theme: SceneTheme): void
  pulse(seed: number): void
  setMode(mode: SceneMode, element: HTMLElement | null): void
  selectBody(body: BodyId | null): void
  setPaused(paused: boolean): void
  resetView(): void
  zoomBy(direction: number): void
  destroy(): void
}
