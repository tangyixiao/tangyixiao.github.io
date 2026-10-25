// 博客静态生成器：零依赖纯 Node。
// 读取 blog-src/*.md（YAML front-matter + Markdown 子集），
// 生成 dist/blog/index.html、dist/blog/posts/<slug>.html、dist/blog/rss.xml。
// URL 与旧版手工 HTML 完全一致；样式沿用 public/blog/assets（由 vite 拷贝）。
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'blog-src')
const outDir = path.join(root, 'dist', 'blog')

const SITE_URL = 'https://tangyixiao.github.io'
const BLOG_URL = SITE_URL + '/blog'
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23080b10'/%3E%3Cpath d='M16 5v22M5 16h22M8 8l16 16M8 24L24 8' stroke='%2384d5c8' stroke-width='2'/%3E%3C/svg%3E"
const SITE_DESCRIPTION = '唐一潇的个人博客。记录算法与竞赛、数学与物理、AI 与智能体的学习、推导和实验。'

// ---- 评论区（giscus，默认关闭）----
// 启用步骤：仓库开启 Discussions → 安装 giscus App（https://github.com/apps/giscus）
// giscus App 已安装、Discussions 已开启、repo-id / category-id 已回填：
// 评论区已启用（enabled: true）。想临时关闭：翻回 false 并重新 npm run build。
// 注入条件：enabled 为 true 且 repoId / categoryId 都非空；否则不输出任何评论区 DOM。
const COMMENTS = {
  enabled: true,
  repo: 'tangyixiao/tangyixiao.github.io',
  repoId: 'R_kgDORJ3d0A',
  category: 'General',
  categoryId: 'DIC_kwDORJ3d0M4DJgd0',
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ---- front-matter ----
function parseFrontMatter(text, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!match) throw new Error(`${file}: 缺少 YAML front-matter`)
  const meta = {}
  let currentKey = null
  for (const line of match[1].split(/\r?\n/)) {
    if (/^\s+-\s+/.test(line) && currentKey) {
      if (!Array.isArray(meta[currentKey])) meta[currentKey] = []
      meta[currentKey].push(line.replace(/^\s+-\s+/, '').trim())
      continue
    }
    const idx = line.indexOf(':')
    if (idx < 1) throw new Error(`${file}: 无法解析 front-matter 行「${line}」`)
    currentKey = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    meta[currentKey] = value === '' ? [] : value
  }
  for (const key of ['title', 'date', 'slug', 'description', 'summary']) {
    if (typeof meta[key] !== 'string' || !meta[key]) throw new Error(`${file}: front-matter 缺少 ${key}`)
  }
  if (!Array.isArray(meta.tags) || meta.tags.length === 0) throw new Error(`${file}: front-matter 缺少 tags`)
  return { meta, body: text.slice(match[0].length).replace(/^\r?\n/, '') }
}

