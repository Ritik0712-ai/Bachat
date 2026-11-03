import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  LockKeyhole,
  LogOut,
  Trash2,
  ChevronRight,
  HelpCircle,
  UserRound,
} from 'lucide-react';
import { api, ApiError } from './api';
import { useAuth, useOnline, useToast } from './context';
import {
  PageHeading,
  Panel,
  Field,
  PasswordInput,
  InlineError,
  Dialog,
  ButtonSpinner,
  useUnsaved,
} from './components';
import { passwordSchema, type User } from '../../shared/domain';
export default function Settings() {
  const auth = useAuth(),
    [name, setName] = useState(auth.user!.name),
    [version, setVersion] = useState(auth.user!.version),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [all, setAll] = useState(false),
    toast = useToast(),
    online = useOnline(),
    dirty = name !== auth.user!.name,
    unsaved = useUnsaved(dirty);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await api<User>('/me', { method: 'PATCH', body: { name, version } });
      auth.setUser(u);
      setVersion(u.version);
      toast('Profile updated.');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function logoutAll() {
    setBusy(true);
    try {
      await api('/auth/logout-all', { method: 'POST', body: {} });
      auth.setUser(null);
      unsaved.leave('/login');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Your space, your settings"
        description="A few essentials to keep things personal and secure."
      />
      <div className="settings-grid">
        <div>
          <Panel title="Profile" description="The basics, all in one place">
            <form onSubmit={save}>
              <InlineError error={error} />
              {error instanceof ApiError && error.code === 'VERSION_CONFLICT' && (
                <button
                  type="button"
                  className="button secondary small"
                  onClick={async () => {
                    const u = await api<User>('/auth/session');
                    auth.setUser(u);
                    setName(u.name);
                    setVersion(u.version);
                    setError(null);
                  }}
                >
                  Load latest profile
                </button>
              )}
              <Field label="Your name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={80}
                  autoComplete="name"
                />
              </Field>
              <Field
                label="Email address"
                helper="Email changes are not available in this version."
              >
                <input value={auth.user!.email} readOnly type="email" />
              </Field>
              <div className="form-two">
                <Field label="Currency">
                  <input readOnly value="INR · Indian rupee" />
                </Field>
                <Field label="Time zone">
                  <input readOnly value="Asia/Kolkata (IST)" />
                </Field>
              </div>
              <div className="form-actions">
                <button className="button primary" disabled={!dirty || busy || !online}>
                  {busy ? (
                    <>
                      <ButtonSpinner />
                      Saving...
                    </>
                  ) : (
                    'Save profile'
                  )}
                </button>
              </div>
            </form>
          </Panel>
          <Panel title="Security" description="Stay in control of account access">
            <Link className="settings-row" to="/app/settings/password">
              <LockKeyhole size={20} />
              <span>
                <strong>Change password</strong>
                <small>Choose a new password and end existing sessions</small>
              </span>
              <ChevronRight size={18} />
            </Link>
            <button className="settings-row" onClick={() => setAll(true)}>
              <LogOut size={20} />
              <span>
                <strong>Sign out of all devices</strong>
                <small>End every active session, including this one</small>
              </span>
              <ChevronRight size={18} />
            </button>
          </Panel>
        </div>
        <div>
          <Panel title="A private place for your finances">
            <span className="privacy-illustration">
              <ShieldCheck size={43} strokeWidth={1.3} />
            </span>
            <p>
              Your entries belong to you. We don’t connect to your bank, move your money, or show
              your records to other users.
            </p>
            <Link className="text-link" to="/privacy">
              How we handle your data
              <ChevronRight size={15} />
            </Link>
          </Panel>
          <Panel title="Need a little guidance?">
            <Link className="settings-row" to="/help">
              <HelpCircle size={20} />
              <span>Help & calculation guide</span>
              <ChevronRight size={17} />
            </Link>
          </Panel>
          <section className="danger-zone">
            <h2>Delete your account</h2>
            <p>Permanently remove your account and active financial records.</p>
            <Link className="button danger-outline" to="/app/settings/delete-account">
              <Trash2 size={16} />
              Delete account
            </Link>
          </section>
        </div>
      </div>
      {all && (
        <Dialog
          title="Sign out everywhere?"
          onClose={() => {
            if (!busy) setAll(false);
          }}
        >
          <p>This ends every active session, including this one. You’ll need to sign in again.</p>
          <InlineError error={error} />
          <div className="form-actions">
            <button
              className="button secondary"
              autoFocus
              disabled={busy}
              onClick={() => setAll(false)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={busy || !online}
              onClick={() => void logoutAll()}
            >
              {busy ? 'Signing out...' : 'Sign out everywhere'}
            </button>
          </div>
        </Dialog>
      )}
      {unsaved.guard}
    </>
  );
}
export function AccountAction({ deleting = false }: { deleting?: boolean }) {
  const auth = useAuth(),
    [currentPassword, setCurrent] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    online = useOnline(),
    unsaved = useUnsaved(!!(currentPassword || password || confirmation)),
    toast = useToast();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!deleting) {
      try {
        passwordSchema.parse(password);
      } catch {
        setError('Use a password with 12–128 characters.');
        return;
      }
      if (password !== confirm) {
        setError('Your passwords do not match.');
        return;
      }
    }
    setBusy(true);
    try {
      await api(deleting ? '/me' : '/me/change-password', {
        method: deleting ? 'DELETE' : 'POST',
        body: deleting
          ? { currentPassword, confirmation }
          : { currentPassword, newPassword: password },
      });
      setCurrent('');
      setPassword('');
      setConfirm('');
      auth.setUser(null);
      toast(deleting ? 'Account deleted.' : 'Password changed. Sign in again.');
      unsaved.leave(deleting ? '/' : '/login?reason=password-changed');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title={deleting ? 'Leave with a clean slate.' : 'Keep your account secure.'}
        description={
          deleting
            ? 'Please read this carefully. Deletion cannot be undone.'
            : 'Changing your password signs you out of all devices.'
        }
        back="/app/settings"
      />
      <form
        className={'panel form-panel narrow ' + (deleting ? 'deletion-panel' : '')}
        onSubmit={submit}
      >
        {deleting && (
          <>
            <div className="danger-notice">
              <Trash2 size={24} />
              <div>
                <h2>Delete {auth.user!.email}?</h2>
                <p>
                  Your profile, transactions, categories, budgets, sessions and account tokens will
                  be removed from active storage.
                </p>
              </div>
            </div>
            <p>
              Backup copies expire within the configured retention period. Recovery controls prevent
              deleted records from being restored into service.{' '}
              <Link className="text-link" to="/privacy">
                Read the privacy notice
              </Link>
              .
            </p>
          </>
        )}
        <InlineError error={error} />
        <Field label="Current password">
          <PasswordInput
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>
        {deleting ? (
          <Field label="Type DELETE to confirm">
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
              required
              placeholder="DELETE"
            />
          </Field>
        ) : (
          <>
            <Field label="New password" helper="12–128 characters. Use a different password.">
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password">
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </Field>
          </>
        )}
        <div className="form-actions">
          <Link className="button secondary" to="/app/settings">
            Cancel
          </Link>
          <button
            className={'button ' + (deleting ? 'danger' : 'primary')}
            disabled={busy || !online || (deleting && confirmation !== 'DELETE')}
          >
            {busy ? (
              <>
                <ButtonSpinner />
                Working...
              </>
            ) : deleting ? (
              'Delete account permanently'
            ) : (
              'Change password'
            )}
          </button>
        </div>
      </form>
      {unsaved.guard}
    </>
  );
}
