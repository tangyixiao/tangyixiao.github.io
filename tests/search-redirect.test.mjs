import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

test('legacy root search links retain their exact query when redirected to the archive', () => {
  const html = readFileSync(new URL('../public/search.html', import.meta.url), 'utf8')
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  assert.ok(script, 'the redirect page needs a script')
  let destination
  const location = {
    search: '?searchtype=1&nodeId=20&Keyword=%u5BB6%u957F&fieldOption=title',
    hash: '#results',
    replace(value) { destination = value },
  }
  runInNewContext(script, { location })
  assert.equal(destination, '/Shaoxingyizhong/search.html?searchtype=1&nodeId=20&Keyword=%u5BB6%u957F&fieldOption=title#results')
})
