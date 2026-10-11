// 一次性生成 public/og-image.png（1200×630 分享缩略图）。
// 运行：node scripts/generate-og-image.mjs（需要 Playwright Chromium，CI 里已安装）
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const WIDTH = 1200
const HEIGHT = 630

// 与 tests/homepage.smoke.cjs 相同的兜底逻辑：优先使用系统 Chrome，避免下载 Playwright Chromium
const chromeCandidates = [
  process.env.CHROME_PATH,
  process.env.CHROMIUM_PATH,
  chromium.executablePath(),
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
].filter(Boolean)
const executablePath = chromeCandidates.find((candidate) => existsSync(candidate))

const html = `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden;
    font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
    background: linear-gradient(135deg, #08131f 0%, #0c1f30 55%, #11304a 100%);
    color: #eef4fb; position: relative;
  }
  .glow {
    position: absolute; top: -180px; right: -120px; width: 640px; height: 640px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(109, 216, 212, 0.16) 0%, rgba(109, 216, 212, 0) 65%);
  }
  .glow-blue {
    position: absolute; bottom: -220px; left: -160px; width: 560px; height: 560px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(126, 155, 215, 0.14) 0%, rgba(126, 155, 215, 0) 65%);
  }
  .star { position: absolute; border-radius: 50%; }
  .content { position: absolute; left: 96px; top: 50%; transform: translateY(-50%); }
  .site {
    color: #6dd8d4; font-size: 21px; font-weight: 600;
    letter-spacing: 0.32em; text-transform: uppercase;
  }
  .name { font-size: 96px; font-weight: 700; line-height: 1.15; margin-top: 26px; }
  .alt-name { font-size: 34px; color: #7e9bd7; margin-top: 6px; }
  .divider { width: 96px; height: 3px; background: #d5c29b; border-radius: 2px; margin: 34px 0; }
  .tagline { font-size: 38px; font-weight: 600; color: #d5c29b; }
  .tagline-en { font-size: 22px; color: #8fa8c8; margin-top: 12px; }
  svg.constellation { position: absolute; right: 88px; top: 50%; transform: translateY(-50%); opacity: 0.9; }
</style>
</head>
<body>
  <div class="glow"></div>
  <div class="glow-blue"></div>
  <div id="stars"></div>
  <svg class="constellation" width="330" height="330" viewBox="0 0 64 64">
    <g stroke="#7e9bd7" stroke-width="0.45" opacity="0.55">
      <path d="M14 42 L32 20 L50 31 M32 20 L24 50" fill="none"/>
    </g>
    <circle cx="14" cy="42" r="3.2" fill="#6dd8d4"/>
    <circle cx="32" cy="20" r="2.4" fill="#7e9bd7"/>
    <circle cx="50" cy="31" r="3.8" fill="#d5c29b"/>
    <circle cx="24" cy="50" r="1.8" fill="#6dd8d4" opacity="0.8"/>
  </svg>
  <div class="content">
    <div class="site">tangyixiao.github.io</div>
    <div class="name">唐一潇</div>
    <div class="alt-name">Tang Yixiao</div>
    <div class="divider"></div>
    <div class="tagline">算法 · 数学 · 智能系统</div>
    <div class="tagline-en">Algorithms · Mathematics · Intelligent Systems</div>
  </div>
  <script>
    // 与粒子宇宙呼应的星点背景
    const tints = ['#6dd8d4', '#7e9bd7', '#d5c29b', '#ffffff']
    for (let i = 0; i < 110; i++) {
      const star = document.createElement('div')
      star.className = 'star'
      const size = 1 + Math.random() * 2
      star.style.cssText =
        \`left:\${(Math.random() * 100).toFixed(2)}%;top:\${(Math.random() * 100).toFixed(2)}%;\` +
        \`width:\${size.toFixed(2)}px;height:\${size.toFixed(2)}px;\` +
        \`background:\${tints[Math.floor(Math.random() * tints.length)]};\` +
        \`opacity:\${(0.2 + Math.random() * 0.6).toFixed(2)};\`
      document.getElementById('stars').appendChild(star)
    }
  </script>
</body>
</html>`

async function main() {
  if (!executablePath) throw new Error('未找到可用的 Chrome/Chromium，请设置 CHROME_PATH')
  const browser = await chromium.launch({ executablePath })
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await mkdir('public', { recursive: true })
  await page.screenshot({ path: 'public/og-image.png' })
  await browser.close()
  console.log('public/og-image.png written')
}

main()