// ---- 行内渲染（粗斜体 / 行内代码 / 链接 / 图片）----
function renderInline(raw) {
  const codes = []
  let text = raw.replace(/`([^`]+)`/g, (_, code) => {
    codes.push('<code>' + escapeHtml(code) + '</code>')
    return '\x00' + (codes.length - 1) + '\x00'
  })
  text = escapeHtml(text)
  text = text.replace(/!\[([^\]]*)\]\(([^()\s]+)\)/g, (_, alt, src) => `<img src="${src}" alt="${alt}">`)
  text = text.replace(/\[([^\]]+)\]\(([^()\s]+)\)/g, (m, label, href) => {
    const external = /^https?:\/\//.test(href)
    return `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`
  })
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  text = text.replace(/\x00(\d+)\x00/g, (_, i) => codes[Number(i)])
  return text
}

// ---- 块级渲染（标题 / 段落 / 围栏代码块 / 有序无序列表 / 引用）----
function renderMarkdown(md) {
  const lines = md.split(/\r?\n/)
  const out = []
  const headings = []
  let i = 0
  let para = []
  const flushPara = () => {
    if (para.length) {
      out.push('<p>' + para.map(renderInline).join('\n') + '</p>')
      para = []
    }
  }
  while (i < lines.length) {
    const line = lines[i]
    if (/^```/.test(line)) {
      flushPara()
      const buf = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++ }
      if (i >= lines.length) throw new Error('围栏代码块缺少结束 ```')
      i++
      out.push('<pre><code>' + escapeHtml(buf.join('\n')) + '</code></pre>')
      continue
    }
    const heading = /^(#{1,3})\s+(.+?)(?:\s+\{#([\w-]+)\})?$/.exec(line)
    if (heading) {
      flushPara()
      const [, hashes, text, id] = heading
      if (hashes === '##' && id) headings.push({ id, text })
      out.push(`<h${hashes.length}${id ? ` id="${id}"` : ''}>` + renderInline(text) + `</h${hashes.length}>`)
      i++
      continue
    }
    if (/^-\s+/.test(line)) {
      flushPara()
      const items = []
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push('<li>' + renderInline(lines[i].replace(/^-\s+/, '')) + '</li>')
        i++
      }
      out.push('<ul>' + items.join('') + '</ul>')
      continue
    }
    if (/^\d+\.\s+/.test(line)) {
      flushPara()
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push('<li>' + renderInline(lines[i].replace(/^\d+\.\s+/, '')) + '</li>')
        i++
      }
      out.push('<ol>' + items.join('') + '</ol>')
      continue
    }
    if (/^>\s?/.test(line)) {
      flushPara()
      const quotes = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quotes.push(renderInline(lines[i].replace(/^>\s?/, '')))
        i++
      }
      out.push('<blockquote>' + quotes.join('<br>') + '</blockquote>')
      continue
    }
    if (/^\s*$/.test(line)) { flushPara(); i++; continue }
    para.push(line)
    i++
  }
  flushPara()
  return { html: out.join(''), headings }
}

// ---- 读取文章 ----
function formatDate(date) {
  return date.replaceAll('-', '.')
}

function readingMinutes(text) {
  const chars = text.replace(/\s/g, '').length
  return Math.max(1, Math.ceil(chars / 450))
}

async function loadPosts() {
  const files = (await readdir(srcDir)).filter((file) => file.endsWith('.md')).sort()
  const posts = []
  for (const file of files) {
    const raw = await readFile(path.join(srcDir, file), 'utf8')
    const { meta, body } = parseFrontMatter(raw, file)
    const { html, headings } = renderMarkdown(body)
    // Markdown 正文的首段作为文章导语（article-lead），与旧版页面一样不进入 article-body。
    const lead = /^<p>([\s\S]*?)<\/p>/.exec(html)
    const bodyHtml = lead ? html.slice(lead[0].length).replace(/^\s*\n/, '') : html
    posts.push({
      ...meta,
      order: Number(meta.order ?? 0),
      leadHtml: lead ? lead[1] : renderInline(meta.description),
      bodyHtml,
      headings,
      minutes: readingMinutes(body),
    })
  }
  posts.sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? 1 : -1))
  return posts
}

// ---- 页面模板 ----
function postMetaRow(post) {
  return `<div class="post-meta"><span class="tag">${escapeHtml(post.tags[0])}</span><time datetime="${post.date}">${formatDate(post.date)}</time><span>约 ${post.minutes} 分钟</span></div>`
}

function commentsSection() {
  if (!COMMENTS.enabled || !COMMENTS.repoId || !COMMENTS.categoryId) return ''
  const attrs = [
    ['data-repo', COMMENTS.repo],
    ['data-repo-id', COMMENTS.repoId],
    ['data-category', COMMENTS.category],
    ['data-category-id', COMMENTS.categoryId],
    ['data-mapping', 'pathname'],
    ['data-strict', '0'],
    ['data-reactions-enabled', '1'],
    ['data-emit-metadata', '0'],
    ['data-input-position', 'top'],
    // 站点默认深色；下方内联脚本在 blog.js 切换 html[data-theme] 时把新主题同步给 giscus iframe。
    ['data-theme', 'dark'],
    ['data-lang', 'zh-CN'],
    ['data-loading', 'lazy'],
  ]
  const script = `<script src="https://giscus.app/client.js" ${attrs.map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(' ')} crossorigin="anonymous" async></script>`
  const sync = '<script>(function(){var root=document.documentElement;var send=function(){var frame=document.querySelector(\'iframe.giscus-frame\');if(!frame)return;frame.contentWindow.postMessage({giscus:{setConfig:{theme:root.dataset.theme===\'light\'?\'light\':\'dark\'}}},\'https://giscus.app\')};new MutationObserver(send).observe(root,{attributes:true,attributeFilter:[\'data-theme\']})})()</script>'
  return `<section class="comments" data-pagefind-ignore aria-label="文章评论">${script}${sync}</section>`
}

