const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { chromium } = require('playwright')

const root = path.resolve(__dirname, '..', 'dist')
const browserPath = [
  process.env.CHROME_PATH,
  chromium.executablePath(),
  '/usr/bin/chromium',
  process.platform === 'win32' && process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  process.platform === 'win32' && process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
].filter(Boolean).find((candidate) => candidate && fs.existsSync(candidate))

function serve() {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname
    const target = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target)) {
      // 与 GitHub Pages 行为对齐：未知路径回退到 404.html（404 状态码），应用引导后按 pathname 渲染。
      if (!path.extname(pathname) && fs.existsSync(path.join(root, '404.html'))) {
        response.statusCode = 404
        response.setHeader('content-type', 'text/html')
        response.end(fs.readFileSync(path.join(root, '404.html')))
        return
      }
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

// 站内路由切换（不重载页面）：pushState 后派发 popstate，等价于用户前进/后退所走的路径。
function pushRoute(page, route) {
  return page.evaluate((next) => { window.history.pushState({}, '', next); window.dispatchEvent(new PopStateEvent('popstate')) }, route)
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
    assert.doesNotMatch(await zh.locator('main').innerText(), /绍兴一中|1000 AC|2000 AC/, 'unconfirmed identity and counts stay off the homepage')
    assert.equal(await zh.locator('a[href="/Code/"]').count(), 0, 'the home view alone exposes no CodeHub anchor')
    await zh.locator('[data-scene-root]').waitFor()
    assert.equal(await zh.locator('[data-scene-theme]').count(), 1, 'the scene exposes its active palette')
    assert.equal(await zh.locator('[data-scene-root]').getAttribute('data-scene-theme'), 'dark')
    for (const [route, phase] of [['/', 'hero'], ['/work', 'projects'], ['/focus', 'focus'], ['/about', 'about'], ['/links', 'links']]) {
      await pushRoute(zh, route)
      await zh.waitForFunction((expected) => document.querySelector('[data-scene-root]')?.getAttribute('data-scene-phase') === expected, phase)
      assert.equal(new URL(zh.url()).pathname, route, `${route} is reflected in the history pathname`)
      const viewId = route === '/' ? 'home' : route.slice(1)
      for (const other of ['home', 'work', 'focus', 'about', 'links'].filter((id) => id !== viewId)) {
        assert.equal(await zh.locator('#' + other).count(), 0, `${route} renders its own view alone (no #${other})`)
      }
    }
    await pushRoute(zh, '/about')
    await zh.locator('#about').waitFor()
    assert.match(await zh.locator('#about').innerText(), /C\+\+.*Python.*LaTeX/s, 'About describes documented tools')
    assert.ok(await zh.locator('.about-timeline li').count() >= 4, 'the about timeline lists at least four milestones')
    assert.equal(await zh.locator('.about-timeline .timeline-year').first().innerText(), '2023', 'the timeline starts at the first documented milestone')
    assert.equal(await zh.locator('.nav-links a[href="/lab"]').count(), 1, 'the primary navigation exposes exactly one Lab entry')
    await pushRoute(zh, '/lab')
    await zh.locator('#lab').waitFor()
    assert.equal(await zh.locator('.lab-card').count(), 5, 'the lab view lists the five WebGL experiments')
    assert.equal(await zh.locator('.lab-card[target="_blank"][rel*="noopener"]').count(), 5, 'every lab card opens its experiment in a new tab')
    await pushRoute(zh, '/work')
    await zh.locator('#work').waitFor()
    assert.equal(await zh.locator('a[href="/Code/"]').count(), 0, 'the work list no longer jumps straight to external links')
    assert.equal(await zh.locator('.work-filter button').count(), 4, 'the work filter offers the all chip plus every observed category')
    assert.equal(await zh.locator('.project-card').count(), 3, 'the work list shows every project before filtering')
    await zh.getByRole('button', { name: '智能体与工具' }).click()
    assert.equal(await zh.locator('.project-card').count(), 1, 'picking a category narrows the card list')
    assert.equal(await zh.locator('.project-card h3').innerText(), 'Agent Learning Hub', 'the filtered list keeps only the matching project')
    await zh.getByRole('button', { name: '全部' }).click()
    assert.equal(await zh.locator('.project-card').count(), 3, 'the all chip restores the full card list')
    await zh.locator('a[href="/work/code"]').click()
    await zh.locator('.project-detail').waitFor()
    assert.equal(new URL(zh.url()).pathname, '/work/code', 'the project card navigates to its history route')
    assert.equal(await zh.locator('#work').count(), 1, 'the project detail renders in the work view')
    assert.equal(await zh.locator('a[href="/Code/"]').count(), 1, 'the code detail exposes exactly one CodeHub anchor')
    assert.match(await zh.locator('#work').innerText(), /项目概述|技术栈/, 'the detail page shows its overview and stack sections')
    assert.equal(await zh.locator('.detail-actions a[href="/work"]').count(), 1, 'the detail page offers a way back to the project list')
    await pushRoute(zh, '/links')
    await zh.locator('#links').waitFor()
    assert.equal(await zh.locator('a[href="/Code/"]').count(), 1, 'links view exposes exactly one CodeHub anchor')
    await pushRoute(zh, '/now')
    await zh.locator('#now').waitFor()
    assert.equal(await zh.locator('.nav-links a[href="/now"]').count(), 1, 'the primary navigation exposes exactly one Now entry')
    assert.equal(await zh.locator('.now-item').count(), 4, 'the now view lists the four ongoing entries')
    assert.equal(await zh.locator('.now-reading li').count(), 3, 'the now view lists the reading entries')
    assert.match(await zh.locator('#now').innerText(), /最后更新.*2026-10-24/s, 'the now view shows its updated date')
    await pushRoute(zh, '/')
    await zh.locator('h1').waitFor()

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
