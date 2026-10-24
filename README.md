# 唐一潇 · Tang Yixiao 个人网站

个人主页与博客站点，部署于 GitHub Pages：<https://tangyixiao.github.io/>

## 简介

基于 **Vite + React 19 + Three.js** 构建的个人网站，主要内容包括：

- **个人主页**：中英双语（跟随浏览器语言，偏好存于 localStorage）、明暗双主题（跟随系统 `prefers-color-scheme`，可手动切换）；使用 hash 路由的五个区块（home / work / focus / about / links），Three.js 宇宙背景按需懒加载；
- **太阳系探索器**：Three.js 驱动的交互式太阳系，行星轨道、自转周期与天体大小之间保持真实比例关系（如太阳直径 = 109 个地球），支持真实比例与取景压缩两种模式；
- **静态博客**：`public/blog/` 下的独立静态页面，与主页共用星空纹理和主题脚本；
- **多个独立 WebGL 页面**：黑洞（blackhole）、三体（threebody）、thechao 等传统单文件 HTML 页面，通过构建脚本原样复制进产物，与 React 主应用并行共存于同一站点。

技术栈：Vite 8、React 19、Three.js 0.185、motion（动画）、TypeScript、Playwright（浏览器测试）。

## 目录结构

```
.
├── index.html               # Vite 入口（React 主应用，含 SEO / Open Graph 元数据）
├── vite.config.ts           # Vite 配置（base: '/' + React 插件）
├── src/
│   ├── App.tsx              # 主应用：hash 路由、主题/语言偏好、区块布局
│   ├── index.css            # 全局样式（主题变量、明暗双主题）
│   ├── site/                # 站点内容与文案（content.ts：中英文案、项目、链接）
│   └── visual/              # Three.js 视觉层：太阳系探索器、宇宙背景、
│                            #   空间卡片、太阳系数据（solarData.ts）
├── public/
│   ├── blog/                # 静态博客（index.html、posts/ 三篇文章、assets/）
│   ├── pelican/             # 独立静态页
│   └── favicon.svg / og-image.png / sitemap.xml / robots.txt
├── assets/                  # 传统页面共用的 css / js / solar 资源
├── scripts/                 # 构建辅助脚本：copy-legacy.mjs（复制传统页面）、
│                            #   verify-lazy-chunks.mjs（校验懒加载 chunk）、
│                            #   generate-og-image.mjs、sync-blog-to-sites.mjs
├── tests/                   # node:test 单元测试 + Playwright 浏览器冒烟测试
├── docs/                    # 内部设计文档（blog.md、specs 等）
├── KCM系列/、极限身法/、luoshao/   # 独立 HTML 小游戏/小项目
├── *.html                   # 根目录传统页面：notes / login / register /
│                            #   thechao / thechaos / blackhole / threebody
├── notes-worker.js          # notes 后端旧版实现（GitHub API 版）
├── wrangler.toml            # Cloudflare Worker 配置（notes 后端）
└── .github/workflows/pages.yml
```

**notes 页面说明**：notes 依赖单独部署的 Cloudflare Worker + D1 数据库（见 `wrangler.toml`，源码在 `worker-temp/tangyixiao-api`），该 Worker 独立部署维护，**不在 GitHub Pages 部署链路内**。

## 本地开发

要求 Node.js 22（CI 使用 node 22）。

```bash
npm install
npx vite          # 启动本地开发服务器
```

注意：`package.json` 中**没有 `dev` 脚本**，本地开发直接运行 `npx vite`。

其他常用命令：

```bash
npm run build        # vite build + copy-legacy 复制传统页面 + 懒加载 chunk 校验
npm run test:unit    # node:test 单元测试（visual-lifecycle、solar-geometry），无需浏览器
npm run test:browser # Playwright 浏览器冒烟测试（主页/太阳系/博客共 6 个脚本）
```

浏览器测试需要先安装 Playwright 的 Chromium：

```bash
npx playwright install chromium
```

## 部署

部署由 GitHub Actions（`.github/workflows/pages.yml`）自动完成：

- **push 到 `main`**：执行 `npm ci` → 安装 Playwright Chromium → `npm run build` → Python 单元测试（`tests/test_*.py`）→ `npm run test:unit` → `npm run test:browser`，全部通过后将 `dist/` 部署到 GitHub Pages；
- **Pull Request**：跑同一条完整流水线（构建 + 全部测试）用于验证，但不触发部署。

即：任何进 main 的改动都会先经过完整构建与测试，Pages 上的站点始终与 main 最新提交一致。

## 当前重点

持续打磨真实比例太阳系探索器的可见性与观感（轨道线分档提亮、小天体取景裁剪等），以及博客与主页内容的日常更新。

## License

Apache License 2.0，见 [LICENSE](LICENSE)。
