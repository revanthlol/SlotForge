import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';

const workflow = [
  ['01', 'Model your institution', 'Bring teachers, subjects, sections, rooms, and time structure into one source of truth.'],
  ['02', 'Set the rules', 'Capture workload, capacity, availability, and the constraints your timetable must respect.'],
  ['03', 'Solve and inspect', 'Generate a conflict-aware draft, review its placement logic, and make precise adjustments.'],
  ['04', 'Publish with confidence', 'Keep draft, published, and archived versions clear for everyone who depends on the schedule.'],
];

const faqs = [
  ['What does SlotForge schedule?', 'SlotForge brings together faculty, subjects, sections, rooms, periods, and institutional rules to generate timetable drafts that your team can review.'],
  ['Can I use day-order timetables?', 'Yes. You can configure either a fixed weekday week or a rotating day-order cycle during setup, then render the timetable in the same structure.'],
  ['Can I review a schedule before publishing?', 'Yes. Generated schedules start as drafts. Review conflicts, edit slots where needed, compare versions, and publish only when the result is ready.'],
  ['Do I need every detail before I begin?', 'No. Start with the resources and rules you know, save your progress, and continue refining the workspace as your institution’s data becomes available.'],
];

const capabilities = [
  ['groups', 'Faculty load', 'Balance teaching hours while retaining the visibility needed for real academic teams.'],
  ['domain', 'Room capacity', 'Match sections to the right room or lab before a capacity problem reaches the timetable.'],
  ['menu_book', 'Course structure', 'Map subjects, session lengths, and teaching assignments in the same operational model.'],
  ['rule_settings', 'Conflict prevention', 'Turn institutional rules into explicit scheduling constraints instead of last-minute fixes.'],
];

