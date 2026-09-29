# Personal Homepage Universe Redesign Implementation Plan

> Implement in `/home/tangyixiao/tangyixiao.github.io` on `codex/homepage-universe-redesign`. Use test-first changes and verify each task before committing.

**Goal:** Redesign the root homepage with bilingual content, remembered light/dark themes, and an accessible section-driven 3D particle field while preserving all existing routes.

**Architecture:** Keep Vite, React, Motion, and one lazy Three.js scene. Use one bilingual content module and a preference controller for language/theme. Reuse the current scene resource cleanup and fallback patterns while replacing its visual composition.

**Tech Stack:** React 19, TypeScript, Vite 8, Three.js, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-29-homepage-universe-redesign-design.md`

## Global constraints

- Only the root homepage is redesigned; all legacy artifacts in `scripts/copy-legacy.mjs` remain present.
- Do not add unverified school identity, AC counts, or personal stories.
- Keep exactly three visible `/Code/` homepage links and the three existing featured project destinations.
- Theme and language use `site-theme` and `site-language` preferences; system/browser defaults apply when absent.
- The scene remains lazy, pointer-inert, theme-aware, and safe under reduced motion or WebGL loss.

## Tasks

### Task 1: Bilingual content and preferences

- [ ] Add browser assertions for Chinese/English copy, metadata, theme/language controls, default selection, persistence, and safe storage fallback; watch them fail on the old homepage.
- [ ] Add a typed bilingual content module and implement the theme/language state and controls, including before-paint preference initialization.
- [ ] Rebuild the homepage sections, navigation, About information, and project links around the content module.
- [ ] Run focused browser checks, TypeScript, and the full static/unit suite; commit.

### Task 2: Particle universe scene

- [ ] Add scene browser assertions for the five phases, dark/light updates, one lazy canvas, reduced motion, WebGL fallback, and mobile quality; watch them fail.
- [ ] Rework the existing Three.js scene into an original particle/orbit composition with theme and phase controls, keeping lifecycle cleanup and lazy loading.
- [ ] Update existing scene tests to test the new behavior rather than old deep-sea naming or fixed particle count.
- [ ] Run browser and unit suites plus the production build/lazy chunk verifier; commit.

### Task 3: Visual finish and delivery

- [ ] Implement the approved color tokens, type hierarchy, section layout, original project visuals, responsive behavior, and restrained motion.
- [ ] Inspect desktop, mobile, both themes, both languages, reduced motion, and fallback screenshots; correct any readability or overflow problems.
- [ ] Run `npx tsc --noEmit`, `python3 -m unittest discover -s tests -p 'test_*.py'`, `npm run test:unit`, `npm run build`, and `npm run test:browser`.
- [ ] Verify copied public routes and links, review the diff, commit, push the feature branch, and open a PR. Merge/deploy only after final review approval, then verify the live site.
