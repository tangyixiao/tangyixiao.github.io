import { useLayoutEffect, useRef, useState } from 'react'
import { bodies, categoryCopy, planetFacts, solarCopy, surfaceFor } from './solarData'
import { bodyCategories, timeScales } from './types'
import type { Language } from '../site/content'
import type { BodyCategory, BodyId, ScaleMode, TimeScale } from './types'

interface Props {
  language: Language
  selected: BodyId | null
  paused: boolean
  scaleMode: ScaleMode
  timeScale: TimeScale
  galacticRing: boolean
  onSelect: (body: BodyId) => void
  onPause: () => void
  onReset: () => void
  onZoom: (direction: number) => void
  onScaleMode: () => void
  onTimeScale: (scale: TimeScale) => void
  onGalacticRing: (visible: boolean) => void
  onClose: () => void
  onSurface: (element: HTMLDivElement | null) => void
}

export default function SolarExplorer({ language, selected, paused, scaleMode, timeScale, galacticRing, onSelect, onPause, onReset, onZoom, onScaleMode, onTimeScale, onGalacticRing, onClose, onSurface }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [infoExpanded, setInfoExpanded] = useState(false)
  // `current` is already the selected body below, so the picker category keeps its own name.
  const [category, setCategory] = useState<BodyCategory>('planet')
  const copy = solarCopy[language]
  const current = bodies.find(body => body.id === selected)
  const facts = current ? planetFacts[current.id] : null
  useLayoutEffect(() => {
    const active = document.activeElement as HTMLElement | null
    const shell = document.querySelector<HTMLElement>('.site-shell')!
    const oldInert = shell.inert, overflow = document.body.style.overflow, padding = document.body.style.paddingRight
    const scrollY = window.scrollY, scrollX = window.scrollX
    document.body.style.paddingRight = `${Math.max(0, innerWidth - document.documentElement.clientWidth)}px`
    document.body.style.overflow = 'hidden'; shell.inert = true; closeRef.current?.focus({ preventScroll: true })
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const elements = Array.from(dialogRef.current!.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]'))
      const first = elements[0], last = elements[elements.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current!.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown); shell.inert = oldInert
      document.body.style.overflow = overflow; document.body.style.paddingRight = padding
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' }); active?.focus({ preventScroll: true })
    }
  }, [onClose])

  return <div ref={dialogRef} className="solar-explorer" role="dialog" aria-modal="true" aria-label={copy.explore}>
    <div ref={onSurface} className="explorer-surface" role="region" tabIndex={0} aria-label={copy.sceneLabel} />
    <header className="explorer-header"><div><span className="observatory-mark" aria-hidden="true">◎</span><div><p className="eyebrow">TY / OBSERVATORY</p><h2>{copy.title}</h2></div></div><button ref={closeRef} className="explorer-close" type="button" onClick={onClose} aria-label={copy.exit}>× <span>{copy.exit}</span></button></header>
    <aside className="body-detail" data-selected={!!current} data-expanded={infoExpanded} aria-live="polite"><span className="detail-status"><i />{current ? copy.tracking : copy.overview}</span><h3>{current ? current[language][0] : copy.title}</h3><span className="body-class">{current && facts ? `${current[language === 'zh' ? 'en' : 'zh'][0]} / ${facts.type[language === 'zh' ? 0 : 1]}` : language === 'zh' ? '从一颗恒星，出发。' : 'Begin with a star.'}</span>
      {current && <button className="body-info-toggle" type="button" aria-expanded={infoExpanded} aria-controls="solar-body-info" onClick={() => setInfoExpanded(value => !value)}>{language === 'zh' ? '天体信息' : 'Body details'} <span aria-hidden="true">{infoExpanded ? '−' : '+'}</span></button>}
      <div id="solar-body-info" className="body-info-content">{current && <p>{current[language][1]}</p>}
      {facts && <dl className="body-facts"><div><dt>{current?.id === 'sun' ? language === 'zh' ? '平均直径' : 'Mean diameter' : language === 'zh' ? '赤道直径' : 'Equatorial diameter'}</dt><dd>{facts.diameter}<small>km</small></dd></div>{current?.id !== 'sun' && <div><dt>{language === 'zh' ? '平均日距' : 'Mean distance from Sun'}</dt><dd>{facts.distance}<small>{language === 'zh' ? '百万 km' : 'million km'}</small></dd></div>}</dl>}
      <p className="explorer-disclaimer">{scaleMode === 'true' ? copy.trueDisclaimer : copy.disclaimer}</p>
      <a className="solar-credit" href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">{language === 'zh' ? '表面贴图' : 'Surface maps'}: Solar System Scope · CC BY 4.0 ↗</a>
      </div>
    </aside>
    <div className="explorer-bottom"><div className="category-chips" role="group" aria-label={copy.title}>{bodyCategories.map(cat => <button type="button" key={cat} data-category={cat} aria-pressed={cat === category} onClick={() => setCategory(cat)}>{categoryCopy[cat][language === 'en' ? 1 : 0]}</button>)}</div>
      <div className="planet-picker" aria-label={copy.overview}>{bodies.filter(body => body.category === category).map(body => {
        const parent = body.parent ? bodies.find(candidate => candidate.id === body.parent) : null
        const name = parent ? `${parent[language][0]}·${body[language][0]}` : body[language][0]
        const surface = surfaceFor(body.id)
        return <button type="button" key={body.id} data-body={body.id} aria-label={`${copy.select}${language === 'en' ? ' ' : ''}${name}`} aria-pressed={selected === body.id} onClick={() => onSelect(body.id)}>{surface
          ? <span className={`planet-dot dot-${body.id}`} style={{ backgroundImage: `url(${surface})` }} />
          : <span className="planet-dot" data-procedural="true" style={{ backgroundColor: body.color }} />}<span>{body[language][0]}</span></button>
      })}</div>
      <div className="explorer-toolbar"><button className="scale-toggle" type="button" aria-pressed={scaleMode === 'true'} onClick={onScaleMode}><span aria-hidden="true">{scaleMode === 'true' ? '✧' : '✦'}</span>{scaleMode === 'true' ? copy.artisticScale : copy.trueScale}</button><div className="time-scale" role="group" aria-label={copy.timeScale}>{timeScales.map(value => <button type="button" key={value} aria-label={`${copy.timeScale} ${value}×`} aria-pressed={timeScale === value} onClick={() => onTimeScale(value)}>{value}×</button>)}</div><button className="ring-toggle" type="button" aria-pressed={galacticRing} onClick={() => onGalacticRing(!galacticRing)}>{copy.galacticRing}</button><a className="blackhole-entry" href="/blackhole.html"><span aria-hidden="true">◉</span>{copy.blackhole}<span aria-hidden="true">↗</span></a><a className="blackhole-entry" href="/threebody.html"><span aria-hidden="true">✦</span>{copy.threebody}<span aria-hidden="true">↗</span></a><p className="explorer-hint"><span className="desktop-hint">{copy.hint}</span><span className="touch-hint">{copy.touchHint}</span></p><div className="explorer-controls"><button type="button" onClick={onPause} aria-label={paused ? copy.resume : copy.pause} aria-pressed={paused}>{paused ? '▷' : 'Ⅱ'} <span>{paused ? copy.resume : copy.pause}</span></button><button type="button" aria-label={copy.zoomOut} onClick={() => onZoom(-1)}>−</button><button type="button" aria-label={copy.zoomIn} onClick={() => onZoom(1)}>+</button><button type="button" onClick={onReset} aria-label={copy.reset}>↺ <span>{copy.reset}</span></button></div></div>
    </div>
  </div>
}
