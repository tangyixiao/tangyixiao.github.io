const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { chromium } = require('playwright')

const root = path.resolve(__dirname, '..', 'dist')
const browserPath = [process.env.CHROME_PATH, chromium.executablePath(), '/usr/bin/chromium'].find((candidate) => candidate && fs.existsSync(candidate))

function serve() {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname
    const target = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target)) {
      response.statusCode = 404
      response.end('not found')
      return
    }
    if (target.endsWith('.js')) response.setHeader('content-type', 'text/javascript')
    if (target.endsWith('.css')) response.setHeader('content-type', 'text/css')
    response.end(fs.readFileSync(target))
  })
  return new Promise((resolve) => server.listen(18768, '127.0.0.1', () => resolve(server)))
}

async function main() {
  assert.ok(browserPath, 'Chromium is required')
  const server = await serve()
  const browser = await chromium.launch({ headless: true, executablePath: browserPath, args: ['--enable-webgl', '--use-angle=swiftshader'] })
  const url = 'http://127.0.0.1:18768/'
  try {
    const zh = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', colorScheme: 'dark' })
    await zh.goto(url, { waitUntil: 'domcontentloaded' })
    assert.equal(await zh.locator('h1').innerText(), '唐一潇', 'the hero identifies the site owner')
    assert.equal(await zh.locator('html').getAttribute('data-theme'), 'dark', 'initial theme follows the system')
    assert.equal(await zh.locator('html').getAttribute('lang'), 'zh-CN', 'initial language follows the browser')
    assert.match(await zh.title(), /唐一潇.*算法、数学与智能系统/)
    assert.match(await zh.locator('meta[name="description"]').getAttribute('content'), /算法、数学、物理与智能系统/)
    assert.match(await zh.locator('#about').innerText(), /C\+\+.*Python.*LaTeX/s, 'About describes documented tools')
    assert.doesNotMatch(await zh.locator('main').innerText(), /绍兴一中|1000 AC|2000 AC/, 'unconfirmed identity and counts stay off the homepage')
    assert.equal(await zh.locator('a[href="/Code/"]').count(), 3, 'all three CodeHub paths remain discoverable')
    await zh.locator('[data-scene-root]').waitFor()
    assert.equal(await zh.locator('[data-scene-theme]').count(), 1, 'the scene exposes its active palette')
    assert.equal(await zh.locator('[data-scene-root]').getAttribute('data-scene-theme'), 'dark')
    for (const [selector, phase] of [['#home', 'hero'], ['#work', 'projects'], ['#focus', 'focus'], ['#about', 'about'], ['#links', 'links']]) {
      await zh.locator(selector).evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'center' }))
      await zh.waitForFunction((expected) => document.querySelector('[data-scene-root]')?.getAttribute('data-scene-phase') === expected, phase)
    }

    await zh.getByRole('button', { name: '切换到浅色模式' }).click()
    assert.equal(await zh.locator('html').getAttribute('data-theme'), 'light')
    assert.equal(await zh.locator('[data-scene-root]').getAttribute('data-scene-theme'), 'light', 'scene palette changes with the page')
    assert.equal(await zh.evaluate(() => localStorage.getItem('site-theme')), 'light')
    await zh.getByRole('button', { name: 'Switch to English' }).click()
    assert.equal(await zh.locator('h1').innerText(), 'Tang Yixiao')
    assert.equal(await zh.locator('html').getAttribute('lang'), 'en')
    assert.equal(await zh.evaluate(() => localStorage.getItem('site-language')), 'en')
    await zh.reload()
    assert.equal(await zh.locator('html').getAttribute('data-theme'), 'light', 'explicit theme survives reload')
    assert.equal(await zh.locator('h1').innerText(), 'Tang Yixiao', 'explicit language survives reload')
    assert.match(await zh.title(), /Tang Yixiao.*Algorithms/)

    const en = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, locale: 'en-US', colorScheme: 'light' })
    await en.goto(url, { waitUntil: 'domcontentloaded' })
    assert.equal(await en.locator('h1').innerText(), 'Tang Yixiao')
    assert.equal(await en.locator('html').getAttribute('data-theme'), 'light')
    await en.locator('[data-scene-root]').waitFor()
    assert.ok(Number(await en.locator('[data-scene-root]').getAttribute('data-scene-particles')) < Number(await zh.locator('[data-scene-root]').getAttribute('data-scene-particles')), 'mobile uses a lighter particle tier')
    assert.equal(await en.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile has no horizontal overflow')

    const storageBlocked = await browser.newPage({ locale: 'zh-CN', colorScheme: 'dark' })
    await storageBlocked.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('Storage unavailable') } })
    })
    await storageBlocked.goto(url, { waitUntil: 'domcontentloaded' })
    assert.equal(await storageBlocked.locator('h1').innerText(), '唐一潇', 'the page loads when storage is blocked')
    await storageBlocked.getByRole('button', { name: '切换到浅色模式' }).click()
    await storageBlocked.getByRole('button', { name: 'Switch to English' }).click()
    assert.equal(await storageBlocked.locator('h1').innerText(), 'Tang Yixiao', 'controls remain usable when storage is blocked')
    assert.equal(await storageBlocked.locator('html').getAttribute('data-theme'), 'light')
    console.log('homepage redesign preferences and content passed')
  } finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
