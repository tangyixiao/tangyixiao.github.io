import { cp, mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const source = new URL('public/blog/', root)
const target = new URL('sites-blog/dist/', root)
await readFile(new URL('index.html', source))
await mkdir(target, { recursive: true })
await cp(source, target, { recursive: true })
console.log(`Synced blog to ${fileURLToPath(target)}`)

