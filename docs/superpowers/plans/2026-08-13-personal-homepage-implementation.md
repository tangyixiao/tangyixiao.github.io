# Personal Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the root `tangyixiao.github.io` homepage into a polished bilingual HTML/CSS/JS personal site while preserving all existing subpages and routes.

**Architecture:** Replace only the root landing-page presentation. Keep semantic structure in `index.html`, move visual styling into `assets/css/home.css`, and keep language/theme/navigation/reveal behavior in `assets/js/home.js`. Use no framework or build step, and make JavaScript progressive enhancement so the Chinese default page remains usable without scripts.

**Tech Stack:** HTML5, CSS custom properties, responsive CSS Grid/Flexbox, vanilla JavaScript, `localStorage`, `matchMedia`, `IntersectionObserver`, Python standard-library smoke tests.

## Global Constraints

- Preserve existing non-homepage pages and directories unchanged.
- Chinese and English are both first-class content languages.
- Default no-JavaScript content must be meaningful Chinese content.
- Do not introduce React, Vue, a build system, or a package manager.
- Do not change authentication/backend logic.
- Do not include a school emblem.
- Dark-first appearance with a complete light theme.
- Use blue/cyan/violet accents, restrained glass panels, subtle grid/glow effects, and no RGB cyberpunk styling.
- Respect `prefers-reduced-motion: reduce`.
- No required runtime API calls; third-party images are optional progressive enhancement only.

---

## File Structure

- Modify: `index.html` — semantic homepage structure and Chinese fallback content.
- Create: `assets/css/home.css` — themes, components, layout, responsive behavior, animation.
- Create: `assets/js/home.js` — i18n, theme, mobile navigation, reveal behavior.
- Create: `tests/test_homepage.py` — static structural tests using Python standard library.
- Preserve: `notes.html`, `login.html`, `register.html`, `auth.js`, `notes-worker.js`, `OI-wiki/`, and all other existing routes.

### Task 1: Build semantic homepage shell and preserve route safety

**Files:**
- Modify: `index.html`
- Create: `tests/test_homepage.py`

**Interfaces:**
- Consumes: approved homepage design spec and existing repository routes.
- Produces: stable section IDs and DOM hooks used by CSS/JS tasks.

- [ ] **Step 1: Write structural tests**

Create `tests/test_homepage.py`:

```python
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

class HomepageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = INDEX.read_text(encoding="utf-8-sig")

    def test_semantic_sections_exist(self):
        for tag in ["<header", "<nav", "<main", "<footer"]:
            self.assertIn(tag, self.html)
        for section_id in ["home", "about", "projects", "oi", "learning", "links"]:
            self.assertRegex(self.html, rf'id=["\']{section_id}["\']')

    def test_bilingual_identity_hooks_exist(self):
        for key in [
            "hero.name",
            "hero.tagline",
            "nav.about",
            "nav.projects",
            "nav.oi",
            "nav.learning",
            "nav.links",
        ]:
            self.assertIn(f'data-i18n="{key}"', self.html)

    def test_local_assets_are_referenced(self):
        self.assertIn("assets/css/home.css", self.html)
        self.assertIn("assets/js/home.js", self.html)

    def test_existing_public_routes_are_not_replaced(self):
        for path in ["notes.html", "login.html", "register.html", "auth.js", "notes-worker.js"]:
            self.assertTrue((ROOT / path).exists(), path)

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests against the current homepage**

```bash
python -m unittest tests/test_homepage.py -v
```

Expected: failures for missing new section IDs, i18n hooks, and split asset references; existing-route checks should pass.

- [ ] **Step 3: Replace root `index.html` with semantic homepage structure**

Create a clean HTML document with:

- `<html lang="zh-CN">`
- header/nav with anchors to `#home`, `#about`, `#projects`, `#oi`, `#learning`, `#links`
- language button with `id="language-toggle"`
- theme button with `id="theme-toggle"`
- mobile menu button with `id="menu-toggle"`
- main sections using the six required IDs
- footer
- stylesheet link to `assets/css/home.css`
- deferred script `assets/js/home.js`

