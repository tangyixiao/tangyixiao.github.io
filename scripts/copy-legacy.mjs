import { cp, mkdir } from 'node:fs/promises'
const files = ['notes.html', 'login.html', 'register.html', 'thechao.html', 'thechaos.html', 'auth.js', 'notes-worker.js', '_config.yml', '.nojekyll']
await Promise.all(files.map((file) => cp(file, `dist/${file}`)))
await mkdir('dist/assets', { recursive: true })
await cp('assets', 'dist/assets', { recursive: true })
