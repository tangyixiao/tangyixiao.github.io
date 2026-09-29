import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { focusIds, links, projectIds, siteContent, type FocusId, type Language, type ProjectId, type Theme } from './site/content'
import type { ScenePhase } from './visual/types'

const UniverseCanvas = lazy(() => import('./visual/UniverseCanvas'))
const SECTION_PHASES: Record<string, ScenePhase> = { home: 'hero', work: 'projects', focus: 'focus', about: 'about', links: 'links' }
const tools = ['C++', 'Python', 'LaTeX', 'Markdown', 'Git']

function preference(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}

function savePreference(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* Browsing remains usable when storage is unavailable. */ }
}

function initialTheme(): Theme {
  const stored = preference('site-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialLanguage(): Language {
  const stored = preference('site-language')
  if (stored === 'zh' || stored === 'en') return stored
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function Reveal({ children, className = '', delay = 0, eager = false }: { children: ReactNode; className?: string; delay?: number; eager?: boolean }) {
  const reduce = useReducedMotion() ?? false
  return <motion.div className={['reveal', className].filter(Boolean).join(' ')} initial={reduce ? false : { opacity: 0, y: 22 }} animate={eager || reduce ? { opacity: 1, y: 0 } : undefined} whileInView={eager || reduce ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .13 }} transition={reduce ? { duration: 0 } : { duration: .7, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
}

function useScenePhase() {
  const [phase, setPhase] = useState<ScenePhase>('hero')
  useEffect(() => {
    const ratios = new Map(Object.keys(SECTION_PHASES).map((id) => [id, 0]))
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
      let active = 'home'
      for (const [id, ratio] of ratios) if (ratio > (ratios.get(active) ?? 0)) active = id
      if ((ratios.get(active) ?? 0) > 0) setPhase(SECTION_PHASES[active])
    }, { rootMargin: '-30% 0px -30% 0px', threshold: [0, .2, .4, .6, .8, 1] })
    for (const id of Object.keys(SECTION_PHASES)) {
      const node = document.getElementById(id)
      if (node) observer.observe(node)
    }
    return () => observer.disconnect()
  }, [])
  return phase
}

function SceneLayer({ phase, theme, pulse, reducedMotion }: { phase: ScenePhase; theme: Theme; pulse: number; reducedMotion: boolean }) {
  return <Suspense fallback={<div className="scene-loading" aria-hidden="true" />}><UniverseCanvas phase={phase} theme={theme} pulse={pulse} reducedMotion={reducedMotion} /></Suspense>
}

function ExternalLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>
}

