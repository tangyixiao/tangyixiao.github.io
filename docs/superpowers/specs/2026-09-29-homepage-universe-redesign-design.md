# Personal Homepage Universe Redesign

## Goal

Make the root homepage a polished introduction to Tang Yixiao and his real work. The homepage must serve peers, reviewers, and casual visitors without changing the existing public subpages.

## Content and structure

- Sections: Home, Selected Work, Focus, About, and Links. Navigation uses the matching anchors.
- The hero leads with `唐一潇` / `Tang Yixiao` and `从算法与数学出发，探索智能系统。` / `Exploring intelligent systems through algorithms and mathematics.`
- Selected Work retains CodeHub (`/Code/`), HighSchoolMathematics, and Agent-Learning-Hub with truthful, concise bilingual descriptions and their current destinations.
- Focus presents algorithms, mathematics and physics, and AI/agents as interests, not claims of expertise.
- About presents publicly documented interests, working methods, and tools (C++, Python, LaTeX, Markdown, Git). Do not publish school identity, AC counts, unverified life events, or fabricated milestones. Personal stories can be added later when supplied by the owner; no placeholder appears now.
- Links retain the existing GitHub, Luogu, cnblogs, CSDN, Bilibili, and CodeHub destinations.

## Visual system

- One restrained signature: a spatial particle field whose groups and orbital traces shift across page sections. It is a diagram of the site's three interests, not a decorative stock galaxy.
- Dark colors: background `#08131f`, surface `#101d2b`, primary text `#f5f8fa`, secondary text `#a8bdc9`, teal `#6dd8d4`, champagne `#d5c29b`.
- Light colors: background `#f5f8fc`, surface `#ffffff`, primary text `#152637`, secondary text `#506577`, teal `#006f77`, champagne `#796238`. Champagne is only a fine accent; no warm base colors.
- Pair a restrained serif display stack for the name with a clean CJK sans stack for reading and a compact mono stack for diagram labels. Large negative space, clear hierarchy, and low-noise surfaces carry the premium feel.
- Desktop hero is a deliberate text/scene composition; mobile stacks the text and scene and keeps navigation legible. Project visuals are original CSS/SVG abstractions related to their real subject matter, never mockup imagery containing invented claims.

## Motion, preferences, and resilience

- One lazy Three.js canvas persists through the homepage; section observation drives five scene phases. Ambient motion, restrained pointer inertia, and project interaction create depth while keeping text readable.
- Mobile uses a lower rendering tier. Hidden pages pause rendering; reduced-motion mode renders a stable frame; missing/lost WebGL displays a theme-aware CSS fallback.
- Theme follows system preference initially; language follows browser language (`zh*` selects Chinese, otherwise English). Explicit choices persist in existing `site-theme` and `site-language` keys. Controls are keyboard accessible and all user-facing labels and metadata follow the selected language.
- Existing GitHub Pages workflow, lazy chunk verification, and legacy route copying remain in place.
