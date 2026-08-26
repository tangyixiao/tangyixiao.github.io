import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assetDirectory = path.join(root, 'dist', 'assets')
const assets = await readdir(assetDirectory)
const initial = assets.find((file) => /^index-[^/]+\.js$/.test(file))
const scene = assets.find((file) => /^DeepSeaCanvas-[^/]+\.js$/.test(file))
const three = assets.find((file) => /^three\.module-[^/]+\.js$/.test(file))

assert.ok(initial, 'production build must contain the initial app chunk')
assert.ok(scene, 'production build must contain a distinct scene chunk')
assert.ok(three, 'production build must contain a distinct Three.js chunk')

const [initialSource, sceneSource, threeSource] = await Promise.all([
  readFile(path.join(assetDirectory, initial), 'utf8'),
  readFile(path.join(assetDirectory, scene), 'utf8'),
  readFile(path.join(assetDirectory, three), 'utf8'),
])

assert.equal(initialSource.includes('WebGLRenderer'), false, 'initial app chunk must not eagerly absorb Three.js')
assert.match(sceneSource, /three\.module-[^"']+\.js/, 'scene chunk must reference the Three.js chunk')
assert.match(threeSource, /WebGLRenderer/, 'Three.js chunk must contain the renderer')
console.log(`lazy chunks passed: ${initial} ${scene} ${three}`)
