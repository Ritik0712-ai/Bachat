import { z } from 'zod';

export const MAX_AMOUNT = 100_000_000;
export const MAX_TRANSACTIONS = 10_000;
export const TIME_ZONE = 'Asia/Kolkata';
export const CATEGORY_SEEDS = [
  ['salary', 'Salary', 'income'],
  ['freelance', 'Freelance', 'income'],
  ['gifts', 'Gifts', 'income'],
  ['other_income', 'Other income', 'income'],
  ['food_dining', 'Food & dining', 'expense'],
  ['groceries', 'Groceries', 'expense'],
  ['transport', 'Transport', 'expense'],
  ['housing', 'Housing', 'expense'],
  ['utilities', 'Utilities', 'expense'],
  ['health', 'Health', 'expense'],
  ['education', 'Education', 'expense'],
  ['shopping', 'Shopping', 'expense'],
  ['entertainment', 'Entertainment', 'expense'],
  ['other_expense', 'Other expense', 'expense'],
] as const;
export const COLORS = [
  '#0F766E',
  '#1D4ED8',
  '#7C3AED',
  '#B45309',
  '#BE185D',
  '#0369A1',
  '#4D7C0F',
  '#A21CAF',
  '#334155',
  '#78716C',
];
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export function validMonth(s: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}
export function monthRange(month = today().slice(0, 7)) {
  if (!validMonth(month)) throw new Error('Invalid month');
  const [y, m] = month.split('-').map(Number);
  return {
    dateFrom: month + '-01',
    dateTo: month + '-' + String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0'),
  };
}
export function offsetMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}
export function parseMoney(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error('Use a positive amount with up to two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_AMOUNT)
    throw new Error('Enter an amount from ₹0.01 to ₹10,00,000.00.');
  return n;
}
export const money = (minor: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(minor / 100);
export const dateLabel = (s: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(s + 'T00:00:00Z'));
export const monthLabel = (s: string) =>
  new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(s + '-01T00:00:00Z'),
  );
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(128, 'Use no more than 128 characters.');
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254);
export const nameSchema = z.string().trim().min(1, 'Enter your name.').max(80);
export const idSchema = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid identifier.');
export const amountSchema = z.number().int().min(1).max(MAX_AMOUNT);
export const versionSchema = z.number().int().min(1);
export const transactionSchema = z
  .object({
    type: z.enum(['income', 'expense']),
    categoryId: idSchema,
    amountMinor: amountSchema,
    occurredOn: z
      .string()
      .refine(
        (s) => validDate(s) && s >= '2000-01-01' && s <= today(),
        'Choose a valid date between 1 Jan 2000 and today.',
      ),
    note: z
      .string()
      .refine((s) => [...s].length <= 280, 'Use no more than 280 characters.')
      .default(''),
  })
  .strict();
export const filtersSchema = z
  .object({
    dateFrom: z.string().default(() => monthRange().dateFrom),
    dateTo: z.string().default(() => monthRange().dateTo),
    type: z.enum(['income', 'expense']).optional(),
    categoryId: idSchema.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      !validDate(v.dateFrom) ||
      !validDate(v.dateTo) ||
      v.dateFrom < '2000-01-01' ||
      v.dateTo < v.dateFrom ||
      (Date.parse(v.dateTo) - Date.parse(v.dateFrom)) / 86400000 > 365
    )
      ctx.addIssue({
        code: 'custom',
        path: ['dateFrom'],
        message: 'Choose an inclusive date range of up to 366 days, starting from 1 Jan 2000.',
      });
  });
export type Filters = z.infer<typeof filtersSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  currency: 'INR';
  timeZone: string;
  version: number;
};
export type Category = {
  id: string;
  name: string;
  key: string;
  type: 'income' | 'expense';
  colorKey: string;
  sortOrder: number;
};
export type Transaction = TransactionInput & {
  id: string;
  version: number;
  currency: 'INR';
  createdAt: string;
  updatedAt: string;
  category: Category;
};
export type Budget = {
  month: string;
  budget: null | { id: string; limitMinor: number; version: number };
  spentMinor: number;
  remainingMinor: number | null;
  exceededMinor: number;
  percentUsed: number | null;
  status: 'unset' | 'within' | 'near' | 'reached' | 'over';
  currency: 'INR';
};
export function evaluateBudget(
  month: string,
  limit: number | null,
  spent: number,
  resource?: { id: string; version: number },
): Budget {
  const status =
    limit === null
      ? 'unset'
      : spent > limit
        ? 'over'
        : spent === limit
          ? 'reached'
          : spent * 100 >= limit * 80
            ? 'near'
            : 'within';
  return {
    month,
    budget:
      limit === null ? null : { id: resource!.id, version: resource!.version, limitMinor: limit },
    spentMinor: spent,
    remainingMinor: limit === null ? null : limit - spent,
    exceededMinor: limit === null ? 0 : Math.max(0, spent - limit),
    percentUsed: limit === null ? null : Math.round((spent / limit) * 1000) / 10,
    status,
    currency: 'INR',
  };
}
export type Dashboard = {
  filters: Filters;
  totals: { incomeMinor: number; expenseMinor: number; netCashFlowMinor: number };
  expenseByCategory: { categoryId: string; name: string; amountMinor: number; colorKey: string }[];
  monthlyTrends: { month: string; incomeMinor: number; expenseMinor: number; partial: boolean }[];
  recentTransactions: Transaction[];
  budget: Budget;
  currency: 'INR';
  asOf: string;
};
