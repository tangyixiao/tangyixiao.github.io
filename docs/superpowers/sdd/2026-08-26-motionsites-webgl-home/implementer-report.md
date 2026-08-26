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

Implementation commit: `08c80daf` (`feat(homepage): add lazy deep-sea WebGL scene`). The report metadata is finalized in the follow-up report-only commit after this implementation commit.

## Risks and follow-up

- Vite reports the expected `three.module` lazy chunk is larger than 500 kB after minification; it is intentionally isolated from the initial app chunk.
- WebGL availability varies by browser/GPU; initialization and context loss fall back to the CSS gradient/ASCII atom without uncaught errors.
- Google Fonts remain an existing external visual dependency; all scene geometry and fallback visuals are programmatic/local.

## Fix round 1/5 — Important findings

Reviewed base: `a854a0e5`.

### RED evidence

The interrupted worker's tests were repaired into behavior-focused regressions before production changes. The initial RED gates were:

- `python3 -m unittest discover -s tests -p 'test_*.py'` — exit 1, 13 tests, 4 failures: missing `node scripts/verify-lazy-chunks.mjs` in the build script, missing `src/visual/resourceScope.ts`, missing `npm run test:browser` in Pages workflow, and missing `data-scene-render-count` in `DeepSeaCanvas.tsx`.
- `node --experimental-strip-types --test tests/visual-lifecycle.test.mjs` — exit 1 because `../src/visual/resourceScope.ts` was not present.
- `CODEX_NODE_MODULES=/home/tangyixiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules CHROME_PATH=/usr/bin/chromium node tests/homepage.smoke.cjs` — exit 1 with `page.waitForFunction: Timeout 3000ms exceeded` in `expectDelayedControllerReplay`, demonstrating that phase/pulse changes made while the Three.js module was delayed were lost.

The legacy regression was expanded from the stale five-route allowlist to parse and assert the complete `copy-legacy.mjs` manifest: `notes.html`, `login.html`, `register.html`, `thechao.html`, `thechaos.html`, `auth.js`, `notes-worker.js`, `_config.yml`, `.nojekyll`, plus the copied `assets/` directory.

### Fix summary

- `DeepSeaCanvas` now keeps latest phase/pulse refs while the async controller loads, replays both on resolution, and tracks pulse identity so a replay is applied once. It exposes controller phase/pulse/count and a deterministic render-count marker for runtime browser assertions.
- `createDeepSeaController` registers the renderer immediately in a reverse-order, idempotent `ResourceScope`; geometry, material/texture, object, listener, animation-loop, and renderer cleanup runs on both normal destroy and every post-renderer initialization rejection. The focused unit tests also prove cleanup continues after a disposer throws.
- `npm run test:browser` now runs both the portable mobile MJS smoke and the desktop/mobile/reduced/context-loss CJS smoke. PR CI installs Chromium and runs static Python, lifecycle unit, build/lazy-chunk, and browser gates.
- The reduced-motion smoke observes the WebGL render marker staying at one frame and confirms no additional RAFs are scheduled after initialization. The build itself runs `scripts/verify-lazy-chunks.mjs` to assert distinct initial, scene, and Three.js assets.
- Browser tests derive legacy routes from `scripts/copy-legacy.mjs`, assert ancillary assets, current brand/metadata, section phases, all three `/Code/` links, and desktop/mobile overflow behavior.

### Exact fix-round verification

- `npm ci --registry=https://registry.npmjs.org/ --replace-registry-host=always` — passed; 97 packages added, 98 audited, 0 vulnerabilities.
- `python3 -m unittest discover -s tests -p 'test_*.py'` — passed, 13 tests.
- `npm run test:unit` — passed, 2 lifecycle tests.
- `npx tsc --noEmit` — passed, exit 0.
- `npm run build` — passed, exit 0; 425 modules transformed. Vite emitted `index-pqT--rYk.js`, `DeepSeaCanvas-CqVPxSjH.js`, and `three.module-C5rh5wLt.js`; the documented isolated Three.js chunk-size warning (>500 kB after minification) was the only expected build warning.
- `node scripts/verify-lazy-chunks.mjs` — passed: initial chunk excludes `WebGLRenderer`, scene chunk references the Three.js chunk, and the Three.js chunk contains `WebGLRenderer`.
- `CODEX_NODE_MODULES=/home/tangyixiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules CHROME_PATH=/usr/bin/chromium SCREENSHOT_DIR=/home/tangyixiao/.codex/visualizations/2026/08/26/motionsites-webgl-home-round-1 npm run test:browser` — passed: mobile smoke and desktop smoke (delayed controller replay, all five section phases, context-loss fallback, complete mobile scene, reduced-motion runtime stability, and current links/content).
- `git diff --check` — passed.

One intermediate post-fix browser run caught an over-broad test assertion requiring total page RAF calls to equal zero. The runtime marker was already exactly one; the assertion was narrowed to require no additional RAFs after initialization, and the full combined browser gate then passed.

### Fix-round changed files

- `.github/workflows/pages.yml`
- `package.json`, `package-lock.json`
- `src/visual/DeepSeaCanvas.tsx`, `src/visual/createDeepSeaController.ts`, `src/visual/resourceScope.ts`
- `scripts/verify-lazy-chunks.mjs`
- `tests/homepage-smoke.mjs`, `tests/homepage.smoke.cjs`, `tests/test_homepage.py`, `tests/visual-lifecycle.test.mjs`
- This report

### Fix-round screenshots

- Desktop: `/home/tangyixiao/.codex/visualizations/2026/08/26/motionsites-webgl-home-round-1/homepage-desktop.png`
- Mobile 390x844: `/home/tangyixiao/.codex/visualizations/2026/08/26/motionsites-webgl-home-round-1/homepage-mobile.png`
- Reduced motion: `/home/tangyixiao/.codex/visualizations/2026/08/26/motionsites-webgl-home-round-1/homepage-reduced-motion.png`

### Fix-round commit

Implementation commit SHA: to be filled after the code/report commit; report-finalization SHA will be recorded below if a separate metadata commit is required.
