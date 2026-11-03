import { useState, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Info,
  MoreHorizontal,
  ChartNoAxesColumn,
  Table2,
  CalendarDays,
} from 'lucide-react';
import {
  money,
  monthLabel,
  monthRange,
  COLORS,
  type Dashboard as DashboardData,
  type Budget,
} from '../../shared/domain';
import { api } from './api';
import { useAuth } from './context';
import { PageHeading, Loading, ErrorPanel, Empty, AddButton, Panel } from './components';
import { FilterBar, useFilters, filtersQuery } from './filters';
import { TransactionTable } from './transactions';
const Charts = lazy(() => import('./visualizations'));
export function BudgetStrip({ budget, compact = false }: { budget: Budget; compact?: boolean }) {
  const set = budget.budget !== null;
  const status = {
    unset: 'No budget yet',
    within: 'Looking good',
    near: 'Near limit',
    reached: 'Limit reached',
    over: 'Over limit',
  }[budget.status];
  return (
    <section
      className={'budget-strip ' + budget.status + (compact ? ' compact' : '')}
      aria-label={'Budget for ' + monthLabel(budget.month)}
    >
      <div className="budget-strip-icon">
        <ChartNoAxesColumn size={24} />
      </div>
      <div className="budget-strip-main">
        <div className="budget-title-line">
          <h2>{monthLabel(budget.month)} budget</h2>
          <span className={'status-badge ' + budget.status}>{status}</span>
        </div>
        {set ? (
          <>
            <div className="budget-numbers">
              <strong>{money(budget.spentMinor)}</strong>
              <span>of {money(budget.budget!.limitMinor)} spent</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, budget.percentUsed || 0)}
              aria-label="Monthly spending limit usage"
            >
              <span style={{ width: Math.min(100, budget.percentUsed || 0) + '%' }} />
            </div>
            <p className="budget-scope">Full-month spending · dashboard filters do not apply</p>
          </>
        ) : (
          <p>Give your spending a little direction. Set a monthly limit.</p>
        )}
      </div>
      <div className="budget-strip-end">
        {set && (
          <>
            <strong>{money(Math.abs(budget.remainingMinor || 0))}</strong>
            <span>
              {(budget.remainingMinor || 0) < 0 ? 'over your limit' : 'left in your budget'}
            </span>
          </>
        )}
        <Link
          className={set ? 'text-link' : 'button secondary small'}
          to={set ? '/app/budgets?month=' + budget.month : '/app/budgets/' + budget.month + '/edit'}
        >
          {set ? 'Manage budget' : 'Set a budget'}
          <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
