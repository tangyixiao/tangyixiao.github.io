import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { focusIds, labIds, links, projectIds, siteContent, type FocusId, type LabId, type Language, type ProjectContent, type ProjectId, type Theme } from './site/content'
import type { BodyId, ScaleMode, TimeScale, UniverseCanvasProps } from './visual/types'
import { solarCopy } from './visual/solarData'
import SolarExplorer from './visual/SolarExplorer'
import { useSpatialCards } from './visual/useSpatialCards'

const UniverseCanvas = lazy(() => import('./visual/UniverseCanvas'))

// 首屏性能：场景（three 模块 + 22 张贴图）是纯背景，不该和 hero 文案抢水合后的主线程与带宽。
// Lighthouse 基线里 three chunk 的求值 + 22 张贴图把模拟 LCP 顶到 23s：只要场景的网络与脚本
// 落在 hero 文案成帧之前，就会被算进那一帧的依赖图。h1 在 Reveal 入场动画里越过可见阈值
// 的那一帧才是真正的 LCP（实测 ~1.3s），所以这里把 SceneLayer 的挂载推迟到首帧绘制之后的
// 1.5s：hero 先画完、LCP 先落定，背景再进场。requestIdleCallback 不行——它在首帧绘制前
// 就会触发（实验里跑出过 LCP 23.3s 的回退），双重 requestAnimationFrame 才保证中间夹着一次
// 真实的绘制。
const SCENE_MOUNT_DELAY = 1500
function useIdleScene() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (mounted) return undefined
    let cancelled = false
    let frame = 0, timer = 0
    const release = () => { if (!cancelled) setMounted(true) }
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => { timer = window.setTimeout(release, SCENE_MOUNT_DELAY) })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [mounted])
  return mounted
}
const SECTION_PHASES = { home: 'hero', work: 'projects', focus: 'focus', lab: 'focus', about: 'about', links: 'links' } as const
type RouteId = keyof typeof SECTION_PHASES
const ROUTE_IDS = Object.keys(SECTION_PHASES) as RouteId[]
const tools = ['C++', 'Python', 'LaTeX', 'Markdown', 'Git']

type Route = { view: RouteId; project?: ProjectId }

// v1.4 起路由读 location.pathname（history 路由），GitHub Pages 上未知路径回退到 404.html
// （构建脚本复制 index.html 而来），应用引导后按 pathname 渲染，各版面才有可被独立收录的 URL。
function parsePath(pathname: string): Route | null {
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  if (segments.length === 0) return { view: 'home' }
  const [base, sub] = segments
  if (!(ROUTE_IDS as string[]).includes(base)) return null
  if (base === 'work' && sub) return (projectIds as string[]).includes(sub) ? { view: 'work', project: sub as ProjectId } : null
  return { view: base as RouteId }
}

function parseRoute(): Route | null {
  return parsePath(window.location.pathname)
}

function routeToPath(route: Route): string {
  if (route.view === 'home') return '/'
  if (route.view === 'work' && route.project) return `/work/${route.project}`
  return `/${route.view}`
}

// 兼容旧 hash 链接（外部可能仍有 #/work 这类引用）：引导时发现合法旧路由就用
// replaceState 原地迁移到对应 pathname，不产生跳转与闪烁；非法 hash 保持不动。
function migrateLegacyHash(): void {
  const hash = window.location.hash
  if (!hash || hash === '#') return
  const segments = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  let route: Route | null = null
  if (segments.length === 0) {
    route = { view: 'home' }
  } else {
    const [base, sub] = segments
    if ((ROUTE_IDS as string[]).includes(base)) {
      route = base === 'work' && sub
        ? ((projectIds as string[]).includes(sub) ? { view: 'work', project: sub as ProjectId } : null)
        : { view: base as RouteId }
    }
  }
  if (route) window.history.replaceState(window.history.state, '', routeToPath(route))
}

function usePathRoute(): Route {
  const [route, setRoute] = useState<Route>(() => { migrateLegacyHash(); return parseRoute() ?? { view: 'home' } })
  useEffect(() => {
    const onPopState = () => { const next = parseRoute(); if (next) setRoute(next) }
    // 站内锚点统一拦截成 pushState；非路由路径（/blog/、独立实验页等）放行给浏览器整页加载。
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest('a')
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return
      const href = anchor.getAttribute('href')
      if (!href || !href.startsWith('/')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const next = parsePath(url.pathname)
      if (!next) return
      event.preventDefault()
      if (url.pathname !== window.location.pathname) window.history.pushState({}, '', url.pathname)
      setRoute(next)
    }
    window.addEventListener('popstate', onPopState)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('click', onClick)
    }
  }, [])
  useEffect(() => { window.scrollTo({ left: 0, top: 0, behavior: 'instant' }) }, [route])
  return route
}

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

