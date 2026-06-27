import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const workflow = [
  { label: 'Resources', icon: 'inventory_2' },
  { label: 'Constraints', icon: 'rule' },
  { label: 'Solver', icon: 'precision_manufacturing' },
  { label: 'Published', icon: 'verified' },
];

const previewRows = [
  ['I', 'AJ', 'OR', 'MAD', 'ST/SE', 'CN', ''],
  ['II', 'AJ', 'BD', 'ST/SE', 'BD LAB', '', ''],
  ['III', 'AJ LAB', 'AJ LAB', 'CN', 'OR', 'MAD', ''],
  ['IV', 'OR', 'ST/SE', 'MAD', 'AJ', 'BD', ''],
  ['V', 'MAD', 'AJ', 'CN', 'BD', 'OR', ''],
  ['VI', 'CN', 'MAD LAB', 'MAD LAB', 'ST/SE', 'AJ', ''],
];

const facultyRows = [
  ['AJ', 'Advanced Java', 'S. Swapna', '5+2'],
  ['BD', 'Big Data Analytics', 'Sri Meghana', '3'],
  ['MAD', 'Mobile App Development', 'K. Hima Bindu', '4+2'],
  ['OR', 'Operations Research', 'D. Sravani', '5'],
];

export default function LandingPage() {
  const { organizationId } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-paper text-on-surface">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo/logo.svg" alt="SlotForge Logo" className="w-10 h-10 object-contain" />
          <div>
            <p className="text-[16px] font-semibold text-on-surface" style={{ fontFamily: 'var(--font-display)' }}>
              SlotForge
            </p>
            <p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>
              Institutional Scheduling
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-accent-soft transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <Link
            to="/login"
            className="px-3 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
          >
            Sign In
          </Link>
          <Link
            to={organizationId ? '/dashboard' : '/signup'}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {organizationId ? 'dashboard' : 'add_business'}
            </span>
            {organizationId ? 'Open Dashboard' : 'Create Institution'}
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-12 pt-10 md:pt-16">
        <section className="grid items-center gap-10 lg:grid-cols-[1fr_0.92fr]">
          <div className="max-w-3xl">
            <p className="text-label-caps text-secondary mb-4" style={{ fontSize: 11 }}>
              Timetable operations for academic teams
            </p>
            <h1 className="text-display-lg text-on-surface" style={{ fontSize: 'clamp(46px, 7vw, 88px)', lineHeight: 0.94 }}>
              SlotForge
            </h1>
            <p className="mt-5 max-w-2xl text-body-lg text-on-surface-variant">
              Build institution schedules from teachers, rooms, sections, course loads, and solver constraints without losing track of versions or conflicts.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={organizationId ? '/dashboard' : '/signup'}
                className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  play_circle
                </span>
                {organizationId ? 'Open Dashboard' : 'Start Scheduling'}
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-3 bg-paper-raised text-primary border-2 border-rule text-sm font-semibold rounded-lg hover:bg-accent-soft transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  login
                </span>
                Sign In
              </Link>
            </div>
          </div>

          <div className="bg-paper-raised border-2 border-rule rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-rule px-4 py-3">
              <div>
                <p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>
                  Day-order preview
                </p>
                <p className="text-sm font-semibold text-on-surface">Third year odd semester</p>
              </div>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                Draft v8
              </span>
            </div>
            <div className="grid grid-cols-[70px_repeat(6,1fr)] border-b border-rule bg-on-background text-paper-raised">
              {['Day', 'I', 'II', 'III', 'IV', 'V', 'VI'].map((hour) => (
                <div key={hour} className="border-r border-rule px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider">
                  {hour}
                </div>
              ))}
            </div>
            <div className="grid">
              {previewRows.map((row) => (
                <div key={row[0]} className="grid grid-cols-[70px_repeat(6,1fr)] border-b border-rule last:border-b-0">
                  {row.map((cell, index) => (
                    <div key={`${row[0]}-${index}`} className="min-h-12 border-r border-rule px-2 py-2 text-center text-[11px]">
                      {index === 0 ? (
                        <span className="font-bold text-on-surface">{cell}</span>
                      ) : cell ? (
                        <span className={`inline-flex min-w-12 justify-center rounded border px-2 py-1 font-semibold ${cell.includes('LAB') ? 'border-secondary/30 bg-signal-soft text-secondary' : 'border-primary/20 bg-accent-soft text-primary'}`}>
                          {cell}
                        </span>
                      ) : (
                        <span className="text-mono-grey/40">-</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="border-t border-rule bg-surface-container-low px-4 py-3">
              <div className="grid grid-cols-[60px_1fr_1fr_60px] gap-2 text-[10px] text-mono-grey">
                <span>Code</span>
                <span>Course</span>
                <span>Faculty</span>
                <span>Hours</span>
              </div>
              <div className="mt-2 grid gap-1">
                {facultyRows.map((row) => (
                  <div key={row[0]} className="grid grid-cols-[60px_1fr_1fr_60px] gap-2 text-[11px] text-on-surface">
                    <span className="font-bold text-primary">{row[0]}</span>
                    <span>{row[1]}</span>
                    <span className="text-on-surface-variant">{row[2]}</span>
                    <span>{row[3]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 border-y border-rule py-6">
          <div className="grid gap-3 md:grid-cols-4">
            {workflow.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                    {item.icon}
                  </span>
                </div>
                <span className="text-sm font-semibold text-on-surface">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ['rule', 'Qualification-aware', 'Teachers are matched to subjects and sections before solving.'],
            ['view_week', 'Lab-ready grids', 'Double-period blocks render as merged timetable cells.'],
            ['history', 'Version controlled', 'Draft schedules can be edited before publication.'],
          ].map(([icon, title, body]) => (
            <div key={title} className="border-t-2 border-rule pt-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>{icon}</span>
              <h2 className="mt-3 text-headline-sm text-on-surface">{title}</h2>
              <p className="mt-2 text-body-sm text-on-surface-variant">{body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
