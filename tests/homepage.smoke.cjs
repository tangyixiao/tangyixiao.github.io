const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { chromium } = require(path.join(process.env.CODEX_NODE_MODULES, 'playwright'));
const root = path.resolve(__dirname, '..', 'dist');

function serve() {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    const target = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = path.join(root, target);
    if (!file.startsWith(root) || !fs.existsSync(file)) return response.end('not found');
    if (file.endsWith('.js')) response.setHeader('content-type', 'text/javascript');
    if (file.endsWith('.css')) response.setHeader('content-type', 'text/css');
    response.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(18766, '127.0.0.1', () => resolve(server)));
}

async function main() {
  const server = await serve();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://127.0.0.1:18766/', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: /TANG\s*YI XIAO/i }).waitFor();
    assert.equal(await page.locator('a[href="/Code/"]').count(), 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto('http://127.0.0.1:18766/', { waitUntil: 'networkidle' });
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await mobile.getByRole('link', { name: /查看项目/i }).waitFor();
    console.log('homepage browser smoke passed');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
