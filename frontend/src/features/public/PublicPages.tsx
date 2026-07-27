import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { GitHubMark, PublicFooter, PublicNavbar, PublicPageProgress, PublicPageShell, REPOSITORY_URL } from './PublicChrome';

const LICENSE_URL = `${REPOSITORY_URL}/blob/dev/LICENSE`;
const MIT_LICENSE = `MIT License

Copyright (c) 2026 revanthlol

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

function PublicShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <PublicPageShell>
      <PublicPageProgress />
      <PublicNavbar />
      <motion.main
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: .48, ease: [0.16, 1, .3, 1] }}
        className="mx-auto w-[calc(100%_-_2rem)] max-w-[880px] pb-20 pt-32 sm:pb-28 sm:pt-40"
      >
        <p className="text-label-caps text-primary" style={{ fontSize: 10 }}>{eyebrow}</p>
        <h1 className="mt-4 text-[clamp(2.7rem,7vw,5.6rem)] font-semibold leading-[.96] tracking-[-.045em]" style={{ fontFamily: 'var(--font-display)' }}>{title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-on-surface-variant">{intro}</p>
        <div className="public-copy mt-14">{children}</div>
      </motion.main>
      <PublicFooter />
    </PublicPageShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2>{title}</h2>{children}</section>;
}

export function OpenSourcePage() {
  return <PublicShell eyebrow="OPEN SOURCE / MIT" title="Built in the open. Better with you." intro="SlotForge is an MIT-licensed scheduling platform. Inspect the solver, follow every release, report a rough edge, or help shape what ships next.">
    <div className="grid gap-4 sm:grid-cols-3">
      {[["code", "Read the code", "Follow the FastAPI, React, PostgreSQL, and OR-Tools implementation."], ["fork_right", "Extend the model", "Study the scheduling decisions, propose a constraint, or build a domain adapter."], ["diversity_3", "Contribute", "Issues, documentation, tests, accessibility, and product feedback all move the project forward."]].map(([icon, cardTitle, body]) => <article key={cardTitle} className="rounded-xl border border-rule bg-paper-raised p-5"><span className="material-symbols-outlined text-primary">{icon}</span><h2 className="mt-6 text-lg">{cardTitle}</h2><p>{body}</p></article>)}
    </div>
    <Section title="Start contributing">
      <p>Read the contribution guide, choose an issue, and open your work against the <code>dev</code> branch. Security reports should follow the private process in <code>SECURITY.md</code>.</p>
      <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary"><GitHubMark className="h-4 w-4" />Explore SlotForge on GitHub <span aria-hidden="true">↗</span></a>
    </Section>
    <Section title="What is open"><p>The application source, database schema documentation, setup guides, and faculty-facing UML v2 diagrams are published in the repository. Secrets, credentials, user records, and production connection details are never part of the public schema export.</p></Section>
    <Section title="MIT License">
      <p>The complete repository is available under the <a href={LICENSE_URL} target="_blank" rel="noreferrer">MIT License <span aria-hidden="true">↗</span></a>. The license text is reproduced here so the terms are readable without leaving SlotForge.</p>
      <pre className="public-license-text">{MIT_LICENSE}</pre>
    </Section>
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
    <Section title="Open-source license"><p>The repository source is available under the <a href={LICENSE_URL} target="_blank" rel="noreferrer">MIT License <span aria-hidden="true">↗</span></a>. That license governs use of the code; these terms govern use of the hosted application.</p></Section>
    <Section title="Availability"><p>SlotForge is under active development and is provided as available, without a guarantee of uninterrupted operation or timetable suitability. Review generated schedules before relying on or publishing them.</p></Section>
    <Section title="Contact"><p>Institution users can email <a href="mailto:workofotb@gmail.com">workofotb@gmail.com</a>. Contributors can use GitHub Issues.</p></Section>
    <p className="public-note">These project-stage terms are not a substitute for professional legal advice and should be reviewed before commercial use.</p>
  </PublicShell>;
}

export function ContactPage() {
  return <PublicShell eyebrow="CONTACT" title="Talk to the right place." intro="Choose the path that matches what you need so your message reaches the right context.">
    <div className="grid gap-5 sm:grid-cols-2">
      <article className="rounded-2xl border border-rule bg-paper-raised p-7"><span className="material-symbols-outlined text-primary">domain</span><h2 className="mt-7">Institutions and users</h2><p>For access, account, privacy, or deployment questions about using SlotForge.</p><a className="mt-6 inline-flex font-bold text-primary" href="mailto:workofotb@gmail.com">workofotb@gmail.com</a></article>
      <article className="rounded-2xl border border-rule bg-paper-raised p-7"><span className="material-symbols-outlined text-primary">terminal</span><h2 className="mt-7">Developers and contributors</h2><p>For bugs, feature proposals, documentation improvements, and contribution discussion.</p><a className="mt-6 inline-flex items-center gap-2 font-bold text-primary" href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noreferrer"><GitHubMark className="h-4 w-4" />Open GitHub Issues <span aria-hidden="true">↗</span></a></article>
    </div>
  </PublicShell>;
}
