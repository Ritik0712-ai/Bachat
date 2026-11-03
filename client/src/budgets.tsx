import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pencil, Trash2, Target, ArrowRight, Info } from 'lucide-react';
import {
  money,
  monthLabel,
  monthRange,
  offsetMonth,
  today,
  validMonth,
  parseMoney,
  type Budget,
} from '../../shared/domain';
import { api, ApiError } from './api';
import { useOnline, useToast } from './context';
import {
  PageHeading,
  Panel,
  Loading,
  ErrorPanel,
  InlineError,
  Field,
  ButtonSpinner,
  Dialog,
  useUnsaved,
  useFinanceRefresh,
  useOperationKey,
} from './components';
export default function Budgets({ mode = 'view' }: { mode?: 'view' | 'edit' | 'remove' }) {
  const params = useParams(),
    [search, setSearch] = useSearchParams(),
    raw = params.month || search.get('month') || today().slice(0, 7),
    max = offsetMonth(today().slice(0, 7), 12),
    valid = validMonth(raw) && raw >= '2000-01' && raw <= max,
    month = valid ? raw : today().slice(0, 7);
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['budget', month],
    queryFn: () => api<Budget>('/budgets/' + month),
    enabled: valid,
  });
  const [amount, setAmount] = useState(''),
    [version, setVersion] = useState(0),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState<unknown>(null);
  const unsaved = useUnsaved(dirty),
    operation = useOperationKey(),
    online = useOnline(),
    toast = useToast(),
    refresh = useFinanceRefresh();
  const back = '/app/budgets?month=' + month;
  useEffect(() => {
    if (data && !dirty) {
      setAmount(data.budget ? (data.budget.limitMinor / 100).toFixed(2) : '');
      setVersion(data.budget?.version || 0);
    }
  }, [data, month]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setFailure(null);
    let limitMinor: number;
    try {
      limitMinor = parseMoney(amount);
    } catch (e) {
      setFailure(e);
      return;
    }
    setBusy(true);
    try {
      await api('/budgets/' + month, {
        method: 'PUT',
        body: { limitMinor, version },
        key: operation.key(),
      });
      setDirty(false);
      await refresh();
      toast('Budget saved.');
      unsaved.leave(back);
    } catch (e) {
      operation.failed(e);
      setFailure(e);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setFailure(null);
    try {
      await api('/budgets/' + month, {
        method: 'DELETE',
        body: { version: data!.budget!.version },
        key: operation.key(),
      });
      await refresh();
      toast('Budget removed.');
      unsaved.leave(back);
    } catch (e) {
      setFailure(e);
    } finally {
      setBusy(false);
    }
  }
  if (!valid)
    return (
      <>
        <PageHeading title="Choose another month" />
        <ErrorPanel error="Budgets can cover January 2000 through twelve months from now." />
        <Link className="button secondary" to="/app/budgets">
          Back to budgets
        </Link>
      </>
    );
  if (isPending) return <Loading label="Loading budget" />;
  if (!data) return <ErrorPanel error={error} retry={() => void refetch()} />;
  if (mode === 'edit')
    return (
      <>
        <PageHeading
          title={data.budget ? 'A little adjustment.' : 'Give your spending direction.'}
          description={'Set your total expense limit for ' + monthLabel(month) + '.'}
          back={back}
        />
        <div className="form-layout">
          <form className="panel form-panel" onSubmit={save}>
            <div className="form-intro">
              <Target size={21} />
              <h2>{monthLabel(month)} budget</h2>
            </div>
            <InlineError error={failure} />
            {failure instanceof ApiError && failure.code === 'VERSION_CONFLICT' && (
              <button
                type="button"
                className="button secondary small"
                onClick={async () => {
                  const latest = await refetch();
                  if (latest.data) {
                    setAmount(
                      latest.data.budget ? (latest.data.budget.limitMinor / 100).toFixed(2) : '',
                    );
                    setVersion(latest.data.budget?.version || 0);
                    setDirty(false);
                    operation.reset();
                    setFailure(null);
                  }
                }}
              >
                Load latest budget
              </button>
            )}
            <Field
              label="Monthly spending limit (required)"
              helper="This covers all expenses and does not repeat automatically."
            >
              <span className="amount-input">
                <span>₹</span>
                <input
                  aria-label="Monthly spending limit"
                  required
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  disabled={busy || operation.ambiguous()}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setDirty(true);
                    operation.reset();
                  }}
                />
              </span>
            </Field>
            <div className="notice">
              <Info size={19} />
              <p>Budgets help you plan. They never prevent you from recording an expense.</p>
            </div>
            <div className="form-actions">
              <Link className="button secondary" to={back}>
                Cancel
              </Link>
              <button
                className="button primary"
                disabled={busy || !online || (!dirty && !!data.budget && !operation.ambiguous())}
              >
                {busy ? (
                  <>
                    <ButtonSpinner />
                    Saving...
                  </>
                ) : (
                  'Save budget'
                )}
              </button>
            </div>
          </form>
          <aside className="form-aside">
            <span className="aside-icon">
              <Target size={25} />
            </span>
            <h3>
              A plan.
              <br />
              With room to live.
            </h3>
            <p>Pick a limit that feels realistic for your month. You can adjust it any time.</p>
            <p>
              All recorded expenses count, whatever their category. Income doesn’t change your
              spending total.
            </p>
          </aside>
        </div>
        {unsaved.guard}
      </>
    );
  return (
    <>
      <PageHeading
        title="A plan for your month"
        description="A little intention now. More breathing room later."
      />
      <div className="month-navigation">
        <button
          className="icon-button"
          aria-label="Previous month"
          disabled={month <= '2000-01'}
          onClick={() => setSearch({ month: offsetMonth(month, -1) })}
        >
          <ChevronLeft size={20} />
        </button>
        <label className="month-picker">
          <span className="sr-only">Budget month</span>
          <input
            type="month"
            min="2000-01"
            max={max}
            value={month}
            onChange={(e) => setSearch({ month: e.target.value })}
          />
        </label>
        <button
          className="icon-button"
          aria-label="Next month"
          disabled={month >= max}
          onClick={() => setSearch({ month: offsetMonth(month, 1) })}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="budget-page-grid">
        <section className={'panel budget-hero ' + data.status}>
          <div className="budget-hero-top">
            <span className="aside-icon">
              <Target size={25} />
            </span>
            <span className={'status-badge ' + data.status}>
              {
                {
                  unset: 'No limit set',
                  within: 'Within your limit',
                  near: 'Near limit',
                  reached: 'Limit reached',
                  over: 'Over limit',
                }[data.status]
              }
            </span>
          </div>
          <h2>{monthLabel(month)}</h2>
          <span className="budget-hero-label">Recorded expenses</span>
          <strong className="budget-hero-value">{money(data.spentMinor)}</strong>
          {data.budget ? (
            <>
              <p>of {money(data.budget.limitMinor)} monthly limit</p>
              <div className="progress-track">
                <span style={{ width: Math.min(100, data.percentUsed || 0) + '%' }} />
              </div>
              <div className="budget-hero-remaining">
                <span>
                  {money(Math.abs(data.remainingMinor || 0))}{' '}
                  {(data.remainingMinor || 0) < 0 ? 'over your limit' : 'remaining'}
                </span>
                <strong>{data.percentUsed}% used</strong>
              </div>
              <div className="inline-actions">
                <Link className="button primary" to={'/app/budgets/' + month + '/edit'}>
                  <Pencil size={16} />
                  Edit budget
                </Link>
                <Link className="button danger-outline" to={'/app/budgets/' + month + '/remove'}>
                  <Trash2 size={16} />
                  Remove
                </Link>
              </div>
            </>
          ) : (
            <>
              <p>Set a spending limit to see how your month is shaping up.</p>
              <Link className="button primary" to={'/app/budgets/' + month + '/edit'}>
                Set a budget
                <ArrowRight size={16} />
              </Link>
            </>
          )}
        </section>
        <div className="budget-side">
          <Panel title="A clearer view of spending">
            <p>
              Every recorded expense in {monthLabel(month)} counts toward this budget, across all
              categories.
            </p>
            <Link
              className="text-link"
              to={
                '/app/transactions?' +
                new URLSearchParams({ ...monthRange(month), type: 'expense' })
              }
            >
              View this month’s expenses
              <ArrowRight size={15} />
            </Link>
          </Panel>
          <Panel title="Room to adjust">
            <p>
              Plans change. Your budget can too. Limits never repeat automatically, and they never
              block an entry.
            </p>
            <p className="muted">
              {data.spentMinor === 0
                ? 'No recorded expenses this month. A clean slate.'
                : 'Income and dashboard filters don’t change your budget’s spending total.'}
            </p>
          </Panel>
        </div>
      </div>
      {mode === 'remove' && (
        <Dialog
          title="Remove this spending limit?"
          onClose={() => {
            if (!busy) unsaved.leave(back);
          }}
        >
          <p>Your transactions will stay in your history.</p>
          <div className="confirmation-record">
            <Target size={25} />
            <div>
              <strong>{monthLabel(month)}</strong>
              <span>Monthly expense limit</span>
            </div>
            <strong>{data.budget ? money(data.budget.limitMinor) : 'Already removed'}</strong>
          </div>
          <InlineError error={failure} />
          <div className="form-actions">
            <button
              className="button secondary"
              autoFocus
              disabled={busy}
              onClick={() => unsaved.leave(back)}
            >
              Cancel
            </button>
            <button
              className="button danger"
              disabled={busy || !data.budget || !online}
              onClick={() => void remove()}
            >
              {busy ? (
                <>
                  <ButtonSpinner />
                  Removing...
                </>
              ) : (
                'Remove budget'
              )}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
