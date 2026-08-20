import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

const links = { code: '/Code/', math: 'https://github.com/tangyixiao/HighSchoolMathematics', agents: 'https://github.com/tangyixiao/Agent-Learning-Hub', github: 'https://github.com/tangyixiao', luogu: 'https://www.luogu.com.cn/blog/TangyixiaoQAQ/', cnblogs: 'https://home.cnblogs.com/u/TangyixiaoQAQ', csdn: 'https://blog.csdn.net/DCMyyds', bilibili: 'https://space.bilibili.com/512272131' }
const focus = [
  { code: 'I', title: 'Algorithms', zh: '算法与数据结构', text: '把不确定的问题转译为经得起边界检验的程序。', href: links.code },
  { code: 'II', title: 'Mathematics', zh: '数学', text: '在证明、结构与直觉之间校准自己的理解。', href: links.math },
  { code: 'III', title: 'Agents', zh: '智能系统', text: '持续记录模型、工具和学习方法如何真正发挥作用。', href: links.agents },
]
const projects = [
  { id: 'code', kind: 'ALGORITHM ARCHIVE', title: 'CodeHub', href: links.code, text: '2,700+ 份竞赛代码与题解，支持检索、配对阅读与 LaTeX。' },
  { id: 'math', kind: 'STUDY SYSTEM', title: 'HighSchool Mathematics', href: links.math, text: '面向长期学习的数学资料、讲义与思考。' },
  { id: 'agents', kind: 'RESEARCH NOTES', title: 'Agent Learning Hub', href: links.agents, text: '关于智能体、工具调用与评估的学习记录。' },
]

function AuroraArchive() { return <div className="aurora-archive" aria-hidden="true"><i /><i /><i /><b /><b /><b /></div> }

function Reveal({ children, delay = 0, className = '', eager = false }: { children: ReactNode; delay?: number; className?: string; eager?: boolean }) {
  const reduce = useReducedMotion()
  const visible = { opacity: 1, y: 0 }
  return <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 24 }} animate={eager ? visible : undefined} whileInView={eager ? undefined : visible} viewport={{ once: true, amount: .18 }} transition={{ duration: .72, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
}

function PointerParallax({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  const [finePointer, setFinePointer] = useState(false)
  const [point, setPoint] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setFinePointer(query.matches && window.innerWidth >= 900)
    update(); query.addEventListener('change', update); window.addEventListener('resize', update)
    return () => { query.removeEventListener('change', update); window.removeEventListener('resize', update) }
  }, [])
  const onMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!finePointer || reduce) return
    const box = event.currentTarget.getBoundingClientRect()
    setPoint({ x: (event.clientX - box.left) / box.width - .5, y: (event.clientY - box.top) / box.height - .5 })
  }
  const style = { '--pointer-x': `${point.x * 20}px`, '--pointer-y': `${point.y * 16}px` } as CSSProperties
  return <header className="hero" id="home" onPointerMove={onMove} onPointerLeave={() => { if (finePointer && !reduce) setPoint({ x: 0, y: 0 }) }} style={style}>{children}</header>
}

function Brand() { return <span className="brand"><b>唐一潇</b><i>Paradox Praxis Clinamen</i></span> }

function App() {
  return <main>
    <PointerParallax>
      <AuroraArchive />
      <nav aria-label="主导航"><a href="#home" aria-label="回到首页"><Brand /></a><div><a href="#about">轨迹</a><a href="#work">档案</a><a href="#links">链接</a></div></nav>
      <div className="hero-orbit" aria-hidden="true"><span /><span /><span /></div>
      <Reveal className="hero-copy" eager><p className="eyebrow">PERSONAL FIELD NOTES · 2026</p><p className="hero-kicker">佯谬·践履·偏斜</p><h1>Paradox<br /><em>Praxis</em><br />Clinamen</h1><p className="lede">在算法、数学与智能系统之间，<br />为持续的理解留下一条可追踪的轨迹。</p><a className="orbit-button" href="#work">进入档案 <span aria-hidden="true">↓</span></a></Reveal>
      <div className="hero-foot"><span>唐一潇的学习与研究档案</span><span>SCROLL TO TRACE <b>↓</b></span></div>
    </PointerParallax>
    <section className="manifesto" id="about"><AuroraArchive /><div className="trajectory" aria-hidden="true"><i /><i /><i /></div><Reveal><p className="eyebrow">01 / THE ORBIT</p><h2>思考不是抵达，<br /><em>而是一次微小的偏斜。</em></h2></Reveal><Reveal delay={.12} className="manifesto-note"><p>我将竞赛训练、数学推导与智能系统学习视为同一件事：拆解、验证、记录，再在下一次面对问题时更清晰地行动。</p><a className="under-link" href={links.github} target="_blank" rel="noreferrer">访问 GitHub 档案 <span>↗</span></a></Reveal></section>
    <section className="constellation" id="focus"><Reveal><p className="eyebrow">02 / CONSTELLATIONS</p><h2>正在校准的<br /><em>三个方向。</em></h2></Reveal><div className="focus-list">{focus.map((item, index) => <Reveal key={item.code} delay={index * .08}><a className="focus-row" href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"><span>{item.code}</span><div><strong>{item.title}</strong><b>{item.zh}</b></div><p>{item.text}</p><i aria-hidden="true">↗</i></a></Reveal>)}</div></section>
    <section className="archive" id="work"><AuroraArchive /><Reveal><p className="eyebrow">03 / SELECTED ARCHIVES</p><h2>把正在发生的<br /><em>理解留下来。</em></h2></Reveal><div className="project-grid">{projects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}</div></section>
    <footer id="links"><AuroraArchive /><Reveal><p className="eyebrow">04 / CONTINUE</p><h2>沿着轨迹，<br /><em>继续偏斜。</em></h2></Reveal><div className="link-grid"><a href={links.code}>CodeHub <span>↗</span></a><a href={links.github} target="_blank" rel="noreferrer">GitHub <span>↗</span></a><a href={links.luogu} target="_blank" rel="noreferrer">Luogu <span>↗</span></a><a href={links.cnblogs} target="_blank" rel="noreferrer">Cnblogs <span>↗</span></a><a href={links.csdn} target="_blank" rel="noreferrer">CSDN <span>↗</span></a><a href={links.bilibili} target="_blank" rel="noreferrer">Bilibili <span>↗</span></a></div><p className="copyright">© 2026 唐一潇 / Paradox Praxis Clinamen / 佯谬·践履·偏斜</p></footer>
  </main>
}

function ProjectCard({ project, index }: { project: typeof projects[number]; index: number }) {
  const reduce = useReducedMotion()
  return <Reveal delay={index * .1}><motion.a href={project.href} className="project-card" target={project.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" whileHover={reduce ? undefined : { y: -8 }} transition={{ duration: .28, ease: 'easeOut' }}><span className="project-index">0{index + 1}</span><p>{project.kind}</p><h3>{project.title}</h3><span className="project-text">{project.text}</span><b>OPEN ARCHIVE <i aria-hidden="true">↗</i></b><div className="project-signal" aria-hidden="true"><i /><i /><i /></div></motion.a></Reveal>
}

export default App