Use Chinese as literal fallback text in the HTML. Include the visible name `唐一潇` and fallback tagline `探索算法、数学与智能。`.

- [ ] **Step 4: Add representative public links to the HTML**

Include static project links for:

- `https://github.com/tangyixiao/Code`
- `https://github.com/tangyixiao/HighSchoolMathematics`
- `https://github.com/tangyixiao/Agent-Learning-Hub`
- `https://github.com/tangyixiao/Shaoxing-No.1-High-School-LaTeX-Beamer-Template`

Include social/resource links for GitHub, Luogu, cnblogs, CSDN, Bilibili, `notes.html`, and the public OI Wiki route.

- [ ] **Step 5: Run structural tests**

```bash
python -m unittest tests/test_homepage.py -v
```

Expected: local asset reference tests will still fail until files exist in the next tasks; semantic and route checks pass.

- [ ] **Step 6: Commit**

```bash
git add index.html tests/test_homepage.py
git commit -m "feat: rebuild homepage semantic structure"
```

### Task 2: Implement theme, layout, and responsive visual system

**Files:**
- Create: `assets/css/home.css`
- Modify: `tests/test_homepage.py`

**Interfaces:**
- Consumes: classes and IDs from Task 1.
- Produces: CSS variables and component classes used directly by the existing HTML.

- [ ] **Step 1: Extend tests for CSS file and required behaviors**

Add:

```python
    def test_css_visual_contract(self):
        css = (ROOT / "assets/css/home.css").read_text(encoding="utf-8")
        for token in [
            ":root",
            "[data-theme=\"light\"]",
            "@media (prefers-reduced-motion: reduce)",
            "@media",
            ".project-card",
            ".focus-card",
        ]:
            self.assertIn(token, css)
```

- [ ] **Step 2: Run tests and verify CSS check fails**

```bash
python -m unittest tests/test_homepage.py -v
```

Expected: failure because `assets/css/home.css` does not exist.

- [ ] **Step 3: Create the visual token system**

In `assets/css/home.css`, define dark defaults under `:root` and light overrides under `[data-theme="light"]`. Use variables for:

- page background
- elevated/glass surface
- primary/secondary text
- border
- blue, cyan, violet accent colors
- focus ring
- shadow

Use a subtle background composition made from CSS gradients and grid lines only; do not require background image assets.

- [ ] **Step 4: Style layout and components**

Implement:

- sticky/translucent header
- responsive nav
- two-column desktop Hero and single-column mobile Hero
- identity chips
- primary/secondary buttons
- About panel
- three Focus Areas cards
- Featured Project card grid
- OI milestone panel
- Learning tags/cards
- Links grid
- restrained footer

Use `clamp()` for typography where appropriate and `minmax()` grids to avoid horizontal overflow.

- [ ] **Step 5: Add interaction states and accessibility styling**

Include visible `:focus-visible` states, hover elevation for project/focus cards, and clear button/link states. Add `.reveal` / `.is-visible` transitions while ensuring content is visible by default when JS is unavailable.

- [ ] **Step 6: Add reduced-motion and responsive rules**

At minimum:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Add mobile and tablet breakpoints and ensure navigation, grids, and hero content collapse cleanly.

- [ ] **Step 7: Run tests**

```bash
python -m unittest tests/test_homepage.py -v
```

Expected: CSS contract passes; JS file check still fails until Task 3.

- [ ] **Step 8: Commit**

```bash
git add assets/css/home.css tests/test_homepage.py
git commit -m "feat: add responsive homepage visual system"
```

### Task 3: Implement real Chinese/English switching and theme persistence

**Files:**
- Create: `assets/js/home.js`
- Modify: `index.html`
- Modify: `tests/test_homepage.py`