function SceneLayer(props: UniverseCanvasProps) {
  return <Suspense fallback={<div className="scene-loading" aria-hidden="true" />}><UniverseCanvas {...props} /></Suspense>
}

function ExternalLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>
}

function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pulse, setPulse] = useState(0)
  const [exploring, setExploring] = useState(false)
  const [selectedBody, setSelectedBody] = useState<BodyId | null>(null)
  const [paused, setPaused] = useState(false)
  const [scaleMode, setScaleMode] = useState<ScaleMode>('artistic')
  const [timeScale, setTimeScale] = useState<TimeScale>(1)
  const [galacticRing, setGalacticRing] = useState(false)
  const [galacticView, setGalacticView] = useState(false)
  const [sceneReset, setSceneReset] = useState(0)
  const [sceneZoom, setSceneZoom] = useState(0)
  const [surface, setSurface] = useState<HTMLDivElement | null>(null)
  const [available, setAvailable] = useState<boolean | null>(null)
  const manualTheme = useRef(preference('site-theme') === 'light' || preference('site-theme') === 'dark')
  const sequence = useRef(0)
  const reduce = useReducedMotion() ?? false
  const route = usePathRoute()
  const sceneMounted = useIdleScene()
  const phase = SECTION_PHASES[route.view]
  const copy = siteContent[language]
  const solar = solarCopy[language]
  useSpatialCards(reduce || exploring)
  const closeExplorer = useCallback(() => { setExploring(false); setSelectedBody(null); setPaused(false); setScaleMode('artistic'); setTimeScale(1); setGalacticView(false) }, [])
  const openExplorer = () => { setSelectedBody(null); setPaused(false); setSceneZoom(0); setMenuOpen(false); setExploring(true) }
  useEffect(() => { if (available === false) closeExplorer() }, [available, closeExplorer])

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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#050507' : '#f5f8fc')
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
    { id: 'lab', label: copy.nav.lab },
    { id: 'blog', label: language === 'zh' ? '博客' : 'Blog' },
    { id: 'focus', label: copy.nav.focus }, { id: 'about', label: copy.nav.about },
    { id: 'links', label: copy.nav.links },
  ]

  return <>
    <a className="skip-link" href="#main">{language === 'zh' ? '跳到主要内容' : 'Skip to main content'}</a>
    {sceneMounted && <SceneLayer phase={phase} theme={theme} pulse={pulse} reducedMotion={reduce} mode={exploring ? 'explore' : 'browse'} scaleMode={scaleMode} selected={selectedBody} paused={paused} reset={sceneReset} zoom={sceneZoom} timeScale={timeScale} galacticRing={galacticRing} galacticView={galacticView} interactionElement={surface} onSelect={setSelectedBody} onAvailability={setAvailable} />}
    <div className="site-shell">
      <header className="site-header">
        <nav className="site-nav" aria-label={language === 'zh' ? '主导航' : 'Primary navigation'}>
          <a className="brand" href="/" onClick={() => setMenuOpen(false)}><span className="brand-mark" aria-hidden="true">✳</span><span>{language === 'zh' ? '唐一潇' : 'Tang Yixiao'}</span></a>
          <div className="nav-links" data-open={menuOpen}>{nav.map(({ id, label }) => id === 'blog'
            ? <a href="/blog/" key={id} onClick={() => setMenuOpen(false)}>{label}</a>
            : <a href={id === 'home' ? '/' : `/${id}`} key={id} data-active={route.view === id} aria-current={route.view === id ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)}</div>
          <div className="nav-actions">
            <button className="control language-control" type="button" onClick={switchLanguage} aria-label={copy.actions.language}>{language === 'zh' ? 'EN' : '中'}</button>
            <button className="control theme-control" type="button" onClick={switchTheme} aria-label={theme === 'dark' ? copy.actions.themeLight : copy.actions.themeDark}><span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span></button>
            <button className="control menu-control" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? copy.actions.menuClose : copy.actions.menuOpen}><span aria-hidden="true">{menuOpen ? '×' : '☰'}</span></button>
          </div>
        </nav>
      </header>
      <main id="main">
        {route.view === 'home' && <section className="hero section" id="home">
          <div className="hero-copy">
            <Reveal eager><p className="eyebrow"><span className="signal-dot" />{copy.hero.label}</p><p className="hero-alt">{copy.hero.alternateName}</p><h1>{copy.hero.name}</h1><p className="hero-headline">{copy.hero.headline}</p><p className="hero-description">{copy.hero.description}</p><div className="hero-actions"><a className="button-primary" href="/work" onPointerDown={pulseScene}>{copy.actions.projects}<span aria-hidden="true">↗</span></a><a className="button-text" href="/about">{copy.actions.about}<span aria-hidden="true">↘</span></a></div></Reveal>
          </div>
          <div className="solar-invitation"><span className="solar-coordinate">SOL / 8 PLANETS / ∞ CURIOSITY</span><button className="explore-entry" type="button" onClick={openExplorer} disabled={available === false}><span className="explore-icon" aria-hidden="true">✺</span>{solar.explore}<span aria-hidden="true">↗</span></button><a className="explore-entry explore-blackhole" href="/blackhole.html"><span className="explore-icon" aria-hidden="true">◉</span>{solar.blackholeCta}<span aria-hidden="true">↗</span></a><a className="explore-entry explore-threebody" href="/threebody.html"><span className="explore-icon" aria-hidden="true">✦</span>{solar.threebodyCta}<span aria-hidden="true">↗</span></a><p>{available === false ? solar.unavailable : available === null ? solar.loading : solar.disclaimer}</p></div>
          <div className="hero-bottom"><span>TY / 2026</span><a href="/work">{copy.hero.scroll} <b aria-hidden="true">↓</b></a></div>
        </section>}

        {route.view === 'work' && !route.project && <section className="work section view" id="work">
          <div className="section-heading"><Reveal><p className="eyebrow">{copy.work.label}</p><h2>{copy.work.heading}</h2></Reveal><Reveal delay={.12}><p className="section-intro">{copy.work.intro}</p></Reveal></div>
          <div className="project-list">{projectIds.map((id, index) => <ProjectCard key={id} id={id} index={index} copy={copy.work.projects[id]} onPulse={pulseScene} visitLabel={copy.actions.visit} />)}</div>
        </section>}

        {route.view === 'work' && route.project && <ProjectDetail id={route.project} copy={copy.work.projects[route.project]} detail={copy.work.detail} visitLabel={copy.actions.visit} />}

        {route.view === 'focus' && <section className="focus section view" id="focus"><div className="section-heading"><Reveal><p className="eyebrow">{copy.focus.label}</p><h2>{copy.focus.heading}</h2></Reveal><Reveal delay={.1}><p className="section-intro">{copy.focus.intro}</p></Reveal></div><div className="focus-grid">{focusIds.map((id) => <FocusCard key={id} id={id} copy={copy.focus.items[id]} onPulse={pulseScene} />)}</div></section>}

        {route.view === 'lab' && <section className="lab section view" id="lab"><div className="section-heading"><Reveal><p className="eyebrow">{copy.lab.label}</p><h2>{copy.lab.heading}</h2></Reveal><Reveal delay={.1}><p className="section-intro">{copy.lab.intro}</p></Reveal></div><div className="focus-grid lab-grid">{labIds.map((id, index) => <LabCard key={id} id={id} index={index} copy={copy.lab.items[id]} />)}</div></section>}

        {route.view === 'about' && <section className="about section view" id="about"><div className="about-heading"><Reveal><p className="eyebrow">{copy.about.label}</p><h2>{copy.about.heading}</h2></Reveal><span className="about-cross" aria-hidden="true">✳</span></div><div className="about-content"><Reveal><p>{copy.about.paragraph1}</p><p>{copy.about.paragraph2}</p></Reveal><Reveal delay={.12}><div className="about-facts"><div><span className="fact-label">{copy.about.toolsLabel}</span><p className="tool-list">{tools.map((tool) => <span key={tool}>{tool}</span>)}</p></div><div><span className="fact-label">{copy.about.interestsLabel}</span><p>{copy.about.interests}</p></div></div></Reveal></div></section>}
      </main>

      {route.view === 'links' ? <footer className="footer section view" id="links"><div className="footer-main"><Reveal><p className="eyebrow">{copy.links.label}</p><h2>{copy.links.heading}</h2><p className="section-intro">{copy.links.description}</p></Reveal><div className="social-links"><a href={links.code}>{copy.links.code}<span aria-hidden="true">↗</span></a><ExternalLink href={links.github}>GitHub <span aria-hidden="true">↗</span></ExternalLink><ExternalLink href={links.luogu}>Luogu <span aria-hidden="true">↗</span></ExternalLink><ExternalLink href={links.cnblogs}>Cnblogs <span aria-hidden="true">↗</span></ExternalLink><ExternalLink href={links.csdn}>CSDN <span aria-hidden="true">↗</span></ExternalLink><ExternalLink href={links.bilibili}>Bilibili <span aria-hidden="true">↗</span></ExternalLink></div></div><div className="footer-bottom"><span>© 2026 {copy.hero.name}</span><a href="/">{copy.actions.top} ↑</a></div></footer>
      : <footer className="footer footer-slim"><div className="footer-bottom"><span>© 2026 {copy.hero.name}</span><a href="/links">{copy.nav.links} <span aria-hidden="true">↗</span></a></div></footer>}
    </div>
    {exploring && <SolarExplorer language={language} selected={selectedBody} paused={paused} scaleMode={scaleMode} timeScale={timeScale} galacticRing={galacticRing} galacticView={galacticView} onSelect={setSelectedBody} onPause={() => setPaused(value => !value)} onReset={() => { setSelectedBody(null); setSceneReset(value => value + 1) }} onZoom={direction => setSceneZoom(value => value + direction)} onScaleMode={() => setScaleMode(value => value === 'artistic' ? 'true' : 'artistic')} onTimeScale={setTimeScale} onGalacticRing={setGalacticRing} onGalacticView={setGalacticView} onClose={closeExplorer} onSurface={setSurface} />}
  </>
}

