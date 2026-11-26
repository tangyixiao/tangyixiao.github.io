// 「问我的笔记」Worker 端单测：直接调用 notes-worker.js 导出的 handleAsk 纯函数，
// 通过替换全局 fetch 模拟智谱上游，不发起真实网络请求。
import assert from 'node:assert/strict'
import test from 'node:test'
import { handleAsk } from '../notes-worker.js'

const ALLOWED_ORIGIN = 'https://tangyixiao.github.io'
const LOCAL_ORIGIN = 'http://127.0.0.1:4173'

let ipCounter = 0
// 每个用例用独立 IP（限流是按 IP 每 10 秒 1 次的内存 Map），避免用例间互相限流。
function askRequest(body, origin = ALLOWED_ORIGIN) {
  ipCounter += 1
  return new Request('https://worker.example.com/api/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'CF-Connecting-IP': `10.0.0.${ipCounter}`,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function mockUpstream(status, payload) {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify(payload), { status })
  }
  return calls
}

test('正常路径：调用智谱 API 并返回 answer 与 model', async () => {
  const calls = mockUpstream(200, {
    choices: [{ message: { content: '《从一道题，到一份可复用的题解》讲前缀和。' } }],
  })
  const res = await handleAsk(askRequest({ question: '博客里讲了什么？' }), { ZHIPU_API_KEY: 'test-key' })
  const data = await res.json()

  assert.equal(res.status, 200)
  assert.equal(data.answer, '《从一道题，到一份可复用的题解》讲前缀和。')
  assert.equal(data.model, 'glm-4-flash')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://open.bigmodel.cn/api/paas/v4/chat/completions')
  const sent = JSON.parse(calls[0].init.body)
  assert.equal(sent.model, 'glm-4-flash')
  assert.equal(sent.temperature, 0.5)
  assert.equal(sent.max_tokens, 400)
  assert.equal(sent.messages[0].role, 'system')
  assert.ok(sent.messages[0].content.includes('唐一潇'))
  assert.equal(sent.messages[1].content, '博客里讲了什么？')
  assert.match(String(calls[0].init.headers.Authorization), /^Bearer test-key$/)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGIN)
})

test('API Key 未配置：返回 503 not_configured', async () => {
  const res = await handleAsk(askRequest({ question: '你好' }), {})
  assert.equal(res.status, 503)
  assert.deepEqual(await res.json(), { error: 'not_configured' })
})

test('问题超过 500 字：返回 400', async () => {
  const res = await handleAsk(askRequest({ question: '好'.repeat(501) }), { ZHIPU_API_KEY: 'test-key' })
  assert.equal(res.status, 400)
  assert.deepEqual(await res.json(), { error: 'question_too_long' })
})

test('CORS：放行站点与 127.0.0.1 本地端口，其余来源不下发 Allow-Origin', async () => {
  mockUpstream(200, { choices: [{ message: { content: 'ok' } }] })

  for (const origin of [ALLOWED_ORIGIN, LOCAL_ORIGIN]) {
    const res = await handleAsk(askRequest({ question: 'hi' }, origin), { ZHIPU_API_KEY: 'test-key' })
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin)
  }

  const foreign = await handleAsk(askRequest({ question: 'hi' }, 'https://evil.example.com'), { ZHIPU_API_KEY: 'test-key' })
  assert.equal(foreign.headers.get('Access-Control-Allow-Origin'), null)
})

test('限流：同一 IP 10 秒内第二次提问返回 429', async () => {
  mockUpstream(200, { choices: [{ message: { content: 'ok' } }] })
  const env = { ZHIPU_API_KEY: 'test-key' }
  const make = () => {
    ipCounter += 1
    return new Request('https://worker.example.com/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN, 'CF-Connecting-IP': '203.0.113.7' },
      body: JSON.stringify({ question: 'hi' }),
    })
  }
  const first = await handleAsk(make(), env)
  assert.equal(first.status, 200)
  const second = await handleAsk(make(), env)
  assert.equal(second.status, 429)
  assert.deepEqual(await second.json(), { error: 'rate_limited' })
})

test('上游失败：非 2xx 返回 502', async () => {
  mockUpstream(500, { error: 'boom' })
  const res = await handleAsk(askRequest({ question: 'hi' }), { ZHIPU_API_KEY: 'test-key' })
  assert.equal(res.status, 502)
  assert.deepEqual(await res.json(), { error: 'upstream_error' })
})

test('预检与非法输入：OPTIONS 返回 204，空问题与坏 JSON 返回 400', async () => {
  const preflight = new Request('https://worker.example.com/api/ask', {
    method: 'OPTIONS',
    headers: { Origin: ALLOWED_ORIGIN, 'Access-Control-Request-Method': 'POST' },
  })
  const optionsRes = await handleAsk(preflight, { ZHIPU_API_KEY: 'test-key' })
  assert.equal(optionsRes.status, 204)
  assert.equal(optionsRes.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGIN)

  ipCounter += 1
  const empty = await handleAsk(askRequest({ question: '   ' }), { ZHIPU_API_KEY: 'test-key' })
  assert.equal(empty.status, 400)

  ipCounter += 1
  const badJson = await handleAsk(askRequest('not-json'), { ZHIPU_API_KEY: 'test-key' })
  assert.equal(badJson.status, 400)
})
