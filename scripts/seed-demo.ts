import 'dotenv/config';
import mongoose from 'mongoose';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { connect, UserModel, CategoryModel, TxModel, BudgetModel, atomic } from '../server/db.js';
import { passwordHash } from '../server/auth.js';
import { CATEGORY_SEEDS, today, offsetMonth, monthRange } from '../shared/domain.js';
if (process.env.NODE_ENV === 'production')
  throw new Error('Synthetic seeding is disabled in production.');
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/?replicaSet=testset';
await connect(uri);
const email = 'sample-' + randomUUID().slice(0, 8) + '@bachat.example.test',
  password = randomBytes(24).toString('base64url'),
  hash = await passwordHash(password),
  month = today().slice(0, 7);
await atomic(async (s) => {
  const [user] = await UserModel.create(
    [
      {
        name: 'Ritik (sample)',
        emailNormalized: email,
        passwordHash: hash,
        emailVerifiedAt: new Date(),
        analyticsId: randomUUID(),
      },
    ],
    { session: s },
  );
  const categories = await CategoryModel.insertMany(
    CATEGORY_SEEDS.map(([key, name, type], i) => ({
      userId: user._id,
      key,
      name,
      type,
      sortOrder: i + 1,
      colorKey: type === 'expense' ? 'expense-' + (i - 3) : 'income-' + (i + 1),
    })),
    { session: s },
  );
  const rows: {
    type: 'income' | 'expense';
    key: string;
    amountMinor: number;
    occurredOn: string;
    note: string;
  }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = offsetMonth(month, -i),
      day = m === month ? today() : monthRange(m).dateTo;
    rows.push({
      type: 'income',
      key: 'salary',
      amountMinor: 6500000,
      occurredOn: m + '-01',
      note: 'Monthly salary · sample entry',
    });
    for (const [key, amount, note] of [
      ['housing', 1200000, 'Monthly rent'],
      ['groceries', 480050, 'Weekly groceries'],
      ['food_dining', 275000, 'Meals & coffee'],
      ['transport', 165000, 'Getting around'],
      ['shopping', 340000, 'Everyday essentials'],
      ['utilities', 210000, 'Internet & electricity'],
    ] as const)
      rows.push({
        type: 'expense',
        key,
        amountMinor: amount + i * 17200,
        occurredOn: day,
        note: note + ' · sample entry',
      });
    await BudgetModel.create([{ userId: user._id, month: m, limitMinor: 3500000n }], {
      session: s,
    });
  }
  await TxModel.insertMany(
    rows.map(({ key, ...r }) => ({
      ...r,
      userId: user._id,
      categoryId: categories.find((c) => c.key === key)!._id,
      amountMinor: BigInt(r.amountMinor),
    })),
    { session: s },
  );
  await UserModel.updateOne(
    { _id: user._id },
    { $set: { transactionCount: rows.length } },
    { session: s },
  );
});
await mkdir('.data', { recursive: true });
await writeFile(
  '.data/demo-account.json',
  JSON.stringify({ email, password, label: 'Synthetic local-only account' }, null, 2),
  { mode: 0o600 },
);
console.info(
  'Created a synthetic local ledger. Credentials are in .data/demo-account.json (never committed).',
);
await mongoose.disconnect();
