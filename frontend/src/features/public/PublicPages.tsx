import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const REPOSITORY_URL = 'https://github.com/revanthlol/SlotForge';

function PublicShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen bg-paper text-on-surface">
      <header className="border-b border-rule bg-paper-raised">
        <nav className="mx-auto flex min-h-16 w-[calc(100%_-_2rem)] max-w-[1080px] items-center justify-between gap-4" aria-label="Public navigation">
          <Link to="/" className="flex items-center gap-2.5 font-bold">
            <img src={theme === 'dark' ? '/logo/logo-dark.svg' : '/logo/logo.svg'} alt="" className="h-8 w-8" />
            <span style={{ fontFamily: 'var(--font-display)' }} className="text-xl">SlotForge</span>
          </Link>
          <div className="flex items-center gap-2">
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="hidden rounded-lg px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-accent-soft sm:inline-flex">GitHub</a>
            <button type="button" onClick={toggleTheme} aria-label="Toggle color theme" className="grid h-9 w-9 place-items-center rounded-lg border border-rule hover:bg-accent-soft"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span></button>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-[calc(100%_-_2rem)] max-w-[880px] py-16 sm:py-24">
        <p className="text-label-caps text-primary" style={{ fontSize: 10 }}>{eyebrow}</p>
        <h1 className="mt-4 text-[clamp(2.7rem,7vw,5.6rem)] font-semibold leading-[.96] tracking-[-.045em]" style={{ fontFamily: 'var(--font-display)' }}>{title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-on-surface-variant">{intro}</p>
        <div className="public-copy mt-14">{children}</div>
      </main>
      <footer className="border-t border-rule bg-paper-raised">
        <div className="mx-auto flex w-[calc(100%_-_2rem)] max-w-[1080px] flex-col justify-between gap-4 py-7 text-xs text-on-surface-variant sm:flex-row">
          <p>SlotForge · Open-source institutional scheduling.</p>
          <div className="flex flex-wrap gap-4"><Link to="/open-source">Open source</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/contact">Contact</Link></div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2>{title}</h2>{children}</section>;
}

export function OpenSourcePage() {
  return <PublicShell eyebrow="OPEN SOURCE / MIT" title="Built in the open. Better with you." intro="SlotForge is an MIT-licensed scheduling platform. Inspect the solver, run the whole stack yourself, report a rough edge, or help shape the next release.">
    <div className="grid gap-4 sm:grid-cols-3">
      {[['code', 'Read the code', 'Follow the FastAPI, React, PostgreSQL, and OR-Tools implementation.'], ['fork_right', 'Make it yours', 'Self-host it, extend the scheduling model, or build a domain adapter.'], ['diversity_3', 'Contribute', 'Issues, documentation, tests, accessibility, and product feedback all move the project forward.']].map(([icon, title, body]) => <article key={title} className="rounded-xl border border-rule bg-paper-raised p-5"><span className="material-symbols-outlined text-primary">{icon}</span><h2 className="mt-6 text-lg">{title}</h2><p>{body}</p></article>)}
    </div>
    <Section title="Start contributing"><p>Read the contribution guide, choose an issue, and open your work against the <code>dev</code> branch. Security reports should follow the private process in <code>SECURITY.md</code>.</p><a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary">Explore SlotForge on GitHub <span aria-hidden="true">↗</span></a></Section>
    <Section title="What is open"><p>The application source, database schema documentation, setup guides, and faculty-facing UML v2 diagrams are published in the repository. Secrets, credentials, user records, and production connection details are never part of the public schema export.</p></Section>
  </PublicShell>;
}

export function PrivacyPage() {
  return <PublicShell eyebrow="PROJECT POLICY" title="Privacy" intro="A plain-language description of the data SlotForge currently handles. Last updated July 26, 2026.">
    <Section title="What SlotForge stores"><p>Account identity and sessions are handled through Supabase Auth. The application stores institution and membership details, scheduling workspaces, resources, constraints, timetable versions, assignments, share links, and audit records needed to provide the service.</p></Section>
    <Section title="Where it runs"><p>The web client is deployed through Vercel, the API runs on an Oracle-hosted server, and application data is stored in PostgreSQL with Supabase services. These providers may process technical request data under their own terms.</p></Section>
    <Section title="Analytics and local preferences"><p>The current application does not include advertising or product analytics. Theme, sidebar, and selected solver preferences may be stored locally in your browser.</p></Section>
    <Section title="Sharing and retention"><p>SlotForge does not sell personal data. Faculty timetable links are accessible to anyone who holds an active link until it expires or is revoked. Institution administrators control workspace records and may request deletion.</p></Section>
    <Section title="Questions"><p>Institution users can contact <a href="mailto:workofotb@gmail.com">workofotb@gmail.com</a>. Developers should use the repository issue tracker for non-sensitive project questions.</p></Section>
    <p className="public-note">This project-stage notice is informational and should receive professional legal review before a commercial launch.</p>
  </PublicShell>;
}

export function TermsPage() {
  return <PublicShell eyebrow="PROJECT POLICY" title="Terms of use" intro="Terms for the current open-source, pre-release SlotForge service. Last updated July 26, 2026.">
    <Section title="Using the service"><p>Use SlotForge only for lawful scheduling work and only with data you are authorized to provide. Do not attempt to disrupt the service, bypass access controls, or access another institution’s workspace.</p></Section>
    <Section title="Accounts and institution data"><p>You are responsible for account security and the accuracy of data entered into your institution workspace. Institution administrators control membership, shared links, and deletion of organization data.</p></Section>
    <Section title="Open-source license"><p>The repository source is available under the MIT License. That license governs use of the code; these terms govern use of the hosted application.</p></Section>
    <Section title="Availability"><p>SlotForge is under active development and is provided as available, without a guarantee of uninterrupted operation or timetable suitability. Review generated schedules before relying on or publishing them.</p></Section>
    <Section title="Contact"><p>Institution users can email <a href="mailto:workofotb@gmail.com">workofotb@gmail.com</a>. Contributors can use GitHub Issues.</p></Section>
    <p className="public-note">These project-stage terms are not a substitute for professional legal advice and should be reviewed before commercial use.</p>
  </PublicShell>;
}

export function ContactPage() {
  return <PublicShell eyebrow="CONTACT" title="Talk to the right place." intro="Choose the path that matches what you need so your message reaches the right context.">
    <div className="grid gap-5 sm:grid-cols-2">
      <article className="rounded-2xl border border-rule bg-paper-raised p-7"><span className="material-symbols-outlined text-primary">domain</span><h2 className="mt-7">Institutions and users</h2><p>For access, account, privacy, or deployment questions about using SlotForge.</p><a className="mt-6 inline-flex font-bold text-primary" href="mailto:workofotb@gmail.com">workofotb@gmail.com</a></article>
      <article className="rounded-2xl border border-rule bg-paper-raised p-7"><span className="material-symbols-outlined text-primary">terminal</span><h2 className="mt-7">Developers and contributors</h2><p>For bugs, feature proposals, documentation improvements, and contribution discussion.</p><a className="mt-6 inline-flex font-bold text-primary" href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noreferrer">Open GitHub Issues ↗</a></article>
    </div>
  </PublicShell>;
}
