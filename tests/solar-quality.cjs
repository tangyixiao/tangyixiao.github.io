const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require('playwright')

async function main() {
  const root = path.resolve(__dirname, '../dist')
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end() }
    res.setHeader('content-type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.webp') ? 'image/webp' : 'text/html')
    res.end(fs.readFileSync(file))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/`
  const executablePath = [process.env.CHROME_PATH, chromium.executablePath(), path.join(process.env.PROGRAMFILES || '', 'Google/Chrome/Application/chrome.exe')].find(p => p && fs.existsSync(p))
  const browser = await chromium.launch({ executablePath, args: ['--enable-webgl', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', colorScheme: 'dark' })
  const errors = [], loaded = new Set()
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && /THREE|shader|WebGL/.test(message.text())) errors.push(message.text()) })
  page.on('response', response => { if (/\/assets\/solar\/.*\.webp$/.test(response.url()) && response.ok()) loaded.add(response.url()) })
  const scene = page.locator('[data-scene-root]')
  try {
    await page.goto(url)
    await page.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneReady === 'true')
    assert.equal(await scene.getAttribute('data-scene-textures'), '22', 'all planet, satellite, dwarf, cloud, night, ring and sky maps decoded')
    assert.equal(loaded.size, 22, 'textures are self-hosted and loaded after the scene chunk')
    await page.getByRole('button', { name: '探索太阳系', exact: true }).click()
    assert.equal(await page.locator('.celestial-label').count(), 9, 'eight planets and the Sun keep permanent labels; the galactic centre marker is gone')
    await page.getByRole('button', { name: '选择地球', exact: true }).click()
    await page.waitForFunction(() => { const value = Number(document.querySelector('[data-scene-root]')?.dataset.sceneFlightProgress); return value > .15 && value < .75 })
    const intermediate = Number(await scene.getAttribute('data-scene-camera-distance'))
    await page.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneFlightProgress === '1.000')
    const settled = Number(await scene.getAttribute('data-scene-camera-distance'))
    assert.ok(intermediate > settled * 2, 'selection flies toward the planet instead of teleporting')
    assert.match(await page.locator('.body-detail').innerText(), /12,756/)
    await page.getByRole('button', { name: '重置视角', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneSelected === 'none')
    const landscapeDistance = Number(await scene.getAttribute('data-scene-camera-distance'))
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForFunction(distance => Number(document.querySelector('[data-scene-root]')?.dataset.sceneCameraDistance) > distance * 1.5, landscapeDistance)
    const portraitDistance = Number(await scene.getAttribute('data-scene-camera-distance'))
    await page.getByRole('button', { name: '重置视角', exact: true }).click()
    await page.waitForTimeout(100)
    assert.ok(Math.abs(Number(await scene.getAttribute('data-scene-camera-distance')) - portraitDistance) < .1, 'resize already fits the whole system without requiring reset')
    // 时间流速新增 240× / 720× 两挡：切换必须落到 data-scene-time-scale 上。
    await page.getByRole('button', { name: '时间流速 720×', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneTimeScale === '720')
    await page.getByRole('button', { name: '时间流速 240×', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneTimeScale === '240')
    await page.keyboard.press('Escape')
    await page.close()

    // 真实比例模式：距离 1:1，全景相机拉远且八颗行星仍在画面内，切回艺术模式后恢复。
    const scaled = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', colorScheme: 'dark' })
    scaled.on('pageerror', error => errors.push(error.message))
    const scaledScene = scaled.locator('[data-scene-root]')
    try {
      await scaled.goto(url)
      await scaled.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneReady === 'true')
      await scaled.getByRole('button', { name: '探索太阳系', exact: true }).click()
      // 探索器取景距离 = span/sin(21°)×1.22：艺术模式 600→2042，真实比例 51→173.6。
      // data-scene-camera-distance 要等取景飞行结束才跳到 2042 量级，浏览模式只有 ~60；
      // 读数前必须等它越过 1000，否则会读到切换瞬间的浏览残留值（此前 CI 的 60.006 即此）。
      await scaled.waitForFunction(() => Number(document.querySelector('[data-scene-root]')?.dataset.sceneCameraDistance) > 1000, undefined, { timeout: 30000 })
      const baseDistance = Number(await scaledScene.getAttribute('data-scene-camera-distance'))
      await scaled.getByRole('button', { name: '真实比例', exact: true }).click()
      await scaled.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneScale === 'true')
      await scaled.waitForTimeout(1500)
      assert.equal(await scaledScene.getAttribute('data-scene-outside-bodies'), 'none', 'true-scale overview still fits all eight planets')
      const trueDistance = Number(await scaledScene.getAttribute('data-scene-camera-distance'))
      // 艺术模式把轨道距离向内压缩（span 600，全景取景 2042），真实比例 span 51（全景 173.6）：
      // 切到真实比例时取景反而拉近，同时 1:1 距离下八大行星仍在画面内（上一行断言）。
      assert.ok(trueDistance < baseDistance * 0.55, `true-scale overview reframes closer (${baseDistance} -> ${trueDistance})`)
      await scaled.getByRole('button', { name: '选择地球', exact: true }).click()
      await scaled.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneSelected === 'earth')
      // 选择后有一段飞向行星的过渡，真实像素直径按落定后的相机距离给出：等飞行结束再读详情。
      await scaled.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneFlightProgress === '1.000', undefined, { timeout: 30000 })
      await scaled.getByRole('button', { name: '艺术模式', exact: true }).click()
      await scaled.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneScale === 'artistic')
      assert.match(await scaled.locator('.body-detail').innerText(), /距离经艺术化压缩/, 'disclaimer swaps back with the scale mode')
      await scaled.getByRole('button', { name: '真实比例', exact: true }).click()
      await scaled.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneScale === 'true')
      assert.match(await scaled.locator('.body-detail').innerText(), /1 AU ≈ 1\.55 单位/, 'true-scale disclaimer is shown')
      // 单一放大系数：读数给出 k 与被选天体的真实像素直径，九个标记环覆盖九个主天体。
      await scaled.waitForTimeout(400)
      const detailText = await scaled.locator('.body-detail').innerText()
      assert.match(detailText, /统一放大系数\s*\|?\s*20×/, 'uniform magnification factor is disclosed')
      assert.match(detailText, /本视图真实直径\s*\|?\s*0\.\d+ px/, 'selected body publishes its true pixel diameter')
      assert.equal(await scaled.locator('.celestial-marker:not([hidden])').count(), 9, 'every primary body gets a position marker in true scale')
      // 「星系视角」：整条银心轨道进入画面，比例尺亮出真实半径与倍数。
      await scaled.getByRole('button', { name: '星系视角', exact: true }).click()
      await scaled.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneView === 'galactic')
      await scaled.waitForTimeout(600)
      assert.ok(Number(await scaledScene.getAttribute('data-scene-camera-distance')) > Number(await scaledScene.getAttribute('data-scene-galactic-radius')), 'galactic view frames the whole ring, not the system')
      const scaleCard = await scaled.locator('.galactic-scale').innerText()
      assert.match(scaleCard, /8\.277 kpc/, 'scale bar states the real galactic-centre distance')
      assert.match(scaleCard, /5,678 万倍/, 'scale bar states the computed Neptune-orbit ratio')
      const before = await scaledScene.getAttribute('data-scene-galactic-angle')
      await scaled.waitForTimeout(1500)
      assert.notEqual(await scaledScene.getAttribute('data-scene-galactic-angle'), before, 'the ring really carries the system around in galactic view')
      await scaled.getByRole('button', { name: '星系视角', exact: true }).click()
      await scaled.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneView === 'system')
    } finally {
      await scaled.close()
    }

    // Actions issued while images are delayed must reach the eventual controller.
    const delayed = await browser.newPage({ locale: 'zh-CN' })
    let release
    const gate = new Promise(resolve => { release = resolve })
    await delayed.route('**/assets/solar/*.webp', async route => { await gate; await route.continue() })
    try {
      await delayed.goto(url, { waitUntil: 'domcontentloaded' })
      await delayed.getByRole('button', { name: '探索太阳系', exact: true }).click()
      await delayed.getByRole('button', { name: '选择土星', exact: true }).click()
      await delayed.getByRole('button', { name: '暂停', exact: true }).click()
      release()
      await delayed.waitForFunction(() => { const s = document.querySelector('[data-scene-root]')?.dataset; return s?.sceneReady === 'true' && s.sceneSelected === 'saturn' && s.scenePaused === 'true' })
      await delayed.keyboard.press('Escape')
    } finally { release(); await delayed.close() }

    const missing = await browser.newPage({ locale: 'zh-CN' })
    await missing.route('**/assets/solar/earth_daymap.webp', route => route.fulfill({ status: 404, body: '' }))
    await missing.goto(url)
    await missing.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneFallback === 'active')
    assert.equal(await missing.getByRole('button', { name: '探索太阳系', exact: true }).isDisabled(), true)
    await missing.close()

    const short = await browser.newPage({ viewport: { width: 320, height: 568 }, locale: 'en-US', isMobile: true, hasTouch: true })
    await short.goto(url)
    await short.getByRole('button', { name: 'Explore the solar system', exact: true }).click()
    await short.getByRole('button', { name: 'Select Earth', exact: true }).click()
    const detail = short.locator('.body-detail')
    await short.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneSelected === 'earth')
    assert.ok((await detail.boundingBox()).height < 110, 'short screens reserve space for the planet')
    assert.equal(await short.locator('.body-facts').isVisible(), false)
    await short.getByRole('button', { name: 'Body details', exact: true }).tap()
    assert.equal(await short.locator('.body-facts').isVisible(), true, 'facts remain available on small screens')
    await short.getByRole('button', { name: 'Body details', exact: true }).tap()
    const touchTarget = await short.getByRole('button', { name: 'Select Earth', exact: true }).boundingBox()
    assert.ok(touchTarget.width >= 44 && touchTarget.height >= 44)
    await short.setViewportSize({ width: 844, height: 390 })
    await short.waitForTimeout(200)
    const infoBox = await detail.boundingBox(), picker = await short.locator('.planet-picker').boundingBox()
    assert.ok(infoBox.y + infoBox.height < picker.y, 'landscape controls and information do not overlap')
    await short.close()
    // 银道环开关必须真的改动画面的像素。这里用 reduced-motion 冻结渲染循环（只剩 invalidate()
    // 触发的单帧），并裁掉 y≥690 的区域把工具栏排除在外——否则按钮自身的高亮变化会让对比永远不相等。
    // 这个断言是有来历的：环的隐藏标记一度打在子节点 galacticRing 上，而开关切的是父级
    // galacticDisc，父级可见救不回 visible=false 的子节点，于是开关点了没反应。
    // 当时的浏览器测试对此零覆盖，直到逐像素比对才发现「属性变了、画面一个像素没变」。
    const ring = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', reducedMotion: 'reduce' })
    await ring.goto(url)
    await ring.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneReady === 'true')
    await ring.getByRole('button', { name: '探索太阳系', exact: true }).click()
    await ring.waitForTimeout(900)
    const clip = { x: 0, y: 0, width: 1440, height: 690 }
    const ringOff = await ring.screenshot({ clip })
    assert.equal(await ring.locator('[data-scene-root]').getAttribute('data-scene-galactic-ring'), 'false')
    await ring.getByRole('button', { name: '银道环', exact: true }).click()
    await ring.waitForTimeout(900)
    assert.equal(await ring.locator('[data-scene-root]').getAttribute('data-scene-galactic-ring'), 'true')
    const ringOn = await ring.screenshot({ clip })
    assert.ok(!ringOff.equals(ringOn), 'the galactic ring toggle must change pixels, not just its attribute')
    await ring.close()

    for (const [width, height] of [[800, 900], [820, 1180]]) {
      const tablet = await browser.newPage({ viewport: { width, height }, locale: 'en-US', reducedMotion: 'reduce' })
      await tablet.goto(url)
      await tablet.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneReady === 'true')
      assert.equal(await tablet.locator('[data-scene-root]').getAttribute('data-scene-outside-bodies'), 'none', `all eight planets fit the ${width}x${height} hero`)
      await tablet.close()
    }
    for (const [width, height] of [[1024, 400], [1440, 450], [1366, 768]]) {
      const shallow = await browser.newPage({ viewport: { width, height }, locale: 'en-US', reducedMotion: 'reduce' })
      await shallow.goto(url)
      await shallow.getByRole('button', { name: 'Explore the solar system', exact: true }).click()
      await shallow.getByRole('button', { name: 'Select Earth', exact: true }).click()
      await shallow.waitForFunction(() => document.querySelector('[data-scene-root]')?.dataset.sceneSelected === 'earth')
      const panel = await shallow.locator('.body-detail').boundingBox(), toolbar = await shallow.locator('.planet-picker').boundingBox()
      assert.ok(panel.y + panel.height < toolbar.y, `information clears the toolbar at ${width}x${height}`)
      assert.equal(await shallow.getByRole('button', { name: 'Body details', exact: true }).isVisible(), true)
      await shallow.close()
    }
    assert.deepEqual(errors, [], 'shader compilation must succeed')
    console.log('solar visual quality, camera flight and texture lifecycle passed')
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
