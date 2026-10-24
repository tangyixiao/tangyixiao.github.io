// 生成 PWA 应用图标（PNG）：icon-192 / icon-512 / maskable-512 / apple-touch-icon。
// 风格对齐 scripts/generate-og.mjs：#050507 深色太空底 + 确定性星点 + 品牌标记 ✳ + 站名。
// maskable 变体把全部内容收进中央 ~80% 安全区，底色满幅延伸，避免各平台裁切丢内容。
// 用法：npm run icons（需要 playwright chromium：npx playwright install chromium）
import { chromium } from 'playwright'
import { stat, writeFile, mkdtemp, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(root, 'public', 'icons')
const PUBLIC_DIR = join(root, 'public')

// 设计令牌：与 generate-og.mjs / src/index.css 保持一致
const C = {
  bg: '#050507',
  ink: '#f5f8fa',
  muted: '#a8bdc9',
  teal: '#6dd8d4',
  gold: '#d5c29b',
}
const MONO = "Consolas, 'DejaVu Sans Mono', 'SFMono-Regular', monospace"
const SANS = "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', 'Source Han Sans CN', sans-serif"

const ICONS = [
  { file: 'icon-192.png', dir: 'icons', size: 192, safe: 1 },
  { file: 'icon-512.png', dir: 'icons', size: 512, safe: 1 },
  { file: 'maskable-512.png', dir: 'icons', size: 512, safe: 0.8 },
  // iOS 惯例放在站点根路径，与 index.html 的 <link rel="apple-touch-icon" href="/apple-touch-icon.png"> 对应
  { file: 'apple-touch-icon.png', dir: '.', size: 180, safe: 1 },
]

// 确定性星点（伪随机，保证每次生成结果一致）
function seededRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function buildHtml({ size, safe }) {
  const S = size
  // 内容收进中央 safe 比例的方形安全区（maskable 为 ~80%）
  const box = Math.round(S * safe)
  const pad = Math.round((S - box) / 2)
  const rand = seededRandom(20261024)
  const starCount = Math.round(S * S * 0.022)
  const stars = Array.from({ length: starCount }, () => ({
    x: +(rand() * S).toFixed(1),
    y: +(rand() * S).toFixed(1),
    r: +((S / 512) * (0.5 + rand() * 1.1)).toFixed(2),
    o: +(0.12 + rand() * 0.5).toFixed(2),
  }))
    .map((s) => `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${C.ink}" opacity="${s.o}"/>`)
    .join('')

  // 字号随画布与安全区比例缩放
  const mark = Math.round(box * 0.4)
  const name = Math.round(box * 0.21)
  const alt = Math.round(box * 0.075)

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${S}px; height: ${S}px; overflow: hidden; }
  body {
    position: relative;
    background:
      radial-gradient(${S * 0.9}px ${S * 0.55}px at 78% 16%, rgba(109, 216, 212, .08), transparent 62%),
      radial-gradient(${S * 0.7}px ${S * 0.45}px at 10% 92%, rgba(213, 194, 155, .06), transparent 60%),
      ${C.bg};
    color: ${C.ink};
    font-family: ${SANS};
  }
  .stars { position: absolute; inset: 0; }
  .content {
    position: absolute; left: ${pad}px; top: ${pad}px;
    width: ${box}px; height: ${box}px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .mark { color: ${C.teal}; font-size: ${mark}px; line-height: 1; text-shadow: 0 0 ${Math.round(box * 0.09)}px rgba(109, 216, 212, .55); }
  .name { margin-top: ${Math.round(box * 0.09)}px; font-size: ${name}px; font-weight: 600; letter-spacing: .1em; line-height: 1.1; }
  .alt { margin-top: ${Math.round(box * 0.06)}px; font: 500 ${alt}px/1 ${MONO}; letter-spacing: .28em; color: ${C.muted}; text-indent: .28em; }
  .rule { margin-top: ${Math.round(box * 0.07)}px; width: ${Math.round(box * 0.3)}px; height: 2px; background: linear-gradient(90deg, transparent, ${C.gold}, transparent); }
</style></head>
<body>
  <svg class="stars" width="${S}" height="${S}">${stars}</svg>
  <div class="content">
    <span class="mark">✳</span>
    <span class="name">唐一潇</span>
    <span class="rule"></span>
    <span class="alt">TANG YIXIAO</span>
  </div>
</body></html>`
}

await mkdir(OUT_DIR, { recursive: true })
const browser = await chromium.launch()
try {
  for (const icon of ICONS) {
    const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size }, deviceScaleFactor: 1 })
    try {
      // 用临时文件而非 data: URL，避免大 HTML 撞上 data: 长度限制
      const dir = await mkdtemp(join(tmpdir(), 'icon-'))
      const file = join(dir, 'icon.html')
      await writeFile(file, buildHtml(icon), 'utf8')
      await page.goto('file:///' + file.replace(/\\/g, '/'))
      await page.waitForTimeout(150) // 等字体渲染稳定
      const out = join(icon.dir === '.' ? PUBLIC_DIR : OUT_DIR, icon.file)
      await page.screenshot({ path: out, type: 'png' })
      const { size } = await stat(out)
      const rel = icon.dir === '.' ? `public/${icon.file}` : `public/icons/${icon.file}`
      console.log(`已生成: ${rel} (${icon.size}x${icon.size}, ${(size / 1024).toFixed(1)} KB)`)
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
