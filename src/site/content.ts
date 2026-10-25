export type Language = 'zh' | 'en'
export type Theme = 'light' | 'dark'
export type FocusId = 'algorithms' | 'mathematics' | 'intelligence'
export type LabId = 'blackhole' | 'threebody' | 'thechao' | 'thechaos' | 'pelican'

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

// 项目结构化数据与里程碑时间线外部化在 ./projects，这里统一转出口。
export { milestones, projectIds, projects } from './projects'
export type { Milestone, ProjectId, ProjectRecord } from './projects'

export const focusIds: FocusId[] = ['algorithms', 'mathematics', 'intelligence']
export const labIds: LabId[] = ['blackhole', 'threebody', 'thechao', 'thechaos', 'pelican']

export interface SiteContent {
  meta: { title: string; description: string }
  nav: { home: string; work: string; lab: string; focus: string; now: string; about: string; links: string }
  lab: { label: string; heading: string; intro: string; items: Record<LabId, { name: string; summary: string; href: string }> }
  actions: { projects: string; about: string; visit: string; top: string; themeLight: string; themeDark: string; language: string; menuOpen: string; menuClose: string }
  hero: { label: string; name: string; alternateName: string; headline: string; description: string; scroll: string }
  work: { label: string; heading: string; intro: string; allLabel: string; filterLabel: string; detail: { overview: string; highlights: string; stack: string; back: string } }
  focus: { label: string; heading: string; intro: string; items: Record<FocusId, { name: string; summary: string }> }
  now: { label: string; heading: string; intro: string; updatedLabel: string; updatedAt: string; blocks: { title: string; detail: string }[]; readingLabel: string; reading: string[] }
  about: { label: string; heading: string; paragraph1: string; paragraph2: string; toolsLabel: string; interestsLabel: string; interests: string }
  links: { label: string; heading: string; description: string; code: string }
}

