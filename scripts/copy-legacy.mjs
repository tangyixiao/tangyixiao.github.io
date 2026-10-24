import { copyFile, cp, mkdir } from 'node:fs/promises'
const files = ['notes.html', 'login.html', 'register.html', 'thechao.html', 'thechaos.html', 'blackhole.html', 'threebody.html', 'auth.js', 'notes-worker.js', '.nojekyll']
await Promise.all(files.map((file) => cp(file, `dist/${file}`)))
await mkdir('dist/assets', { recursive: true })
await cp('assets', 'dist/assets', { recursive: true })
// history 路由的 GitHub Pages 回退：未知路径由 404.html（与 index.html 同源）接管，
// 应用引导后按 location.pathname 渲染对应版面（代价是该路径返回 404 状态码）。
await copyFile('dist/index.html', 'dist/404.html')
