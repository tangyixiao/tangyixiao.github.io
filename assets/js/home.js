document.documentElement.classList.add("js");

const translations = {
  zh: {
    "a11y.skip": "跳到主要内容",
    "a11y.openMenu": "打开导航",
    "a11y.mainNav": "主导航",
    "a11y.switchLanguage": "切换到英文",
    "a11y.switchTheme": "切换主题",
    "nav.home": "首页",
    "nav.about": "关于",
    "nav.projects": "项目",
    "nav.oi": "竞赛",
    "nav.learning": "学习",
    "nav.links": "链接",
    "hero.eyebrow": "持续学习 · 持续构建",
    "hero.name": "唐一潇",
    "hero.tagline": "探索算法、数学与智能。",
    "hero.summary": "绍兴一中学生。关注 OI / 信息学竞赛、数学与物理，也在探索 AI、LLM、Agent 与开源世界。",
    "hero.projectsButton": "查看项目",
    "about.kicker": "ABOUT / 关于",
    "about.title": "在竞赛、课堂与开源之间",
    "about.p1": "我目前就读于绍兴市第一中学。信息学竞赛是我长期投入的方向之一：从算法和数据结构，到实现、调试、复盘与整理，我喜欢把一道题真正想清楚。",
    "about.p2": "同时，我也持续学习数学与物理，并用 LaTeX、Markdown 等工具整理资料。最近的另一条探索线是 AI：大语言模型、Agent、推理与开源项目。",
    "about.p3": "这里不是一份夸张的简历，而是我正在学习、构建和思考的东西的索引。",
    "about.fact1Label": "身份",
    "about.fact1Value": "高中生 / High School Student",
    "about.fact2Label": "主要语言",
    "about.fact3Label": "正在关注",
    "about.fact3Value": "算法 · 数学 · 物理 · AI",
    "about.fact4Label": "理念",
    "about.fact4Value": "保持好奇，持续构建",
    "focus.kicker": "FOCUS / 学习方向",
    "focus.title": "三个长期方向",
    "focus.oiTitle": "OI / 信息学竞赛",
    "focus.oiDesc": "算法、数据结构、复杂度分析、竞赛代码与赛后复盘。追求的不只是 AC，而是理解。",
    "focus.mathTitle": "数学与科学",
    "focus.mathDesc": "高中数学与物理，兼顾推导、证明、题目与技术写作，把零散知识逐渐连接成体系。",
    "focus.aiTitle": "AI 与开源",
    "focus.aiDesc": "关注大语言模型、Agent、推理与工具链，通过阅读、实验和开源项目理解它们真正如何工作。",
    "projects.kicker": "PROJECTS / 精选项目",
    "projects.title": "我正在维护与整理的内容",
    "projects.all": "全部仓库",
    "projects.codeDesc": "算法竞赛代码与学习记录：题目实现、模板、训练与复盘的长期归档。",
    "projects.mathDesc": "高中数学资料与学习整理，用更可复用、可检索的方式积累知识。",
    "projects.agentDesc": "AI Agent 与大模型学习资料，记录概念、方法、工具与实验线索。",
    "projects.beamerDesc": "面向绍兴一中场景的 LaTeX Beamer 演示文稿模板，让技术内容更容易被清晰地表达。",
    "oi.kicker": "COMPETITIVE PROGRAMMING / 信息学竞赛",
    "oi.title": "把进步留在时间线上",
    "oi.desc": "竞赛记录只是学习过程的坐标。真正重要的是不断把不会的东西变成会，把模糊的思路变成可以证明和实现的算法。",
    "oi.luogu": "博客与题解",
    "oi.archive": "竞赛代码归档",
    "oi.m2": "阶段性里程碑",
    "oi.m1": "阶段性里程碑",
    "oi.start": "开始系统记录",
    "oi.startDesc": "从一次次提交开始积累",
    "learning.kicker": "LEARNING / 学习",
    "learning.title": "正在长期积累的知识地图",
    "learning.algorithms": "算法与数据结构",
    "learning.math": "数学",
    "learning.physics": "物理",
    "learning.writing": "LaTeX 与技术写作",
    "learning.ai": "AI / LLM / Agent",
    "learning.notes": "个人笔记",
    "links.kicker": "LINKS / 链接",
    "links.title": "继续找到我",
    "links.luogu": "博客 / Blog",
    "links.notes": "站内笔记 / Notes",
    "links.notesDesc": "打开已有笔记页面",
    "links.oiwiki": "我的仓库副本 / Repository",
    "footer.quote": "心有所向，日复一日，必有精进。",
    "footer.top": "回到顶部 ↑"
  },
  en: {
    "a11y.skip": "Skip to main content",
    "a11y.openMenu": "Open navigation",
    "a11y.mainNav": "Primary navigation",
    "a11y.switchLanguage": "Switch to Chinese",
    "a11y.switchTheme": "Switch theme",
    "nav.home": "Home",
    "nav.about": "About",
    "nav.projects": "Projects",
    "nav.oi": "OI",
    "nav.learning": "Learning",
    "nav.links": "Links",
    "hero.eyebrow": "Keep learning · Keep building",
    "hero.name": "Tang Yixiao",
    "hero.tagline": "Exploring Algorithms, Mathematics & Intelligence.",
    "hero.summary": "A student at Shaoxing No.1 High School, focused on competitive programming, mathematics and physics, while exploring AI, LLMs, agents, and open source.",
    "hero.projectsButton": "View Projects",
    "about.kicker": "ABOUT / 关于",
    "about.title": "Between contests, classrooms, and open source",
    "about.p1": "I study at Shaoxing No.1 High School. Competitive programming is one of my long-term interests: from algorithms and data structures to implementation, debugging, review, and documentation, I enjoy understanding a problem all the way through.",
    "about.p2": "I also keep learning mathematics and physics, using tools such as LaTeX and Markdown to organize what I learn. Another current direction is AI: large language models, agents, reasoning, and open-source projects.",
    "about.p3": "This is not an inflated résumé. It is an index of what I am learning, building, and thinking about.",
    "about.fact1Label": "Role",
    "about.fact1Value": "High School Student / 高中生",
    "about.fact2Label": "Main tools",
    "about.fact3Label": "Current focus",
    "about.fact3Value": "Algorithms · Math · Physics · AI",
    "about.fact4Label": "Principle",
    "about.fact4Value": "Stay curious, keep building",
    "focus.kicker": "FOCUS / 学习方向",
    "focus.title": "Three long-term directions",
    "focus.oiTitle": "OI / Competitive Programming",
    "focus.oiDesc": "Algorithms, data structures, complexity, contest code, and post-contest review. The goal is not only AC, but understanding.",
    "focus.mathTitle": "Mathematics & Science",
    "focus.mathDesc": "High-school mathematics and physics, connecting derivations, proofs, problems, and technical writing into a growing system of knowledge.",
    "focus.aiTitle": "AI & Open Source",
    "focus.aiDesc": "Learning about LLMs, agents, reasoning, and toolchains through reading, experimentation, and open-source projects.",
    "projects.kicker": "PROJECTS / 精选项目",
    "projects.title": "Things I maintain and organize",
    "projects.all": "All Repositories",
    "projects.codeDesc": "A long-term archive of competitive programming solutions, templates, training code, and review notes.",
    "projects.mathDesc": "High-school mathematics materials and notes organized to be reusable and searchable.",
    "projects.agentDesc": "Learning materials for AI agents and LLMs, collecting concepts, methods, tools, and experiments.",
    "projects.beamerDesc": "A LaTeX Beamer presentation template for Shaoxing No.1 High School, designed for clear technical communication.",
    "oi.kicker": "COMPETITIVE PROGRAMMING / 信息学竞赛",
    "oi.title": "Keeping progress on a timeline",
    "oi.desc": "Contest records are coordinates in the learning process. What matters is turning unknowns into understanding, and vague ideas into algorithms that can be proved and implemented.",
    "oi.luogu": "Blog & solutions",
    "oi.archive": "Contest code archive",
    "oi.m2": "Selected milestone",
    "oi.m1": "Selected milestone",
    "oi.start": "Started systematic tracking",
    "oi.startDesc": "Building progress one submission at a time",
    "learning.kicker": "LEARNING / 学习",
    "learning.title": "A knowledge map I keep expanding",
    "learning.algorithms": "Algorithms & Data Structures",
    "learning.math": "Mathematics",
    "learning.physics": "Physics",
    "learning.writing": "LaTeX & Technical Writing",
    "learning.ai": "AI / LLM / Agents",
    "learning.notes": "Personal Notes",
    "links.kicker": "LINKS / 链接",
    "links.title": "Find me elsewhere",
    "links.luogu": "Blog / 博客",
    "links.notes": "Notes / 站内笔记",
    "links.notesDesc": "Open the existing notes page",
    "links.oiwiki": "My repository fork / 仓库副本",
    "footer.quote": "心有所向，日复一日，必有精进。",
    "footer.top": "Back to top ↑"
  }
};

function safeStorageGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}

function setLanguage(lang) {
  const next = lang === "en" ? "en" : "zh";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (translations[next][key] !== undefined) node.textContent = translations[next][key];
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    const key = node.dataset.i18nAria;
    if (translations[next][key] !== undefined) node.setAttribute("aria-label", translations[next][key]);
  });
  document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  document.documentElement.dataset.language = next;
  const label = document.getElementById("language-label");
  if (label) label.textContent = next === "zh" ? "EN" : "中文";
  safeStorageSet("site-language", next);
}

function initLanguage() {
  const stored = safeStorageGet("site-language");
  const preferred = stored === "zh" || stored === "en"
    ? stored
    : ((navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en");
  setLanguage(preferred);
  const button = document.getElementById("language-toggle");
  button?.addEventListener("click", () => {
    const current = document.documentElement.dataset.language || "zh";
    setLanguage(current === "zh" ? "en" : "zh");
  });
}

function setTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  const icon = document.getElementById("theme-icon");
  if (icon) icon.textContent = next === "dark" ? "☀" : "☾";
  safeStorageSet("site-theme", next);
}

function initTheme() {
  const stored = safeStorageGet("site-theme");
  const preferred = stored === "light" || stored === "dark"
    ? stored
    : (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  setTheme(preferred);
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "dark";
    setTheme(current === "dark" ? "light" : "dark");
  });
}

function initMenu() {
  const header = document.querySelector(".site-header");
  const button = document.getElementById("menu-toggle");
  const nav = document.getElementById("primary-nav");
  if (!header || !button || !nav) return;

  const close = () => {
    header.classList.remove("nav-open");
    button.setAttribute("aria-expanded", "false");
  };

  button.addEventListener("click", () => {
    const open = !header.classList.contains("nav-open");
    header.classList.toggle("nav-open", open);
    button.setAttribute("aria-expanded", String(open));
  });

  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) close();
  });
}

function initReveal() {
  const nodes = [...document.querySelectorAll(".reveal")];
  if (!("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6%" });
  nodes.forEach((node) => observer.observe(node));
}

function init() {
  initTheme();
  initLanguage();
  initMenu();
  initReveal();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