const REPOSITORY_URL = 'https://github.com/revanthlol/SlotForge';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [desktopTrace, setDesktopTrace] = useState(() => window.matchMedia('(min-width: 900px)').matches);
  const reduceMotion = useReducedMotion();
  const signedIn = Boolean(user);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 22);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px)');
    const update = () => setDesktopTrace(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const enter = (delay = 0) => reduceMotion ? undefined : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: .58, delay } };

  return (
    <div className="stitch-landing min-h-screen bg-paper text-on-surface">
      <header className="stitch-header">
        <nav className={`stitch-container stitch-nav-floating ${scrolled ? 'is-scrolled' : ''}`} aria-label="Public navigation">
          <Link to="/" className="stitch-nav-brand flex shrink-0 items-center gap-2.5" aria-label="SlotForge home">
            <img src={theme === 'dark' ? '/logo/logo-dark.svg' : '/logo/logo.svg'} alt="" className="h-7 w-7 object-contain" />
            <span className="stitch-nav-wordmark">SlotForge</span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <a href="#workflow">Workflow</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#open-source">Open source</a>
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">GitHub</a>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleTheme} className="stitch-nav-icon" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="stitch-nav-mobile-github md:hidden">GitHub</a>
            <span className="stitch-nav-mobile-soon md:hidden">Mobile app soon</span>
            {!loading && signedIn ? <Link to="/" className="stitch-nav-primary stitch-desktop-launch hidden md:inline-flex">Open dashboard</Link> : <button type="button" onClick={() => setLauncherOpen(true)} className="stitch-nav-primary stitch-desktop-launch hidden md:inline-flex">Launch web app</button>}
          </div>
        </nav>
      </header>

      <main>
        <section className="stitch-hero">
          <div className="stitch-container grid items-center gap-12 py-16 lg:grid-cols-[.88fr_1.12fr] lg:py-24">
            <div>
              <motion.h1 {...enter(.08)} className="stitch-display">Build timetables<br />around reality.</motion.h1>
              <motion.p {...enter(.16)} className="mt-6 max-w-xl text-base leading-7 text-on-surface-variant">Model faculty, rooms, courses, and institutional rules in one workspace—then let an inspectable solver turn them into a timetable your team can review.</motion.p>
              <motion.div {...enter(.24)} className="mt-9 flex flex-wrap gap-3">
                {signedIn ? <Link to="/" className="stitch-primary-cta stitch-desktop-launch">Open workspace <span aria-hidden="true">→</span></Link> : <button type="button" onClick={() => setLauncherOpen(true)} className="stitch-primary-cta stitch-desktop-launch">Launch web app <span aria-hidden="true">→</span></button>}
                <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="stitch-secondary-cta"><span className="material-symbols-outlined" style={{ fontSize: 17 }}>code</span>View on GitHub</a>
              </motion.div>
              <motion.div {...enter(.32)} className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-rule pt-5">
                <Stat value="MIT" label="licensed" />
                <Stat value="Self-host" label="your stack" />
                <Stat value="OR-Tools" label="solver core" />
              </motion.div>
            </div>
            <motion.div initial={reduceMotion ? false : { opacity: 0, scale: .97, y: 12 }} animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }} transition={{ duration: .7, delay: .16, ease: [0.16, 1, .3, 1] }} className="solver-trace-wrap">
              <SolverTrace animated={desktopTrace && !reduceMotion} />
            </motion.div>
          </div>
        </section>

        <section className="border-y border-rule bg-paper-raised py-9">
          <div className="stitch-container grid gap-5 text-center sm:grid-cols-3">
            <p className="text-[10px] font-mono uppercase tracking-[.16em] text-mono-grey">Model resources once</p>
            <p className="text-[10px] font-mono uppercase tracking-[.16em] text-mono-grey">Keep rules visible</p>
            <p className="text-[10px] font-mono uppercase tracking-[.16em] text-mono-grey">Review before publish</p>
          </div>
        </section>

        <section id="workflow" className="stitch-container py-24">
          <div className="max-w-3xl"><p className="stitch-eyebrow">The working rhythm</p><h2 className="stitch-heading mt-4">A schedule should be a decision, not a scramble.</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant">The workflow stays linear enough to learn quickly and flexible enough for the details that surface once a real institution starts using it.</p></div>
          <div className="mt-14 grid gap-px overflow-hidden border border-rule bg-rule md:grid-cols-4">{workflow.map(([number, title, body], index) => <motion.article initial={reduceMotion ? false : { opacity: 0, y: 16 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }} transition={{ duration: .42, delay: index * .06 }} whileHover={reduceMotion ? undefined : { y: -4 }} key={number} className="bg-paper-raised p-6"><p className="text-[10px] font-mono tracking-widest text-on-surface-variant">{number}</p><h3 className="mt-8 text-lg font-semibold text-on-surface" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3><p className="mt-3 text-sm leading-6 text-on-surface-variant">{body}</p></motion.article>)}</div>
        </section>

        <section id="capabilities" className="border-y border-rule bg-paper-raised py-24">
          <div className="stitch-container"><div className="max-w-3xl"><p className="stitch-eyebrow">Intelligent foundation</p><h2 className="stitch-heading mt-4">Tools for the parts of scheduling that actually get complicated.</h2></div>
            <div className="mt-14 grid gap-4 md:grid-cols-2">
              <CapabilityCard reduceMotion={reduceMotion} className="stitch-feature-card stitch-feature-card--pale" icon="account_tree" title="A clear operational model" body="Resources, assignments, rooms, sections, and time structure live in the same workspace instead of across separate spreadsheets." tags={['Resources', 'Assignments']} />
              <CapabilityCard reduceMotion={reduceMotion} className="stitch-feature-card stitch-feature-card--dark" icon="precision_manufacturing" title="A solver you can inspect" body="Generate a workable draft, make targeted adjustments, and use conflict analysis to understand the trade-offs behind a placement." tags={['Generate', 'Explainability']} />
              <CapabilityCard reduceMotion={reduceMotion} className="stitch-feature-card" icon="history" title="Version control without the mess" body="Keep draft, published, and archived timetable states distinct so a change never erases the schedule people rely on." />
              <CapabilityCard reduceMotion={reduceMotion} className="stitch-feature-card" icon="ios_share" title="Exports that fit the institution" body="Prepare shareable timetables and structured exports for the people and systems that need the final answer." visual />
            </div>
          </div>
        </section>

        <section className="stitch-dark-section py-24"><div className="stitch-container text-center"><p className="text-[10px] font-mono uppercase tracking-[.16em] text-white/35">Built for the constraints behind the grid</p><h2 className="stitch-heading mt-4 text-white">Made for every academic team.</h2><p className="mt-3 text-sm text-white/50">Faculty, rooms, courses, and the rules between them.</p>
          <div className="mt-14 grid gap-px border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-4">{capabilities.map(([icon, title, body]) => <div key={title} className="bg-[#0d2924] p-7 text-center transition-colors hover:bg-white/5"><span className="material-symbols-outlined text-white/75" style={{ fontSize: 26 }}>{icon}</span><h3 className="mt-5 text-sm font-semibold text-white">{title}</h3><p className="mt-3 text-xs leading-5 text-white/50">{body}</p></div>)}</div>
        </div></section>

        <section id="open-source" className="border-b border-rule bg-paper-raised py-24"><div className="stitch-container grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-end"><div><p className="stitch-eyebrow">Open source by design</p><h2 className="stitch-heading mt-4">The scheduling engine belongs in the open.</h2><p className="mt-5 max-w-2xl text-sm leading-6 text-on-surface-variant">Read every constraint, audit how drafts are produced, self-host the stack, or contribute the workflow your institution needs next. SlotForge is MIT licensed and built publicly.</p></div><div className="flex flex-wrap gap-3 lg:justify-end"><a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="stitch-primary-cta">Star or contribute <span aria-hidden="true">↗</span></a><Link to="/open-source" className="stitch-secondary-cta">Open-source guide</Link></div></div></section>

        <LandingFaq />

        <section className="stitch-cta"><div className="stitch-container relative z-10 py-24 text-center"><h2 className="stitch-display mx-auto max-w-4xl text-white" style={{ fontSize: 'clamp(2.6rem, 6vw, 5.3rem)' }}>Start with the schedule your institution actually needs.</h2><p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-white/60">The web console is available on desktop. A focused mobile experience is coming soon.</p>{signedIn ? <Link to="/" className="stitch-desktop-launch mt-9 inline-flex rounded bg-white px-6 py-3 text-sm font-semibold text-[#0d2924] transition-transform hover:-translate-y-0.5">Open workspace <span className="ml-2">→</span></Link> : <button type="button" onClick={() => setLauncherOpen(true)} className="stitch-desktop-launch mt-9 rounded bg-white px-6 py-3 text-sm font-semibold text-[#0d2924] transition-transform hover:-translate-y-0.5">Launch web app <span className="ml-2">→</span></button>}</div></section>
      </main>

      <footer className="stitch-footer"><div className="stitch-container grid gap-10 py-14 sm:grid-cols-[1.4fr_repeat(3,1fr)]"><div><div className="flex items-center gap-2"><img src={theme === 'dark' ? '/logo/logo-dark.svg' : '/logo/logo.svg'} alt="" className="h-7 w-7" /><span className="text-sm font-bold">SlotForge</span></div><p className="mt-4 max-w-56 text-xs leading-5 text-white/45">Open-source institutional scheduling for academic teams.</p></div><FooterGroup title="Product" links={[['Workflow', '#workflow'], ['Capabilities', '#capabilities'], ['FAQ', '#faq']]} /><FooterGroup title="Open source" links={[['GitHub', REPOSITORY_URL], ['Contribute', `${REPOSITORY_URL}/blob/dev/CONTRIBUTING.md`], ['Project guide', '/open-source']]} /><FooterGroup title="Project" links={[['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', '/contact']]} /></div><div className="stitch-container flex flex-wrap justify-between gap-3 border-t border-white/10 py-5 text-[10px] font-mono uppercase tracking-widest text-white/30"><span>© {new Date().getFullYear()} SlotForge</span><span>MIT licensed · Built in public</span></div></footer>
      {launcherOpen && !signedIn && <LaunchChooser onClose={() => setLauncherOpen(false)} />}
    </div>
  );
}

