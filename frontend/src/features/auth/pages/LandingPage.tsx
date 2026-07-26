import { useEffect, useState } from 'react';
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

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();
  const signedIn = Boolean(user);
  const primaryHref = signedIn ? '/' : '/signup';

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 22);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
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
            <a href="#faq">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleTheme} className="stitch-nav-icon" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>
            {!loading && !signedIn && <Link to="/login" className="stitch-nav-signin hidden sm:inline-flex">Sign in</Link>}
            <Link to={primaryHref} className="stitch-nav-primary">
              {signedIn ? 'Open dashboard' : 'Create institution'}
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="stitch-hero">
          <div className="stitch-container grid items-center gap-12 py-16 lg:grid-cols-[.88fr_1.12fr] lg:py-24">
            <div>
              <motion.div {...enter(0)} className="stitch-status"><span className="stitch-status-dot" />Institutional scheduling, made legible</motion.div>
              <motion.h1 {...enter(.08)} className="stitch-display mt-6">Bring every schedule<br />into focus.</motion.h1>
              <motion.p {...enter(.16)} className="mt-6 max-w-xl text-base leading-7 text-on-surface-variant">SlotForge gives academic teams one calm place to model their resources, resolve constraints, and publish schedules people can trust.</motion.p>
              <motion.div {...enter(.24)} className="mt-9 flex flex-wrap gap-3">
                <Link to={primaryHref} className="stitch-primary-cta">{signedIn ? 'Open workspace' : 'Start scheduling'} <span aria-hidden="true">→</span></Link>
                <a href="#workflow" className="stitch-secondary-cta">See the workflow</a>
              </motion.div>
              <motion.div {...enter(.32)} className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-rule pt-5">
                <Stat value="One" label="shared source of truth" />
                <Stat value="Draft" label="before every publish" />
                <Stat value="Clear" label="from setup to export" />
              </motion.div>
            </div>
            <motion.div initial={reduceMotion ? false : { opacity: 0, scale: .97, y: 12 }} animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }} transition={{ duration: .7, delay: .16, ease: [0.16, 1, .3, 1] }} className="schedule-preview-wrap">
              <div className="schedule-preview-kicker"><span className="stitch-status-dot" /> Draft schedule · Week 07</div>
              <SchedulePreview />
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

        <LandingFaq />

        <section className="stitch-cta"><div className="stitch-container relative z-10 py-24 text-center"><h2 className="stitch-display mx-auto max-w-4xl text-white" style={{ fontSize: 'clamp(2.6rem, 6vw, 5.3rem)' }}>Start with the schedule your institution actually needs.</h2><p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-white/60">Create an institution, add the resources you know, and let SlotForge guide the next decision.</p><Link to={primaryHref} className="mt-9 inline-flex rounded bg-white px-6 py-3 text-sm font-semibold text-[#0d2924] transition-transform hover:-translate-y-0.5">{signedIn ? 'Open workspace' : 'Create your institution'} <span className="ml-2">→</span></Link></div></section>
      </main>

      <footer className="stitch-footer"><div className="stitch-container grid gap-10 py-14 sm:grid-cols-[1.4fr_repeat(3,1fr)]"><div><div className="flex items-center gap-2"><img src={theme === 'dark' ? '/logo/logo-dark.svg' : '/logo/logo.svg'} alt="" className="h-7 w-7" /><span className="text-sm font-bold">SlotForge</span></div><p className="mt-4 max-w-56 text-xs leading-5 text-white/45">Precise institutional scheduling for academic teams.</p></div><FooterGroup title="Product" links={['Workflow', 'Solver', 'Versions']} /><FooterGroup title="Resources" links={['FAQ', 'Setup guide', 'Support']} /><FooterGroup title="Institution" links={['Privacy', 'Terms', 'Contact']} /></div><div className="stitch-container border-t border-white/10 py-5 text-[10px] font-mono uppercase tracking-widest text-white/30">© {new Date().getFullYear()} SlotForge</div></footer>
    </div>
  );
}

