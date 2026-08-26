# Abyssal Clinamen Homepage Implementation Plan

> Execute in `/home/tangyixiao/.codex/worktrees/tangyixiao.github.io/motionsites-webgl-home` on `codex/motionsites-webgl-home`.

## Goal

Upgrade the existing personal homepage in place with an original MotionSites-inspired deep-sea WebGL visual system. Preserve all current copy, links, metadata, public routes, and the five `home / about / focus / work / links` sections.

## Task 1: Test-drive and implement the homepage scene system

### Required production changes

- Add `three` as a production dependency and keep the Three.js implementation behind a dynamic import so the primary React page renders first and the production build emits a separate lazy scene chunk.
- Add typed visual modules under `src/visual/` with these public contracts:

```ts
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
```

- Render exactly one full-screen, transparent, pointer-inert canvas. The raw Three.js scene must include deep-sea fog, a glowing nucleus, orbit paths, a particle flow field, subtle camera drift, smoothed pointer inertia, cyan signal light, and muted ion purple. It must be original programmatic geometry with no external video or visual assets.
- Keep the complete scene and the same particle count/logic on mobile. Cap renderer DPR at `Math.min(devicePixelRatio, 2)`.
- Pause animation while the page is hidden. On teardown, remove listeners and dispose all geometries, materials, textures, and the renderer.
- For `prefers-reduced-motion`, render one static frame and do not run an animation loop. If WebGL cannot initialize or the context is lost, expose a visible CSS deep-sea gradient and static ASCII atom fallback without uncaught errors.
- Expose deterministic, accessible state attributes on the scene root so browser tests can inspect phase, motion mode, pulse, and fallback status without depending on pixels.

### Required page integration

- Refactor the existing single-file visual helpers into coherent modules where useful; do not change existing words, links, project identities, brand metadata, or legacy files.
- Use `IntersectionObserver` to map the five sections to scene phases and continuously tune scene position/emphasis as the active section changes.
- Place the hero nucleus to the title's right and establish a deliberately skewed relationship with `Paradox / Praxis / Clinamen`.
- Upgrade navigation to a floating glass bar. Apply a shared cinematic entrance rhythm to headings, buttons, trajectories, and ASCII data labels.
- Keep the existing three real project cards and add glass refraction, cursor spotlight, magnetic displacement on fine pointers, and a scene pulse on interaction.
- Maintain exactly three public `/Code/` links and all old route copying.
- Add translucent glass fill, fine borders, inner highlights, backdrop blur, responsive layout, focus-visible states, and no horizontal overflow.

### Tests first

Before implementation, extend the Python and browser regression suites so they fail for the missing behavior, then implement until green. Browser coverage must prove:

- one and only one scene canvas at desktop and `390x844`;
- all five sections update the scene phase;
- three CodeHub links and copied legacy routes remain intact;
- reduced-motion mode reports a static scene and has no continuously running site animations;
- dispatching a WebGL context-loss event reveals the fallback without uncaught console errors;
- desktop/mobile have no horizontal overflow;
- the current canonical hero and metadata are asserted (repair stale `TANG YI XIAO` expectations and make Chrome discovery cross-platform).

### Workflow

- Update `.github/workflows/pages.yml` to run installation/build checks for pull requests while limiting Pages configure/upload/deploy actions to pushes on `main`.

### Verification

- `python3 -m unittest discover -s tests -p 'test_*.py'`
- `npm run build`
- Browser smoke tests using the bundled Playwright module and `/usr/bin/chromium`
- Confirm a distinct lazy Three.js/scene chunk exists under `dist/assets` and the initial app chunk does not eagerly absorb Three.js.
- Capture desktop, mobile, and reduced-motion screenshots for review.

### Commit

Commit all task-owned changes with a descriptive Conventional Commit message. Do not push or open the PR; the parent agent will do that after independent review.
