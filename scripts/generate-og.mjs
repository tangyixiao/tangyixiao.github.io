// 生成 Open Graph 主图（1200×630 PNG），风格对齐主站 hero：
// 深色太空底 + 轨道线圈 + 品牌标记 ✳ + 站名 + 副标题 + SOL 坐标点缀。
// 用法：npm run og（需要 playwright chromium：npx playwright install chromium）
import { chromium } from 'playwright'
import { stat, writeFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'public', 'og-image.png')
const WIDTH = 1200
const HEIGHT = 630

// 设计令牌：与 src/index.css 的 :root 保持一致
const C = {
  bg: '#050507',
  ink: '#f5f8fa',
  muted: '#a8bdc9',
  teal: '#6dd8d4',
  gold: '#d5c29b',
  line: 'rgba(187, 218, 231, .15)',
}
const MONO = "Consolas, 'DejaVu Sans Mono', 'SFMono-Regular', monospace"
const SANS = "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', 'Source Han Sans CN', sans-serif"

// 确定性星点（伪随机，保证每次生成结果一致）
function seededRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const rand = seededRandom(20261024)
const stars = Array.from({ length: 90 }, () => ({
  x: +(rand() * WIDTH).toFixed(1),
  y: +(rand() * HEIGHT).toFixed(1),
  r: +(0.5 + rand() * 1.1).toFixed(2),
  o: +(0.12 + rand() * 0.5).toFixed(2),
}))
  .map((s) => `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${C.ink}" opacity="${s.o}"/>`)
  .join('')

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
  body {
    position: relative;
    background:
      radial-gradient(900px 520px at 82% 18%, rgba(109, 216, 212, .07), transparent 62%),
      radial-gradient(700px 420px at 8% 96%, rgba(213, 194, 155, .05), transparent 60%),
      ${C.bg};
    color: ${C.ink};
    font-family: ${SANS};
  }
  .stars { position: absolute; inset: 0; }
  .frame { position: absolute; inset: 34px; border: 1px solid ${C.line}; }
  .corner { position: absolute; width: 14px; height: 14px; }
  .corner.tl { top: 34px; left: 34px; border-top: 1px solid rgba(109,216,212,.55); border-left: 1px solid rgba(109,216,212,.55); }
  .corner.tr { top: 34px; right: 34px; border-top: 1px solid rgba(109,216,212,.55); border-right: 1px solid rgba(109,216,212,.55); }
  .corner.bl { bottom: 34px; left: 34px; border-bottom: 1px solid rgba(109,216,212,.55); border-left: 1px solid rgba(109,216,212,.55); }
  .corner.br { bottom: 34px; right: 34px; border-bottom: 1px solid rgba(109,216,212,.55); border-right: 1px solid rgba(109,216,212,.55); }

  /* 轨道线圈：呼应 hero 的 .diagram-orbit */
  svg.orbits { position: absolute; right: -140px; top: 50%; transform: translateY(-50%); }
  .label { position: absolute; font: 500 11px/1.4 ${MONO}; letter-spacing: .18em; color: ${C.gold}; opacity: .85; }
  .label.l1 { right: 96px; top: 118px; }
  .label.l2 { right: 300px; top: 236px; }
  .label.l3 { right: 168px; bottom: 132px; }

  .content { position: absolute; left: 88px; top: 0; height: 100%; display: flex; flex-direction: column; justify-content: center; }
  .brand { position: absolute; left: 88px; top: 66px; display: flex; align-items: center; gap: 14px; font-size: 17px; font-weight: 650; letter-spacing: .04em; }
  .brand .mark { color: ${C.teal}; font-size: 22px; font-weight: 400; line-height: 1; }
  .site { position: absolute; right: 88px; top: 70px; font: 500 12px/1 ${MONO}; letter-spacing: .14em; color: ${C.muted}; opacity: .75; }

  .eyebrow { display: flex; align-items: center; gap: 12px; margin-bottom: 26px; color: ${C.teal}; font: 600 13px/1.4 ${MONO}; letter-spacing: .22em; }
  .eyebrow .dot { width: 7px; height: 7px; border-radius: 50%; background: ${C.teal}; box-shadow: 0 0 12px rgba(109, 216, 212, .9); }
  h1 { margin: 0 0 22px; font-size: 108px; font-weight: 600; line-height: 1.1; letter-spacing: -.05em; }
  .sub { margin: 0 0 30px; font-size: 27px; font-weight: 450; letter-spacing: .08em; color: ${C.ink}; }
  .sub .sep { color: ${C.teal}; margin: 0 12px; }
  .rule { width: 64px; height: 2px; background: linear-gradient(90deg, ${C.teal}, transparent); margin-bottom: 18px; }
  .alt { font: 500 12px/1.5 ${MONO}; letter-spacing: .2em; color: ${C.muted}; }

  .footer { position: absolute; left: 88px; right: 88px; bottom: 64px; display: flex; justify-content: space-between; align-items: baseline; font: 500 12px/1.4 ${MONO}; letter-spacing: .16em; color: ${C.muted}; }
  .footer .sol { color: ${C.gold}; }