function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pulse, setPulse] = useState(0)
  const manualTheme = useRef(preference('site-theme') === 'light' || preference('site-theme') === 'dark')
  const sequence = useRef(0)
  const reduce = useReducedMotion() ?? false
  const phase = useScenePhase()
  const copy = siteContent[language]

  const pulseScene = useCallback(() => { sequence.current += 1; setPulse(sequence.current) }, [])
  const switchTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    manualTheme.current = true
    savePreference('site-theme', next)
    setTheme(next)
  }
  const switchLanguage = () => {
    const next = language === 'zh' ? 'en' : 'zh'
    savePreference('site-language', next)
    setLanguage(next)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#08131f' : '#f5f8fc')
  }, [theme])
  useEffect(() => {
    document.documentElement.dataset.language = language
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.title = copy.meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy.meta.description)
  }, [copy, language])
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const followSystem = () => { if (!manualTheme.current) setTheme(query.matches ? 'dark' : 'light') }
    query.addEventListener('change', followSystem)
    return () => query.removeEventListener('change', followSystem)
  }, [])

  const nav = [
    { id: 'home', label: copy.nav.home }, { id: 'work', label: copy.nav.work },
    { id: 'focus', label: copy.nav.focus }, { id: 'about', label: copy.nav.about },
    { id: 'links', label: copy.nav.links },
  ]

  return <>
    <a className="skip-link" href="#main">{language === 'zh' ? '跳到主要内容' : 'Skip to main content'}</a>
    <SceneLayer phase={phase} theme={theme} pulse={pulse} reducedMotion={reduce} />
    <div className="site-shell">
      <header className="site-header">
        <nav className="site-nav" aria-label={language === 'zh' ? '主导航' : 'Primary navigation'}>
          <a className="brand" href="#home" onClick={() => setMenuOpen(false)}><span className="brand-mark" aria-hidden="true">✳</span><span>{language === 'zh' ? '唐一潇' : 'Tang Yixiao'}</span></a>
          <div className="nav-links" data-open={menuOpen}>{nav.map(({ id, label }) => <a href={`#${id}`} key={id} onClick={() => setMenuOpen(false)}>{label}</a>)}</div>
          <div className="nav-actions">
            <button className="control language-control" type="button" onClick={switchLanguage} aria-label={copy.actions.language}>{language === 'zh' ? 'EN' : '中'}</button>
            <button className="control theme-control" type="button" onClick={switchTheme} aria-label={theme === 'dark' ? copy.actions.themeLight : copy.actions.themeDark}><span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span></button>
            <button className="control menu-control" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? copy.actions.menuClose : copy.actions.menuOpen}><span aria-hidden="true">{menuOpen ? '×' : '☰'}</span></button>
          </div>
        </nav>
      </header>
      <main id="main">
        <section className="hero section" id="home">
          <div className="hero-copy">
            <Reveal eager><p className="eyebrow"><span className="signal-dot" />{copy.hero.label}</p><p className="hero-alt">{copy.hero.alternateName}</p><h1>{copy.hero.name}</h1><p className="hero-headline">{copy.hero.headline}</p><p className="hero-description">{copy.hero.description}</p><div className="hero-actions"><a className="button-primary" href="#work" onPointerDown={pulseScene}>{copy.actions.projects}<span aria-hidden="true">↗</span></a><a className="button-text" href="#about">{copy.actions.about}<span aria-hidden="true">↘</span></a></div></Reveal>
          </div>
          <div className="hero-diagram" aria-hidden="true"><div className="diagram-orbit orbit-one" /><div className="diagram-orbit orbit-two" /><span className="diagram-label diagram-label-a">A / ALGORITHMS</span><span className="diagram-label diagram-label-m">M / MATHEMATICS</span><span className="diagram-label diagram-label-i">I / INTELLIGENCE</span></div>
          <div className="hero-bottom"><span>TY / 2026</span><span>{copy.hero.scroll} <b aria-hidden="true">↓</b></span></div>
        </section>

        <section className="work section" id="work">
          <div className="section-heading"><Reveal><p className="eyebrow">{copy.work.label}</p><h2>{copy.work.heading}</h2></Reveal><Reveal delay={.12}><p className="section-intro">{copy.work.intro}</p></Reveal></div>
          <div className="project-list">{projectIds.map((id, index) => <ProjectCard key={id} id={id} index={index} copy={copy.work.projects[id]} onPulse={pulseScene} visitLabel={copy.actions.visit} />)}</div>
        </section>

        <section className="focus section" id="focus"><div className="section-heading"><Reveal><p className="eyebrow">{copy.focus.label}</p><h2>{copy.focus.heading}</h2></Reveal><Reveal delay={.1}><p className="section-intro">{copy.focus.intro}</p></Reveal></div><div className="focus-grid">{focusIds.map((id) => <FocusCard key={id} id={id} copy={copy.focus.items[id]} onPulse={pulseScene} />)}</div></section>

        <section className="about section" id="about"><div className="about-heading"><Reveal><p className="eyebrow">{copy.about.label}</p><h2>{copy.about.heading}</h2></Reveal><span className="about-cross" aria-hidden="true">✳</span></div><div className="about-content"><Reveal><p>{copy.about.paragraph1}</p><p>{copy.about.paragraph2}</p></Reveal><Reveal delay={.12}><div className="about-facts"><div><span className="fact-label">{copy.about.toolsLabel}</span><p className="tool-list">{tools.map((tool) => <span key={tool}>{tool}</span>)}</p></div><div><span className="fact-label">{copy.about.interestsLabel}</span><p>{copy.about.interests}</p></div></div></Reveal></div></section>
      </main>

      <footer className="footer section" id="links"><div className="footer-main"><Reveal><p className="eyebrow">{copy.links.label}</p><h2>{copy.links.heading}</h2><p className="section-intro">{copy.links.description}</p></Reveal><div className="social-links"><a href={links.code}>{copy.links.code}<span aria-hidden="true">↗</span></a><ExternalLink href={links.github}>GitHub <span aria-hidden="true">↗</span></ExternalLink><ExternalLink href={links.luogu}>Luogu <span aria-hidden="true">↗</span></ExternalLink><ExternalLink href={links.cnblogs}>Cnblogs <span aria-hidden="true">↗</span></ExternalLink><ExternalLink href={links.csdn}>CSDN <span aria-hidden="true">↗</span></ExternalLink><ExternalLink href={links.bilibili}>Bilibili <span aria-hidden="true">↗</span></ExternalLink></div></div><div className="footer-bottom"><span>© 2026 {copy.hero.name}</span><a href="#home">{copy.actions.top} ↑</a></div></footer>
    </div>
  </>
}

function ProjectCard({ id, index, copy, onPulse, visitLabel }: { id: ProjectId; index: number; copy: { category: string; title: string; description: string }; onPulse: () => void; visitLabel: string }) {
  const href = links[id]
  return <Reveal delay={index * .1}><a className={`project-card project-${id}`} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} onPointerEnter={onPulse} onFocus={onPulse}><div className="project-art" aria-hidden="true"><span /><i /><b /></div><div className="project-body"><p className="project-category">{copy.category}</p><h3>{copy.title}</h3><p className="project-description">{copy.description}</p><span className="project-open">{visitLabel} <span aria-hidden="true">↗</span></span></div></a></Reveal>
}

function FocusCard({ id, copy, onPulse }: { id: FocusId; copy: { name: string; summary: string }; onPulse: () => void }) {
  const href = id === 'algorithms' ? links.code : id === 'mathematics' ? links.math : links.agents
  return <Reveal><a className={`focus-card focus-${id}`} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} onPointerEnter={onPulse} onFocus={onPulse}><span className="focus-glyph" aria-hidden="true">{id === 'algorithms' ? '⌘' : id === 'mathematics' ? '∿' : '✳'}</span><h3>{copy.name}</h3><p>{copy.summary}</p><span className="focus-arrow" aria-hidden="true">↗</span></a></Reveal>
}

export default App