function ProjectCard({ id, index, copy, onPulse, visitLabel }: { id: ProjectId; index: number; copy: ProjectContent; onPulse: () => void; visitLabel: string }) {
  return <Reveal delay={index * .1}><a className={`project-card project-${id}`} href={`/work/${id}`} onPointerEnter={onPulse} onFocus={onPulse}><div className="project-art" aria-hidden="true"><span /><i /><b /></div><div className="project-body"><p className="project-category">{copy.category}</p><h3>{copy.title}</h3><p className="project-description">{copy.description}</p><span className="project-open">{visitLabel} <span aria-hidden="true">↗</span></span></div></a></Reveal>
}

function ProjectDetail({ id, copy, detail, visitLabel }: { id: ProjectId; copy: ProjectContent; detail: { overview: string; highlights: string; stack: string; back: string }; visitLabel: string }) {
  const href = links[id]
  const external = href.startsWith('http')
  return <section className="work section view" id="work">
    <div className="section-heading"><Reveal><p className="eyebrow">{copy.category}</p><h2>{copy.title}</h2></Reveal><Reveal delay={.12}><p className="section-intro">{copy.description}</p></Reveal></div>
    <div className="project-detail">
      <Reveal><div className="detail-block"><h3 className="detail-label">{detail.overview}</h3><p className="detail-overview">{copy.overview}</p></div></Reveal>
      <Reveal delay={.08}><div className="detail-block"><h3 className="detail-label">{detail.highlights}</h3><ul className="detail-highlights">{copy.highlights.map((item) => <li key={item}>{item}</li>)}</ul></div></Reveal>
      <Reveal delay={.16}><div className="detail-block"><h3 className="detail-label">{detail.stack}</h3><p className="detail-stack">{copy.stack.map((item) => <span className="stack-tag" key={item}>{item}</span>)}</p></div></Reveal>
      <Reveal delay={.24}><div className="detail-actions"><a className="button-primary" href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{visitLabel}<span aria-hidden="true">↗</span></a><a className="button-text" href="/work">{detail.back}<span aria-hidden="true">↩</span></a></div></Reveal>
    </div>
  </section>
}

