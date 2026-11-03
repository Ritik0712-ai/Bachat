import mongoose from 'mongoose';
import { config } from '../server/config.js';
import {
  connect,
  UserModel,
  CategoryModel,
  TxModel,
  BudgetModel,
  SessionModel,
  TokenModel,
  ReceiptModel,
  RateModel,
  TombModel,
} from '../server/db.js';
if (!config.mongo) throw new Error('MONGODB_URI is required for migrations.');
await connect(config.mongo);
const models = [
  UserModel,
  CategoryModel,
  TxModel,
  BudgetModel,
  SessionModel,
  TokenModel,
  ReceiptModel,
  RateModel,
  TombModel,
];
for (const model of models) await model.createIndexes();
const moneyField = { bsonType: 'long', minimum: 1, maximum: 100000000 };
const validators: Record<string, object> = {
  users: {
    bsonType: 'object',
    required: [
      'name',
      'emailNormalized',
      'passwordHash',
      'authVersion',
      'version',
      'ledgerRevision',
      'transactionCount',
      'analyticsId',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      name: { bsonType: 'string', minLength: 1, maxLength: 80 },
      emailNormalized: { bsonType: 'string', maxLength: 254 },
      currency: { enum: ['INR'] },
      timeZone: { enum: ['Asia/Kolkata'] },
      ledgerRevision: { bsonType: 'long' },
      transactionCount: { minimum: 0, maximum: 10000 },
      authVersion: { minimum: 1 },
      version: { minimum: 1 },
    },
  },
  transactions: {
    bsonType: 'object',
    required: [
      'userId',
      'type',
      'categoryId',
      'amountMinor',
      'currency',
      'occurredOn',
      'note',
      'version',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      userId: { bsonType: 'objectId' },
      categoryId: { bsonType: 'objectId' },
      type: { enum: ['income', 'expense'] },
      amountMinor: moneyField,
      currency: { enum: ['INR'] },
      occurredOn: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      note: { bsonType: 'string' },
      version: { minimum: 1 },
    },
  },
  budgets: {
    bsonType: 'object',
    required: ['userId', 'month', 'limitMinor', 'currency', 'version'],
    properties: {
      userId: { bsonType: 'objectId' },
      month: { bsonType: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' },
      limitMinor: moneyField,
      currency: { enum: ['INR'] },
      version: { minimum: 1 },
    },
  },
  categories: {
    bsonType: 'object',
    required: ['userId', 'key', 'name', 'type', 'sortOrder', 'colorKey'],
    properties: { userId: { bsonType: 'objectId' }, type: { enum: ['income', 'expense'] } },
  },
};
for (const [collection, schema] of Object.entries(validators))
  await mongoose.connection.db!.command({
    collMod: collection,
    validator: { $jsonSchema: schema },
    validationLevel: 'strict',
    validationAction: 'error',
  });
console.info('Bachat migration v1: indexes and database validators applied.');
await mongoose.disconnect();
