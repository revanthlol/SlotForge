import { Link, useLocation } from 'react-router-dom';

const routes = [
  { to: '/', label: 'Home' },
  { to: '/login', label: 'Sign in' },
  { to: '/signup', label: 'Create institution' },
];

export default function AuthRouteNav() {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Account navigation" className="mb-8 flex flex-wrap gap-1 rounded-xl border border-rule bg-surface-container-low p-1">
      {routes.map((route) => (
        <Link
          key={route.to}
          to={route.to}
          aria-current={pathname === route.to ? 'page' : undefined}
          className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-bold transition-colors ${pathname === route.to ? 'bg-paper-raised text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
