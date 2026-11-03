import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ReceiptText,
} from 'lucide-react';
import {
  money,
  dateLabel,
  today,
  parseMoney,
  type Transaction,
  type Category,
  type TransactionInput,
} from '../../shared/domain';
import { api, ApiError } from './api';
import { useOnline, useToast } from './context';
import {
  PageHeading,
  Loading,
  ErrorPanel,
  InlineError,
  Empty,
  AddButton,
  CategoryIcon,
  Panel,
  Field,
  ButtonSpinner,
  Dialog,
  useUnsaved,
  useFinanceRefresh,
  useOperationKey,
  safeReturn,
} from './components';
import { FilterBar, useFilters, filtersQuery } from './filters';
export function TransactionTable({
  items,
  returnTo,
  compact = false,
}: {
  items: Transaction[];
  returnTo: string;
  compact?: boolean;
}) {
  const suffix = '?returnTo=' + encodeURIComponent(returnTo);
  return (
    <div className="transaction-table-wrap">
      <table className={'transaction-table ' + (compact ? 'compact' : '')}>
        <caption className="sr-only">Recorded transactions</caption>
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Date</th>
            <th>Type</th>
            <th className="amount">Amount</th>
            {!compact && <th className="actions-col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td>
                <Link className="tx-title" to={'/app/transactions/' + t.id + suffix}>
                  <CategoryIcon category={t.category} />
                  <span>
                    <strong>{t.category.name}</strong>
                    <span>{t.note || 'No note added'}</span>
                  </span>
                </Link>
              </td>
              <td className="tx-date">{dateLabel(t.occurredOn)}</td>
              <td>
                <span className={'type-badge ' + t.type}>
                  {t.type === 'income' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                  <span>{t.type === 'income' ? 'Income' : 'Expense'}</span>
                </span>
              </td>
              <td className={'amount ' + t.type}>
                {t.type === 'income' ? '+' : '−'}
                {money(t.amountMinor)}
              </td>
              {!compact && (
                <td className="tx-actions">
                  <Link
                    className="icon-button"
                    aria-label={
                      'Edit ' + t.category.name + ' transaction on ' + dateLabel(t.occurredOn)
                    }
                    title="Edit transaction"
                    to={'/app/transactions/' + t.id + '/edit' + suffix}
                  >
                    <Pencil size={16} />
                  </Link>
                  <Link
                    className="icon-button danger-text"
                    aria-label={
                      'Delete ' + t.category.name + ' transaction on ' + dateLabel(t.occurredOn)
                    }
                    title="Delete transaction"
                    to={'/app/transactions/' + t.id + '/delete' + suffix}
                  >
                    <Trash2 size={16} />
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function Transactions() {
  const state = useFilters(),
    location = useLocation();
  const { data, error, isPending, refetch, isRefetchError } = useQuery({
    queryKey: ['transactions', state.filters, state.page],
    queryFn: () =>
      api<{ items: Transaction[]; total: number; page: number; hasNext: boolean }>(
        '/transactions?' + filtersQuery(state.filters) + '&page=' + state.page,
      ),
    enabled: state.valid,
  });
  useEffect(() => {
    if (data && !data.items.length && data.page > 1)
      state.apply(state.filters, Math.max(1, Math.ceil(data.total / 25)));
  }, [data]);
  return (
    <>
      <PageHeading
        title="Your transaction history"
        description="Every entry has a place in the bigger picture."
        action={<AddButton returnTo={location.pathname + location.search} />}
      />
      <FilterBar value={state.filters} onApply={state.apply} onReset={state.reset} />
      {!state.valid ? (
        <ErrorPanel error={state.error} retry={state.reset} />
      ) : isPending ? (
        <Loading label="Loading transactions" />
      ) : !data ? (
        <ErrorPanel error={error} retry={() => void refetch()} />
      ) : (
        <>
          {isRefetchError && (
            <ErrorPanel
              error="Could not refresh. These are your last confirmed records."
              retry={() => void refetch()}
            />
          )}
          <Panel
            title="Transactions"
            description={data.total + ' recorded ' + (data.total === 1 ? 'entry' : 'entries')}
          >
            {data.items.length ? (
              <TransactionTable items={data.items} returnTo={location.pathname + location.search} />
            ) : (
              <Empty
                title={
                  state.filters.type || state.filters.categoryId
                    ? 'No transactions match these filters'
                    : 'No transactions in this period'
                }
                description="Record an entry or choose a different date range."
                action={
                  <div className="inline-actions">
                    <AddButton />
                    <button className="button secondary" onClick={state.reset}>
                      Reset filters
                    </button>
                  </div>
                }
              />
            )}
            <div className="pagination">
              <span>
                {data.total
                  ? `Showing ${(data.page - 1) * 25 + 1}–${Math.min(data.page * 25, data.total)} of ${data.total}`
                  : '0 records'}
              </span>
              <div>
                <button
                  className="button secondary small"
                  disabled={data.page <= 1}
                  onClick={() => state.apply(state.filters, data.page - 1)}
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>
                <span>
                  Page {data.page} of {Math.max(1, Math.ceil(data.total / 25))}
                </span>
                <button
                  className="button secondary small"
                  disabled={!data.hasNext}
                  onClick={() => state.apply(state.filters, data.page + 1)}
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
export function TransactionForm() {
  const { id } = useParams(),
    editing = !!id,
    [search] = useSearchParams(),
    returnTo = safeReturn(search.get('returnTo'));
  const {
    data: record,
    isPending,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => api<Transaction>('/transactions/' + id),
    enabled: editing,
  });
  const cats = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  const [type, setType] = useState<'income' | 'expense'>('expense'),
    [amount, setAmount] = useState(''),
    [categoryId, setCategoryId] = useState(''),
    [occurredOn, setDate] = useState(today()),
    [note, setNote] = useState(''),
    [version, setVersion] = useState(1),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [fields, setFields] = useState<Record<string, string>>({}),
    [previousDraft, setPreviousDraft] = useState<string | null>(null);
  const initialized = useRef(false),
    operation = useOperationKey(),
    online = useOnline(),
    toast = useToast(),
    refresh = useFinanceRefresh(),
    unsaved = useUnsaved(dirty);
  function fill(t: Transaction) {
    setType(t.type);
    setAmount((t.amountMinor / 100).toFixed(2));
    setCategoryId(t.categoryId);
    setDate(t.occurredOn);
    setNote(t.note);
    setVersion(t.version);
    setDirty(false);
    operation.reset();
  }
  useEffect(() => {
    if (record && !initialized.current) {
      fill(record);
      initialized.current = true;
    }
  }, [record]);
  function changed() {
    setDirty(true);
    if (!operation.ambiguous()) operation.reset();
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFields({});
    let amountMinor: number;
    try {
      amountMinor = parseMoney(amount);
    } catch (e) {
      setFields({ amountMinor: (e as Error).message });
      return;
    }
    if (!categoryId) {
      setFields({ categoryId: 'Choose a category.' });
      return;
    }
    setBusy(true);
    try {
      const body: TransactionInput = { type, amountMinor, categoryId, occurredOn, note };
      const saved = await api<Transaction>('/transactions' + (editing ? '/' + id : ''), {
        method: editing ? 'PATCH' : 'POST',
        body: editing ? { ...body, version } : body,
        key: operation.key(),
      });
      setDirty(false);
      await refresh();
      toast(editing ? 'Transaction updated.' : 'Transaction added.');
      unsaved.leave(
        editing
          ? '/app/transactions/' + saved.id + '?returnTo=' + encodeURIComponent(returnTo)
          : returnTo,
      );
    } catch (e) {
      setError(e);
      operation.failed(e);
      if (e instanceof ApiError) setFields(e.fields);
    } finally {
      setBusy(false);
    }
  }
  if (editing && isPending) return <Loading label="Loading transaction" />;
  if (editing && (!record || loadError))
    return (
      <>
        <PageHeading title="Transaction unavailable" back={returnTo} />
        <ErrorPanel error={loadError || 'Transaction not found.'} retry={() => void refetch()} />
      </>
    );
  return (
    <>
      <PageHeading
        title={editing ? 'Edit transaction' : 'A little entry. A clearer picture.'}
        description={
          editing
            ? 'Keep your record accurate. Every change updates your totals.'
            : 'Record what came in or went out. We’ll take care of the bigger picture.'
        }
        back={
          editing
            ? '/app/transactions/' + id + '?returnTo=' + encodeURIComponent(returnTo)
            : returnTo
        }
      />
      <div className="form-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <div className="form-intro">
            <ReceiptText size={21} />
            <h2>{editing ? 'Transaction details' : 'New transaction'}</h2>
          </div>
          <InlineError error={error} />
          {error instanceof ApiError && error.code === 'VERSION_CONFLICT' && (
            <div className="conflict-panel">
              <p>
                Your unsaved entry is still here. Load the latest record to review before saving.
              </p>
              <button
                type="button"
                className="button secondary small"
                onClick={async () => {
                  setPreviousDraft(
                    `${type} · ${money(parseMoney(amount))} · ${occurredOn}\n${note}`,
                  );
                  const latest = await refetch();
                  if (latest.data) {
                    fill(latest.data);
                    setError(null);
                  }
                }}
              >
                Load latest
              </button>
            </div>
          )}
          {previousDraft && (
            <div className="draft-comparison">
              <strong>Your previous unsaved values</strong>
              <p>{previousDraft}</p>
            </div>
          )}
          <fieldset disabled={busy || !online || operation.ambiguous()}>
            <legend className="sr-only">Transaction fields</legend>
            <div className="type-segment" role="group" aria-label="Transaction type">
              <button
                type="button"
                aria-pressed={type === 'expense'}
                onClick={() => {
                  setType('expense');
                  setCategoryId('');
                  changed();
                }}
              >
                <ArrowUpRight size={18} />
                Expense
              </button>
              <button
                type="button"
                aria-pressed={type === 'income'}
                onClick={() => {
                  setType('income');
                  setCategoryId('');
                  changed();
                }}
              >
                <ArrowDownLeft size={18} />
                Income
              </button>
            </div>
            <Field label="Amount (required)" error={fields.amountMinor}>
              <span className="amount-input">
                <span>₹</span>
                <input
                  aria-label="Amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    changed();
                  }}
                  required
                />
              </span>
            </Field>
            <div className="form-two">
              <Field label="Category (required)" error={fields.categoryId}>
                <select
                  aria-label="Category"
                  value={categoryId}
                  required
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    changed();
                  }}
                >
                  <option value="">Choose a category</option>
                  {cats.data
                    ?.filter((c) => c.type === type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Date (required)" error={fields.occurredOn}>
                <input
                  aria-label="Transaction date"
                  type="date"
                  min="2000-01-01"
                  max={today()}
                  value={occurredOn}
                  required
                  onChange={(e) => {
                    setDate(e.target.value);
                    changed();
                  }}
                />
              </Field>
            </div>
            <Field
              label="Note (optional)"
              error={fields.note}
              helper={`${[...note].length}/280 characters`}
            >
              <textarea
                aria-label="Note"
                rows={3}
                placeholder="What was it for?"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  changed();
                }}
              />
            </Field>
          </fieldset>
          {cats.error && <ErrorPanel error={cats.error} retry={() => void cats.refetch()} />}
          <div className="form-actions">
            <Link
              className="button secondary"
              to={
                editing
                  ? '/app/transactions/' + id + '?returnTo=' + encodeURIComponent(returnTo)
                  : returnTo
              }
            >
              Cancel
            </Link>
            <button
              className="button primary"
              disabled={
                busy || !online || !cats.data || (editing && !dirty && !operation.ambiguous())
              }
            >
              {busy ? (
                <>
                  <ButtonSpinner />
                  Saving...
                </>
              ) : operation.ambiguous() ? (
                'Retry same submission'
              ) : editing ? (
                'Save changes'
              ) : (
                'Save transaction'
              )}
            </button>
          </div>
        </form>
        <aside className="form-aside">
          <span className="aside-icon">
            <ReceiptText size={25} />
          </span>
          <h3>
            Small habits.
            <br />
            Better perspective.
          </h3>
          <p>A few seconds to record an entry means less guesswork at the end of the month.</p>
          <ul>
            <li>Use the date the transaction happened.</li>
            <li>Choose the category that fits best.</li>
            <li>You can always edit an entry later.</li>
          </ul>
          <div className="aside-note">
            Your entries are private. Bachat doesn’t connect to your bank or move your money.
          </div>
        </aside>
      </div>
      {unsaved.guard}
    </>
  );
}
export function TransactionDetail({ deleting = false }: { deleting?: boolean }) {
  const { id } = useParams(),
    [search] = useSearchParams(),
    returnTo = safeReturn(search.get('returnTo')),
    detail = '/app/transactions/' + id + '?returnTo=' + encodeURIComponent(returnTo);
  const { data, error, isPending, refetch } = useQuery({
      queryKey: ['transaction', id],
      queryFn: () => api<Transaction>('/transactions/' + id),
    }),
    [failure, setFailure] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const operation = useOperationKey(),
    refresh = useFinanceRefresh(),
    toast = useToast(),
    unsaved = useUnsaved(false),
    online = useOnline();
  async function remove() {
    setBusy(true);
    setFailure(null);
    try {
      await api('/transactions/' + id, {
        method: 'DELETE',
        body: { version: data!.version },
        key: operation.key(),
      });
      await refresh();
      toast('Transaction deleted.');
      unsaved.leave(returnTo);
    } catch (e) {
      setFailure(e);
    } finally {
      setBusy(false);
    }
  }
  if (isPending) return <Loading label="Loading transaction" />;
  if (!data)
    return (
      <>
        <PageHeading title="Transaction not found" back={returnTo} />
        <ErrorPanel
          error={error || 'This transaction is no longer available.'}
          retry={() => void refetch()}
        />
      </>
    );
  return (
    <>
      <PageHeading
        title="Transaction details"
        description="One entry in your bigger picture."
        back={returnTo}
      />
      <div className="panel detail-panel">
        <div className="detail-amount">
          <CategoryIcon category={data.category} />
          <span className={'type-badge ' + data.type}>{data.type}</span>
          <strong>
            {data.type === 'income' ? '+' : '−'}
            {money(data.amountMinor)}
          </strong>
          <p>{data.category.name}</p>
        </div>
        <dl>
          <div>
            <dt>Date</dt>
            <dd>{dateLabel(data.occurredOn)}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{data.category.name}</dd>
          </div>
          <div>
            <dt>Note</dt>
            <dd className="full-note">{data.note || 'No note'}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>
              {new Intl.DateTimeFormat('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Asia/Kolkata',
              }).format(new Date(data.updatedAt))}{' '}
              IST
            </dd>
          </div>
        </dl>
        <div className="form-actions">
          <Link
            className="button danger-outline"
            to={'/app/transactions/' + id + '/delete?returnTo=' + encodeURIComponent(returnTo)}
          >
            <Trash2 size={16} />
            Delete
          </Link>
          <Link
            className="button primary"
            to={'/app/transactions/' + id + '/edit?returnTo=' + encodeURIComponent(returnTo)}
          >
            <Pencil size={16} />
            Edit transaction
          </Link>
        </div>
      </div>
      {deleting && (
        <Dialog
          title="Delete this transaction?"
          onClose={() => {
            if (!busy) unsaved.leave(detail);
          }}
        >
          <p>This cannot be undone. Your recorded totals and budget spending will update.</p>
          <div className="confirmation-record">
            <CategoryIcon category={data.category} />
            <div>
              <strong>{data.category.name}</strong>
              <span>
                {dateLabel(data.occurredOn)} · {data.type}
              </span>
            </div>
            <strong>{money(data.amountMinor)}</strong>
          </div>
          <InlineError error={failure} />
          <div className="form-actions">
            <button
              className="button secondary"
              autoFocus
              disabled={busy}
              onClick={() => unsaved.leave(detail)}
            >
              Cancel
            </button>
            <button
              className="button danger"
              disabled={busy || !online}
              onClick={() => void remove()}
            >
              {busy ? (
                <>
                  <ButtonSpinner />
                  Deleting...
                </>
              ) : (
                'Delete transaction'
              )}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