function SolverTrace({ animated }: { animated: boolean }) {
  const nodes = [['person', 'Prof. Rao', 'Faculty'], ['menu_book', 'Systems', 'Subject'], ['groups', 'CSE–4A', 'Section'], ['science', 'Lab 2', 'Room'], ['rule', 'No clashes', 'Constraint']];
  return <div className={`solver-trace ${animated ? 'is-animated' : 'is-static'}`} aria-label="A solver trace resolving academic constraints into accepted timetable slots">
    <div className="solver-trace__bar"><span><i />Solver trace · Academic workspace</span><span>CP-SAT / 05 inputs</span></div>
    <div className="solver-trace__stage">
      <div className="solver-trace__inputs">{nodes.map(([icon, label, type], index) => <div key={label} className="solver-trace__node" style={{ '--trace-index': index } as CSSProperties}><span className="material-symbols-outlined">{icon}</span><span><strong>{label}</strong><small>{type}</small></span></div>)}</div>
      <svg className="solver-trace__lines" viewBox="0 0 600 330" preserveAspectRatio="none" aria-hidden="true"><path d="M140 43 C260 43 255 165 345 165"/><path d="M140 103 C245 103 260 165 345 165"/><path d="M140 163 C245 163 260 165 345 165"/><path d="M140 223 C245 223 260 165 345 165"/><path d="M140 283 C260 283 255 165 345 165"/><path className="solver-trace__accepted-line" d="M365 165 C430 165 430 92 486 92"/></svg>
      <div className="solver-trace__core"><span className="material-symbols-outlined">precision_manufacturing</span><small>resolve</small></div>
      <div className="solver-trace__result"><p>Accepted placements</p><div><span>MON · 09:00</span><strong>Systems</strong><small>CSE–4A · Lab 2</small></div><div><span>WED · 11:00</span><strong>Design studio</strong><small>CSE–4A · R-110</small></div><footer><i />0 conflicts</footer></div>
    </div>
  </div>;
}

