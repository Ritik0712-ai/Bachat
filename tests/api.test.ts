import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/app.js';
import {
  connect,
  TxModel,
  UserModel,
  SessionModel,
  TokenModel,
  TombModel,
  CategoryModel,
  BudgetModel,
  ReceiptModel,
} from '../server/db.js';
import { capturedMail } from '../server/mailer.js';
import { config } from '../server/config.js';
import { today, monthRange, offsetMonth } from '../shared/domain.js';
const app = createApp();
let repl: MongoMemoryReplSet;
let n = 10;
class Client {
  agent = request.agent(app);
  token = '';
  ip = '198.51.100.' + n++;
  email = 'test-' + randomUUID() + '@example.test';
  password = 'Synthetic test passphrase 123!';
  userId = '';
  categories: any[] = [];
  async ready() {
    this.token = (await this.agent.get('/api/v1/auth/csrf')).body.data.token;
    return this;
  }
  send(method: 'post' | 'patch' | 'put' | 'delete', path: string, body: unknown, key?: string) {
    let r = this.agent[method]('/api/v1' + path)
      .set('Origin', config.origin)
      .set('X-CSRF-Token', this.token)
      .set('X-Forwarded-For', this.ip)
      .send(body);
    if (key) r = r.set('Idempotency-Key', key);
    return r;
  }
  get(path: string) {
    return this.agent.get('/api/v1' + path).set('X-Forwarded-For', this.ip);
  }
  async account() {
    await this.ready();
    const signup = await this.send('post', '/auth/register', {
      name: 'Synthetic Owner',
      email: this.email,
      password: this.password,
    });
    expect(signup.status).toBe(202);
    const mail = capturedMail.findLast((m) => m.to === this.email)!;
    expect(mail).toBeTruthy();
    const token = new URLSearchParams(new URL(mail.url).hash.slice(1)).get('token');
    expect((await this.send('post', '/auth/verify-email', { token })).status).toBe(200);
    const login = await this.send('post', '/auth/login', {
      email: this.email,
      password: this.password,
    });
    expect(login.status).toBe(200);
    this.userId = login.body.data.id;
    this.categories = (await this.get('/categories')).body.data;
    return this;
  }
  category(key: string) {
    return this.categories.find((c) => c.key === key).id;
  }
  add(
    amountMinor = 25000,
    type = 'expense',
    key = 'food_dining',
    occurredOn = today(),
    idempotency = randomUUID(),
  ) {
    return this.send(
      'post',
      '/transactions',
      { type, categoryId: this.category(key), amountMinor, occurredOn, note: 'Synthetic fixture' },
      idempotency,
    );
  }
}
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await connect(repl.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
});
describe('secure account lifecycle', () => {
  it('requires CSRF and exact Origin, then enforces verification', async () => {
    const c = await new Client().ready();
    const noCsrf = await c.agent
      .post('/api/v1/auth/register')
      .set('Origin', config.origin)
      .send({});
    expect(noCsrf.status).toBe(403);
    const badOrigin = await c.agent
      .post('/api/v1/auth/register')
      .set('Origin', 'https://evil.example')
      .set('X-CSRF-Token', c.token)
      .send({});
    expect(badOrigin.status).toBe(403);
    await c.send('post', '/auth/register', { name: 'Owner', email: c.email, password: c.password });
    expect(
      (await c.send('post', '/auth/login', { email: c.email, password: c.password })).body.error
        .code,
    ).toBe('EMAIL_UNVERIFIED');
    expect((await c.get('/dashboard')).status).toBe(401);
  });
  it('issues private HttpOnly cookies and revokes logout immediately', async () => {
    const c = await new Client().account();
    const response = await c.send('post', '/auth/login', { email: c.email, password: c.password });
    const cookie = response.headers['set-cookie'].find((s: string) =>
      s.startsWith('bachat_dev_session='),
    );
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    const rawCookie = cookie.split(';')[0];
    expect((await c.send('post', '/auth/logout', {})).status).toBe(204);
    expect((await request(app).get('/api/v1/auth/session').set('Cookie', rawCookie)).status).toBe(
      401,
    );
    expect((await c.get('/dashboard')).headers['cache-control']).toBe('no-store');
  });
  it('resets once and invalidates all prior sessions', async () => {
    const c = await new Client().account();
    expect((await c.send('post', '/auth/forgot-password', { email: c.email })).status).toBe(202);
    const mail = capturedMail.findLast((m) => m.to === c.email && m.kind === 'reset_password')!;
    const token = new URLSearchParams(new URL(mail.url).hash.slice(1)).get('token');
    const body = { token, newPassword: 'New synthetic passphrase 456!' };
    expect((await c.send('post', '/auth/reset-password', body)).status).toBe(200);
    expect((await c.send('post', '/auth/reset-password', body)).body.error.code).toBe(
      'INVALID_ACCOUNT_TOKEN',
    );
    expect((await c.get('/dashboard')).status).toBe(401);
    expect(
      (await c.send('post', '/auth/login', { email: c.email, password: body.newPassword })).status,
    ).toBe(200);
  });
  it('never accepts expired sessions even before TTL cleanup', async () => {
    const c = await new Client().account();
    await SessionModel.updateMany(
      { userId: c.userId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    expect((await c.get('/dashboard')).status).toBe(401);
  });
});
describe('financial correctness, ownership and concurrency', () => {
  it('matches exact fixture totals and full-month budget under category filters', async () => {
    const c = await new Client().account(),
      month = today().slice(0, 7),
      last = monthRange(offsetMonth(month, -1));
    await c.add(5000000, 'income', 'salary', month + '-01');
    await c.add(125050, 'expense', 'groceries', today());
    await c.add(25000);
    await c.add(9999, 'expense', 'transport', last.dateTo);
    const budget = await c.send(
      'put',
      '/budgets/' + month,
      { limitMinor: 1000000, version: 0 },
      randomUUID(),
    );
    expect(budget.status).toBe(200);
    expect(budget.body.data.remainingMinor).toBe(849950);
    const dashboard = await c.get('/dashboard');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.totals).toEqual({
      incomeMinor: 5000000,
      expenseMinor: 150050,
      netCashFlowMinor: 4849950,
    });
    const filtered = await c.get(
      '/dashboard?' +
        new URLSearchParams({ ...monthRange(month), categoryId: c.category('food_dining') }),
    );
    expect(filtered.body.data.totals.expenseMinor).toBe(25000);
    expect(filtered.body.data.totals.incomeMinor).toBe(0);
    expect(filtered.body.data.budget.spentMinor).toBe(150050);
    const prior = (await c.get('/dashboard?' + new URLSearchParams({ ...last }))).body.data;
    expect(prior.totals.expenseMinor).toBe(9999);
  });
  it('replays identical submissions and rejects changed payloads', async () => {
    const c = await new Client().account(),
      key = randomUUID();
    const first = await c.add(1, 'expense', 'food_dining', today(), key),
      retry = await c.add(1, 'expense', 'food_dining', today(), key);
    expect(first.status).toBe(201);
    expect(retry.body.data).toEqual(first.body.data);
    expect(await TxModel.countDocuments({ userId: c.userId })).toBe(1);
    expect((await c.add(2, 'expense', 'food_dining', today(), key)).body.error.code).toBe(
      'IDEMPOTENCY_CONFLICT',
    );
    expect((await UserModel.findById(c.userId))?.transactionCount).toBe(1);
  });
  it('allows two identical legitimate purchases with different operation keys', async () => {
    const c = await new Client().account();
    await c.add(99);
    await c.add(99);
    expect(await TxModel.countDocuments({ userId: c.userId })).toBe(2);
  });
  it('serializes racing duplicate requests without duplicate records', async () => {
    const c = await new Client().account(),
      key = randomUUID();
    const responses = await Promise.all([
      c.add(100, 'expense', 'food_dining', today(), key),
      c.add(100, 'expense', 'food_dining', today(), key),
    ]);
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
    expect(await TxModel.countDocuments({ userId: c.userId })).toBe(1);
  });
  it('rejects stale edits, updates versions and supports retry-safe deletion', async () => {
    const c = await new Client().account(),
      row = (await c.add()).body.data;
    const body = {
      type: row.type,
      categoryId: row.categoryId,
      amountMinor: 20000,
      occurredOn: row.occurredOn,
      note: 'Corrected',
      version: row.version,
    };
    const updated = await c.send('patch', '/transactions/' + row.id, body, randomUUID());
    expect(updated.status).toBe(200);
    expect(updated.body.data.version).toBe(2);
    expect(
      (await c.send('patch', '/transactions/' + row.id, body, randomUUID())).body.error.code,
    ).toBe('VERSION_CONFLICT');
    const key = randomUUID();
    expect((await c.send('delete', '/transactions/' + row.id, { version: 2 }, key)).status).toBe(
      204,
    );
    expect((await c.send('delete', '/transactions/' + row.id, { version: 2 }, key)).status).toBe(
      204,
    );
    expect((await UserModel.findById(c.userId))?.transactionCount).toBe(0);
  });
  it('isolates foreign IDs, categories, totals and injected ownership', async () => {
    const a = await new Client().account(),
      b = await new Client().account(),
      row = (await a.add(99999)).body.data;
    expect((await b.get('/transactions/' + row.id)).status).toBe(404);
    expect(
      (await b.send('delete', '/transactions/' + row.id, { version: 1 }, randomUUID())).status,
    ).toBe(404);
    const injected = {
      type: 'expense',
      categoryId: a.category('food_dining'),
      amountMinor: 1,
      occurredOn: today(),
      note: '',
    };
    expect((await b.send('post', '/transactions', injected, randomUUID())).status).toBe(422);
    expect(
      (
        await b.send(
          'post',
          '/transactions',
          { ...injected, categoryId: b.category('food_dining'), userId: a.userId },
          randomUUID(),
        )
      ).status,
    ).toBe(422);
    expect((await b.get('/dashboard')).body.data.totals.expenseMinor).toBe(0);
  });
  it('rejects future dates, zero/fractional amounts and incompatible type filters', async () => {
    const c = await new Client().account();
    expect((await c.add(0)).status).toBe(422);
    expect((await c.add(1.5)).status).toBe(422);
    expect((await c.add(1, 'expense', 'food_dining', '2099-01-01')).status).toBe(422);
    expect(
      (await c.get('/transactions?type=income&categoryId=' + c.category('food_dining'))).status,
    ).toBe(422);
  });
  it('pages history while aggregating all rows and caps new entries atomically', async () => {
    const c = await new Client().account(),
      uid = new mongoose.Types.ObjectId(c.userId),
      categoryId = new mongoose.Types.ObjectId(c.category('food_dining'));
    await TxModel.insertMany(
      Array.from({ length: 26 }, () => ({
        userId: uid,
        type: 'expense',
        categoryId,
        amountMinor: 1n,
        occurredOn: today(),
      })),
    );
    await UserModel.updateOne({ _id: uid }, { $set: { transactionCount: 26 } });
    const first = await c.get('/transactions'),
      second = await c.get('/transactions?page=2');
    expect(first.body.data.items).toHaveLength(25);
    expect(second.body.data.items).toHaveLength(1);
    expect((await c.get('/dashboard')).body.data.totals.expenseMinor).toBe(26);
    await UserModel.updateOne({ _id: uid }, { $set: { transactionCount: 10000 } });
    expect((await c.add(1)).body.error.code).toBe('TRANSACTION_LIMIT_REACHED');
    expect(await TxModel.countDocuments({ userId: uid })).toBe(26);
  });
  it('keeps budgets versioned and removal leaves transactions intact', async () => {
    const c = await new Client().account(),
      month = today().slice(0, 7);
    await c.add(1000001);
    const saved = await c.send(
      'put',
      '/budgets/' + month,
      { limitMinor: 1000000, version: 0 },
      randomUUID(),
    );
    expect(saved.body.data.status).toBe('over');
    expect(saved.body.data.exceededMinor).toBe(1);
    expect(
      (await c.send('put', '/budgets/' + month, { limitMinor: 2000000, version: 0 }, randomUUID()))
        .status,
    ).toBe(409);
    expect((await c.send('delete', '/budgets/' + month, { version: 1 }, randomUUID())).status).toBe(
      204,
    );
    expect((await c.get('/budgets/' + month)).body.data.budget).toBeNull();
    expect(await TxModel.countDocuments({ userId: c.userId })).toBe(1);
  });
  it('deletes owned data and writes a separate recovery tombstone', async () => {
    const c = await new Client().account();
    await c.add();
    const month = today().slice(0, 7);
    await c.send('put', '/budgets/' + month, { limitMinor: 1000, version: 0 }, randomUUID());
    expect(
      (await c.send('delete', '/me', { currentPassword: 'incorrect', confirmation: 'DELETE' }))
        .status,
    ).toBe(422);
    expect(await UserModel.findById(c.userId)).toBeTruthy();
    expect(
      (await c.send('delete', '/me', { currentPassword: c.password, confirmation: 'DELETE' }))
        .status,
    ).toBe(204);
    for (const model of [
      TxModel,
      CategoryModel,
      BudgetModel,
      SessionModel,
      TokenModel,
      ReceiptModel,
    ])
      expect(await model.countDocuments({ userId: c.userId })).toBe(0);
    expect(await UserModel.findById(c.userId)).toBeNull();
    expect(await TombModel.findOne({ deletedUserId: c.userId })).toBeTruthy();
    expect((await c.get('/dashboard')).status).toBe(401);
  });
});
