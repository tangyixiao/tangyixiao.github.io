import { cp, mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
// 博客 HTML 现由 scripts/build-blog.mjs 生成到 dist/blog/（源文件在 blog-src/）。
// 注：原 sites-blog/（独立 Sites 发布目录）已归档至 homepage-archive 仓库；
// 本脚本仅用于按需重建本地静态副本，不再托管 Sites 发布流程。
const source = new URL('dist/blog/', root)
const target = new URL('sites-blog/dist/', root)
await readFile(new URL('index.html', source))
await mkdir(target, { recursive: true })
await cp(source, target, { recursive: true })
console.log(`Synced blog to ${fileURLToPath(target)}`)
