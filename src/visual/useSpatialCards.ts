import { useEffect } from 'react'

export function useSpatialCards(reducedMotion: boolean) {
  useEffect(() => {
    if (reducedMotion || !matchMedia('(hover:hover) and (pointer:fine)').matches) return
    let frame = 0, active: HTMLElement | null = null, x = 0, y = 0
    const reset = (node: HTMLElement | null) => {
      if (!node) return
      for (const name of ['--tilt-x', '--tilt-y', '--light-x', '--light-y']) node.style.removeProperty(name)
      node.removeAttribute('data-spatial-active')
    }
    const move = (event: PointerEvent) => {
      const card = (event.target as Element).closest<HTMLElement>('.project-card, .focus-card')
      if (card !== active) { reset(active); active = card }
      if (!card) return
      const rect = card.getBoundingClientRect()
      x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)); y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0; if (!active) return
        active.style.setProperty('--tilt-x', `${(y - .5) * -12}deg`); active.style.setProperty('--tilt-y', `${(x - .5) * 12}deg`)
        active.style.setProperty('--light-x', `${x * 100}%`); active.style.setProperty('--light-y', `${y * 100}%`); active.dataset.spatialActive = 'true'
      })
    }
    const leave = () => { reset(active); active = null }
    document.addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerleave', leave)
    return () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); if (frame) cancelAnimationFrame(frame); reset(active) }
  }, [reducedMotion])
}