**Interfaces:**
- Consumes: `data-i18n` attributes and control IDs from Task 1.
- Produces: `initLanguage()`, `setLanguage(lang)`, `initTheme()`, `setTheme(theme)`, `initMenu()`, and `initReveal()`.

- [ ] **Step 1: Extend tests for JS contract**

Add:

```python
    def test_javascript_contract(self):
        js = (ROOT / "assets/js/home.js").read_text(encoding="utf-8")
        for token in [
            "const translations",
            "function setLanguage",
            "function initLanguage",
            "function setTheme",
            "function initTheme",
            "function initMenu",
            "function initReveal",
            "localStorage",
            "IntersectionObserver",
        ]:
            self.assertIn(token, js)
```

- [ ] **Step 2: Run tests and verify JS contract fails**

```bash
python -m unittest tests/test_homepage.py -v
```

Expected: failure because `assets/js/home.js` does not exist.

- [ ] **Step 3: Create translation dictionary**

Define:

```javascript
const translations = {
  zh: {
    "nav.home": "首页",
    "nav.about": "关于",
    "nav.projects": "项目",
    "nav.oi": "竞赛",
    "nav.learning": "学习",
    "nav.links": "链接",
    "hero.name": "唐一潇",
    "hero.tagline": "探索算法、数学与智能。"
  },
  en: {
    "nav.home": "Home",
    "nav.about": "About",
    "nav.projects": "Projects",
    "nav.oi": "OI",
    "nav.learning": "Learning",
    "nav.links": "Links",
    "hero.name": "Tang Yixiao",
    "hero.tagline": "Exploring Algorithms, Mathematics & Intelligence."
  }
};
```

Expand it to every `data-i18n` key used by the page, including About, focus cards, project descriptions, OI text, Learning labels, Links heading, buttons, and footer.

- [ ] **Step 4: Implement language state**

`setLanguage(lang)` must:

- normalize to `zh` or `en`
- update every `[data-i18n]` node via `textContent`
- update `document.documentElement.lang` to `zh-CN` or `en`
- update the language-toggle label/ARIA state
- try to persist `site-language` in `localStorage` without failing if storage is blocked

`initLanguage()` must prefer saved value; otherwise use Chinese if `navigator.language` starts with `zh`, else English.

- [ ] **Step 5: Implement theme state**

`setTheme(theme)` must set `document.documentElement.dataset.theme` to `dark` or `light`, update the control label/ARIA state, and try to persist `site-theme`.

`initTheme()` must prefer saved value; otherwise use `matchMedia('(prefers-color-scheme: dark)')`.

- [ ] **Step 6: Implement mobile menu and reveal behavior**

`initMenu()` must toggle a navigation-open class/attribute and close the menu when a nav anchor is selected.

`initReveal()` must use `IntersectionObserver` if available. If unavailable, it should mark all reveal elements visible immediately.

- [ ] **Step 7: Initialize all behaviors after DOM readiness**

Call the four initialization functions once and avoid unrelated global side effects.

- [ ] **Step 8: Run tests**

```bash
python -m unittest tests/test_homepage.py -v
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add assets/js/home.js index.html tests/test_homepage.py
git commit -m "feat: add bilingual and theme interactions"
```

### Task 4: Complete content, accessibility, and graceful degradation

**Files:**
- Modify: `index.html`
- Modify: `assets/css/home.css`
- Modify: `assets/js/home.js`
- Modify: `tests/test_homepage.py`

**Interfaces:**
- Consumes: stable layout and JS behaviors from Tasks 1-3.
- Produces: final content-complete homepage.

- [ ] **Step 1: Add content completeness tests**

Add assertions for the visible content and public links:

