# Personal Homepage Design

## Goal

Redesign the root homepage of `tangyixiao.github.io` into a polished bilingual personal website while preserving the repository's existing subpages and utilities.

The new homepage should visually and structurally complement the GitHub Profile README while taking advantage of full HTML, CSS, and JavaScript capabilities.

Core identity:

- 唐一潇 / Tang Yixiao
- 高中生 / High School Student
- OI / 信息学竞赛 / Competitive Programming
- 数学与物理 / Mathematics & Physics
- AI / LLM / Agent / Open Source

## Scope

### In scope

- Redesign `index.html`
- Add dedicated homepage stylesheet at `assets/css/home.css`
- Add dedicated homepage script at `assets/js/home.js`
- Create a real Chinese/English language toggle
- Keep theme toggle with remembered preference
- Add responsive layout and lightweight animation
- Surface representative repositories, competitive-programming links, study directions, and existing site pages
- Preserve all existing non-homepage pages and directories

### Out of scope

- Rewriting `notes.html`, `login.html`, `register.html`, OI Wiki pages, or other existing subpages
- Changing authentication or backend logic
- Introducing React, Vue, a build system, or a package manager
- Adding a school emblem
- Creating a blog CMS

## Existing Site Compatibility

The repository already contains a substantial `index.html` and multiple independent pages and directories. The new homepage will replace the root landing-page presentation only.

Existing routes should remain reachable. The implementation must not delete or rename existing pages simply to simplify the new navigation.

## Information Architecture

Primary navigation:

- 首页 / Home
- 关于 / About
- 项目 / Projects
- 竞赛 / OI
- 学习 / Learning
- 链接 / Links

Secondary actions:

- 中文 / EN toggle
- light / dark theme toggle

On small screens, navigation may collapse into a compact mobile menu if necessary.

## Visual Direction

### Overall style

A modern student/OI identity with restrained technology aesthetics.

Primary visual language:

- dark-first appearance with a complete light theme
- blue / cyan / violet accent gradient
- subtle radial glow and grid/technical texture in the background
- glass-like panels with lower visual weight than the current homepage
- rounded project cards
- strong typography and generous whitespace
- no RGB cyberpunk styling
- no school emblem
- no dense decorative clutter

### Motion

Use only lightweight, purposeful motion:

- hero content fade/slide on first load
- card hover elevation
- section reveal on scroll using `IntersectionObserver`
- smooth in-page navigation where appropriate

Respect `prefers-reduced-motion: reduce` by disabling or minimizing nonessential animation.

## Homepage Sections

### 1. Hero

Primary bilingual identity:

- `唐一潇`
- `Tang Yixiao`

Tagline in Chinese mode:

- `探索算法、数学与智能。`

Tagline in English mode:

- `Exploring Algorithms, Mathematics & Intelligence.`

Supporting identity chips or short line:

- OI / Competitive Programming
- Mathematics & Physics
- AI / LLM / Agents

Primary actions:

- `查看项目 / View Projects`
- `GitHub`

Secondary visual element may be a small code/math-inspired decorative panel, but it must not overpower the name and identity.

### 2. About / 关于

Short personal introduction with equivalent Chinese and English versions.

Content themes:

- student at Shaoxing No.1 High School
- competitive programming and algorithm study
- mathematics and physics learning
- AI, LLM, agent, and open-source exploration
- maintaining code, notes, templates, and learning resources

Avoid exaggerated résumé language.

### 3. Focus Areas / 学习方向

Three primary cards:

1. OI / Competitive Programming
   - algorithms, data structures, problem solving, contest code
2. Mathematics & Science
   - high-school mathematics, physics, LaTeX notes
3. AI & Open Source
   - LLMs, agents, experimentation, open-source learning

These cards are descriptive rather than skill-level claims.

### 4. Featured Projects / 精选项目

Primary project cards:

- `Code`
  - 算法竞赛代码与学习记录
  - Competitive programming solutions and notes
- `HighSchoolMathematics`
  - 高中数学资料与学习整理
  - High-school mathematics notes and resources
- `Agent-Learning-Hub`
  - AI Agent 与大模型学习资料
  - Learning materials for AI agents and LLMs
- `Shaoxing-No.1-High-School-LaTeX-Beamer-Template`
  - 绍兴一中 LaTeX Beamer 演示文稿模板
  - LaTeX Beamer presentation template

Optionally include one additional card for the website repository itself if the layout benefits from it.

Each card should include:

- project name
- bilingual one-line description
- category/tag
- GitHub link

Avoid live GitHub API dependence on initial page load; static links are sufficient and more reliable.

### 5. Competitive Programming / 信息学竞赛

Include:

- Luogu
- AtCoder
- Codeforces
- `Code` repository

Progress indicators may include selected milestones:

- `2026.01 — 1000 AC`
- `2026.06 — 2000 AC`

If external rating images are embedded, they must be optional enhancements; the section must remain useful if those images fail to load.

### 6. Learning / 学习

Show current long-term interests in a concise layout:

