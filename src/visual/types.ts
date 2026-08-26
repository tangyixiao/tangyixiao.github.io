export type SceneVariant = 'portfolio' | 'workbench'

export type ScenePhase = 'hero' | 'orbit' | 'focus' | 'archive' | 'links' | 'workbench'

export interface DeepSeaCanvasProps {
  variant: SceneVariant
  phase: ScenePhase
  pulse: number
  reducedMotion: boolean
}

export interface DeepSeaController {
  setPhase(phase: ScenePhase): void
  pulse(seed: number): void
  destroy(): void
}