export default function Dashboard() {
  const { user } = useAuth(),
    location = useLocation(),
    state = useFilters();
  const [categoryTable, setCategoryTable] = useState(false),
    [trendTable, setTrendTable] = useState(false);
  const { data, error, isPending, refetch, isRefetchError } = useQuery({
    queryKey: ['dashboard', state.filters],
    queryFn: () => api<DashboardData>('/dashboard?' + filtersQuery(state.filters)),
    enabled: state.valid,
  });
  return (
    <>
      <PageHeading
        title="Your money, in perspective"
        description={`A little clarity for your day, ${user?.name.split(' ')[0]}.`}
        action={<AddButton returnTo={location.pathname + location.search} />}
      />
      <FilterBar value={state.filters} onApply={state.apply} onReset={state.reset} />
      {!state.valid ? (
        <ErrorPanel error={state.error} retry={state.reset} />
      ) : isPending ? (
        <Loading />
      ) : !data ? (
        <ErrorPanel error={error} retry={() => void refetch()} />
      ) : (
        <>
          {isRefetchError && (
            <ErrorPanel
              error="Could not refresh. These are your last confirmed values."
              retry={() => void refetch()}
            />
          )}
          <div className="overview-period">
            <span>
              <CalendarDays size={15} />
              {data.filters.dateFrom.slice(0, 7) === data.filters.dateTo.slice(0, 7)
                ? monthLabel(data.filters.dateTo.slice(0, 7))
                : 'Selected period'}
            </span>
            <span>
              Based on transactions you recorded <Info size={14} />
            </span>
          </div>
          <div className="stats-composition">
            <div className="stat">
              <span className="stat-label">
                <span className="stat-icon income">
                  <ArrowDownLeft size={18} />
                </span>
                Recorded income
              </span>
              <strong>{money(data.totals.incomeMinor)}</strong>
              <span className="stat-footnote">Money coming in</span>
            </div>
            <div className="stat">
              <span className="stat-label">
                <span className="stat-icon expense">
                  <ArrowUpRight size={18} />
                </span>
                Recorded expenses
              </span>
              <strong>{money(data.totals.expenseMinor)}</strong>
              <span className="stat-footnote">Money going out</span>
            </div>
            <div className="stat net">
              <span className="stat-label">
                Net cash flow
                <Info size={15} aria-label="Recorded income minus expenses; not a bank balance" />
              </span>
              <strong className={data.totals.netCashFlowMinor < 0 ? 'negative' : ''}>
                {money(data.totals.netCashFlowMinor)}
              </strong>
              <span className="stat-footnote">Income minus expenses · not a bank balance</span>
            </div>
          </div>
          <BudgetStrip budget={data.budget} />
          <div className="chart-grid">
            <Panel
              title="Where it went"
              description="Your expenses by category"
              action={
                <button
                  className="view-toggle"
                  aria-label={categoryTable ? 'Show category chart' : 'Show category data table'}
                  onClick={() => setCategoryTable(!categoryTable)}
                >
                  {categoryTable ? <ChartNoAxesColumn size={17} /> : <Table2 size={17} />}
                </button>
              }
            >
              {!data.expenseByCategory.length ? (
                <Empty
                  title="No expenses in this selection"
                  description="Your spending breakdown will appear here."
                />
              ) : (
                <>
                  <Suspense fallback={<Loading label="Loading charts" />}>
                    <Charts
                      kind="categories"
                      data={data}
                      table={categoryTable}
                      onCategory={(categoryId) => state.apply({ ...state.filters, categoryId })}
                    />
                  </Suspense>
                </>
              )}
            </Panel>
            <Panel
              title="The bigger picture"
              description="Recorded income and expenses over time"
              action={
                <button
                  className="view-toggle"
                  aria-label={trendTable ? 'Show trend chart' : 'Show trend data table'}
                  onClick={() => setTrendTable(!trendTable)}
                >
                  {trendTable ? <ChartNoAxesColumn size={17} /> : <Table2 size={17} />}
                </button>
              }
            >
              <Suspense fallback={<Loading label="Loading charts" />}>
                <Charts
                  kind="trends"
                  data={data}
                  table={trendTable}
                  onMonth={(month) => {
                    const range = monthRange(month);
                    state.apply({
                      ...state.filters,
                      dateFrom:
                        range.dateFrom < state.filters.dateFrom
                          ? state.filters.dateFrom
                          : range.dateFrom,
                      dateTo:
                        range.dateTo > state.filters.dateTo ? state.filters.dateTo : range.dateTo,
                    });
                  }}
                />
              </Suspense>
            </Panel>
          </div>
          <Panel
            title="Recent activity"
            description="The little things add up"
            action={
              <Link className="text-link" to={'/app/transactions?' + filtersQuery(state.filters)}>
                View all transactions
                <ArrowRight size={15} />
              </Link>
            }
          >
            {data.recentTransactions.length ? (
              <TransactionTable
                items={data.recentTransactions}
                returnTo={location.pathname + location.search}
                compact
              />
            ) : (
              <Empty
                title={
                  state.filters.categoryId || state.filters.type
                    ? 'No transactions match these filters'
                    : 'Start with your first transaction'
                }
                description="A quick entry today makes the bigger picture clearer."
                action={<AddButton returnTo={location.pathname + location.search} />}
              />
            )}
          </Panel>
          <p className="page-footnote">
            <span className="tiny-dot" />
            Your ledger. Your space. Only you can access these records.
          </p>
        </>
      )}
    </>
  );
}
