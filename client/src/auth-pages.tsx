import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Mail, Leaf } from 'lucide-react';
import { emailSchema, nameSchema, passwordSchema, type User } from '../../shared/domain';
import { api, ApiError } from './api';
import { useAuth, useOnline } from './context';
import {
  Brand,
  Field,
  PasswordInput,
  InlineError,
  Success,
  ButtonSpinner,
  safeReturn,
  useUnsaved,
} from './components';
type Mode =
  'login' | 'signup' | 'check-email' | 'verify-email' | 'forgot-password' | 'reset-password';
const copy: Record<Mode, { title: string; description: string; button: string }> = {
  login: {
    title: 'Welcome back.',
    description: 'Your money story continues here.',
    button: 'Sign in',
  },
  signup: {
    title: 'A fresh start for your finances.',
    description: 'Create your own private space. One entry at a time.',
    button: 'Create account',
  },
  'check-email': {
    title: 'Check your inbox.',
    description: 'If this address can be registered, a verification link will arrive shortly.',
    button: 'Resend verification',
  },
  'verify-email': {
    title: 'One last little step.',
    description: 'Verify your email to start your private ledger.',
    button: 'Verify email',
  },
  'forgot-password': {
    title: 'Let’s get you back in.',
    description: 'Enter your email and we’ll send reset instructions if an account exists.',
    button: 'Send reset link',
  },
  'reset-password': {
    title: 'A new password. A fresh start.',
    description: 'Choose a secure password you haven’t used before.',
    button: 'Reset password',
  },
};
export default function AuthPage({ mode }: { mode: Mode }) {
  const auth = useAuth(),
    navigate = useNavigate(),
    location = useLocation(),
    [search] = useSearchParams(),
    online = useOnline();
  const [email, setEmail] = useState(location.state?.email || ''),
    [name, setName] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false),
    [cooldown, setCooldown] = useState(false);
  const [token] = useState(() => {
    if (!['verify-email', 'reset-password'].includes(mode)) return '';
    const value = new URLSearchParams(location.hash.slice(1)).get('token') || '';
    if (location.hash)
      window.history.replaceState(window.history.state, '', location.pathname + location.search);
    return value;
  });
  const unsaved = useUnsaved(!!(name || password) && !success && !busy);
  const linkMode = mode === 'verify-email' || mode === 'reset-password';
  if (auth.user && !linkMode) return <Navigate to="/app/dashboard" replace />;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (['signup', 'login', 'check-email', 'forgot-password'].includes(mode))
        emailSchema.parse(email);
      if (mode === 'signup') nameSchema.parse(name);
      if (mode === 'signup' || mode === 'reset-password') {
        passwordSchema.parse(password);
        if (password !== confirm) throw new Error('Your passwords do not match.');
      }
      if (mode === 'login') {
        const user = await api<User>('/auth/login', { method: 'POST', body: { email, password } });
        auth.setUser(user);
        setPassword('');
        unsaved.leave(safeReturn(search.get('returnTo'), '/app/dashboard'));
      } else if (mode === 'signup') {
        await api('/auth/register', { method: 'POST', body: { name, email, password } });
        setPassword('');
        setConfirm('');
        setSuccess(true);
        setTimeout(() => navigate('/check-email', { state: { email } }), 0);
      } else if (mode === 'check-email' || mode === 'forgot-password') {
        await api('/auth/' + (mode === 'check-email' ? 'resend-verification' : 'forgot-password'), {
          method: 'POST',
          body: { email },
        });
        setSuccess(true);
        setCooldown(true);
        setTimeout(() => setCooldown(false), 60000);
      } else {
        await api('/auth/' + mode, {
          method: 'POST',
          body: mode === 'verify-email' ? { token } : { token, newPassword: password },
        });
        setPassword('');
        setConfirm('');
        setSuccess(true);
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMAIL_UNVERIFIED') {
        setPassword('');
        unsaved.leave('/check-email');
      } else if (e && typeof e === 'object' && 'issues' in e)
        setError((e as { issues: { message: string }[] }).issues[0].message);
      else setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div>
          <span className="story-icon">
            <Leaf size={31} />
          </span>
          <h2>
            Good with money.
            <br />
            Better with clarity.
          </h2>
          <p>
            A calm space to understand your spending, build a budget, and make room for what
            matters.
          </p>
          <div className="story-rule" />
          <span className="story-note">
            <ShieldCheck size={18} />
            Private by design. Yours by choice.
          </span>
        </div>
        <span className="auth-story-footer">A little bachat goes a long way.</span>
      </aside>
      <main className="auth-main" id="main-content">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <Link className="back-link" to="/">
          <ArrowLeft size={15} />
          Back to home
        </Link>
        <div className="auth-card">
          <h1>{copy[mode].title}</h1>
          <p className="auth-description">{copy[mode].description}</p>
          {search.get('reason') === 'expired' && (
            <div className="notice">Your session ended. Sign in to continue.</div>
          )}
          {search.get('reason') === 'password-changed' && (
            <div className="notice">Password changed. Sign in again.</div>
          )}
          {auth.user && linkMode ? (
            <>
              <p>Sign out to use this account link.</p>
              <button className="button primary" onClick={() => void auth.logout().catch(setError)}>
                Sign out
              </button>
              <Link className="text-link" to="/app/dashboard">
                Back to dashboard
              </Link>
            </>
          ) : success && linkMode ? (
            <Success
              title={mode === 'verify-email' ? 'Email verified.' : 'Password updated.'}
              description="You’re ready to sign in to your private ledger."
            >
              <Link className="button primary" to="/login">
                Sign in
              </Link>
            </Success>
          ) : linkMode && !token ? (
            <div className="notice">
              <p>This link is invalid or expired.</p>
              <Link
                className="text-link"
                to={mode === 'verify-email' ? '/check-email' : '/forgot-password'}
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <InlineError error={error} />
              {success && !linkMode && (
                <div className="notice" role="status">
                  <Mail size={19} />
                  <p>
                    If an account is eligible, instructions will arrive shortly. Check your spam
                    folder too.
                  </p>
                </div>
              )}
              {mode === 'signup' && (
                <Field label="Your name">
                  <input
                    autoComplete="name"
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="What should we call you?"
                  />
                </Field>
              )}
              {!linkMode && (
                <Field label="Email address">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={254}
                    placeholder="you@example.com"
                  />
                </Field>
              )}
              {['login', 'signup', 'reset-password'].includes(mode) && (
                <Field
                  label={mode === 'reset-password' ? 'New password' : 'Password'}
                  helper={
                    mode === 'login'
                      ? undefined
                      : 'Use 12–128 characters. Spaces and passphrases welcome.'
                  }
                >
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === 'login' ? 1 : 12}
                    maxLength={128}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={
                      mode === 'login' ? 'Enter your password' : 'Create a secure password'
                    }
                  />
                </Field>
              )}
              {(mode === 'signup' || mode === 'reset-password') && (
                <Field label="Confirm password">
                  <PasswordInput
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Enter your password again"
                  />
                </Field>
              )}
              {mode === 'login' && (
                <Link className="forgot-link" to="/forgot-password">
                  Forgot password?
                </Link>
              )}
              <button className="button primary auth-submit" disabled={busy || !online || cooldown}>
                {busy ? (
                  <>
                    <ButtonSpinner />
                    Please wait...
                  </>
                ) : cooldown ? (
                  'Try again in a minute'
                ) : (
                  copy[mode].button
                )}
              </button>
              {linkMode && error instanceof ApiError && error.code === 'INVALID_ACCOUNT_TOKEN' && (
                <Link
                  className="text-link"
                  to={mode === 'verify-email' ? '/check-email' : '/forgot-password'}
                >
                  Request a new link
                </Link>
              )}
            </form>
          )}
          {mode === 'login' ? (
            <p className="auth-switch">
              New here? <Link to="/signup">Create an account</Link>
            </p>
          ) : mode === 'signup' ? (
            <p className="auth-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          ) : (
            <p className="auth-switch">
              <Link to="/login">Back to sign in</Link>
            </p>
          )}
          <div className="auth-legal">
            <Link to="/privacy">Privacy</Link>
            <span>·</span>
            <Link to="/help">Need a little help?</Link>
          </div>
        </div>
      </main>
      {unsaved.guard}
    </div>
  );
}
