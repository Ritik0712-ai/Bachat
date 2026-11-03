import { describe, it, expect } from 'vitest';
import {
  parseMoney,
  validDate,
  validMonth,
  monthRange,
  offsetMonth,
  filtersSchema,
  evaluateBudget,
  transactionSchema,
} from '../shared/domain.js';
describe('exact financial inputs', () => {
  it.each([
    ['0.01', 1],
    ['1', 100],
    ['1250.50', 125050],
    ['1000000.00', 100000000],
    ['001.20', 120],
  ])('parses %s as exact minor units', (input, expected) =>
    expect(parseMoney(input)).toBe(expected),
  );
  it.each(['0', '-1', '1.001', '1e3', '1,000', 'Infinity', '', '.5', '1000000.01', 'NaN', '1.'])(
    'rejects invalid money %s',
    (input) => expect(() => parseMoney(input)).toThrow(),
  );
  it('rejects fractional API minor units and owner injection', () => {
    const input = {
      type: 'expense',
      categoryId: '507f1f77bcf86cd799439011',
      amountMinor: 1.1,
      occurredOn: '2020-01-01',
      note: '',
    };
    expect(transactionSchema.safeParse(input).success).toBe(false);
    expect(
      transactionSchema.safeParse({ ...input, amountMinor: 100, userId: 'injected' }).success,
    ).toBe(false);
  });
});
describe('calendar semantics', () => {
  it.each([
    ['2024-02-29', true],
    ['2026-02-29', false],
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['2026-1-01', false],
  ])('validates %s', (date, valid) => expect(validDate(date)).toBe(valid));
  it('handles leap months and year boundaries', () => {
    expect(monthRange('2024-02').dateTo).toBe('2024-02-29');
    expect(offsetMonth('2026-12', 1)).toBe('2027-01');
    expect(validMonth('2026-00')).toBe(false);
  });
  it('bounds inclusive windows without clipping history', () => {
    expect(filtersSchema.safeParse({ dateFrom: '2024-01-01', dateTo: '2024-12-31' }).success).toBe(
      true,
    );
    expect(filtersSchema.safeParse({ dateFrom: '2024-01-01', dateTo: '2025-01-01' }).success).toBe(
      false,
    );
    expect(filtersSchema.safeParse({ dateFrom: '2025-01-02', dateTo: '2025-01-01' }).success).toBe(
      false,
    );
  });
});
describe('budget thresholds use integers', () => {
  it.each([
    [799999, 'within'],
    [800000, 'near'],
    [999999, 'near'],
    [1000000, 'reached'],
    [1000001, 'over'],
  ] as const)('evaluates spent %i as %s', (spent, status) =>
    expect(evaluateBudget('2026-11', 1000000, spent, { id: 'x', version: 1 }).status).toBe(status),
  );
  it('distinguishes unset and exceeded budgets', () => {
    const unset = evaluateBudget('2026-11', null, 500);
    expect(unset.remainingMinor).toBeNull();
    expect(unset.percentUsed).toBeNull();
    const over = evaluateBudget('2026-11', 1000000, 1000001, { id: 'x', version: 1 });
    expect(over.remainingMinor).toBe(-1);
    expect(over.exceededMinor).toBe(1);
  });
});
