# 个人博客

- 首页源码：`public/blog/index.html`。
- 三篇起始文章：`public/blog/posts/*.html`，为本次建站编写，尚未迁移洛谷、博客园或 CSDN 的已有文章。
- 共用样式、主题脚本和沿用主页的星空纹理：`public/blog/assets/`。
- 主页导航中的“博客”跳转到 `/blog/`。Vite 将 `public/blog/` 复制到构建目录，支持 GitHub Pages 静态路径。

## 更新内容

修改或新增文章 HTML，并更新博客首页的列表条目；文章链接使用相对路径。发布到个人主页沿用现有 Pages 流程。

发布到 Sites 前运行 `node scripts/sync-blog-to-sites.mjs`，再在 `sites-blog/` 内运行 Sites 的正常发布流程。`.openai/hosting.json` 保存独立 Sites 身份；不要把个人主页仓库当成 Sites 的源仓库推送。

两处使用同一份文章源码，属于手动同步，不是自动跨站更新。Sites 的初始访问范围为仅本人。
