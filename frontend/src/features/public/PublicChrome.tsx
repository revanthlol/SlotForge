import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export const REPOSITORY_URL = 'https://github.com/revanthlol/SlotForge';

type PublicNavbarProps = {
  action?: 'launch' | 'signin' | 'signup';
  onLaunch?: () => void;
};

export function GitHubMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.24.7-3.92-1.38-3.92-1.38-.53-1.35-1.3-1.71-1.3-1.71-1.06-.73.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.4-1.27.74-1.56-2.59-.3-5.31-1.3-5.31-5.69 0-1.26.45-2.28 1.2-3.09-.12-.29-.52-1.47.11-3.05 0 0 .98-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.64 1.58.24 2.76.12 3.05.74.81 1.19 1.83 1.19 3.09 0 4.4-2.73 5.39-5.32 5.68.42.36.79 1.07.79 2.16v3.27c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}

export function PublicNavbar({ action = 'launch', onLaunch }: PublicNavbarProps) {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 22);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const signedIn = Boolean(user);
  const launchControl = !loading && signedIn ? (
    <Link to="/" className="stitch-nav-primary stitch-desktop-launch hidden md:inline-flex">Open dashboard</Link>
  ) : action === 'signup' ? (
    <Link to="/signup" className="stitch-nav-primary stitch-desktop-launch hidden md:inline-flex">Create institution</Link>
  ) : action === 'signin' ? (
    <Link to="/login" className="stitch-nav-primary stitch-desktop-launch hidden md:inline-flex">Sign in</Link>
  ) : onLaunch ? (
    <button type="button" onClick={onLaunch} className="stitch-nav-primary stitch-desktop-launch hidden md:inline-flex">Launch web app</button>
  ) : (
    <Link to="/login" className="stitch-nav-primary stitch-desktop-launch hidden md:inline-flex">Launch web app</Link>
  );

  return (
    <header className="stitch-header">
      <nav className={`stitch-container stitch-nav-floating ${scrolled ? 'is-scrolled' : ''}`} aria-label="Public navigation">
        <Link to="/landing" className="stitch-nav-brand flex shrink-0 items-center gap-2.5" aria-label="SlotForge landing page">
          <img src={theme === 'dark' ? '/logo/logo-dark.svg' : '/logo/logo.svg'} alt="" className="h-7 w-7 object-contain" />
          <span className="stitch-nav-wordmark">SlotForge</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          <Link to="/landing#workflow" className="stitch-nav-section-link">Workflow</Link>
          <Link to="/landing#capabilities" className="stitch-nav-section-link">Capabilities</Link>
          <Link to="/open-source" className="stitch-nav-section-link">Open source</Link>
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="stitch-nav-github" aria-label="SlotForge on GitHub">
            <GitHubMark className="h-4 w-4" />
            <span>GitHub</span>
          </a>
        </div>
        <div className="flex items-center gap-2">
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="stitch-nav-github stitch-nav-github-mobile" aria-label="SlotForge on GitHub">
            <GitHubMark className="h-4 w-4" />
          </a>
          <button type="button" onClick={toggleTheme} className="stitch-nav-icon" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <span className="stitch-nav-mobile-soon md:hidden">Mobile app soon</span>
          {launchControl}
        </div>
      </nav>
    </header>
  );
}

function FooterGroup({ title, links }: { title: string; links: Array<{ label: string; href: string; external?: boolean }> }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-white/35">{title}</p>
      <div className="mt-4 space-y-2">
        {links.map(({ label, href, external }) => external ? (
          <a key={label} href={href} target="_blank" rel="noreferrer" className="stitch-footer-link">
            <span>{label}</span><span aria-hidden="true">↗</span>
          </a>
        ) : (
          <Link key={label} to={href} className="stitch-footer-link"><span>{label}</span></Link>
        ))}
      </div>
    </div>
  );
}

export function PublicFooter() {
  return (
    <footer className="stitch-footer">
      <div className="stitch-container grid gap-10 py-14 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2"><img src="/logo/logo-dark.svg" alt="" className="h-7 w-7" /><span className="text-sm font-bold">SlotForge</span></div>
          <p className="mt-4 max-w-56 text-xs leading-5 text-white/45">Open-source institutional scheduling for academic teams.</p>
        </div>
        <FooterGroup title="Product" links={[{ label: 'Landing', href: '/landing' }, { label: 'Workflow', href: '/landing#workflow' }, { label: 'Capabilities', href: '/landing#capabilities' }, { label: 'FAQ', href: '/landing#faq' }]} />
        <FooterGroup title="Open source" links={[{ label: 'GitHub', href: REPOSITORY_URL, external: true }, { label: 'Contribute', href: `${REPOSITORY_URL}/blob/dev/CONTRIBUTING.md`, external: true }, { label: 'Project guide', href: '/open-source' }]} />
        <FooterGroup title="Project" links={[{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }, { label: 'Contact', href: '/contact' }]} />
      </div>
      <div className="stitch-container flex flex-wrap justify-between gap-3 border-t border-white/10 py-5 text-[10px] font-mono uppercase tracking-widest text-white/30">
        <span>© {new Date().getFullYear()} SlotForge</span><span>MIT licensed · Built in public</span>
      </div>
    </footer>
  );
}

export function PublicPageProgress() {
  return <div className="public-page-progress" role="progressbar" aria-label="Loading page"><span /></div>;
}

export function PublicPageShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-paper text-on-surface">{children}</div>;
}
