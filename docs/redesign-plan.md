# 网站视觉改版规划（v3 · 现代极简 · 全站统一）

> 状态：已立项，正在实施。方向由站点所有者于 2026-11-06 拍板：
> ① 风格走**现代极简**（中性灰阶 + 单一强调色，Linear/Vercel 式的克制产品感，暗亮双主题）；
> ② 范围是**全站统一**（主站 + 博客 + 笔记页 + 外围页面共用一套设计令牌）；
> ③ three.js 太阳系**保留但移出首页**，归入「3D 作品」展示。
>
> 本文档是所有改版 PR 的唯一规范：色彩、字体、圆角、动效的定稿值都写在 §4，
> 任何 PR 不得自行发明色值或字号；各 PR 的文件边界写在 §6，保证并行开发互不冲突。

---

## 1. 现状盘点：三套视觉系统

| 界面 | 形态 | 配色 | 字体 | 主题机制 |
| --- | --- | --- | --- | --- |
| 主站（React + Vite） | `src/index.css` 563 行 | 近黑 `#050507` + 青 `#6dd8d4` + 金 `#d5c29b` | 思源黑体/DejaVu Sans Mono（均非 Win/macOS 预装） | `html[data-theme]`，`site-theme` |
| 博客（build-blog.mjs 静态生成） | `public/blog/assets/blog.css` 单文件压缩 | `#080b10` + `#84d5c8` + `#ceba9b` | 微软雅黑 + Cascadia Code | `html[data-theme]`，独立脚本 |
| 笔记页（notes.html，自包含 672 行） | 内联 `<style>` | 蓝灰渐变 + `#3b71ca` | Segoe UI + FontAwesome 6 **beta** CDN | `body.dark`，独立机制 |
| 外围（login/register/blackhole/threebody/thechao/thechaos） | 各自为政 | 各自为政 | 各自为政 | 部分无 |

再叠加遗留的 `assets/css/home.css + assets/js/home.js`（copy-legacy 原样进 dist），
访客在一次浏览里会穿过至少三种气质完全不同的界面。

## 2. 问题清单（改版要消灭的）

- **P1 字体静默回退**：`src/index.css:14,61,64` 的字体栈里 `DejaVu Sans Mono`、`SFMono-Regular`、
  `Noto Serif CJK SC`、`Source Han Serif SC`、`Songti SC` 在 Windows 上全部不存在；
  标题实际回退到宋体，等宽标签回退到默认衬线——设计依赖访客没有的字体，全站零 webfont。
- **P2 三套令牌**：同一「强调色」在主站是 `#6dd8d4`、博客是 `#84d5c8`、笔记页是 `#3b71ca`；
  圆角出现 5–40px 共 15+ 种取值（`notes.html` 容器 40px、`index.css` 5–18px 混用）。
- **P3 不可读的小字**：等宽标签大量低于 12px——`.45rem`（7px，`.solar-credit`）、
  `.5rem`、`.52rem`、`.59rem`、`.64rem` 遍布 explorer 与页脚。
- **P4 CSS 自我覆盖**：`.hero` 的背景在 `src/index.css:70 / 274 / 456 / 518` 被定义/覆盖了 4 次；
  `:root` 与 `body` 重复声明同一 font-family；`.galactic-scale li b` 引用了**从未定义**的 `var(--fg)`。
- **P5 过时的视觉手法**：全局玻璃拟态（backdrop-filter 15–22px 无处不在）、卡片 3D 倾斜
  （`perspective + rotateX/rotateY` hover，index.css:285–310）、用字符当图标
  （✳ ◉ ✦ ∿ ☼ ☾ ☰ ✺）、FontAwesome 6 beta CDN（notes.html:12）。
- **P6 内容错误**：`notes.html` 与 `register.html` 的 `<title>` 把「唐一潇」写成「唐一笑」。
- **P7 首页性能税**：three chunk（约 565KB 未压缩）+ 22 张贴图仅为主页背景，
  现靠 1.5s 延迟挂载规避 LCP 污染（`src/App.tsx:18-36` 注释里记录了实测 23s 的教训）——
  背景移走后，这套规避代码也可以整体退役。

## 3. 目标与非目标

