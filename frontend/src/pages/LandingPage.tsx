import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const workflow = [
  { label: 'Resources', icon: 'inventory_2' },
  { label: 'Constraints', icon: 'rule' },
  { label: 'Solver', icon: 'precision_manufacturing' },
  { label: 'Published', icon: 'verified' },
];

const featureRows = [
  ['Teacher load', 'Room capacity', 'Section demand'],
  ['Version history', 'Conflict checks', 'Export-ready grids'],
];

export default function LandingPage() {
  const { organizationId } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-paper text-on-surface">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary" style={{ fontSize: 22 }}>
              view_module
            </span>
          </div>
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
                  Solver Preview
                </p>
                <p className="text-sm font-semibold text-on-surface">Weekly schedule draft</p>
              </div>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                Feasible
              </span>
            </div>
            <div className="grid grid-cols-5 border-b border-rule bg-on-background text-paper-raised">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
                <div key={day} className="px-3 py-2 text-center text-data-table font-semibold">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 grid-rows-4">
              {Array.from({ length: 20 }).map((_, index) => {
                const active = [1, 4, 7, 9, 13, 16].includes(index);
                return (
                  <div key={index} className="min-h-20 border-b border-r border-rule p-2">
                    {active ? (
                      <div className="h-full rounded-lg border border-primary/20 bg-accent-soft p-2">
                        <p className="text-[10px] font-semibold text-primary">
                          {index % 3 === 0 ? 'DBMS' : index % 2 === 0 ? 'AI' : 'SE'}
                        </p>
                        <p className="mt-1 text-[10px] text-on-surface-variant">Room {100 + index}</p>
                      </div>
                    ) : (
                      <span className="text-[10px] italic text-mono-grey">Open</span>
                    )}
                  </div>
                );
              })}
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

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {featureRows.map((row, rowIndex) => (
            <div key={rowIndex} className="bg-paper-raised border-2 border-rule rounded-xl p-5">
              <div className="grid gap-3">
                {row.map((feature) => (
                  <div key={feature} className="flex items-center justify-between border-b border-rule pb-3 last:border-b-0 last:pb-0">
                    <span className="text-sm font-semibold text-on-surface">{feature}</span>
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                      check_circle
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
