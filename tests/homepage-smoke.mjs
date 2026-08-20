import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = process.cwd()
const port = 4174
const debugPort = 9225
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const legacyRoutes = ['notes.html', 'login.html', 'register.html', 'auth.js', 'notes-worker.js']
let preview
let browser
let profile

const waitFor = async (check, message) => {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(message)
}

class Cdp {
  constructor(url) {
    this.nextId = 0
    this.pending = new Map()
    this.socket = new WebSocket(url)
  }
  async open() { await new Promise((resolve, reject) => { this.socket.onopen = resolve; this.socket.onerror = reject; this.socket.onmessage = ({ data }) => { const message = JSON.parse(data); const pending = this.pending.get(message.id); if (!pending) return; this.pending.delete(message.id); message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result) } }) }
  send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++this.nextId; this.pending.set(id, { resolve, reject }); this.socket.send(JSON.stringify({ id, method, params })) }) }
  async evaluate(expression) { const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return result.result.value }
  close() { this.socket.close() }
}

const readPage = async (cdp) => cdp.evaluate(`(async () => { await document.fonts.ready; await new Promise(r => setTimeout(r, 900)); const title = document.querySelector('h1').getBoundingClientRect(); return { codeHubAnchors: document.querySelectorAll('a[href="/Code/"]').length, viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, titleRight: title.right, titleText: document.querySelector('h1').innerText, documentTitle: document.title, description: document.querySelector('meta[name="description"]')?.content, themeColor: document.querySelector('meta[name="theme-color"]')?.content, heroTransform: getComputedStyle(document.querySelector('.hero-orbit')).transform, activeAnimations: document.getAnimations().filter(animation => animation.playState === 'running').length }; })()`)

try {
  for (const route of legacyRoutes) assert.ok(existsSync(path.join(root, 'dist', route)), `missing built legacy route: ${route}`)
  assert.ok(existsSync(chrome), 'Chrome is required for homepage browser smoke tests')
  preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' })
  await waitFor(async () => (await fetch(`http://127.0.0.1:${port}/`)).ok, 'Vite preview did not start')
  profile = await mkdtemp(path.join(os.tmpdir(), 'homepage-smoke-'))
  browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
  const target = await waitFor(async () => { const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' }); return response.ok ? response.json() : null }, 'Chrome DevTools did not start')
  const cdp = new Cdp(target.webSocketDebuggerUrl)
  await cdp.open()
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/` })
  await waitFor(async () => (await cdp.evaluate('document.readyState')) === 'complete', 'Homepage did not load')
  const mobile = await readPage(cdp)
  assert.equal(mobile.codeHubAnchors, 3, 'homepage must expose exactly three CodeHub anchors')
  assert.ok(mobile.scrollWidth <= mobile.viewport, `mobile page overflows: ${mobile.scrollWidth}px > ${mobile.viewport}px`)
  assert.ok(mobile.titleRight <= mobile.viewport, `Clinamen title is clipped at ${mobile.titleRight}px of ${mobile.viewport}px`)
  assert.equal(mobile.titleText.split('\n').at(-1), 'Clinamen', 'Clinamen must remain on a readable final line')
  assert.equal(mobile.documentTitle, 'Paradox Praxis Clinamen', 'document title must use the canonical brand')
  assert.equal(mobile.description, 'Paradox Praxis Clinamen · 佯谬·践履·偏斜', 'description must use the canonical bilingual brand')
  assert.equal(mobile.themeColor, '#070b17', 'theme color must match the archive void')
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await cdp.send('Page.reload')
  await waitFor(async () => (await cdp.evaluate('document.readyState')) === 'complete', 'Reduced-motion homepage did not reload')
  const reduced = await readPage(cdp)
  assert.equal(reduced.activeAnimations, 0, 'reduced-motion mode must not run animations')
  assert.equal(reduced.heroTransform, 'none', 'reduced-motion mode must not apply parallax transforms')
  cdp.close()
  console.log(`browser smoke passed: ${mobile.codeHubAnchors} CodeHub anchors, ${mobile.scrollWidth}px mobile width`)
} finally {
  preview?.kill()
  browser?.kill()
  if (browser) await once(browser, 'exit')
  if (profile) await rm(profile, { recursive: true, force: true })
}
