import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import mongoose, { type ClientSession } from 'mongoose';
import { z } from 'zod';
import {
  filtersSchema,
  transactionSchema,
  versionSchema,
  idSchema,
  amountSchema,
  evaluateBudget,
  monthRange,
  offsetMonth,
  today,
  validMonth,
  MAX_TRANSACTIONS,
  type Filters,
  type Dashboard,
} from '../shared/domain.js';
import { atomic, UserModel, TxModel, CategoryModel, BudgetModel, ReceiptModel } from './db.js';
import { fail } from './errors.js';
import { categoryDTO, txDTO, type DbRecord } from './serializers.js';
import { rateLimit } from './security.js';
export const ledgerRouter = Router();
const sort = { occurredOn: -1, createdAt: -1, _id: -1 } as const;
const oid = (id: string) => new mongoose.Types.ObjectId(idSchema.parse(id));
function monthParam(value: string) {
  if (!validMonth(value) || value < '2000-01' || value > offsetMonth(today().slice(0, 7), 12))
    fail(422, 'VALIDATION_ERROR', 'Choose a month from January 2000 to twelve months ahead.');
  return value;
}
async function matchFilters(
  userId: mongoose.Types.ObjectId,
  filters: Filters,
  session?: ClientSession,
) {
  if (filters.categoryId) {
    const cat = await CategoryModel.findOne({ _id: oid(filters.categoryId), userId })
      .session(session || null)
      .lean();
    if (!cat) fail(404, 'RESOURCE_NOT_FOUND', 'Category not found.');
    if (filters.type && cat.type !== filters.type)
      fail(422, 'VALIDATION_ERROR', 'This category does not match the selected type.');
  }
  return {
    userId,
    occurredOn: { $gte: filters.dateFrom, $lte: filters.dateTo },
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.categoryId ? { categoryId: oid(filters.categoryId) } : {}),
  };
}
async function txPublic(row: DbRecord, session?: ClientSession) {
  const category = await CategoryModel.findOne({ _id: row.categoryId, userId: row.userId })
    .session(session || null)
    .lean();
  if (!category) fail(500, 'INTERNAL_ERROR', 'Category data is unavailable.');
  return txDTO(row, category);
}
export async function budgetEvaluation(
  userId: mongoose.Types.ObjectId,
  month: string,
  session?: ClientSession,
) {
  const { dateFrom, dateTo } = monthRange(month);
  const budget = await BudgetModel.findOne({ userId, month })
    .session(session || null)
    .lean();
  const agg = TxModel.aggregate([
    { $match: { userId, type: 'expense', occurredOn: { $gte: dateFrom, $lte: dateTo } } },
    { $group: { _id: null, spent: { $sum: '$amountMinor' } } },
  ]);
  if (session) agg.session(session);
  const [sum] = await agg;
  return evaluateBudget(
    month,
    budget ? Number(budget.limitMinor) : null,
    Number(sum?.spent || 0),
    budget ? { id: String(budget._id), version: budget.version! } : undefined,
  );
}
const canonical = (value: unknown): string =>
  value === null || typeof value !== 'object'
    ? JSON.stringify(value)
    : Array.isArray(value)
      ? '[' + value.map(canonical).join(',') + ']'
      : '{' +
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
          .join(',') +
        '}';
