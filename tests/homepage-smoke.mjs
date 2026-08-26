import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const filePath = fileURLToPath(import.meta.url)
const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(filePath), '..')
const port = Number(process.env.PREVIEW_PORT || 4174)
const moduleRoot = process.env.CODEX_NODE_MODULES || path.join(root, 'node_modules')
const { chromium } = require(path.join(moduleRoot, 'playwright'))
const legacyRoutes = ['notes.html', 'login.html', 'register.html', 'auth.js', 'notes-worker.js']
const chromiumCandidates = [
  process.env.CHROME_PATH,
  process.env.CHROMIUM_PATH,
  chromium.executablePath(),
  ...(process.platform === 'linux' ? ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'] : []),
  ...(process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : []),
  ...(process.platform === 'win32' ? [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ] : []),
].filter(Boolean).find((candidate) => existsSync(candidate))

const waitFor = async (check, message) => {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(message)
}

async function expectPhase(page, selector, phase) {
  await page.locator(selector).scrollIntoViewIfNeeded()
  await page.waitForFunction((nextPhase) => document.querySelector('[data-scene-root]')?.getAttribute('data-scene-phase') === nextPhase, phase)
}

async function stopProcess(processHandle) {
  if (!processHandle || processHandle.exitCode !== null) return
  const exited = once(processHandle, 'exit')
  processHandle.kill()
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2_000))])
}

async function main() {
  let preview
  let browser
  try {
    for (const route of legacyRoutes) assert.ok(existsSync(path.join(root, 'dist', route)), `missing built legacy route: ${route}`)
    assert.ok(chromiumCandidates, 'A Chromium executable is required for homepage browser smoke tests')
    preview = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' })
    await waitFor(async () => (await fetch(`http://127.0.0.1:${port}/`)).ok, 'Vite preview did not start')
    browser = await chromium.launch({ headless: true, executablePath: chromiumCandidates, args: ['--enable-webgl', '--use-angle=swiftshader'] })
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-scene-root]').waitFor()
    assert.equal(await page.locator('[data-scene-canvas]').count(), 1, 'mobile renders exactly one scene canvas')
    assert.equal(await page.locator('a[href="/Code/"]').count(), 3, 'homepage must expose exactly three CodeHub anchors')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'mobile page must not overflow horizontally')
    assert.equal(await page.locator('h1').innerText(), 'Paradox\nPraxis\nClinamen', 'canonical hero must remain readable on mobile')
    assert.equal(await page.title(), 'Paradox Praxis Clinamen', 'document title must use the canonical brand')
    assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), 'Paradox Praxis Clinamen · 佯谬·践履·偏斜')
    assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'), '#070b17')
    for (const [selector, phase] of [['#home', 'hero'], ['#about', 'orbit'], ['#focus', 'focus'], ['#work', 'archive'], ['#links', 'links']]) {
      await page.locator(selector).evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'center' }))
      await page.waitForFunction((nextPhase) => document.querySelector('[data-scene-root]')?.getAttribute('data-scene-phase') === nextPhase, phase)
    }
    console.log('homepage mobile browser smoke passed')
  } finally {
    if (browser) await browser.close()
    await stopProcess(preview)
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
