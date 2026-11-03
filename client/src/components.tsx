import { useEffect, useRef, useState, type ReactNode, type InputHTMLAttributes } from 'react';
import { Link, useBeforeUnload, useBlocker, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  LoaderCircle,
  Plus,
  X,
  Wallet,
  Utensils,
  Car,
  Home,
  Heart,
  ShoppingBag,
  GraduationCap,
  Zap,
  Gift,
  Briefcase,
  MoreHorizontal,
  ShoppingBasket,
  Clapperboard,
} from 'lucide-react';
import type { Category } from '../../shared/domain';
import { ApiError, notifyChange } from './api';
import { useQueryClient } from '@tanstack/react-query';
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link className={'brand ' + (small ? 'compact' : '')} to="/">
      <span className="brand-mark">
        <Wallet size={22} strokeWidth={1.8} />
      </span>
      <span>
        bachat<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export const ButtonSpinner = () => <LoaderCircle className="spin" size={17} aria-hidden />;
export function PageHeading({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  back?: string;
}) {
  useEffect(() => {
    document.title = title + ' · Bachat';
    document.getElementById('page-title')?.focus();
  }, [title]);
  return (
    <div className="page-heading">
      <div>
        {back && (
          <Link className="back-link" to={back}>
            <ArrowLeft size={15} />
            Back
          </Link>
        )}
        <h1 tabIndex={-1} id="page-title">
          {title}
        </h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function AddButton({ returnTo }: { returnTo?: string }) {
  return (
    <Link
      className="button primary"
      to={'/app/transactions/new' + (returnTo ? '?returnTo=' + encodeURIComponent(returnTo) : '')}
    >
      <Plus size={17} />
      Add transaction
    </Link>
  );
}
export function Loading({ label = 'Loading your overview' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="loading">
      <div className="skeleton wide" />
      <div className="skeleton" />
      <div className="skeleton tall" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
export function ErrorPanel({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="error-panel" role="alert">
      <AlertCircle size={22} />
      <div>
        <strong>Something needs your attention</strong>
        <p>{error instanceof Error ? error.message : String(error)}</p>
        {retry && (
          <button className="button secondary small" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
export function InlineError({ error }: { error: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  return error ? (
    <div ref={ref} className="inline-error" role="alert" tabIndex={-1}>
      <AlertCircle size={17} />
      <span>{error instanceof Error ? error.message : String(error)}</span>
    </div>
  ) : null;
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Wallet size={26} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Field({
  label,
  error,
  helper,
  children,
}: {
  label: string;
  error?: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <label className={'field ' + (error ? 'invalid' : '')}>
      <span className="field-label">{label}</span>
      {children}
      {error ? (
        <span className="field-error">{error}</span>
      ) : (
        helper && <span className="field-helper">{helper}</span>
      )}
    </label>
  );
}
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <span className="password-wrap">
      <input {...props} type={show ? 'text' : 'password'} />
      <button
        type="button"
        aria-label={show ? 'Hide password' : 'Show password'}
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current!;
    const prev = document.activeElement as HTMLElement;
    element.showModal();
    return () => {
      element.close();
      prev?.focus();
    };
  }, []);
  return (
    <dialog
      className="dialog"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <header>
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function useUnsaved(dirty: boolean, onDiscard?: () => void) {
  const allowed = useRef(false);
  const nav = useNavigate();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowed.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useBeforeUnload((e) => {
    if (dirty && !allowed.current) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  return {
    leave: (to: string, state?: unknown) => {
      allowed.current = true;
      nav(to, { state });
    },
    guard:
      blocker.state === 'blocked' ? (
        <Dialog title="Discard your changes?" onClose={() => blocker.reset()}>
          <p>Your unsaved changes will be lost.</p>
          <div className="form-actions">
            <button className="button secondary" autoFocus onClick={() => blocker.reset()}>
              Keep editing
            </button>
            <button
              className="button danger"
              onClick={() => {
                onDiscard?.();
                blocker.proceed();
              }}
            >
              Discard changes
            </button>
          </div>
        </Dialog>
      ) : null,
  };
}
export const safeReturn = (value: string | null, fallback = '/app/transactions') =>
  value?.startsWith('/app/') && !value.startsWith('//') ? value : fallback;
export function useFinanceRefresh() {
  const qc = useQueryClient();
  return async () => {
    notifyChange();
    await Promise.all(
      ['transactions', 'transaction', 'dashboard', 'budget'].map((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      ),
    );
  };
}
export function useOperationKey() {
  const key = useRef<string | undefined>(undefined),
    unconfirmed = useRef(false);
  return {
    key: () => (key.current ||= crypto.randomUUID()),
    reset: () => {
      key.current = undefined;
      unconfirmed.current = false;
    },
    failed: (e: unknown) => {
      unconfirmed.current = e instanceof ApiError && e.status === 0;
    },
    ambiguous: () => unconfirmed.current,
  };
}
const icons: Record<string, typeof Wallet> = {
  food_dining: Utensils,
  groceries: ShoppingBasket,
  transport: Car,
  housing: Home,
  utilities: Zap,
  health: Heart,
  education: GraduationCap,
  shopping: ShoppingBag,
  entertainment: Clapperboard,
  salary: Briefcase,
  freelance: Briefcase,
  gifts: Gift,
};
export function CategoryIcon({ category }: { category: Pick<Category, 'key' | 'type'> }) {
  const Icon = icons[category.key] || MoreHorizontal;
  return (
    <span className={'category-icon ' + category.type}>
      <Icon size={18} />
    </span>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={'panel ' + className}>
      <header className="panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
export function Success({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="success-state">
      <span>
        <Check size={26} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function SmallSelectArrow() {
  return <ChevronDown size={14} aria-hidden />;
}