function SchedulePreview() {
  return <div className="schedule-preview">
    <div className="schedule-preview__header">
      <div><p className="schedule-preview__eyebrow">B.Tech · CSE · Semester 04</p><h2>Weekly draft</h2></div>
      <span className="schedule-preview__status"><i />Ready to review</span>
    </div>
    <div className="schedule-preview__grid" aria-label="Sample timetable preview">
      <span className="schedule-preview__time">09:00</span><span className="schedule-preview__day">Mon</span><span className="schedule-preview__day">Tue</span><span className="schedule-preview__day">Wed</span>
      <span className="schedule-preview__time">10:00</span><div className="schedule-block schedule-block--systems">Systems<br /><small>Lab 2</small></div><div className="schedule-block schedule-block--data">Data structures<br /><small>A-203</small></div><div className="schedule-block schedule-block--empty" />
      <span className="schedule-preview__time">11:00</span><div className="schedule-block schedule-block--empty" /><div className="schedule-block schedule-block--design">Design studio<br /><small>R-110</small></div><div className="schedule-block schedule-block--math">Discrete math<br /><small>A-203</small></div>
      <span className="schedule-preview__time">12:00</span><div className="schedule-block schedule-block--math">Discrete math<br /><small>A-203</small></div><div className="schedule-block schedule-block--empty" /><div className="schedule-block schedule-block--systems">Systems<br /><small>Lab 2</small></div>
    </div>
    <div className="schedule-preview__footer"><span><i />0 unresolved conflicts</span><span>18/18 placements covered</span></div>
  </div>;
}

function LandingFaq() {
  const [openFaq, setOpenFaq] = useState(0);

  return <section id="faq" className="stitch-faq py-24"><div className="stitch-container max-w-3xl"><div className="text-center"><p className="stitch-eyebrow">Questions, answered</p><h2 className="stitch-heading mt-4">FAQ</h2></div><div className="mt-12 space-y-3">{faqs.map(([question, answer], index) => <div key={question} className="border border-rule bg-paper-raised"><button type="button" className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left text-sm font-semibold text-on-surface" aria-expanded={openFaq === index} onClick={() => setOpenFaq((current) => current === index ? -1 : index)}>{question}<span className={`material-symbols-outlined text-mono-grey transition-transform ${openFaq === index ? 'rotate-45' : ''}`} style={{ fontSize: 20 }}>add</span></button>{openFaq === index && <p className="border-t border-rule px-6 py-5 text-sm leading-6 text-on-surface-variant">{answer}</p>}</div>)}</div></div></section>;
}

function CapabilityCard({ className, icon, title, body, tags, visual, reduceMotion }: { className: string; icon: string; title: string; body: string; tags?: string[]; visual?: boolean; reduceMotion: boolean | null }) {
  return <motion.article initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .46 }} whileHover={reduceMotion ? undefined : { y: -4 }} className={className}><div><span className="material-symbols-outlined" style={{ fontSize: 25 }}>{icon}</span><h3 className="mt-7 text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3><p className="mt-4 max-w-md text-sm leading-6 opacity-70">{body}</p></div>{tags && <div className="mt-7 flex flex-wrap gap-2">{tags.map(tag => <span key={tag} className="stitch-tag">{tag}</span>)}</div>}{visual && <div className="stitch-export-lines" aria-hidden="true"><i /><i /><i /></div>}</motion.article>;
}

function Stat({ value, label }: { value: string; label: string }) { return <div><p className="text-base font-bold text-on-surface">{value}</p><p className="mt-1 text-[9px] font-mono uppercase tracking-[.11em] text-mono-grey">{label}</p></div>; }
function FooterGroup({ title, links }: { title: string; links: string[] }) { return <div><p className="text-[10px] font-mono uppercase tracking-widest text-white/35">{title}</p><div className="mt-4 space-y-2">{links.map(link => <a key={link} href="#" className="block text-xs text-white/60 hover:text-white">{link}</a>)}</div></div>; }