async function financial(
  req: Request,
  res: Response,
  body: unknown,
  fn: (session: ClientSession) => Promise<{ status: number; data: unknown }>,
) {
  const key = z.string().uuid().parse(req.get('idempotency-key'));
  await rateLimit(req, res, 'write', 30, 60000);
  const fingerprint = createHash('sha256')
    .update(canonical({ method: req.method, path: req.path, body }))
    .digest('hex');
  const userId = req.auth!.user._id;
  const result = await atomic(async (session) => {
    const user = await UserModel.findOneAndUpdate(
      { _id: userId, authVersion: req.auth!.user.authVersion },
      { $inc: { ledgerRevision: 1n } },
      { session, returnDocument: 'after' },
    );
    if (!user) fail(401, 'SESSION_EXPIRED', 'Sign in again.');
    const receipt = await ReceiptModel.findOne({ userId, key }).session(session).lean();
    if (receipt && receipt.expiresAt! > new Date()) {
      if (receipt.fingerprint !== fingerprint)
        fail(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This submission key was used with different details. Review your history.',
        );
      return { status: receipt.httpStatus!, data: receipt.response };
    }
    if (receipt) await ReceiptModel.deleteOne({ _id: receipt._id }, { session });
    const output = await fn(session);
    await ReceiptModel.create(
      [
        {
          userId,
          key,
          fingerprint,
          httpStatus: output.status,
          response: output.data,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      ],
      { session },
    );
    return output;
  });
  if (result.status === 204) res.sendStatus(204);
  else
    res
      .status(result.status)
      .json({ data: result.data, meta: { requestId: res.locals.requestId } });
}
async function validateCategory(
  userId: mongoose.Types.ObjectId,
  categoryId: string,
  type: 'income' | 'expense',
  session: ClientSession,
) {
  const category = await CategoryModel.findOne({ _id: oid(categoryId), userId, type })
    .session(session)
    .lean();
  if (!category) fail(422, 'VALIDATION_ERROR', 'Choose a category matching this transaction type.');
  return category;
}
async function missingOrConflict(
  userId: mongoose.Types.ObjectId,
  id: unknown,
  session: ClientSession,
) {
  const exists = await TxModel.exists({ _id: id, userId }).session(session);
  if (!exists) fail(404, 'RESOURCE_NOT_FOUND', 'Transaction not found.');
  fail(409, 'VERSION_CONFLICT', 'This record changed in another tab. Review the latest version.');
}
ledgerRouter.get('/categories', async (req, res) => {
  const { type } = z
    .object({ type: z.enum(['income', 'expense']).optional() })
    .strict()
    .parse(req.query);
  const rows = await CategoryModel.find({ userId: req.auth!.user._id, ...(type ? { type } : {}) })
    .sort({ sortOrder: 1 })
    .lean();
  res.json({ data: rows.map(categoryDTO) });
});
ledgerRouter.get('/transactions', async (req, res) => {
  const { page: pageRaw, pageSize, ...filterQuery } = req.query;
  const page = z.coerce.number().int().min(1).max(100000).default(1).parse(pageRaw);
  if (pageSize !== undefined && pageSize !== '25')
    fail(400, 'BAD_REQUEST', 'Page size must be 25.');
  const filters = filtersSchema.parse(filterQuery),
    userId = req.auth!.user._id;
  const result = await atomic(async (s) => {
    const match = await matchFilters(userId, filters, s);
    const total = await TxModel.countDocuments(match).session(s);
    const rows = await TxModel.find(match)
      .sort(sort)
      .skip((page - 1) * 25)
      .limit(25)
      .session(s)
      .lean();
    const cats = await CategoryModel.find({ userId }).session(s).lean();
    return {
      items: rows.map((row) =>
        txDTO(
          row,
          cats.find((c) => String(c._id) === String(row.categoryId))!,
        ),
      ),
      total,
      page,
      pageSize: 25,
      hasNext: page * 25 < total,
    };
  });
  res.json({ data: result });
});
ledgerRouter.get('/transactions/:id', async (req, res) => {
  const row = await TxModel.findOne({
    _id: oid(String(req.params.id)),
    userId: req.auth!.user._id,
  }).lean();
  if (!row) fail(404, 'RESOURCE_NOT_FOUND', 'Transaction not found.');
  res.json({ data: await txPublic(row) });
});
ledgerRouter.post('/transactions', async (req, res) => {
  const body = transactionSchema.parse(req.body),
    userId = req.auth!.user._id;
  await financial(req, res, body, async (s) => {
    const category = await validateCategory(userId, body.categoryId, body.type, s);
    const changed = await UserModel.updateOne(
      { _id: userId, transactionCount: { $lt: MAX_TRANSACTIONS } },
      { $inc: { transactionCount: 1 } },
      { session: s },
    );
    if (!changed.modifiedCount)
      fail(
        409,
        'TRANSACTION_LIMIT_REACHED',
        'Your ledger has reached 10,000 entries. Review your history before adding more.',
      );
    const [row] = await TxModel.create(
      [
        {
          ...body,
          categoryId: oid(body.categoryId),
          amountMinor: BigInt(body.amountMinor),
          userId,
        },
      ],
      { session: s },
    );
    return { status: 201, data: txDTO(row, category) };
  });
});
ledgerRouter.patch('/transactions/:id', async (req, res) => {
  const body = transactionSchema.extend({ version: versionSchema }).parse(req.body),
    userId = req.auth!.user._id,
    id = oid(String(req.params.id));
  await financial(req, res, body, async (s) => {
    const category = await validateCategory(userId, body.categoryId, body.type, s);
    const { version, ...fields } = body;
    const row = await TxModel.findOneAndUpdate(
      { _id: id, userId, version },
      {
        $set: {
          ...fields,
          categoryId: oid(fields.categoryId),
          amountMinor: BigInt(fields.amountMinor),
        },
        $inc: { version: 1 },
      },
      { session: s, returnDocument: 'after', runValidators: true },
    );
    if (!row) await missingOrConflict(userId, id, s);
    return { status: 200, data: txDTO(row!, category) };
  });
});
ledgerRouter.delete('/transactions/:id', async (req, res) => {
  const body = z.object({ version: versionSchema }).strict().parse(req.body),
    userId = req.auth!.user._id,
    id = oid(String(req.params.id));
  await financial(req, res, body, async (s) => {
    const removed = await TxModel.deleteOne(
      { _id: id, userId, version: body.version },
      { session: s },
    );
    if (!removed.deletedCount) await missingOrConflict(userId, id, s);
    await UserModel.updateOne({ _id: userId }, { $inc: { transactionCount: -1 } }, { session: s });
    return { status: 204, data: null };
  });
});
ledgerRouter.get('/budgets/:month', async (req, res) => {
  const month = monthParam(String(req.params.month));
  res.json({ data: await atomic((s) => budgetEvaluation(req.auth!.user._id, month, s)) });
});
ledgerRouter.put('/budgets/:month', async (req, res) => {
  const month = monthParam(String(req.params.month)),
    userId = req.auth!.user._id,
    body = z
      .object({ limitMinor: amountSchema, version: z.number().int().min(0) })
      .strict()
      .parse(req.body);
  await financial(req, res, body, async (s) => {
    const current = await BudgetModel.findOne({ userId, month }).session(s);
    if ((current?.version || 0) !== body.version)
      fail(
        409,
        'VERSION_CONFLICT',
        'This budget changed in another tab. Review the latest version.',
      );
    if (current) {
      current.limitMinor = BigInt(body.limitMinor);
      current.version! += 1;
      await current.save({ session: s });
    } else
      await BudgetModel.create([{ userId, month, limitMinor: BigInt(body.limitMinor) }], {
        session: s,
      });
    return { status: 200, data: await budgetEvaluation(userId, month, s) };
  });
});
ledgerRouter.delete('/budgets/:month', async (req, res) => {
  const month = monthParam(String(req.params.month)),
    userId = req.auth!.user._id,
    body = z.object({ version: versionSchema }).strict().parse(req.body);
  await financial(req, res, body, async (s) => {
    const current = await BudgetModel.findOne({ userId, month }).session(s);
    if (!current) fail(404, 'RESOURCE_NOT_FOUND', 'Budget not found.');
    if (current.version !== body.version)
      fail(409, 'VERSION_CONFLICT', 'This budget changed. Review it before removing.');
    await BudgetModel.deleteOne({ _id: current._id }, { session: s });
    return { status: 204, data: null };
  });
});
const sumFor = (type: string) => ({
  $sum: { $cond: [{ $eq: ['$type', type] }, '$amountMinor', 0] },
});
ledgerRouter.get('/dashboard', async (req, res) => {
  const filters = filtersSchema.parse(req.query),
    userId = req.auth!.user._id;
  const result = await atomic(async (s) => {
    const match = await matchFilters(userId, filters, s),
      categories = await CategoryModel.find({ userId }).session(s).lean();
    const [facet] = await TxModel.aggregate([
      { $match: match },
      {
        $facet: {
          totals: [{ $group: { _id: null, income: sumFor('income'), expense: sumFor('expense') } }],
          byCategory: [
            { $match: { type: 'expense' } },
            { $group: { _id: '$categoryId', amount: { $sum: '$amountMinor' } } },
            { $sort: { amount: -1 } },
          ],
          trends: [
            {
              $group: {
                _id: { $substr: ['$occurredOn', 0, 7] },
                income: sumFor('income'),
                expense: sumFor('expense'),
              },
            },
          ],
          recent: [{ $sort: sort }, { $limit: 5 }],
        },
      },
    ])
      .session(s)
      .option({ maxTimeMS: 5000 });
    const income = Number(facet.totals[0]?.income || 0),
      expense = Number(facet.totals[0]?.expense || 0),
      months = [];
    for (
      let m = filters.dateFrom.slice(0, 7);
      m <= filters.dateTo.slice(0, 7);
      m = offsetMonth(m, 1)
    ) {
      const bin = facet.trends.find((x: DbRecord) => x._id === m),
        range = monthRange(m);
      months.push({
        month: m,
        incomeMinor: Number(bin?.income || 0),
        expenseMinor: Number(bin?.expense || 0),
        partial: filters.dateFrom > range.dateFrom || filters.dateTo < range.dateTo,
      });
    }
    return {
      filters,
      totals: { incomeMinor: income, expenseMinor: expense, netCashFlowMinor: income - expense },
      expenseByCategory: facet.byCategory.map((row: DbRecord) => {
        const cat = categories.find((c) => String(c._id) === String(row._id))!;
        return {
          categoryId: String(cat._id),
          name: cat.name,
          amountMinor: Number(row.amount),
          colorKey: cat.colorKey,
        };
      }),
      monthlyTrends: months,
      recentTransactions: facet.recent.map((row: DbRecord) =>
        txDTO(
          row,
          categories.find((c) => String(c._id) === String(row.categoryId))!,
        ),
      ),
      budget: await budgetEvaluation(userId, filters.dateTo.slice(0, 7), s),
      currency: 'INR',
      asOf: new Date().toISOString(),
    } satisfies Dashboard;
  });
  res.json({ data: result });
});