function postPage(post, prev, next) {
  const postUrl = `${BLOG_URL}/posts/${post.slug}.html`
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: 'zh-CN',
    author: { '@type': 'Person', name: '唐一潇', url: SITE_URL + '/' },
    mainEntityOfPage: postUrl,
    keywords: post.tags.join('、'),
  }
  const ldJson = JSON.stringify(ld).replace(/</g, '\\u003c')
  const comments = commentsSection()
  const toc = post.headings.length
    ? `<aside class="toc" aria-label="文章目录"><p class="eyebrow">ON THIS PAGE</p><ol>${post.headings.map((h) => `<li><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`).join('')}</ol></aside>`
    : ''
  return `<!doctype html>
<html lang="zh-CN" data-theme="dark">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#080b10">
<meta name="description" content="${escapeHtml(post.description)}"><title>${escapeHtml(post.title)} · 唐一潇</title>
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(post.title)}">
<meta property="og:description" content="${escapeHtml(post.description)}">
<meta property="og:url" content="${postUrl}">
<meta property="article:published_time" content="${post.date}">
<script type="application/ld+json">${ldJson}</script>
<link rel="alternate" type="application/rss+xml" title="唐一潇 · 个人博客" href="/blog/rss.xml"><link rel="icon" type="image/svg+xml" href="${FAVICON}"><link rel="stylesheet" href="../assets/blog.css"><script src="../assets/blog.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">跳到主要内容</a>
<header class="site-header wrap"><a class="brand" href="../index.html"><span class="brand-mark" aria-hidden="true">✳</span><span>唐一潇 <small>JOURNAL</small></span></a><nav aria-label="主导航"><a href="../index.html#writing">全部文章</a><a class="home-link" href="https://tangyixiao.github.io/">个人主页 ↗</a><button class="theme-toggle" type="button" aria-label="切换到浅色模式" hidden>☼</button></nav></header>
<main id="main" class="wrap">
<nav class="breadcrumb" aria-label="面包屑"><a href="../index.html">博客</a><span aria-hidden="true">/</span><span>${escapeHtml(post.tags[0])}</span></nav>
<div class="article-layout"><article data-pagefind-body><header>${postMetaRow(post)}<h1 class="article-title" data-pagefind-meta="title">${post.displayTitle ?? escapeHtml(post.title)}</h1><p class="article-lead">${post.leadHtml}</p></header>
<div class="article-body">
${post.bodyHtml}
</div><nav class="article-end" data-pagefind-ignore aria-label="文章导航"><a href="../index.html#writing">← 返回全部文章</a>${prev ? `<a href="${prev.slug}.html">← 上一篇：${escapeHtml(prev.title)}</a>` : ''}${next ? `<a href="${next.slug}.html">下一篇：${escapeHtml(next.title)} →</a>` : ''}</nav>${comments}
</article>${toc}</div>
</main>
<footer class="site-footer wrap"><div><span>© 2026 唐一潇</span><a href="https://tangyixiao.github.io/">个人主页 ↗</a></div></footer>
</body></html>
`
}