export const siteContent: Record<Language, SiteContent> = {
  zh: {
    meta: { title: '唐一潇 · 算法、数学与智能系统', description: '唐一潇的个人网站：算法、数学、物理与智能系统的学习实践和精选项目。' },
    nav: { home: '首页', work: '项目', lab: '实验场', focus: '方向', now: '现在', about: '关于', links: '联系' },
    lab: {
      label: 'PLAYGROUND / 实验场', heading: '一些亲手写的小实验。', intro: '独立运行的 WebGL 小页面，点开即玩——引力、混沌与动画的小玩具。',
      items: {
        blackhole: { name: '黑洞 · Gargantua', summary: '拖拽环视、滚轮推近，看引力透镜如何弯折吸积盘的光。', href: '/blackhole.html' },
        threebody: { name: '三体 · 半人马座α', summary: '用滑杆调整初始条件，看三颗恒星在引力下跳出不可预测的轨道。', href: '/threebody.html' },
        thechao: { name: '双摆 · Double Pendulum', summary: '松手让双摆甩动，摆锤的轨迹会画出一条逐渐消隐的混沌尾迹。', href: '/thechao.html' },
        thechaos: { name: '双摆 · 混沌增强版', summary: '另一个双摆：第二个摆锤带渐隐尾迹，并附一块实时读数面板。', href: '/thechaos.html' },
        pelican: { name: '鹈鹕的海边兜风', summary: '一只鹈鹕沿海边慢慢骑行的小动画，顺风就出发。', href: '/pelican/' },
      },
    },
    actions: { projects: '查看项目', about: '了解我', visit: '访问项目', top: '回到顶部', themeLight: '切换到浅色模式', themeDark: '切换到深色模式', language: 'Switch to English', menuOpen: '打开导航', menuClose: '关闭导航' },
    hero: { label: 'ALGORITHMS · MATHEMATICS · INTELLIGENCE', name: '唐一潇', alternateName: 'Tang Yixiao', headline: '从算法与数学出发，探索智能系统。', description: '把问题拆解、验证，再将理解写成代码、笔记与工具。', scroll: '向下探索' },
    work: {
      label: 'SELECTED WORK / 精选项目', heading: '让思考成为可以继续使用的作品。', intro: '代码、资料与学习记录，都是理解问题的不同方式。',
      allLabel: '全部', filterLabel: '按分类筛选项目',
      detail: { overview: '项目概述', highlights: '亮点', stack: '技术栈', back: '返回项目列表' },
    },
    focus: {
      label: 'FIELDS OF INTEREST / 探索方向', heading: '三个持续投入的方向。', intro: '从可证明的算法，到可解释的结构，再到可实践的智能系统。',
      items: {
        algorithms: { name: '算法与数据结构', summary: '从问题建模、复杂度分析到实现与复盘，追求能经得起边界检验的解法。' },
        mathematics: { name: '数学与物理', summary: '通过推导、证明和整理资料，把零散的知识连成可以复用的理解。' },
        intelligence: { name: 'AI 与智能体', summary: '阅读、实验并记录模型与工具如何真正帮助人解决问题。' },
      },
    },
    now: {
      label: 'NOW / 现在', heading: '最近在做什么，在读什么。', intro: '这一页记录我此刻正在推进的事情和正在读的东西，不追求完整履历——想看全貌，去「项目」和「关于」。',
      updatedLabel: '最后更新', updatedAt: '2026-10-24',
      blocks: [
        { title: '打磨太阳系探索器', detail: '继续给首页的 WebGL 太阳系做减法与校准：贴图一张张瘦身，读数等待改成确定性的几何计算，让慢一点的机器上也不再出现竞态和闪烁。' },
        { title: '把博客搬进 Markdown', detail: '博客正文改成 Markdown 源文件加零依赖生成器，写一篇东西的门槛降到只剩一个文本文件，RSS 和评论也顺势接上。' },
        { title: '给网站做性能与收录', detail: '首页的 Lighthouse 分数从 42 一路磨到 76，路由也换成了 history 模式——每个版面都有了能被搜索引擎独立收录的地址。' },
        { title: '沉淀算法与数学笔记', detail: 'CodeHub 和高中数学库保持缓慢但持续的更新：做过的题写成题解，推过的公式留下完整推导，不让理解在记忆里蒸发。' },
      ],
      readingLabel: '在读 / 在学',
      reading: ['《算法导论》选章重读：图算法与动态规划', '费曼物理学讲义 · 卷二（电磁学）', 'Three.js 官方文档：着色器与后期处理'],
    },
    about: { label: 'ABOUT / 关于我', heading: '保持好奇，也认真验证。', paragraph1: '我关注算法、数学、物理与人工智能，也喜欢用代码解决问题，并把学习过程整理成可查找的资料。', paragraph2: '面对新问题时，我习惯先拆解，再用实现、推导和记录检验自己的理解。这里收集的是这段持续学习与构建的轨迹。', toolsLabel: '常用工具', interestsLabel: '长期关注', interests: '算法 · 数学 · 物理 · AI', timelineLabel: '里程碑' },
    links: { label: 'CONNECT / 保持联系', heading: '从这里，继续交流。', description: '欢迎查看项目、阅读记录，或在公开平台找到我。', code: 'CodeHub' },
  },
  en: {
    meta: { title: 'Tang Yixiao · Algorithms, Mathematics & Intelligent Systems', description: 'Tang Yixiao’s personal website: selected work and learning notes on algorithms, mathematics, physics, and intelligent systems.' },
    nav: { home: 'Home', work: 'Work', lab: 'Lab', focus: 'Focus', now: 'Now', about: 'About', links: 'Contact' },
    lab: {
      label: 'PLAYGROUND', heading: 'Small experiments, built by hand.', intro: 'Standalone WebGL pages — open one and play with gravity, chaos, and animation.',
      items: {
        blackhole: { name: 'Black Hole · Gargantua', summary: 'Drag to orbit and scroll to zoom in on a gravitationally lensed accretion disk.', href: '/blackhole.html' },
        threebody: { name: 'Three-Body · Alpha Centauri', summary: 'Adjust the initial conditions with sliders and watch three stars weave unpredictable orbits.', href: '/threebody.html' },
        thechao: { name: 'Double Pendulum', summary: 'Release the pendulum and watch its bob trace a slowly fading chaotic trail.', href: '/thechao.html' },
        thechaos: { name: 'Double Pendulum · Chaos', summary: 'A second take: a fading trail on the second bob and a live readout panel.', href: '/thechaos.html' },
        pelican: { name: 'A Pelican Ride', summary: 'A little animation of a pelican cycling along the seaside — tailwind included.', href: '/pelican/' },
      },
    },
    actions: { projects: 'Explore projects', about: 'About me', visit: 'Visit project', top: 'Back to top', themeLight: 'Switch to light mode', themeDark: 'Switch to dark mode', language: '切换到中文', menuOpen: 'Open navigation', menuClose: 'Close navigation' },
    hero: { label: 'ALGORITHMS · MATHEMATICS · INTELLIGENCE', name: 'Tang Yixiao', alternateName: '唐一潇', headline: 'Exploring intelligent systems through algorithms and mathematics.', description: 'I break problems down, test ideas, and turn what I learn into code, notes, and tools.', scroll: 'Scroll to explore' },
    work: {
      label: 'SELECTED WORK', heading: 'Ideas become useful when they can be revisited.', intro: 'Code, resources, and learning notes are different ways to understand a problem.',
      allLabel: 'All', filterLabel: 'Filter projects by category',
      detail: { overview: 'Overview', highlights: 'Highlights', stack: 'Stack', back: 'Back to projects' },
    },
    focus: {
      label: 'FIELDS OF INTEREST', heading: 'Three directions I keep exploring.', intro: 'From provable algorithms to explainable structures and practical intelligent systems.',
      items: {
        algorithms: { name: 'Algorithms & Data Structures', summary: 'From modeling and complexity to implementation and review, I look for solutions that stand up to edge cases.' },
        mathematics: { name: 'Mathematics & Physics', summary: 'I connect ideas through derivation, proof, and well-organized learning materials.' },
        intelligence: { name: 'AI & Agents', summary: 'I read, experiment, and document how models and tools help people solve real problems.' },
      },
    },
    now: {
      label: 'NOW', heading: 'What I am doing and reading lately.', intro: 'This page tracks what I am currently building and reading — not a complete resume. For the full picture, see Work and About.',
      updatedLabel: 'Last updated', updatedAt: '2026-10-24',
      blocks: [
        { title: 'Polishing the solar explorer', detail: 'Still trimming and calibrating the WebGL solar system on the homepage: slimming textures one by one and replacing timing-based waits with deterministic geometry, so slower machines no longer race or flicker.' },
        { title: 'Moving the blog into Markdown', detail: 'Blog posts now live as Markdown sources behind a zero-dependency generator — writing one comes down to a single text file, with RSS and comments wired in along the way.' },
        { title: 'Tuning performance and indexing', detail: 'The homepage Lighthouse score has been ground up from 42 to 76, and routing moved to the History API so every view has its own indexable URL.' },
        { title: 'Keeping notes alive', detail: 'CodeHub and my high-school mathematics library keep growing slowly but steadily: solved problems become write-ups, derived formulas keep their full derivations, and understanding does not evaporate.' },
      ],
      readingLabel: 'Reading / Learning',
      reading: ['Revisiting CLRS chapters on graphs and dynamic programming', 'The Feynman Lectures, Vol. II (electromagnetism)', 'Three.js docs: shaders and post-processing'],
    },
    about: { label: 'ABOUT', heading: 'Stay curious. Verify carefully.', paragraph1: 'I am interested in algorithms, mathematics, physics, and AI. I enjoy solving problems with code and organizing what I learn into useful resources.', paragraph2: 'When I meet a new problem, I break it down and test my understanding through implementation, derivation, and notes. This site traces that continuing practice.', toolsLabel: 'Tools I use', interestsLabel: 'Long-term interests', interests: 'Algorithms · Mathematics · Physics · AI', timelineLabel: 'Milestones' },
    links: { label: 'CONNECT', heading: 'Continue the conversation.', description: 'Explore my projects, read my notes, or find me on public platforms.', code: 'CodeHub' },
  },
}
