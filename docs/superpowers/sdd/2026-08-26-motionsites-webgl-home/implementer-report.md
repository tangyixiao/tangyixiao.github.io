# Task 1 implementer report

Date: 2026-08-26
Worktree: `/home/tangyixiao/.codex/worktrees/tangyixiao.github.io/motionsites-webgl-home`
Branch: `codex/motionsites-webgl-home`

## RED evidence

After repairing the interrupted tests so missing files produced assertion failures instead of a `FileNotFoundError`, this command failed for the expected missing behavior:

```text
python3 -m unittest discover -s tests -p 'test_*.py'
Ran 10 tests in 0.005s
FAILED (failures=3)
```

The three failures were: missing `src/visual/DeepSeaCanvas.tsx`, missing `pull_request:` in Pages workflow, and missing `IntersectionObserver` section integration. The browser tests were also updated to assert current `Paradox Praxis Clinamen` content, real scene state, fallback behavior, responsive overflow, and cross-platform browser discovery before implementation.

## Summary

- Added production `three` and development `@types/three` dependencies.
- Added typed visual contracts, a lazy React canvas, and a raw Three.js controller loaded with `import('three')`.
- Implemented deterministic deep-sea fog, cyan/purple lights, glowing nucleus, orbit paths, 360-particle flow field, camera drift, pointer inertia, pulse response, visibility pausing, DPR capping, reduced-motion static rendering, context-loss/WebGL fallback, and full disposal.
- Integrated the five section-to-phase mappings through `IntersectionObserver`, one pointer-inert full-screen scene canvas, glass navigation/cards, cursor spotlight, fine-pointer magnetic displacement, interaction pulses, cinematic motion rhythm, responsive layout, focus-visible states, and no horizontal overflow.
- Preserved existing copy, project identities, exactly three `/Code/` links, metadata, legacy routes, and legacy copying.
- Updated both browser smokes to use current brand content, Playwright, portable Chromium discovery, desktop/mobile/reduced-motion coverage, context loss, and screenshot output.
- Updated Pages CI so pull requests install/build only; Pages configure/upload/deploy steps are push-to-main only.

## Changed files

- `.github/workflows/pages.yml`
- `index.html`
- `package.json`, `package-lock.json`
- `src/App.tsx`, `src/index.css`
- `src/visual/types.ts`
- `src/visual/DeepSeaCanvas.tsx`
- `src/visual/createDeepSeaController.ts`
- `tests/test_homepage.py`
- `tests/homepage-smoke.mjs`
- `tests/homepage.smoke.cjs`
- `docs/superpowers/plans/2026-08-26-motionsites-webgl-home.md`
- `docs/superpowers/sdd/2026-08-26-motionsites-webgl-home/implementer-report.md`

No legacy route/content files were changed.

## Exact verification commands and results

- `npm install three --save --registry=https://registry.npmjs.org` — first attempt was blocked by npm 12 `allow-remote=none` because the pre-existing lockfile used `registry.npmmirror.com` tarball hosts.
- `npm install three --save --registry=https://registry.npmjs.org/ --replace-registry-host=always` — passed; added Three.js.
- `npm install --save-dev @types/three --registry=https://registry.npmjs.org/ --replace-registry-host=always` — passed.
- `npm ci --registry=https://registry.npmjs.org/ --replace-registry-host=always` — passed; 95 packages added, 0 vulnerabilities.
- `python3 -m unittest discover -s tests -p 'test_*.py'` — passed, 10 tests.
- `npx tsc --noEmit` — passed, exit 0.
- `npm run build` — passed, exit 0; 424 modules transformed and Vite reported `✓ built in 20.68s`.
- `CODEX_NODE_MODULES=/home/tangyixiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules CHROME_PATH=/usr/bin/chromium npm run test:browser` — passed, mobile smoke.
- `CODEX_NODE_MODULES=/home/tangyixiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules CHROME_PATH=/usr/bin/chromium node tests/homepage.smoke.cjs` — passed, desktop/mobile/reduced/context-loss smoke.
- Lazy-chunk Node inspection — passed: `index-B6ue8Un_.js` 322176 bytes, `DeepSeaCanvas-BrlbfsQ6.js` 6784 bytes, `three.module-C5rh5wLt.js` 724236 bytes; initial chunk had no `WebGLRenderer` and scene chunk referenced the Three chunk.
- `git diff --check` — passed.

## Screenshots

- Desktop: `/home/tangyixiao/.codex/visualizations/2026/08/26/motionsites-webgl-home/homepage-desktop.png`
- Mobile 390x844: `/home/tangyixiao/.codex/visualizations/2026/08/26/motionsites-webgl-home/homepage-mobile.png`
- Reduced motion: `/home/tangyixiao/.codex/visualizations/2026/08/26/motionsites-webgl-home/homepage-reduced-motion.png`

## Commit

Pending initial commit; this section is amended with the final SHA after the task-owned changes are committed.

## Risks and follow-up

- Vite reports the expected `three.module` lazy chunk is larger than 500 kB after minification; it is intentionally isolated from the initial app chunk.
- WebGL availability varies by browser/GPU; initialization and context loss fall back to the CSS gradient/ASCII atom without uncaught errors.
- Google Fonts remain an existing external visual dependency; all scene geometry and fallback visuals are programmatic/local.
