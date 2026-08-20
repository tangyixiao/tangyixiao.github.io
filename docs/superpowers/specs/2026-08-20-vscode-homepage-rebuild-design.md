# VS Code Personal Homepage Rebuild Design

## Goal

Rebuild `https://tangyixiao.github.io/` as a React portfolio homepage using the same VS Code-inspired identity as CodeHub while accurately presenting Tang Yixiao's competitive-programming, mathematics, and learning work.

## Visual system

- Canvas: `#1E1E1E`; inset panels: `#252526` and `#2D2D30`; rules: `#3E3E42`.
- Accent: `#007ACC`; action/hover blue: `#3794FF`; cool display gradient ends at `#D7E2EA`.
- Kanit is the technical utility face, Italiana provides the large display typography, Manrope supports bilingual long-form text, and Marck Script appears only in one concise personal signature.
- No provided third-party portrait, GIF, project-image, or video assets are published. The visual depth comes from CSS layers, typography, generated line motifs, and owned public links.

## Page structure

1. Full-height hero: oversized bilingual identity, compact navigation, concise statement, and a pointer-responsive but optional blue "code field" rather than a portrait.
2. Motion strip: an accessible, nonessential scrolling ribbon derived from real public themes—algorithms, mathematics, intelligent systems, and learning—rather than copied media.
3. About: personal practice and learning statement with progressive text reveal; reduced motion shows the complete text immediately.
4. Focus areas: a light VS Code terminal-paper panel for competitive programming, mathematics, AI/agents, and writing, each with an owned external destination.
5. Selected work: three layered, sticky cards pointing to CodeHub, HighSchoolMathematics, and Agent-Learning-Hub; the cards use typography and CSS surfaces only.
6. Footer/contact: GitHub, Luogu, blog, and CodeHub routes remain available; the three current Code entry points still target `/Code/`.

## React architecture

- Vite builds a static `dist/` directory for legacy GitHub Pages publishing.
- `src/data/site.ts` owns public links, milestones, focus areas, and project cards.
- `src/components/` contains nav, hero, marquee, about, focus areas, project stack, button, motion helpers, and footer.
- `src/App.tsx` composes sections; each section is independently navigable with matching heading IDs.

## Accessibility and resilience

- Motion uses `motion/react` and respects `prefers-reduced-motion`.
- Keyboard focus stays visible on navigation, cards, and external links.
- Text and actions maintain readable contrast on dark panels and blue states.
- No interaction depends on a pointer, a remote image, or a JavaScript-only navigation path.

## Acceptance criteria

- Homepage renders at desktop and phone widths with no horizontal scroll.
- The public routes that existed before the rebuild remain present and three CodeHub routes use `/Code/`.
- Each project card and navigation action has an accessible name and valid target.
- Production build is static, deploys from GitHub Pages, and visual browser smoke tests pass.