function indexPage(posts) {
  const rows = posts
    .map((post, idx) => `<article class="post-row"><span class="post-number" aria-hidden="true">${String(idx + 1).padStart(2, '0')}</span><div>${postMetaRow(post)}<h3><a href="posts/${post.slug}.html">${escapeHtml(post.title)}<span class="post-arrow" aria-hidden="true">↗</span></a></h3><p>${escapeHtml(post.summary)}</p></div></article>`)
    .join('\n        ')
  return `<!doctype html>
<html lang="zh-CN" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#080b10">
  <meta name="description" content="${SITE_DESCRIPTION}">
  <title>唐一潇 · 个人博客</title>
  <link rel="alternate" type="application/rss+xml" title="唐一潇 · 个人博客" href="rss.xml">
  <link rel="icon" type="image/svg+xml" href="${FAVICON}">
  <link rel="stylesheet" href="assets/blog.css">
  <script src="assets/blog.js" defer></script>
  <style>
    /* 全文搜索（Pagefind）：搜索框由 JS 揭示，无 JS 时保持隐藏。 */
    .blog-search{padding:26px 0 0;max-width:520px}
    .blog-search-input{width:100%;padding:12px 16px;font:inherit;font-size:13px;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:0}
    .blog-search-input:focus{outline:none;border-color:var(--accent)}
    .blog-search-input::placeholder{color:var(--muted)}
    .blog-search-results{display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--line);border-top:0}
    .blog-search-results[hidden]{display:none}
    .blog-search-item{display:block;padding:14px 16px;border-top:1px solid var(--line);font-size:12px;line-height:1.9;color:var(--muted)}
    .blog-search-item:first-child{border-top:0}
    .blog-search-item b{display:block;font-size:14px;font-weight:500;color:var(--ink);margin-bottom:4px}
    .blog-search-item:hover b,.blog-search-item:focus-visible b{color:var(--accent)}
    .blog-search-item mark{background:none;color:var(--gold);padding:0}
    .blog-search-empty{margin:0;padding:14px 16px;font-size:12px;color:var(--muted)}
  </style>
</head>
<body data-pagefind-ignore>
  <a class="skip-link" href="#main">跳到主要内容</a>
  <header class="site-header wrap">
    <a class="brand" href="index.html" aria-label="唐一潇博客首页"><span class="brand-mark" aria-hidden="true">✳</span><span>唐一潇 <small>JOURNAL</small></span></a>
    <nav aria-label="主导航"><a class="active" href="#writing">文章</a><a href="#about">关于</a><a class="home-link" href="https://tangyixiao.github.io/">个人主页 <span aria-hidden="true">↗</span></a><button class="theme-toggle" type="button" aria-label="切换到浅色模式" hidden>☼</button></nav>
  </header>
  <main id="main" class="wrap">
    <section class="intro" aria-labelledby="intro-title">
      <div class="intro-copy"><p class="eyebrow"><span class="signal" aria-hidden="true"></span> NOTES FROM A CURIOUS MIND</p><h1 id="intro-title">把探索，<br>写成<span>记录。</span></h1><p class="intro-description">算法里的思路，推导中的线索，实验后的思考。<br>在这里，把零散的好奇连成可以回看的轨迹。</p><div class="intro-bottom"><span>TANG YIXIAO / 个人博客</span><a href="#writing">开始阅读 <span aria-hidden="true">↓</span></a></div></div>
      <figure class="sky"><img src="assets/sky.webp" alt="" width="2048" height="1024" fetchpriority="high"><div class="sky-caption"><span>保持好奇，认真验证。</span><span class="mono">ALGORITHMS · MATH · AI</span></div><figcaption class="visually-hidden">沿用个人主页的星空纹理。图片来源见页脚。</figcaption></figure>
    </section>
    <section id="writing" class="writing" aria-labelledby="writing-title">
      <div class="section-label"><h2 id="writing-title">最近的记录</h2><span class="mono">WRITING / 001—${String(posts.length).padStart(3, '0')}</span></div>
      <div class="blog-search" data-pagefind-ignore>
        <input id="blog-search" class="blog-search-input" type="search" placeholder="搜索文章…" aria-label="搜索文章" autocomplete="off" hidden>
        <div id="blog-search-results" class="blog-search-results" hidden></div>
      </div>
      <div class="writing-layout"><div class="post-list">
        ${rows}
      </div><aside class="sidebar" aria-label="博客介绍"><p class="eyebrow">FIELD NOTES</p><h3>思考的途中，<br>留下一些坐标。</h3><p>围绕算法、数学与智能系统，记录能被检验、也能被继续使用的理解。</p><div class="fields"><span>01 <b>算法与竞赛</b></span><span>02 <b>数学与物理</b></span><span>03 <b>AI 与智能体</b></span></div><a class="quiet-link" href="https://github.com/tangyixiao" target="_blank" rel="noopener noreferrer">在 GitHub 查看项目 <span aria-hidden="true">↗</span></a></aside></div>
    </section>
    <section id="about" class="about" aria-labelledby="about-title"><div><p class="eyebrow">ABOUT THE JOURNAL</p><h2 id="about-title">保持好奇，<br>也认真验证。</h2></div><div class="about-copy"><p>我是唐一潇，关注算法、数学、物理与人工智能。个人主页展示正在探索的方向与项目，这里则用文章把思路展开。</p><p>从问题的拆解，到实现与推导，再到复盘与记录；希望每一篇文字，都能留下下一次继续探索的起点。</p><div class="about-links"><a href="https://tangyixiao.github.io/">回到个人主页 ↗</a><a href="https://www.luogu.com.cn/blog/TangyixiaoQAQ/" target="_blank" rel="noopener noreferrer">洛谷博客 ↗</a></div></div></section>
  </main>
  <footer class="site-footer wrap"><div><span>© 2026 唐一潇</span><span class="mono">KEEP EXPLORING.</span></div><div class="footer-small"><span>星空纹理：<a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">Solar System Scope</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · 已转为 WebP</span><a href="#main">回到顶部 ↑</a></div></footer>
  <script type="module">
    // 全文搜索：动态加载 Pagefind 索引（build 时由 pagefind 生成到 pagefind/）。
    // 加载失败（索引缺失或无 JS）时搜索框保持 hidden，列表页阅读不受影响。
    const input = document.getElementById('blog-search')
    const results = document.getElementById('blog-search-results')
    if (input && results) {
      try {
        const pagefind = await import('./pagefind/pagefind.js')
        // 结果链接是相对站点根（dist/blog）的路径，按当前页面位置补全前缀。
        const base = new URL('./', document.baseURI).pathname
        input.hidden = false
        let token = 0
        input.addEventListener('input', async () => {
          const query = input.value.trim()
          const current = ++token
          if (!query) { results.hidden = true; results.replaceChildren(); return }
          const found = await pagefind.search(query)
          const items = await Promise.all(found.results.slice(0, 8).map((result) => result.data()))
          if (current !== token) return
          const nodes = items.map((item) => {
            const link = document.createElement('a')
            link.className = 'blog-search-item'
            link.href = item.url.startsWith('/') ? item.url : base + item.url
            const title = document.createElement('b')
            title.textContent = item.meta?.title || item.url
            const excerpt = document.createElement('span')
            excerpt.innerHTML = item.excerpt || ''
            link.append(title, excerpt)
            return link
          })
          if (!nodes.length) {
            const empty = document.createElement('p')
            empty.className = 'blog-search-empty'
            empty.textContent = '没有找到相关文章。'
            nodes.push(empty)
          }
          results.replaceChildren(...nodes)
          results.hidden = false
        })
      } catch { /* 索引不可用时保持隐藏 */ }
    }
  </script>
</body>
</html>
`
}

