# 个人博客

- 首页源码：`public/blog/index.html`。
- 三篇起始文章：`public/blog/posts/*.html`，为本次建站编写，尚未迁移洛谷、博客园或 CSDN 的已有文章。
- 共用样式、主题脚本和沿用主页的星空纹理：`public/blog/assets/`。
- 主页导航中的“博客”跳转到 `/blog/`。Vite 将 `public/blog/` 复制到构建目录，支持 GitHub Pages 静态路径。

## 更新内容

修改或新增文章 HTML，并更新博客首页的列表条目；文章链接使用相对路径。发布到个人主页沿用现有 Pages 流程。

原「Sites 独立发布目录」`sites-blog/` 已于 2026-10-24 归档至 [homepage-archive](https://github.com/tangyixiao/homepage-archive)（`sites-blog/`，含 `.openai/hosting.json` 发布身份）并从本仓库移出。博客现只以 `dist/blog/`（由 `blog-src/` 生成）对外发布；如需重建本地静态副本，可运行 `node scripts/sync-blog-to-sites.mjs`，它会把 `dist/blog/` 复制到 `sites-blog/dist/`（仅本地使用，不再托管 Sites 发布流程）。
