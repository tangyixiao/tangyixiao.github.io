import type { Language } from './content'

// 项目结构化数据：加一个项目 = 在 projects 数组里加一个对象，
// 卡片、详情页、分类筛选全部从数组渲染，组件零改动。
// id 同时用作 /work/<id> 路由与 project-<id> 卡片样式钩子（无专属样式时回退到默认卡片美术）。

export type ProjectId = string

export interface LocalizedProject {
  category: string
  description: string
  overview: string
  highlights: string[]
  stack: string[]
}

export interface ProjectRecord {
  id: string
  title: string
  year: string
  link: string
  tags: string[]
  zh: LocalizedProject
  en: LocalizedProject
}

export const projects: ProjectRecord[] = [
  {
    id: 'code',
    title: 'CodeHub',
    year: '2023',
    link: '/Code/',
    tags: ['C++', '题解', '模板库'],
    zh: {
      category: '算法与竞赛',
      description: '持续整理竞赛代码与题解，让实现、复盘和检索形成一条清晰的线索。',
      overview: '这里是我算法竞赛学习的完整沉淀：按专题整理的模板代码、竞赛真题的题解与实现，以及调试和复盘过程中留下的笔记。从最初的枚举与模拟，到图论、动态规划和数据结构，每个条目都尽量保留完整的思考过程——为什么这样做、复杂度是多少、有哪些边界情况需要特别处理。整理这份库的动机很简单：做过的题如果不留下来，很快就会忘记；而写清楚的题解，能在下次遇到同类问题时立刻找回当时的关键想法。它既是我自己的工具书，也希望对同样走在竞赛路上的同学有用。',
      highlights: ['按算法专题分类的模板与实现', '题解附带复杂度分析与思路推导', '覆盖从入门到提高的持续积累', '站内直达，无需跳转第三方平台'],
      stack: ['C++', '算法竞赛', 'Markdown'],
    },
    en: {
      category: 'Algorithms & contests',
      description: 'An evolving archive of contest code and solutions, organized for implementation, review, and discovery.',
      overview: 'This repository is the full record of my competitive programming practice: templates organized by topic, solutions to contest problems, and the notes I kept while debugging and reviewing. It grew out of a simple observation — problems I solved but never wrote down faded quickly, while a clearly written solution lets me recover the key idea the next time a similar problem appears. Every entry tries to keep the full line of thought: why the approach works, what the complexity is, and which edge cases need special care. It works as my personal reference book, and I hope it is just as useful to other students on the same path.',
      highlights: ['Templates and implementations grouped by algorithm topic', 'Solutions with complexity analysis and reasoning', 'Continuous accumulation from beginner to advanced', 'Reachable directly on this site, no third-party detour'],
      stack: ['C++', 'Competitive programming', 'Markdown'],
    },
  },
  {
    id: 'math',
    title: 'HighSchool Mathematics',
    year: '2024',
    link: 'https://github.com/tangyixiao/HighSchoolMathematics',
    tags: ['数学', '推导', '知识库'],
    zh: {
      category: '数学与学习',
      description: '把高中数学资料与推导整理成便于阅读、查找和继续扩展的知识库。',
      overview: '这个仓库把高中数学的公式、推导和典型例题整理成一份便于检索的知识库。做这件事的原因是：教材和教辅把知识点分散在很多章节里，复习时很难快速定位"这个结论是怎么来的"。于是我按主题重写了常用结论的完整推导，配上容易出错的例题和易错点提醒，让每个公式都能追溯到它的来源。整理的过程也逼着我把"背下来"变成"推一遍"，理解明显更牢固。仓库以 Markdown 为主，结构清晰、便于扩展，之后还会继续补充新专题与更多变式训练。',
      highlights: ['按主题整理的高中数学知识库', '每个公式都附带完整推导过程', '收录典型例题与易错点提醒', 'Markdown 编写，持续扩展新专题'],
      stack: ['Markdown', 'LaTeX', 'Git'],
    },
    en: {
      category: 'Mathematics & learning',
      description: 'High-school mathematics resources and derivations organized for reading, finding, and extending.',
      overview: 'This repository organizes high-school mathematics — formulas, derivations, and worked examples — into a library that is easy to search. Textbooks scatter related results across many chapters, so while revising it was hard to answer a simple question: where does this conclusion actually come from? I rewrote the full derivation behind each commonly used formula, paired it with typical problems and reminders about common mistakes, and made every formula traceable to its origin. Writing it all down turned memorizing into deriving, and the understanding stuck far better. Everything is written in Markdown with a clear structure that is easy to extend, and I keep adding new topics and more practice variations.',
      highlights: ['A topic-organized high-school math library', 'Every formula comes with its full derivation', 'Typical problems and pitfall reminders included', 'Written in Markdown, still expanding'],
      stack: ['Markdown', 'LaTeX', 'Git'],
    },
  },
  {
    id: 'agents',
    title: 'Agent Learning Hub',
    year: '2025',
    link: 'https://github.com/tangyixiao/Agent-Learning-Hub',
    tags: ['AI Agent', 'LLM', '学习路线'],
    zh: {
      category: '智能体与工具',
      description: '记录 AI Agent 与大模型的概念、工具和学习路线。',
      overview: '这个仓库记录我学习 AI Agent 与大模型的过程：从基本概念、常见框架到工具调用和记忆机制，都以笔记和示例代码的形式沉淀下来。起点是我发现这个领域的资料非常零散，新闻多而系统的整理少，于是决定边学边写，把每一步的理解都留下可复查的痕迹。内容包括学习路线、关键论文与概念的通俗解释，以及亲手跑通的小例子。它帮我理清了"哪些概念真正重要、哪些只是流行语"，也让后来者可以少走弯路。随着模型和工具的迭代，这份记录也会不断修订和扩充。',
      highlights: ['系统整理 AI Agent 学习路线', '概念、工具与论文笔记相结合', '包含可运行的小型示例代码', '随领域发展持续修订扩充'],
      stack: ['Python', 'LLM', 'Markdown'],
    },
    en: {
      category: 'Agents & tools',
      description: 'Notes on AI agents and language models, their concepts, tools, and learning paths.',
      overview: 'This repository documents my journey learning AI agents and large language models: core concepts, common frameworks, tool calling, and memory mechanisms, captured as notes and small runnable examples. I started it because the material in this field is scattered — plenty of news, very little systematic organization — so I decided to write while learning, leaving a trace of each step that I could go back and check. It covers a learning path, plain-language explanations of key papers and ideas, and hands-on experiments that clarify which concepts truly matter and which are just buzzwords. As models and tools evolve, the record keeps being revised and extended.',
      highlights: ['A structured AI agent learning path', 'Concept, tool, and paper notes in one place', 'Small runnable example code included', 'Continuously revised as the field evolves'],
      stack: ['Python', 'LLM', 'Markdown'],
    },
  },
]

export const projectIds: ProjectId[] = projects.map((project) => project.id)

// 关于页里程碑时间线：年份 + 一行事件，只写有据可查的节点，不虚构精确日期。
export interface Milestone {
  year: string
  zh: string
  en: string
}

export const milestones: Milestone[] = [
  { year: '2023', zh: '开始算法竞赛，题解与模板陆续落在洛谷、博客园和 CodeHub。', en: 'Started competitive programming; solutions and templates began accumulating on Luogu, Cnblogs, and CodeHub.' },
  { year: '2024', zh: '整理高中数学公式与推导，建起 HighSchoolMathematics 知识库。', en: 'Organized high-school formulas and derivations into the HighSchoolMathematics library.' },
  { year: '2025', zh: '创建 Agent Learning Hub，边学 AI Agent 边沉淀学习路线与小例子。', en: 'Created Agent Learning Hub, documenting an AI agent learning path with runnable examples.' },
  { year: '2026', zh: '个人主页全面改版：React 重写、history 路由、博客迁入 Markdown。', en: 'Fully redesigned this site: a React rewrite, history routing, and a Markdown blog.' },
]
