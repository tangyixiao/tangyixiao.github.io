export type Language = 'zh' | 'en'
export type Theme = 'light' | 'dark'
export type ProjectId = 'code' | 'math' | 'agents'
export type FocusId = 'algorithms' | 'mathematics' | 'intelligence'

export const links = {
  code: '/Code/',
  math: 'https://github.com/tangyixiao/HighSchoolMathematics',
  agents: 'https://github.com/tangyixiao/Agent-Learning-Hub',
  github: 'https://github.com/tangyixiao',
  luogu: 'https://www.luogu.com.cn/blog/TangyixiaoQAQ/',
  cnblogs: 'https://home.cnblogs.com/u/TangyixiaoQAQ',
  csdn: 'https://blog.csdn.net/DCMyyds',
  bilibili: 'https://space.bilibili.com/512272131',
} as const

export const projectIds: ProjectId[] = ['code', 'math', 'agents']
export const focusIds: FocusId[] = ['algorithms', 'mathematics', 'intelligence']

interface SiteContent {
  meta: { title: string; description: string }
  nav: { home: string; work: string; focus: string; about: string; links: string }
  actions: { projects: string; about: string; visit: string; top: string; themeLight: string; themeDark: string; language: string; menuOpen: string; menuClose: string }
  hero: { label: string; name: string; alternateName: string; headline: string; description: string; scroll: string }
  work: { label: string; heading: string; intro: string; projects: Record<ProjectId, { category: string; title: string; description: string }> }
  focus: { label: string; heading: string; intro: string; items: Record<FocusId, { name: string; summary: string }> }
  about: { label: string; heading: string; paragraph1: string; paragraph2: string; toolsLabel: string; interestsLabel: string; interests: string }
  links: { label: string; heading: string; description: string; code: string }
}

export const siteContent: Record<Language, SiteContent> = {
  zh: {
    meta: { title: '唐一潇 · 算法、数学与智能系统', description: '唐一潇的个人网站：算法、数学、物理与智能系统的学习实践和精选项目。' },
    nav: { home: '首页', work: '项目', focus: '方向', about: '关于', links: '联系' },
    actions: { projects: '查看项目', about: '了解我', visit: '访问项目', top: '回到顶部', themeLight: '切换到浅色模式', themeDark: '切换到深色模式', language: 'Switch to English', menuOpen: '打开导航', menuClose: '关闭导航' },
    hero: { label: 'ALGORITHMS · MATHEMATICS · INTELLIGENCE', name: '唐一潇', alternateName: 'Tang Yixiao', headline: '从算法与数学出发，探索智能系统。', description: '把问题拆解、验证，再将理解写成代码、笔记与工具。', scroll: '向下探索' },
    work: {
      label: 'SELECTED WORK / 精选项目', heading: '让思考成为可以继续使用的作品。', intro: '代码、资料与学习记录，都是理解问题的不同方式。',
      projects: {
        code: { category: '算法与竞赛', title: 'CodeHub', description: '持续整理竞赛代码与题解，让实现、复盘和检索形成一条清晰的线索。' },
        math: { category: '数学与学习', title: 'HighSchool Mathematics', description: '把高中数学资料与推导整理成便于阅读、查找和继续扩展的知识库。' },
        agents: { category: '智能体与工具', title: 'Agent Learning Hub', description: '记录 AI Agent 与大模型的概念、工具和学习路线。' },
      },
    },
    focus: {
      label: 'FIELDS OF INTEREST / 探索方向', heading: '三个持续投入的方向。', intro: '从可证明的算法，到可解释的结构，再到可实践的智能系统。',
      items: {
        algorithms: { name: '算法与数据结构', summary: '从问题建模、复杂度分析到实现与复盘，追求能经得起边界检验的解法。' },
        mathematics: { name: '数学与物理', summary: '通过推导、证明和整理资料，把零散的知识连成可以复用的理解。' },
        intelligence: { name: 'AI 与智能体', summary: '阅读、实验并记录模型与工具如何真正帮助人解决问题。' },
      },
    },
    about: { label: 'ABOUT / 关于我', heading: '保持好奇，也认真验证。', paragraph1: '我关注算法、数学、物理与人工智能，也喜欢用代码解决问题，并把学习过程整理成可查找的资料。', paragraph2: '面对新问题时，我习惯先拆解，再用实现、推导和记录检验自己的理解。这里收集的是这段持续学习与构建的轨迹。', toolsLabel: '常用工具', interestsLabel: '长期关注', interests: '算法 · 数学 · 物理 · AI' },
    links: { label: 'CONNECT / 保持联系', heading: '从这里，继续交流。', description: '欢迎查看项目、阅读记录，或在公开平台找到我。', code: 'CodeHub' },
  },
  en: {
    meta: { title: 'Tang Yixiao · Algorithms, Mathematics & Intelligent Systems', description: 'Tang Yixiao’s personal website: selected work and learning notes on algorithms, mathematics, physics, and intelligent systems.' },
    nav: { home: 'Home', work: 'Work', focus: 'Focus', about: 'About', links: 'Contact' },
    actions: { projects: 'Explore projects', about: 'About me', visit: 'Visit project', top: 'Back to top', themeLight: 'Switch to light mode', themeDark: 'Switch to dark mode', language: '切换到中文', menuOpen: 'Open navigation', menuClose: 'Close navigation' },
    hero: { label: 'ALGORITHMS · MATHEMATICS · INTELLIGENCE', name: 'Tang Yixiao', alternateName: '唐一潇', headline: 'Exploring intelligent systems through algorithms and mathematics.', description: 'I break problems down, test ideas, and turn what I learn into code, notes, and tools.', scroll: 'Scroll to explore' },
    work: {
      label: 'SELECTED WORK', heading: 'Ideas become useful when they can be revisited.', intro: 'Code, resources, and learning notes are different ways to understand a problem.',
      projects: {
        code: { category: 'Algorithms & contests', title: 'CodeHub', description: 'An evolving archive of contest code and solutions, organized for implementation, review, and discovery.' },
        math: { category: 'Mathematics & learning', title: 'HighSchool Mathematics', description: 'High-school mathematics resources and derivations organized for reading, finding, and extending.' },
        agents: { category: 'Agents & tools', title: 'Agent Learning Hub', description: 'Notes on AI agents and language models, their concepts, tools, and learning paths.' },
      },
    },
    focus: {
      label: 'FIELDS OF INTEREST', heading: 'Three directions I keep exploring.', intro: 'From provable algorithms to explainable structures and practical intelligent systems.',
      items: {
        algorithms: { name: 'Algorithms & Data Structures', summary: 'From modeling and complexity to implementation and review, I look for solutions that stand up to edge cases.' },
        mathematics: { name: 'Mathematics & Physics', summary: 'I connect ideas through derivation, proof, and well-organized learning materials.' },
        intelligence: { name: 'AI & Agents', summary: 'I read, experiment, and document how models and tools help people solve real problems.' },
      },
    },
    about: { label: 'ABOUT', heading: 'Stay curious. Verify carefully.', paragraph1: 'I am interested in algorithms, mathematics, physics, and AI. I enjoy solving problems with code and organizing what I learn into useful resources.', paragraph2: 'When I meet a new problem, I break it down and test my understanding through implementation, derivation, and notes. This site traces that continuing practice.', toolsLabel: 'Tools I use', interestsLabel: 'Long-term interests', interests: 'Algorithms · Mathematics · Physics · AI' },
    links: { label: 'CONNECT', heading: 'Continue the conversation.', description: 'Explore my projects, read my notes, or find me on public platforms.', code: 'CodeHub' },
  },
}