```python
    def test_representative_content_and_links(self):
        for token in [
            "唐一潇",
            "探索算法、数学与智能。",
            "Code",
            "HighSchoolMathematics",
            "Agent-Learning-Hub",
            "2026.01",
            "1000 AC",
            "2026.06",
            "2000 AC",
        ]:
            self.assertIn(token, self.html)

        for url in [
            "https://github.com/tangyixiao",
            "https://github.com/tangyixiao/Code",
            "https://www.luogu.com.cn/blog/TangyixiaoQAQ/",
            "https://home.cnblogs.com/u/TangyixiaoQAQ",
            "https://blog.csdn.net/DCMyyds",
            "https://space.bilibili.com/512272131",
        ]:
            self.assertIn(url, self.html)

    def test_private_email_not_exposed(self):
        self.assertNotIn("37662981@qq.com", self.html)
```

- [ ] **Step 2: Run tests and verify any missing content fails**

```bash
python -m unittest tests/test_homepage.py -v
```

Expected: any incomplete content/link assertions fail.

- [ ] **Step 3: Finish About and Focus Areas copy**

Ensure both translation objects carry equivalent Chinese/English text covering:

- student at Shaoxing No.1 High School
- algorithms/OI
- mathematics and physics
- AI/LLM/agents/open-source exploration
- code, notes, templates, and learning resources

Keep language factual and avoid exaggerated résumé claims.

- [ ] **Step 4: Finish Projects, OI, Learning, and Links**

Populate the four required project cards and the selected OI milestones. Add text links for Luogu, AtCoder, Codeforces, GitHub, notes, OI Wiki, cnblogs, CSDN, and Bilibili. If rating images are included, wrap them as optional visuals with useful text alternatives.

- [ ] **Step 5: Audit semantic and accessible controls**

Verify:

- icon-only buttons have `aria-label`
- mobile menu uses `aria-expanded`
- heading order is logical
- links have understandable text
- all interactive elements are keyboard reachable
- no information is conveyed by color alone

- [ ] **Step 6: Run tests**

```bash
python -m unittest tests/test_homepage.py -v
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html assets/css/home.css assets/js/home.js tests/test_homepage.py
git commit -m "feat: complete bilingual personal homepage content"
```

### Task 5: Final verification without disturbing existing pages

**Files:**
- Modify only if verification reveals a defect: `index.html`, `assets/css/home.css`, `assets/js/home.js`, `tests/test_homepage.py`.

**Interfaces:**
- Consumes: completed homepage.
- Produces: deployable GitHub Pages root homepage.

- [ ] **Step 1: Run full static regression suite**

```bash
python -m unittest tests/test_homepage.py -v
```

Expected: PASS.

- [ ] **Step 2: Verify local asset references and no accidental absolute filesystem paths**

```bash
python - <<'PY'
from pathlib import Path
from html.parser import HTMLParser

root = Path('.')
html = Path('index.html').read_text(encoding='utf-8-sig')
for rel in ['assets/css/home.css', 'assets/js/home.js', 'notes.html', 'login.html', 'register.html']:
    assert (root / rel).exists(), rel
assert '/mnt/data/' not in html
assert 'file://' not in html
print('asset and route sanity checks passed')
PY
```

Expected: `asset and route sanity checks passed`.

- [ ] **Step 3: Serve locally and manually inspect responsive behavior**

Run:

```bash
python -m http.server 8000
```

Inspect `/` at narrow mobile width, tablet width, and desktop width. Confirm no horizontal overflow, readable typography, and working anchors.

- [ ] **Step 4: Verify interaction behavior in browser**

Confirm:

- Chinese/English toggle changes all intended visible strings.
- `html[lang]` changes between `zh-CN` and `en`.
- language preference persists after reload.
- theme toggle works and persists.
- without saved theme, OS preference is respected.
- mobile navigation opens/closes and updates `aria-expanded`.
- reduced-motion mode removes nonessential animation.
- with JavaScript disabled, Chinese content and all major links remain visible.

- [ ] **Step 5: Verify existing routes remain untouched**

Open at least `notes.html`, `login.html`, and one existing OI Wiki route directly. Confirm they still load and were not renamed/deleted.

- [ ] **Step 6: Commit final fixes if any**

```bash
git add index.html assets/css/home.css assets/js/home.js tests/test_homepage.py
git commit -m "polish: finalize personal homepage"
```