**目标**
1. 全站一套设计令牌、一套字体方案、一种主题机制（`html[data-theme]` + `site-theme`）。
2. 首页是干净的信息页：无 3D 背景，聚焦文字与作品；性能预算 LCP < 1.5s。
3. 太阳系完整保留（explorer、真实/艺术比例、星系视角全功能），入口移至「3D 作品」。
4. 深浅双主题 + `prefers-reduced-motion` + 键盘可达性全部保留。
5. 全站无 < 12px 文字；正文对比度 ≥ WCAG AA。

**非目标**
- 不改信息架构与路由（home/work/lab/focus/now/about/links/blog 都保留，仅 lab 重定位为 3D 作品展示并新增 /solar 路由）。
- 不动 Worker（`notes-worker.js` / `/api/ask`）、giscus、auth.js 的功能逻辑。
- 不改 `blog-src/*.md` 的内容。

## 4. 设计系统定稿（所有 PR 照抄，不得另造）

### 4.1 色彩令牌

```css
:root {
  /* 灰阶 · dark（默认跟随系统，dark 优先） */
  --bg: #0a0a0c;
  --surface: #131318;
  --surface-raised: #1b1b22;
  --line: rgba(255, 255, 255, .09);
  --line-strong: rgba(255, 255, 255, .16);
  --ink: #f4f4f6;          /* 主文字 */
  --ink-2: #a6a6b0;        /* 次级文字 */
  --ink-3: #73737e;        /* 标签/占位 */
  --accent: #8e9bff;       /* 唯一强调色（暗色下） */
  --accent-contrast: #0a0a0c;
  --accent-soft: rgba(142, 155, 255, .13);
  color-scheme: dark;
}
:root[data-theme='light'] {
  --bg: #ffffff;
  --surface: #f7f7f9;
  --surface-raised: #eeeef1;
  --line: rgba(16, 16, 28, .10);
  --line-strong: rgba(16, 16, 28, .18);
  --ink: #16161c;
  --ink-2: #55555e;
  --ink-3: #8b8b95;
  --accent: #4c5bf0;
  --accent-contrast: #ffffff;
  --accent-soft: rgba(76, 91, 240, .10);
  color-scheme: light;
}
```

规则：强调色每屏至多出现 2–3 处（主按钮、当前态、关键数字）；金色 `--gold` 全站退役；
语义色（成功/警告/危险）暂不需要。对比度：`--ink/--bg ≥ 15:1`、`--ink-2/--bg ≥ 5:1`、
`--ink-3` 仅用于 ≥ 12px 的非关键标签。

### 4.2 字体

- 拉丁：自托管 `@fontsource-variable/inter`（正文/UI）与 `@fontsource-variable/jetbrains-mono`（等宽），
  `font-display: swap`，vite 打包 woff2，无外部 CDN。
- CJK：走系统栈，不做 webfont 子集（中文全量字体 3–8MB，得不偿失）：
  `'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif`。
- 退役全部衬线标题（Noto Serif/Songti/Georgia）与宋体回退——现代极简风无衬线。

```css
--font-sans: 'Inter Variable', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif;
--font-mono: 'JetBrains Mono Variable', 'Cascadia Code', Consolas, monospace;
```

字号阶（rem）：`.75 / .8125 / .875 / 1 / 1.125 / 1.375 / 1.75 / 2.25 / 3 / 3.75`；
display 级（hero h1）`clamp(2.5rem, 5.5vw, 4rem)`。**最小 12px**。
行高：正文（CJK）1.9、UI 1.6、标题 1.25。CJK 禁用负字距；拉丁 display 至多 `-0.02em`。

### 4.3 几何与动效

- 间距基数 4px；区块纵向留白 `clamp(64px, 10vw, 120px)`；内容列 `max-width: 1200px`。
- 圆角只有 4 档：`--radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-full: 999px`。
- 阴影：light 用 `--shadow-sm/md`（两档柔和阴影），dark 用 1px `--line` 描边替代阴影，不发光。
- 动效：仅 `opacity/transform`，`--dur-fast: 150ms`、`--dur: 250ms`、
  `--ease: cubic-bezier(.2, .8, .2, 1)`；`prefers-reduced-motion` 下全量禁用（现有机制保留）。
