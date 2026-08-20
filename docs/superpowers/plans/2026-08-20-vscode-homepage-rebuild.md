# VS Code Personal Homepage Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Vite-built React personal homepage that presents Tang Yixiao's public work in a VS Code-inspired portfolio while retaining all public navigation.

**Architecture:** A typed local content module owns public copy and destinations. React section components compose the page; Motion provides optional entrance, scroll, and stacked-card behavior. The Pages repository moves to the official workflow deployment so Vite's `dist/` artifact is published.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, `@tailwindcss/vite`, `motion/react`, Python unittest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-20-vscode-homepage-rebuild-design.md`

## Global Constraints

- Use `#1E1E1E`, `#252526`, `#2D2D30`, `#007ACC`, `#3794FF`, and `#D4D4D4` as shared tokens.
- Publish no supplied external portrait, GIF, project-image, or video assets.
- Preserve public links, bilingual identity hooks, local public routes, and exactly three `href="/Code/"` CodeHub entries.
- Respect reduced motion and expose visible keyboard focus for every interaction.

---

### Task 1: Establish Vite workflow publishing and route regressions

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/index.css`, `src/App.tsx`, `.github/workflows/pages.yml`
- Modify: `.gitignore`, `tests/test_homepage.py`
- Test: `tests/test_homepage.py`

**Interfaces:** `npm run build` emits `dist/index.html`; the Pages workflow uploads only `dist/` and deploys through workflow Pages.

- [ ] **Step 1: Add a failing Vite/route test**

```python
def test_vite_source_and_codehub_routes_exist(self):
    self.assertTrue((ROOT / 'package.json').is_file())
    self.assertEqual(self.html.count('href="/Code/"'), 3)
```

- [ ] **Step 2: Run the focused test**

Run: `python -m unittest tests.test_homepage.HomepageTests.test_vite_source_and_codehub_routes_exist -v`
Expected: FAIL because Vite source files do not exist.

- [ ] **Step 3: Implement Vite/Tailwind entry points and Pages workflow**

```ts
export default defineConfig({ base: '/', plugins: [react(), tailwindcss()] })
```

```yaml
- run: npm ci
- run: npm run build
- uses: actions/upload-pages-artifact@v4
  with: { path: dist }
```

- [ ] **Step 4: Verify and commit**

Run: `python -m unittest discover -s tests -v; npm ci; npm run build`

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json src .github/workflows/pages.yml .gitignore tests/test_homepage.py
git commit -m "feat: build homepage with Vite"
```

### Task 2: Create owned content and semantic portfolio sections

**Files:**
- Create: `src/data/site.ts`, `src/components/Nav.tsx`, `src/components/Hero.tsx`, `src/components/Marquee.tsx`, `src/components/About.tsx`, `src/components/FocusAreas.tsx`, `src/components/ProjectStack.tsx`, `src/components/Footer.tsx`
- Modify: `src/App.tsx`
- Test: `tests/test_homepage.py`

**Interfaces:** `site.ts` exports `navItems`, `focusAreas`, `projects`, and `socialLinks`; every `Project` has `{ id, label, href, kind, summary }`.

- [ ] **Step 1: Add failing content and asset-origin tests**

```python
for label in ['CodeHub', 'HighSchoolMathematics', 'Agent-Learning-Hub']:
    self.assertIn(label, self.html)
self.assertNotIn('motionsites.ai', self.html)
self.assertNotIn('figma.site', self.html)
```

- [ ] **Step 2: Run the focused test**

Run: `python -m unittest tests.test_homepage.HomepageTests.test_representative_content_and_links -v`
Expected: FAIL until the React output includes owned project content.

- [ ] **Step 3: Implement typed data and section composition**

```ts
export type Project = { id: string; label: string; href: string; kind: string; summary: string }
export const projects: Project[] = [{ id: 'codehub', label: 'CodeHub', href: '/Code/', kind: 'Archive', summary: '...' }]
```

```tsx
<main><Hero /><Marquee /><About /><FocusAreas /><ProjectStack /><Footer /></main>
```

- [ ] **Step 4: Verify and commit**

Run: `python -m unittest discover -s tests -v; npm run build`

```bash
git add src tests/test_homepage.py
git commit -m "feat: compose owned portfolio content"
```

### Task 3: Implement VS Code visual identity and accessible motion

**Files:**
- Create: `src/components/FadeIn.tsx`, `src/components/MagneticLink.tsx`, `tests/homepage.smoke.cjs`
- Modify: `src/index.css`, `src/components/Hero.tsx`, `src/components/Marquee.tsx`, `src/components/About.tsx`, `src/components/FocusAreas.tsx`, `src/components/ProjectStack.tsx`
- Test: `tests/homepage.smoke.cjs`

**Interfaces:** `FadeIn` accepts `children`, `delay`, `x`, and `y`; `MagneticLink` remains an ordinary anchor with reduced motion or no pointer.

- [ ] **Step 1: Add failing desktop and mobile smoke checks**

```js
await expect(page.getByRole('heading', { name: /Tang Yixiao/i })).toBeVisible();
await expect(page.locator('a[href="/Code/"]')).toHaveCount(3);
expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
```

- [ ] **Step 2: Run the smoke test**

Run: `node tests/homepage.smoke.cjs`
Expected: FAIL because no Vite app is served.

- [ ] **Step 3: Add CSS code-field artwork and restrained Motion components**

```tsx
const reduce = useReducedMotion()
return <motion.div initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} />
```

- [ ] **Step 4: Add focus and reduced-motion styles**

```css
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; } }
```

- [ ] **Step 5: Verify and commit**

Run: `npm run build; node tests/homepage.smoke.cjs`

```bash
git add src tests/homepage.smoke.cjs
git commit -m "feat: style homepage as a VS Code portfolio"
```

### Task 4: Release through GitHub Pages and verify

**Files:**
- Modify: `.github/workflows/pages.yml` only if deployment verification requires correction.

- [ ] **Step 1: Run final local verification**

Run: `python -m unittest discover -s tests -v; npm run build; git diff --check; node tests/homepage.smoke.cjs`

- [ ] **Step 2: Enable workflow publishing and push a fast-forward release**

```bash
gh api --method POST repos/tangyixiao/tangyixiao.github.io/pages -f build_type=workflow
git fetch origin main
git merge-base --is-ancestor origin/main HEAD
git push origin HEAD:main
```

- [ ] **Step 3: Verify production**

Wait for the Pages workflow, request `https://tangyixiao.github.io/`, and assert HTTP 200, no phone-width horizontal overflow, three `/Code/` links, and successful navigation to `https://tangyixiao.github.io/Code/`.