- Algorithms & Data Structures
- Mathematics
- Physics
- LaTeX / Technical Writing
- AI / LLM / Agents

This section can link to `HighSchoolMathematics`, notes, OI Wiki, and relevant internal pages where stable URLs exist.

### 7. Site & Social Links / 链接

External links:

- GitHub
- Luogu
- cnblogs / 博客园
- CSDN
- Bilibili

Internal site links should surface useful existing content without exposing admin-like implementation details. Suitable links can include:

- Notes
- OI Wiki
- other clearly public resource pages

The homepage should not expose private account data or email addresses.

### 8. Footer

Chinese:

> 心有所向，日复一日，必有精进。

English:

> Stay curious. Keep building.

Include a small copyright/name line and a return-to-top action only if it remains unobtrusive.

## Internationalization

The language toggle must switch actual interface and content text between Chinese and English.

Implementation approach:

- keep translation strings in a JavaScript object keyed by semantic identifiers
- mark translatable DOM elements with stable `data-i18n` keys
- ship meaningful Chinese text directly in `index.html` as the no-JavaScript/default fallback
- switch text content in place without page reload
- store selected language in `localStorage`
- default to saved preference; otherwise prefer browser language when it starts with `zh`; otherwise switch to English after initialization
- update the document `lang` attribute after switching

Chinese and English copy should be equivalent in meaning, not mechanically word-for-word where natural phrasing differs.

## Theme System

Use CSS custom properties for both dark and light themes.

Theme behavior:

- read explicit saved preference from `localStorage`
- if no explicit preference exists, respect `prefers-color-scheme`
- allow manual toggle
- update icons/ARIA labels to reflect the current state

The design must maintain readable contrast in both modes.

## File Architecture

```text
tangyixiao.github.io/
├── index.html
├── assets/
│   ├── css/
│   │   └── home.css
│   └── js/
│       └── home.js
├── notes.html
├── login.html
├── register.html
├── ... existing pages and directories unchanged
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-08-13-personal-homepage-design.md
```

`index.html` contains semantic page structure and meaningful fallback text only.

`home.css` contains visual tokens, responsive layout, components, themes, and motion rules.

`home.js` contains language selection, theme selection, navigation interaction, and lightweight reveal behavior.

## Component Boundaries

Even without a framework, the implementation should preserve clear conceptual components:

- header/navigation
- hero
- section heading pattern
- focus card
- project card
- competitive-programming panel
- links panel
- footer

CSS class naming should reflect these components and avoid unrelated global selectors.

JavaScript should be organized into small initialization functions such as:

- language initialization
- theme initialization
- mobile navigation initialization
- reveal animation initialization

No function should depend on unrelated page behavior.

## Accessibility

- semantic `header`, `nav`, `main`, `section`, and `footer` structure
- meaningful heading hierarchy
- keyboard-accessible controls and links
- visible focus states
- `aria-label` on icon-only controls
- sufficient color contrast
- no critical information conveyed by color alone
- respect reduced-motion preferences
- links should remain understandable without icons

## Responsive Design

Target three broad layout ranges:

- mobile: single-column, compact navigation, full-width cards
- tablet: one or two columns depending on section
- desktop: two-column hero and multi-column project/focus grids

Avoid fixed dimensions that create horizontal scrolling.

## Performance and Reliability

- no framework or build step
- no required runtime API calls
- use system font stack or at most one optional external font source
- minimize third-party scripts
- Font Awesome may be retained only if needed; inline SVG or text labels are preferred for a smaller dependency surface
- external stats/rating images are progressive enhancement only

## Error Handling and Graceful Degradation

- if JavaScript is disabled, the page displays the complete Chinese fallback content and all major links
- if `localStorage` access fails, toggles should still work for the current session where possible
- if `IntersectionObserver` is unavailable, content should simply remain visible
- if third-party images fail, textual project/OI information remains intact
- navigation anchors must work without animation

## Testing and Verification

Before completion, verify:

- homepage loads with no missing local asset references
- language toggle changes all intended strings and `html[lang]`
- language selection persists after reload
- theme toggle works and persists
- system theme fallback works when no preference is saved
- all navigation anchors point to existing sections
- all external links use correct destinations
- existing non-homepage routes remain untouched
- mobile layout works at narrow viewport widths
- no horizontal overflow
- keyboard navigation reaches interactive controls in a sensible order
- reduced-motion mode disables nonessential animation
- page remains useful with JavaScript disabled and displays the Chinese fallback content

## Relationship to GitHub Profile README

The website and Profile README should share:

- the same identity statement
- the same core project selection
- the same major link set
- blue/cyan/violet visual tone
- bilingual presentation

The website is the richer destination; the GitHub README is the compact gateway.

## Success Criteria

The finished homepage should feel like a coherent personal identity rather than a generic portfolio template.

A visitor should immediately understand Tang Yixiao's interests in OI, mathematics/physics, and AI, be able to switch cleanly between Chinese and English, find representative projects and links quickly, and continue using all existing site subpages without disruption.
