import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { bodies, categoryCopy, GALACTIC_REAL, planetFacts, solarCopy, surfaceFor, TRUE_SCALE } from './solarData'
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
  galacticView: boolean
  onSelect: (body: BodyId) => void
  onPause: () => void
  onReset: () => void
  onZoom: (direction: number) => void
  onScaleMode: () => void
  onTimeScale: (scale: TimeScale) => void
  onGalacticRing: (visible: boolean) => void
  onGalacticView: (active: boolean) => void
  onClose: () => void
  onSurface: (element: HTMLDivElement | null) => void
}
export default function SolarExplorer({ language, selected, paused, scaleMode, timeScale, galacticRing, galacticView, onSelect, onPause, onReset, onZoom, onScaleMode, onTimeScale, onGalacticRing, onGalacticView, onClose, onSurface }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [infoExpanded, setInfoExpanded] = useState(false)
  // `current` is already the selected body below, so the picker category keeps its own name.
  const [category, setCategory] = useState<BodyCategory>('planet')
  // 画布把「本视图里这颗天体真实的像素直径」与「环上已经走了多少度」写到 data-scene-* 上，
  // 面板只读这些数字，不自己重算取景——两处各自算一遍必然会与场景里的实际相机打架。
  // 200ms 轮询：读数不需要每帧更新，而面板不该为显示一个数字去驱动渲染循环。
  const [diagnostics, setDiagnostics] = useState({ pixels: 'none', angle: '0.00', radius: '0' })
  useEffect(() => {
    const read = () => {
      const root = document.querySelector<HTMLElement>('[data-scene-root]')
      const next = { pixels: root?.dataset.sceneBodyPixels ?? 'none', angle: root?.dataset.sceneGalacticAngle ?? '0.00', radius: root?.dataset.sceneGalacticRadius ?? '0' }
      setDiagnostics(current => current.pixels === next.pixels && current.angle === next.angle && current.radius === next.radius ? current : next)
    }
    read()
    const timer = window.setInterval(read, 200)
    return () => window.clearInterval(timer)
  }, [])
  const copy = solarCopy[language]
  const current = bodies.find(body => body.id === selected)
  const facts = current ? planetFacts[current.id] : null
  // 读数直接来自画布（data-scene-body-pixels 就是「这颗天体在当前视图里占多少像素」的原始值），
  // 面板不做任何换算：它不知道相机在哪，换算只会变成第二套会过期的真相。
  const bodyPixels = diagnostics.pixels === 'none' ? null : diagnostics.pixels
  const galacticDrawn = Number(diagnostics.radius) || 0
  // 「真实轨道半径 = 海王星轨道的 N 万倍」由常数现算：8.277 kpc × 206,264.806 AU/pc ÷ 30.07 AU，
  // 再除以 1e4 换成「万倍」。写死在文案里的数字一旦改常数就会撒谎，所以只算一次、只显示结果。
  const galacticRatio = Math.round(GALACTIC_REAL.distanceKpc * 1000 * GALACTIC_REAL.auPerParsec / GALACTIC_REAL.neptuneAU / 1e4)
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
      {scaleMode === 'true' && <dl className="body-scale"><div><dt>{copy.magnifyLabel}</dt><dd>{TRUE_SCALE.magnify}×</dd></div><div><dt>{copy.pixelLabel}</dt><dd>{bodyPixels === null ? '—' : `${bodyPixels} px`}</dd></div></dl>}
      {scaleMode === 'true' && <p className="body-scale-note">{copy.ratioLabel} · {copy.markerLabel}</p>}
      <p className="explorer-disclaimer">{scaleMode === 'true' ? copy.trueDisclaimer : copy.disclaimer}</p>
      <a className="solar-credit" href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">{language === 'zh' ? '表面贴图' : 'Surface maps'}: Solar System Scope · CC BY 4.0 ↗</a>
      </div>
    </aside>
    <div className="explorer-bottom"><section className="galactic-scale" hidden={!galacticView} aria-label={copy.galacticScaleTitle}>
      <h4>{copy.galacticScaleTitle}</h4>
      <ol><li><b>{copy.galacticScaleSun}</b><span>{copy.galacticProgress} <i className="galactic-progress">{diagnostics.angle}°</i></span></li><li><b>{copy.galacticScaleCentre}</b><span>{copy.galacticScaleReal}</span></li></ol>
      <p><strong>{copy.galacticScaleRatio} {galacticRatio.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')} {copy.galacticScaleRatioUnit}</strong></p>
      <p>{galacticDrawn > 0 ? `${scaleMode === 'true' ? copy.galacticScaleDrawnTrue : copy.galacticScaleDrawnArt} ${galacticDrawn} ${scaleMode === 'true' ? copy.galacticScaleDrawnTrueUnit : copy.galacticScaleDrawnArtUnit}` : copy.galacticScaleNote}</p>
    </section><div className="category-chips" role="group" aria-label={copy.title}>{bodyCategories.map(cat => <button type="button" key={cat} data-category={cat} aria-pressed={cat === category} onClick={() => setCategory(cat)}>{categoryCopy[cat][language === 'en' ? 1 : 0]}</button>)}</div>
      <div className="planet-picker" aria-label={copy.overview}>{bodies.filter(body => body.category === category).map(body => {
        const parent = body.parent ? bodies.find(candidate => candidate.id === body.parent) : null
        const name = parent ? `${parent[language][0]}·${body[language][0]}` : body[language][0]
        const surface = surfaceFor(body.id)
        return <button type="button" key={body.id} data-body={body.id} aria-label={`${copy.select}${language === 'en' ? ' ' : ''}${name}`} aria-pressed={selected === body.id} onClick={() => onSelect(body.id)}>{surface
          ? <span className={`planet-dot dot-${body.id}`} style={{ backgroundImage: `url(${surface})` }} />
          : <span className="planet-dot" data-procedural="true" style={{ backgroundColor: body.color }} />}<span>{body[language][0]}</span></button>
      })}</div>
      <div className="explorer-toolbar"><button className="scale-toggle" type="button" aria-pressed={scaleMode === 'true'} onClick={onScaleMode}><span aria-hidden="true">{scaleMode === 'true' ? '✧' : '✦'}</span>{scaleMode === 'true' ? copy.artisticScale : copy.trueScale}</button><button className="view-toggle" type="button" aria-pressed={galacticView} onClick={() => onGalacticView(!galacticView)}>{copy.galacticView}</button><div className="time-scale" role="group" aria-label={copy.timeScale}>{timeScales.map(value => <button type="button" key={value} aria-label={`${copy.timeScale} ${value}×`} aria-pressed={timeScale === value} onClick={() => onTimeScale(value)}>{value}×</button>)}</div><button className="ring-toggle" type="button" aria-pressed={galacticRing} onClick={() => onGalacticRing(!galacticRing)}>{copy.galacticRing}</button><a className="blackhole-entry" href="/blackhole.html"><span aria-hidden="true">◉</span>{copy.blackhole}<span aria-hidden="true">↗</span></a><a className="blackhole-entry" href="/threebody.html"><span aria-hidden="true">✦</span>{copy.threebody}<span aria-hidden="true">↗</span></a><p className="explorer-hint"><span className="desktop-hint">{copy.hint}</span><span className="touch-hint">{copy.touchHint}</span></p><div className="explorer-controls"><button type="button" onClick={onPause} aria-label={paused ? copy.resume : copy.pause} aria-pressed={paused}>{paused ? '▷' : 'Ⅱ'} <span>{paused ? copy.resume : copy.pause}</span></button><button type="button" aria-label={copy.zoomOut} onClick={() => onZoom(-1)}>−</button><button type="button" aria-label={copy.zoomIn} onClick={() => onZoom(1)}>+</button><button type="button" onClick={onReset} aria-label={copy.reset}>↺ <span>{copy.reset}</span></button></div></div>
    </div>
  </div>
}
