export type ScenePhase = 'hero' | 'projects' | 'focus' | 'about' | 'links'
export type SceneTheme = 'light' | 'dark'

export interface UniverseCanvasProps {
  phase: ScenePhase
  theme: SceneTheme
  pulse: number
  reducedMotion: boolean
}

export interface UniverseController {
  setPhase(phase: ScenePhase): void
  setTheme(theme: SceneTheme): void
  pulse(seed: number): void
  destroy(): void
}
