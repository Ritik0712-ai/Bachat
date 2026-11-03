import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X, CalendarDays, RotateCcw } from 'lucide-react';
import {
  filtersSchema,
  monthRange,
  offsetMonth,
  today,
  dateLabel,
  type Filters,
  type Category,
} from '../../shared/domain';
import { api } from './api';
import { Dialog, Field, InlineError } from './components';
export const filtersQuery = (f: Filters) =>
  new URLSearchParams(Object.entries(f).filter(([, v]) => !!v) as [string, string][]).toString();
export function useFilters() {
  const [search, setSearch] = useSearchParams();
  const query = Object.fromEntries(
    [...search].filter(([k]) => ['dateFrom', 'dateTo', 'type', 'categoryId'].includes(k)),
  );
  const result = filtersSchema.safeParse(query),
    filters = result.success ? result.data : { ...monthRange() };
  function apply(next: Filters, page = 1) {
    const s = new URLSearchParams(filtersQuery(next));
    if (page > 1) s.set('page', String(page));
    setSearch(s);
  }
  return {
    filters,
    valid: result.success,
    error: result.success ? '' : result.error.issues[0].message,
    apply,
    reset: () => apply({ ...monthRange() }),
    page: Math.max(1, Number(search.get('page')) || 1),
  };
}
export function FilterBar({
  value,
  onApply,
  onReset,
}: {
  value: Filters;
  onApply: (f: Filters) => void;
  onReset: () => void;
}) {
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  const [draft, setDraft] = useState<Filters>(value),
    [error, setError] = useState(''),
    [open, setOpen] = useState(false),
    [preset, setPreset] = useState('custom');
  useEffect(() => {
    setDraft(value);
    setError('');
    const current = monthRange();
    setPreset(
      value.dateFrom === current.dateFrom && value.dateTo === current.dateTo ? 'current' : 'custom',
    );
  }, [JSON.stringify(value)]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const visible = new FormData(event.currentTarget);
    const result = filtersSchema.safeParse({
      dateFrom: String(visible.get('dateFrom') || ''),
      dateTo: String(visible.get('dateTo') || ''),
      type: String(visible.get('type') || '') || undefined,
      categoryId: String(visible.get('categoryId') || '') || undefined,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    onApply(result.data);
    setOpen(false);
  }
  const fields = (
    <form onSubmit={submit}>
      <div className="filter-fields">
        <Field label="Period">
          <select
            aria-label="Period"
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              if (e.target.value !== 'custom')
                setDraft({
                  ...draft,
                  ...monthRange(
                    e.target.value === 'current'
                      ? today().slice(0, 7)
                      : offsetMonth(today().slice(0, 7), -1),
                  ),
                });
            }}
          >
            <option value="current">This month</option>
            <option value="last">Last month</option>
            <option value="custom">Custom dates</option>
          </select>
        </Field>
        <Field label="From">
          <input
            aria-label="From date"
            name="dateFrom"
            type="date"
            min="2000-01-01"
            value={draft.dateFrom}
            onInput={(e) => {
              setPreset('custom');
              setDraft({ ...draft, dateFrom: e.currentTarget.value });
            }}
            onChange={(e) => {
              setPreset('custom');
              setDraft({ ...draft, dateFrom: e.target.value });
            }}
          />
        </Field>
        <Field label="To">
          <input
            aria-label="To date"
            name="dateTo"
            type="date"
            value={draft.dateTo}
            onInput={(e) => {
              setPreset('custom');
              setDraft({ ...draft, dateTo: e.currentTarget.value });
            }}
            onChange={(e) => {
              setPreset('custom');
              setDraft({ ...draft, dateTo: e.target.value });
            }}
          />
        </Field>
        <Field label="Type">
          <select
            aria-label="Transaction type filter"
            name="type"
            value={draft.type || ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                type: (e.target.value || undefined) as Filters['type'],
                categoryId: undefined,
              })
            }
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </Field>
        <Field label="Category">
          <select
            aria-label="Category filter"
            name="categoryId"
            value={draft.categoryId || ''}
            onChange={(e) => setDraft({ ...draft, categoryId: e.target.value || undefined })}
          >
            <option value="">All categories</option>
            {categories
              .filter((c) => !draft.type || c.type === draft.type)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
        <button className="button primary small filter-apply" type="submit">
          Apply
        </button>
        <button
          className="icon-button filter-reset"
          type="button"
          aria-label="Reset filters"
          title="Reset filters"
          onClick={() => {
            onReset();
            setOpen(false);
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <InlineError error={error} />
    </form>
  );
  return (
    <>
      <div className="filter-desktop">{fields}</div>
      <div className="filter-mobile">
        <span>
          <CalendarDays size={16} />
          {dateLabel(value.dateFrom)} – {dateLabel(value.dateTo)}
        </span>
        <button className="button secondary small" onClick={() => setOpen(true)}>
          <SlidersHorizontal size={15} />
          Filters
        </button>
      </div>
      {open && (
        <Dialog
          title="Filter transactions"
          onClose={() => {
            setDraft(value);
            setOpen(false);
          }}
        >
          {fields}
        </Dialog>
      )}
      {(value.type || value.categoryId) && (
        <div className="filter-chips">
          {value.type && (
            <button onClick={() => onApply({ ...value, type: undefined })}>
              {value.type}
              <X size={13} />
            </button>
          )}
          {value.categoryId && (
            <button onClick={() => onApply({ ...value, categoryId: undefined })}>
              {categories.find((c) => c.id === value.categoryId)?.name || 'Selected category'}
              <X size={13} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