</style></head>
<body>
  <svg class="stars" width="${WIDTH}" height="${HEIGHT}">${stars}</svg>
  <div class="frame"></div>
  <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>

  <svg class="orbits" width="760" height="760" viewBox="0 0 760 760" fill="none">
    <g transform="translate(380 380) rotate(-24) scale(1 .75)">
      <ellipse rx="330" ry="330" stroke="rgba(109,216,212,.32)" stroke-width="1"/>
      <circle cx="330" cy="0" r="5" fill="${C.teal}"/>
    </g>
    <g transform="translate(380 380) rotate(32) scale(1 .9)">
      <ellipse rx="252" ry="252" stroke="rgba(213,194,155,.32)" stroke-width="1"/>
      <circle cx="-252" cy="0" r="4" fill="${C.gold}"/>
    </g>
    <circle cx="380" cy="380" r="26" fill="rgba(213,194,155,.16)"/>
    <circle cx="380" cy="380" r="9" fill="${C.gold}"/>
  </svg>
  <span class="label l1">MERCURY → NEPTUNE</span>
  <span class="label l2">PERIHELION</span>
  <span class="label l3">APHELION +∞</span>

  <div class="brand"><span class="mark">✳</span><span>唐一潇 · Tang Yixiao</span></div>
  <div class="site">tangyixiao.github.io</div>

  <div class="content">
    <p class="eyebrow"><span class="dot"></span>PERSONAL SITE</p>
    <h1>唐一潇</h1>
    <p class="sub">算法<span class="sep">·</span>数学<span class="sep">·</span>智能系统</p>
    <div class="rule"></div>
    <p class="alt">ALGORITHMS / MATHEMATICS / INTELLIGENT SYSTEMS</p>
  </div>

  <div class="footer">
    <span class="sol">SOL / 8 PLANETS / ∞ CURIOSITY</span>
    <span>✺ SOLAR SYSTEM / ◉ BLACKHOLE / ✦ THREE-BODY</span>
  </div>
</body></html>`

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 })
  // 用临时文件而非 data: URL，避免大 HTML 撞上 data: 长度限制
  const dir = await mkdtemp(join(tmpdir(), 'og-'))
  const file = join(dir, 'og.html')
  await writeFile(file, html, 'utf8')
  await page.goto('file:///' + file.replace(/\\/g, '/'))
  await page.waitForTimeout(150) // 等字体渲染稳定
  await page.screenshot({ path: OUT, type: 'png' })
} finally {
  await browser.close()
}

const { size } = await stat(OUT)
console.log(`og-image 已生成: ${OUT}`)
console.log(`尺寸: ${WIDTH}x${HEIGHT}, 体积: ${(size / 1024).toFixed(1)} KB`)
if (size > 500 * 1024) {
  console.error('PNG 超过 500KB，请改用 JPEG 导出并同步 index.html 的 og:image 引用')
  process.exit(1)
}