function rssXml(posts) {
  const items = posts
    .map((post) => `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${BLOG_URL}/posts/${post.slug}.html</link>
      <guid isPermaLink="true">${BLOG_URL}/posts/${post.slug}.html</guid>
      <description>${escapeHtml(post.description)}</description>
      <pubDate>${new Date(post.date + 'T12:00:00Z').toUTCString()}</pubDate>
    </item>`)
    .join('\n')
  const lastBuild = posts.length ? new Date(posts[0].date + 'T12:00:00Z').toUTCString() : new Date().toUTCString()
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>唐一潇 · 个人博客</title>
    <link>${BLOG_URL}/</link>
    <description>${escapeHtml(SITE_DESCRIPTION)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${BLOG_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`
}

// ---- 主流程 ----
async function main() {
  const posts = await loadPosts()
  if (posts.length === 0) throw new Error('blog-src/ 中没有文章')
  await mkdir(path.join(outDir, 'posts'), { recursive: true })
  await writeFile(path.join(outDir, 'index.html'), indexPage(posts))
  await writeFile(path.join(outDir, 'rss.xml'), rssXml(posts))
  // posts 已按「日期新→旧」（同日按 order 小→大）排序：i-1 是更新一篇，i+1 是更旧一篇。
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    const prev = i + 1 < posts.length ? posts[i + 1] : null
    const next = i > 0 ? posts[i - 1] : null
    const html = postPage(post, prev, next)
    await writeFile(path.join(outDir, 'posts', `${post.slug}.html`), html)
  }
  console.log(`blog generated: ${posts.length} posts -> dist/blog/ (index, rss.xml, ${posts.map((p) => p.slug).join(', ')})`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
