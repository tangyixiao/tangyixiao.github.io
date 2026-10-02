const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require(path.join(process.env.CODEX_NODE_MODULES || path.resolve(__dirname, '../node_modules'), 'playwright'))
const project = process.env.BLOG_TEST_ROOT || path.resolve(__dirname, '..')
const chrome = [process.env.CHROME_PATH, chromium.executablePath(), path.join(process.env.PROGRAMFILES || '', 'Google/Chrome/Application/chrome.exe')].find(file => file && fs.existsSync(file))

async function serverFor(root) {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''))
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); return res.end('Not found')
    }
    const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.webp':'image/webp' }
    res.setHeader('content-type', types[path.extname(file)] || 'text/plain')
    res.end(fs.readFileSync(file))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return { server, origin: 'http://127.0.0.1:' + server.address().port }
}

async function main() {
  assert.ok(chrome, 'A Chromium executable is required')
  const home = await serverFor(path.join(project, 'dist'))
  const standalone = path.join(project, 'sites-blog/dist')
  const sites = await serverFor(fs.existsSync(standalone) ? standalone : path.join(project, 'public/blog'))
  const browser = await chromium.launch({ headless:true, executablePath:chrome, args:['--enable-webgl','--use-angle=swiftshader'] })
  try {
    for (const [host, base] of [[home, '/blog/'], [sites, '/']]) {
      const page = await browser.newPage({viewport:{width:1440,height:1000},locale:'zh-CN'})
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(host.origin + base)
      assert.equal(await page.locator('.post-row').count(), 3)
      assert.equal(await page.locator('.sky img').evaluate(image => image.complete && image.naturalWidth > 0), true)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      const resources = await page.locator('a[href],link[rel=stylesheet],script[src],img[src]').evaluateAll(nodes => nodes.map(node => node.href || node.src))
      for (const url of resources.filter(url => url.startsWith(host.origin))) {
        assert.equal((await page.request.get(url)).status(),200,'missing local resource: ' + url)
      }
      const dark = await page.locator('html').getAttribute('data-theme')
      await page.getByRole('button',{name:'切换到浅色模式'}).click()
      assert.equal(await page.locator('html').getAttribute('data-theme'),'light')
      await page.reload()
      assert.equal(await page.locator('html').getAttribute('data-theme'),'light')
      await page.getByRole('button',{name:'切换到深色模式'}).click()
      assert.equal(dark,'dark')
      if (process.env.BLOG_SCREENSHOT_DIR && base === '/') {
        fs.mkdirSync(process.env.BLOG_SCREENSHOT_DIR,{recursive:true})
        await page.screenshot({path:path.join(process.env.BLOG_SCREENSHOT_DIR,'blog-desktop.png'),fullPage:true})
      }
      const slugs = ['problem-to-note','proof-and-notes','agent-experiment']
      for (const slug of slugs) {
        await page.goto(host.origin + base + 'posts/' + slug + '.html')
        assert.equal(await page.locator('h1').count(),1)
        const toc = await page.locator('.toc a').evaluateAll(nodes => nodes.map(node => node.hash.slice(1)))
        for (const id of toc) assert.equal(await page.locator('[id="' + id + '"]').count(),1)
        await page.locator('.article-end a').first().click()
        await page.waitForURL('**/index.html#writing')
      }
      await page.setViewportSize({width:375,height:812})
      await page.goto(host.origin + base)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true)
      if (process.env.BLOG_SCREENSHOT_DIR && base === '/') await page.screenshot({path:path.join(process.env.BLOG_SCREENSHOT_DIR,'blog-mobile.png'),fullPage:true})
      for (const slug of slugs) {
        await page.goto(host.origin + base + 'posts/' + slug + '.html')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true)
      }
      assert.deepEqual(errors,[])
      await page.close()
    }
    const page = await browser.newPage({viewport:{width:390,height:844},locale:'zh-CN'})
    await page.goto(home.origin)
    await page.getByRole('button',{name:'打开导航'}).click()
    await page.getByRole('link',{name:'博客',exact:true}).click()
    await page.waitForURL('**/blog/')
    await page.close()
    const noJS = await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}})
    const staticPage = await noJS.newPage()
    await staticPage.goto(sites.origin)
    await staticPage.locator('.post-row h3 a').first().click()
    assert.equal(await staticPage.locator('.article-body h2').count(),3)
    assert.equal(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true)
    await noJS.close()
    console.log('Blog smoke passed: both hosting paths, all three articles, local assets, theme persistence, mobile homepage entry and reading without JavaScript.')
  } finally {
    await browser.close()
    await Promise.all([home,sites].map(({server}) => new Promise(resolve => server.close(resolve))))
  }
}
main().catch(error => { console.error(error);process.exitCode=1 })