- **移除**：backdrop-filter 玻璃拟态（顶部导航允许保留唯一一处
  `color-mix(bg 88%, transparent)` + `blur(12px)`）、卡片 3D 倾斜、文字发光、透视 hover。
- 图标：内联 SVG，16/20px，`stroke: currentColor; stroke-width: 1.6`，round cap；
  需要的集合：sun、moon、menu、x、arrow-up-right、arrow-down、external、play、pause、
  plus、minus、reset、orbit（太阳系）。字符图标（✳◉✦∿☼☾☰✺）全部退役。

### 4.4 组件基线

- 主按钮：`background: var(--accent); color: var(--accent-contrast); border-radius: var(--radius-sm); padding: 10px 16px; font-weight: 600`；hover 提亮 6%，active 下压 1px。
- 次按钮：1px `--line-strong` 描边、透明底、hover 边框变 `--ink-3`。
- 卡片：`background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md)`；hover 边框升 `--line-strong` + `translateY(-2px)`，无阴影无倾斜。
- 顶部导航：高 64px，`border-bottom: 1px solid var(--line)`，内容列 1200px；移动端抽屉式菜单保留。
- eyebrow 标签：`--font-mono`、12px、大写、`letter-spacing: .08em`、`--ink-3`。

## 5. 各界面改版方案

### 5.1 首页（结构性变化）
- **彻底移除** three.js 场景：删 `SceneLayer`/`useIdleScene`/`SCENE_MOUNT_DELAY`/
  `solar-invitation` 区块及全部相关 state（App.tsx），hero 背景收敛为一条纯色规则
  （可加 6% 透明度 `--accent-soft` 的单枚 radial，右上角，仅此一处）。
- hero 单列左对齐：eyebrow → h1（display 级）→ 一句话 headline → 两枚按钮 →
  底部一行次要链接；删除 `hero-bottom` 的装饰性坐标文案。
- 首屏之下给「精选作品 ×3」「3D 作品 ×3」各一个横排入口区，其余版面（focus/now/about/links）只换肤不动结构。

### 5.2 /solar（新路由）+ /lab 重定位为「3D 作品」
- 新路由 `/solar`：整页太阳系体验（复用现有 `UniverseCanvas + SolarExplorer` 全部能力，
  面板/工具栏按 §4 换肤），关闭按钮 → 返回 `/lab`。
- `/lab` 从「实验室卡片」重定位为**3D 作品展示**：每作品一张卡（16:9 海报区 + 名称 + 一句话），
  成员：太阳系（`/solar`）、黑洞（blackhole.html）、三体（threebody.html）、
  双摆（thechao.html / thechaos.html）、鹈鹕（/pelican/）。
- 海报区不引入新资源：用 CSS 渐变 + 一枚 SVG 轨道图形（`--accent` 线稿）即可；
  保留 `useSpatialCards`？——否，3D 倾斜手法全站退役，相关代码一并删除。
- 现有测试（`tests/solar-*.cjs`、`tests/homepage-*.cjs/js`）随流程改动同步迁移。

### 5.3 work / focus / now / about / links
- 只换肤不改 DOM 结构：卡片、按钮、标签按 §4.4；`project-art` 的伪 3D 插画
  （span/i/b 组合）换成单一 SVG 线稿图标 + 序号排版。

### 5.4 博客（M2）
- `public/blog/assets/blog.css` 以 §4 令牌重写（当前是压缩单文件，重写为可维护的分行格式）。
- 字体：把 node_modules 里的 Inter/JetBrains Mono latin woff2 拷入 `public/blog/assets/fonts/`
  并 `@font-face` 引入（与主站同一字重体系）。
- 文章页：正文 16px/1.9，代码块浅深两套配色（基于 surface/line），TOC sticky 保留。
- giscus 主题跟随：`blog.js` 在切换主题时向 giscus iframe postMessage
  `{ setConfig: { theme } }`（若已有等价逻辑则对齐）。
- `scripts/build-blog.mjs` 仅在模板类名/结构必要时微调，不改文章生成逻辑与 URL。

