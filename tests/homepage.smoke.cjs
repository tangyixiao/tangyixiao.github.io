const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const moduleRoot = process.env.CODEX_NODE_MODULES || path.resolve(__dirname, '..', 'node_modules')
const { chromium } = require(path.join(moduleRoot, 'playwright'))
const root = path.resolve(__dirname, '..', 'dist')
const copyScript = fs.readFileSync(path.resolve(__dirname, '..', 'scripts', 'copy-legacy.mjs'), 'utf8')
const copyManifest = copyScript.match(/const files = \[(.*?)\]/s)
assert.ok(copyManifest, 'copy-legacy.mjs must expose its complete legacy artifact manifest')
const legacyRoutes = [...copyManifest[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
const chromeCandidates = [
  process.env.CHROME_PATH,
  process.env.CHROMIUM_PATH,
  chromium.executablePath(),
  ...(process.platform === 'linux' ? ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'] : []),
  ...(process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : []),
  ...(process.platform === 'win32' ? [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ] : []),
].filter(Boolean)
const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate))
const screenshotDirectory = process.env.SCREENSHOT_DIR

function serve() {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname
    const target = pathname === '/' ? 'index.html' : pathname.slice(1)
    const file = path.join(root, target)
    if (!file.startsWith(root) || !fs.existsSync(file)) return response.end('not found')
    if (file.endsWith('.js')) response.setHeader('content-type', 'text/javascript')
    if (file.endsWith('.css')) response.setHeader('content-type', 'text/css')
    response.end(fs.readFileSync(file))
  })
  return new Promise((resolve) => server.listen(18766, '127.0.0.1', () => resolve(server)))
}

async function expectPhase(page, selector, phase) {
  await page.locator(selector).evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'center' }))
  await page.waitForFunction((nextPhase) => document.querySelector('[data-scene-root]')?.getAttribute('data-scene-phase') === nextPhase, phase)
}

async function expectDelayedControllerReplay(page, siteUrl) {
  let releaseThree
  const threeReleased = new Promise((resolve) => { releaseThree = resolve })
  await page.route(/\/assets\/three\.module-[^/]+\.js$/, async (route) => {
    await threeReleased
    await route.continue()
  })
  try {
    await page.goto(siteUrl, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-scene-root]').waitFor()
    await page.locator('#focus').evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'center' }))
    await page.waitForFunction(() => document.querySelector('[data-scene-root]')?.getAttribute('data-scene-phase') === 'focus')
    await page.locator('.orbit-button').dispatchEvent('pointerdown')
    await page.waitForFunction(() => document.querySelector('[data-scene-root]')?.getAttribute('data-scene-pulse') !== '0.000')
    const expectedPulse = await page.locator('[data-scene-root]').getAttribute('data-scene-pulse')
    releaseThree()
    await page.waitForFunction(
      ({ expectedPhase, expectedPulse }) => {
        const root = document.querySelector('[data-scene-root]')
        return root?.getAttribute('data-scene-controller-phase') === expectedPhase && root?.getAttribute('data-scene-controller-pulse') === expectedPulse
      },
      { expectedPhase: 'focus', expectedPulse },
      { timeout: 3_000 },
    )
    assert.equal(await page.locator('[data-scene-root]').getAttribute('data-scene-controller-pulse-count'), '1', 'a delayed pulse is replayed exactly once')
    await page.waitForTimeout(200)
    assert.equal(await page.locator('[data-scene-root]').getAttribute('data-scene-controller-pulse-count'), '1', 'a replayed pulse is not duplicated by a late effect')
  } finally {
    releaseThree()
    await page.unroute(/\/assets\/three\.module-[^/]+\.js$/)
  }
}