function FocusCard({ id, copy, onPulse }: { id: FocusId; copy: { name: string; summary: string }; onPulse: () => void }) {
  const href = id === 'algorithms' ? links.code : id === 'mathematics' ? links.math : links.agents
  return <Reveal><a className={`focus-card focus-${id}`} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} onPointerEnter={onPulse} onFocus={onPulse}><span className="focus-glyph" aria-hidden="true">{id === 'algorithms' ? '⌘' : id === 'mathematics' ? '∿' : '✳'}</span><h3>{copy.name}</h3><p>{copy.summary}</p><span className="focus-arrow" aria-hidden="true">↗</span></a></Reveal>
}

const labGlyphs: Record<LabId, string> = { blackhole: '◉', threebody: '✦', thechao: '∿', thechaos: '∞', pelican: '✳' }

function LabCard({ id, index, copy }: { id: LabId; index: number; copy: { name: string; summary: string; href: string } }) {
  return <Reveal delay={index * .08}><a className="focus-card lab-card" href={copy.href} target="_blank" rel="noopener noreferrer"><span className="focus-glyph" aria-hidden="true">{labGlyphs[id]}</span><h3>{copy.name}</h3><p>{copy.summary}</p><span className="focus-arrow" aria-hidden="true">↗</span></a></Reveal>
}

export default App