### 5.5 笔记页与外围（M3）
- `notes.html`：内联样式按 §4 重写；删 FontAwesome CDN（图标换内联 SVG）；
  `body.dark` → `html[data-theme]`，存储键统一为 `site-theme`；修「唐一笑→唐一潇」。
- `login.html` / `register.html`：同一套令牌的极简表单页，修错别字。
- `blackhole/threebody/thechao/thechaos.html`：**画布与物理逻辑一行不动**，
  仅统一页头（返回 /lab 链接 + 标题）与 `theme-color`，配少量令牌化 CSS。

### 5.6 收尾（M4）
- favicon/OG 图随新强调色重生成（`npm run og` / `npm run icons`，脚本如需调色值则小改）。
- `public/manifest.webmanifest` 的 `theme_color/background_color`、index.html 的
  `meta[name=theme-color]`、`scripts/build-blog.mjs` 里的 favicon data-URI 统一为新色。
- README/docs 与实际对齐；跑全量验证。

## 6. 实施分期与文件边界（并行开发的冲突隔离）

| 期 | 内容 | 独占文件 | 执行 |
| --- | --- | --- | --- |
| PR#1 | 本规划文档 | `docs/redesign-plan.md` | 主会话 |
| M0 | 令牌底座 + 字体 + 主站 index.css 重写 | `package.json/-lock`、`src/main.tsx`、`src/styles/tokens.css`（新）、`src/index.css`、`index.html`、`eslint.config.mjs`、`.gitignore`、`src/App.tsx`（仅 theme-color 常量一行） | 主会话 |
| M2 | 博客换肤 | `public/blog/assets/**`、`scripts/build-blog.mjs` | 子代理（与 M0 并行，文件不相交） |
| M3 | notes/登录/注册/实验页壳 | `notes.html`、`login.html`、`register.html`、`blackhole.html`、`threebody.html`、`thechao.html`、`thechaos.html` | 子代理（与 M0/M2 并行） |
| M1 | 首页去 3D + /solar + /lab 重定位 + 测试迁移 | `src/App.tsx`、`src/visual/*`、`src/site/*`、`tests/*` | 子代理（**必须等 M0 合并后**基于新 main） |
| M4 | 打磨与回归 | `scripts/generate-*`、`public/manifest.webmanifest`、`public/favicon.svg`、`README.md` | 主会话（最后） |

每个 PR 的合并门槛（本地 + CI 双重）：
`npm ci && npm run build && npm run lint && npm run typecheck && npm run test:unit`
（CI 额外跑 `test:browser`、死链检查；M1 还须本地跑通改后的 browser 测试）。

## 7. 风险与对策

- **CJK 字体观感参差**（Win 微软雅黑 / mac 苹方）：接受系统栈差异，不引入大字体；
  排版节奏靠字号阶与行高统一兜底。
- **测试是旧结构的镜子**：`homepage-redesign.cjs`、`solar-*.cjs` 断言旧 DOM
  （如首页的 `.solar-invitation`），M1 必须同步重写，绝不允许为保测试跳过删场景。
- **并行分支冲突**：严格按 §6 文件边界；M2/M3 与 M0 完全不相交，M1 排在 M0 之后。
- **linkinator 死链**：新增 `/solar` 路由链接与既有 `/work` 同机制（404.html 兜底），
  合并前以 CI 结果为准。
- **giscus iframe 主题**：若 postMessage 方案在 CI 无法验证，至少保证博客自身双主题正确。

## 8. 总验收清单

- [ ] 主站 → 博客 → 笔记页 → 登录页切换：同一套色彩/字体/圆角/主题机制，无「换站感」。
- [ ] 首页零 three.js 依赖（构建产物里 three chunk 只被 /solar 与实验页引用）。
- [ ] `/solar` 完整承载太阳系（比例切换、星系视角、天体面板全可用）。
- [ ] 全站无 FontAwesome、无外部字体/图标 CDN、无 < 12px 文字、无 `var(--fg)` 类未定义变量。
- [ ] 深浅双主题 + reduced-motion + 键盘焦点环全站可用。
- [ ] `npm run build / lint / typecheck / test:unit / test:browser` 全绿，CI 绿。
- [ ] 首页 Lighthouse LCP < 1.5s（CI Lighthouse 报告佐证）。
- [ ] 「唐一笑」错别字清零。
