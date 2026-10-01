import { useLayoutEffect, useRef } from 'react'
import { bodies, solarCopy } from './solarData'
import type { Language } from '../site/content'
import type { BodyId } from './types'

interface Props {
  language: Language
  selected: BodyId | null
  paused: boolean
  onSelect: (body: BodyId) => void
  onPause: () => void
  onReset: () => void
  onZoom: (direction: number) => void
  onClose: () => void
  onSurface: (element: HTMLDivElement | null) => void
}

export default function SolarExplorer({ language, selected, paused, onSelect, onPause, onReset, onZoom, onClose, onSurface }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const copy = solarCopy[language]
  const current = bodies.find(body => body.id === selected)
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
      const elements = Array.from(dialogRef.current!.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'))
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
    <header className="explorer-header"><div><p className="eyebrow">SOL / SOLAR SYSTEM</p><h2>{copy.title}</h2></div><button ref={closeRef} className="explorer-close" type="button" onClick={onClose} aria-label={copy.exit}>× <span>{copy.exit}</span></button></header>
    <aside className="body-detail" aria-live="polite"><span className="detail-status">{current ? copy.tracking : copy.overview}</span><h3>{current ? current[language][0] : copy.subtitle}</h3>{current && <p>{current[language][1]}</p>}<p className="explorer-disclaimer">{copy.disclaimer}</p></aside>
    <div className="explorer-bottom"><div className="planet-picker" aria-label={copy.overview}>{bodies.map(body => <button type="button" key={body.id} data-body={body.id} aria-label={`${copy.select}${language === 'en' ? ' ' : ''}${body[language][0]}`} aria-pressed={selected === body.id} onClick={() => onSelect(body.id)}><span className={`planet-dot dot-${body.id}`} style={{ background: body.color }} /><span>{body[language][0]}</span></button>)}</div>
      <div className="explorer-toolbar"><p className="explorer-hint"><span className="desktop-hint">{copy.hint}</span><span className="touch-hint">{copy.touchHint}</span></p><div className="explorer-controls"><button type="button" onClick={onPause} aria-label={paused ? copy.resume : copy.pause} aria-pressed={paused}>{paused ? '▷' : 'Ⅱ'} <span>{paused ? copy.resume : copy.pause}</span></button><button type="button" aria-label={copy.zoomOut} onClick={() => onZoom(-1)}>−</button><button type="button" aria-label={copy.zoomIn} onClick={() => onZoom(1)}>+</button><button type="button" onClick={onReset} aria-label={copy.reset}>↺ <span>{copy.reset}</span></button></div></div>
    </div>
  </div>
}