function LaunchChooser({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#071713]/65 p-5 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="launch-title" className="w-full max-w-lg rounded-2xl border-2 border-rule bg-paper-raised p-6 shadow-2xl"><div className="flex items-start justify-between gap-5"><div><p className="stitch-eyebrow">Desktop web app</p><h2 id="launch-title" className="mt-3 text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Where do you want to begin?</h2></div><button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg border border-rule text-on-surface-variant hover:bg-accent-soft"><span className="material-symbols-outlined">close</span></button></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><Link to="/login" className="rounded-xl border border-rule bg-paper p-5 hover:border-primary"><span className="material-symbols-outlined text-primary">login</span><strong className="mt-5 block">Sign in</strong><span className="mt-2 block text-xs leading-5 text-on-surface-variant">Return to an existing institution workspace.</span></Link><Link to="/signup" className="rounded-xl border border-primary bg-accent-soft p-5"><span className="material-symbols-outlined text-primary">domain_add</span><strong className="mt-5 block">Create institution</strong><span className="mt-2 block text-xs leading-5 text-on-surface-variant">Start the guided Academic setup.</span></Link></div><p className="mt-5 text-xs text-mono-grey">On a phone? The mobile app is coming soon; the scheduling console currently needs a desktop-sized workspace.</p></section></div>;
}

function LandingFaq() {
  const [openFaq, setOpenFaq] = useState(0);

  return <section id="faq" className="stitch-faq py-24"><div className="stitch-container max-w-3xl"><div className="text-center"><p className="stitch-eyebrow">Questions, answered</p><h2 className="stitch-heading mt-4">FAQ</h2></div><div className="mt-12 space-y-3">{faqs.map(([question, answer], index) => <div key={question} className="border border-rule bg-paper-raised"><button type="button" className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left text-sm font-semibold text-on-surface" aria-expanded={openFaq === index} onClick={() => setOpenFaq((current) => current === index ? -1 : index)}>{question}<span className={`material-symbols-outlined text-mono-grey transition-transform ${openFaq === index ? 'rotate-45' : ''}`} style={{ fontSize: 20 }}>add</span></button>{openFaq === index && <p className="border-t border-rule px-6 py-5 text-sm leading-6 text-on-surface-variant">{answer}</p>}</div>)}</div></div></section>;
}

function CapabilityCard({ className, icon, title, body, tags, visual, reduceMotion }: { className: string; icon: string; title: string; body: string; tags?: string[]; visual?: boolean; reduceMotion: boolean | null }) {
  return <motion.article initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .46 }} whileHover={reduceMotion ? undefined : { y: -4 }} className={className}><div><span className="material-symbols-outlined" style={{ fontSize: 25 }}>{icon}</span><h3 className="mt-7 text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3><p className="mt-4 max-w-md text-sm leading-6 opacity-70">{body}</p></div>{tags && <div className="mt-7 flex flex-wrap gap-2">{tags.map(tag => <span key={tag} className="stitch-tag">{tag}</span>)}</div>}{visual && <div className="stitch-export-lines" aria-hidden="true"><i /><i /><i /></div>}</motion.article>;
}

function Stat({ value, label }: { value: string; label: string }) { return <div><p className="text-base font-bold text-on-surface">{value}</p><p className="mt-1 text-[9px] font-mono uppercase tracking-[.11em] text-mono-grey">{label}</p></div>; }
function FooterGroup({ title, links }: { title: string; links: [string, string][] }) { return <div><p className="text-[10px] font-mono uppercase tracking-widest text-white/35">{title}</p><div className="mt-4 space-y-2">{links.map(([label, href]) => href.startsWith('/') ? <Link key={label} to={href} className="block text-xs text-white/60 hover:text-white">{label}</Link> : <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className="block text-xs text-white/60 hover:text-white">{label}</a>)}</div></div>; }