async function main() {
  for (const route of legacyRoutes) {
    assert.ok(fs.existsSync(path.join(root, route)), `missing built legacy route: ${route}`)
  }
  assert.ok(fs.existsSync(path.join(root, 'assets')), 'missing copied legacy assets directory')
  const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate))
  assert.ok(chrome, 'A Chromium executable is required for homepage browser smoke tests')
  if (screenshotDirectory) fs.mkdirSync(screenshotDirectory, { recursive: true })
  const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:18766/'
  const server = process.env.SITE_URL ? null : await serve()
  const browser = await chromium.launch({
    headless: true,
    executablePath: chrome,
    args: ['--enable-webgl', '--use-angle=swiftshader'],
  })
  try {
    const consoleErrors = []
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    desktop.on('pageerror', (error) => consoleErrors.push(error.message))
    desktop.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
    await desktop.goto(siteUrl, { waitUntil: 'domcontentloaded' })
    await desktop.getByRole('heading', { name: /Paradox\s*Praxis\s*Clinamen/i }).waitFor()
    await desktop.locator('[data-scene-root]').waitFor()
    assert.equal(await desktop.locator('[data-scene-canvas]').count(), 1, 'desktop renders exactly one scene canvas')
    assert.equal(await desktop.locator('[data-scene-root]').getAttribute('data-scene-phase'), 'hero')
    assert.equal(await desktop.locator('a[href="/Code/"]').count(), 3, 'homepage exposes exactly three CodeHub links')
    assert.equal(await desktop.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'desktop must not overflow horizontally')
    await expectDelayedControllerReplay(desktop, siteUrl)
    for (const [selector, phase] of [['#home', 'hero'], ['#about', 'orbit'], ['#focus', 'focus'], ['#work', 'archive'], ['#links', 'links']]) await expectPhase(desktop, selector, phase)
    if (screenshotDirectory) await desktop.screenshot({ path: path.join(screenshotDirectory, 'homepage-desktop.png'), fullPage: true })
    await desktop.evaluate(() => document.querySelector('[data-scene-canvas]').dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
    await desktop.waitForFunction(() => document.querySelector('[data-scene-root]')?.getAttribute('data-scene-fallback') === 'active')
    await desktop.locator('.deep-sea-fallback').waitFor({ state: 'visible' })
    assert.equal(await desktop.locator('.deep-sea-fallback').isVisible(), true, 'context loss reveals a visible fallback')
    assert.deepEqual(consoleErrors, [], `scene fallback must not cause console errors: ${consoleErrors.join('\n')}`)

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
    await mobile.goto(siteUrl, { waitUntil: 'domcontentloaded' })
    await mobile.locator('[data-scene-root]').waitFor()
    assert.equal(await mobile.locator('[data-scene-canvas]').count(), 1, 'mobile renders exactly one full scene canvas')
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'mobile must not overflow horizontally')
    assert.equal(await mobile.locator('[data-scene-root]').getAttribute('data-scene-particles'), '360', 'mobile uses the complete particle field')
    if (screenshotDirectory) await mobile.screenshot({ path: path.join(screenshotDirectory, 'homepage-mobile.png'), fullPage: true })

    const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await reduced.emulateMedia({ reducedMotion: 'reduce' })
    await reduced.addInitScript(() => {
      window.__homepageRafCalls = 0
      const originalRequestAnimationFrame = window.requestAnimationFrame
      window.requestAnimationFrame = (callback) => {
        window.__homepageRafCalls += 1
        return originalRequestAnimationFrame(callback)
      }
    })
    await reduced.goto(siteUrl, { waitUntil: 'domcontentloaded' })
    await reduced.locator('[data-scene-root]').waitFor()
    assert.equal(await reduced.locator('[data-scene-root]').getAttribute('data-scene-motion'), 'reduced')
    assert.equal(await reduced.locator('[data-scene-root]').getAttribute('data-scene-animation'), 'static')
    assert.equal(await reduced.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length), 0, 'reduced-motion mode must not run continuous site animations')
    await reduced.waitForFunction(() => Number(document.querySelector('[data-scene-root]')?.getAttribute('data-scene-render-count')) === 1, undefined, { timeout: 5_000 })
    const reducedRenderCount = await reduced.locator('[data-scene-root]').getAttribute('data-scene-render-count')
    const reducedRafCalls = await reduced.evaluate(() => window.__homepageRafCalls)
    await reduced.waitForTimeout(250)
    assert.equal(await reduced.locator('[data-scene-root]').getAttribute('data-scene-render-count'), reducedRenderCount, 'reduced motion renders one stable WebGL frame')
    assert.equal(await reduced.evaluate(() => window.__homepageRafCalls), reducedRafCalls, 'reduced motion does not schedule additional animation frames')
    if (screenshotDirectory) await reduced.screenshot({ path: path.join(screenshotDirectory, 'homepage-reduced-motion.png'), fullPage: true })
    console.log('homepage desktop browser smoke passed')
  } finally {
    await browser.close()
    if (server) await new Promise((resolve) => server.close(resolve))
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
