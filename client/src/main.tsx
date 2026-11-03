import React, { Suspense, lazy, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  NavLink,
  Link,
  Navigate,
  useLocation,
  useRouteError,
} from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Settings,
  HelpCircle,
  ChevronDown,
  LogOut,
  ShieldCheck,
  WifiOff,
  ArrowUpRight,
} from 'lucide-react';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import './styles.css';
import { AuthProvider, ToastProvider, queryClient, useAuth, useOnline } from './context';
import { Brand, Loading, ErrorPanel } from './components';
import { Landing, Help, Privacy } from './public-pages';
const Dashboard = lazy(() => import('./dashboard'));
const Transactions = lazy(() => import('./transactions'));
const TransactionForm = lazy(() =>
  import('./transactions').then((m) => ({ default: m.TransactionForm })),
);
const TransactionDetail = lazy(() =>
  import('./transactions').then((m) => ({ default: m.TransactionDetail })),
);
const Budgets = lazy(() => import('./budgets'));
const SettingsPage = lazy(() => import('./settings'));
const AccountAction = lazy(() => import('./settings').then((m) => ({ default: m.AccountAction })));
const AuthPage = lazy(() => import('./auth-pages'));
function Root() {
  const online = useOnline();
  return (
    <AuthProvider>
      <ToastProvider>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={17} />
            You’re offline. Reconnect to save changes.
          </div>
        )}
        <Suspense
          fallback={
            <div className="page-loading">
              <Loading />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
}
const navItems = [
  { to: '/app/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/app/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/app/budgets', label: 'Budgets', icon: Target },
];
function AppShell() {
  const auth = useAuth(),
    location = useLocation(),
    [logoutError, setLogoutError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  if (auth.loading)
    return (
      <div className="page-loading">
        <Loading label="Opening your private workspace" />
      </div>
    );
  if (auth.error)
    return (
      <div className="page-loading">
        <ErrorPanel error={auth.error} retry={() => void auth.reload()} />
      </div>
    );
  if (!auth.user)
    return (
      <Navigate
        to={
          '/login?' +
          new URLSearchParams({
            returnTo: location.pathname + location.search,
            ...(auth.expired ? { reason: 'expired' } : {}),
          })
        }
        replace
      />
    );
  const name = auth.user.name,
    initials = name
      .split(' ')
      .map((x) => x[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  const section = location.pathname.includes('transactions')
    ? 'Transactions'
    : location.pathname.includes('budgets')
      ? 'Budgets'
      : location.pathname.includes('settings')
        ? 'Settings'
        : 'Overview';
  async function logout() {
    setBusy(true);
    try {
      await auth.logout();
    } catch (e) {
      setLogoutError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <span className="workspace-label">Your workspace</span>
        <nav aria-label="Workspace navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-lower">
          <div className="sidebar-note">
            <span className="sidebar-note-icon">
              <Target size={22} />
            </span>
            <strong>
              A little intention.
              <br />A better month.
            </strong>
            <p>Small habits make room for what matters.</p>
            <Link to="/app/budgets">
              Plan your month
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <nav aria-label="Account navigation">
            <NavLink to="/help">
              <HelpCircle size={19} />
              Help & guidance
            </NavLink>
            <NavLink to="/app/settings">
              <Settings size={19} />
              Settings
            </NavLink>
          </nav>
          <div className="sidebar-private">
            <ShieldCheck size={15} />
            Private personal workspace
          </div>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="app-topbar">
          <div className="breadcrumb">
            <span>Your workspace</span>
            <span>/</span>
            <strong>{section}</strong>
          </div>
          <div className="mobile-top-brand">
            <Brand small />
          </div>
          <details className="account-menu">
            <summary>
              <span className="avatar">{initials}</span>
              <span className="account-name">
                {name}
                <small>Personal account</small>
              </span>
              <ChevronDown size={15} />
            </summary>
            <div className="account-menu-popup">
              <span>{auth.user.email}</span>
              <Link
                to="/app/settings"
                onClick={(e) =>
                  ((e.currentTarget.closest('details') as HTMLDetailsElement).open = false)
                }
              >
                <Settings size={16} />
                Settings
              </Link>
              <button disabled={busy} onClick={() => void logout()}>
                <LogOut size={16} />
                {busy ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </details>
        </header>
        <main className="app-content" id="main-content">
          {!!logoutError && <ErrorPanel error={logoutError} retry={() => void logout()} />}
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="app-footer">
          <span>Made for a clearer picture.</span>
          <Link to="/privacy">Privacy & data use</Link>
          <span>bachat.</span>
        </footer>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Mobile workspace navigation">
        {[...navItems, { to: '/app/settings', label: 'Settings', icon: Settings }].map(
          ({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}>
              <Icon size={21} />
              <span>{label}</span>
            </NavLink>
          ),
        )}
      </nav>
    </div>
  );
}
function NotFound() {
  return (
    <div className="not-found">
      <Brand />
      <h1>This page wandered off.</h1>
      <p>Let’s get you back to a clearer picture.</p>
      <Link className="button primary" to="/">
        Back to home
      </Link>
    </div>
  );
}
function Failure() {
  const error = useRouteError();
  return (
    <div className="page-loading">
      <Brand />
      <ErrorPanel
        error={
          error instanceof Error
            ? 'This page could not load. Please reload and try again.'
            : 'Something went wrong.'
        }
        retry={() => window.location.reload()}
      />
      <Link className="text-link" to="/">
        Go home
      </Link>
    </div>
  );
}
const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <Failure />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/help', element: <Help /> },
      { path: '/privacy', element: <Privacy /> },
      ...(
        [
          'login',
          'signup',
          'check-email',
          'verify-email',
          'forgot-password',
          'reset-password',
        ] as const
      ).map((mode) => ({ path: '/' + mode, element: <AuthPage key={mode} mode={mode} /> })),
      {
        path: '/app',
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'transactions', element: <Transactions /> },
          { path: 'transactions/new', element: <TransactionForm /> },
          { path: 'transactions/:id', element: <TransactionDetail /> },
          { path: 'transactions/:id/edit', element: <TransactionForm /> },
          { path: 'transactions/:id/delete', element: <TransactionDetail deleting /> },
          { path: 'budgets', element: <Budgets /> },
          { path: 'budgets/:month/edit', element: <Budgets mode="edit" /> },
          { path: 'budgets/:month/remove', element: <Budgets mode="remove" /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'settings/password', element: <AccountAction /> },
          { path: 'settings/delete-account', element: <AccountAction deleting /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
