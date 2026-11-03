import type { Category, Transaction, User } from '../shared/domain.js';
// MongoDB documents are intentionally narrowed to explicit public DTOs here.
export type DbRecord = Record<string, any>;
export function userDTO(u: DbRecord): User {
  return {
    id: String(u._id),
    name: u.name,
    email: u.emailNormalized,
    emailVerified: !!u.emailVerifiedAt,
    currency: 'INR',
    timeZone: u.timeZone,
    version: u.version,
  };
}
export function categoryDTO(c: DbRecord): Category {
  return {
    id: String(c._id),
    name: c.name,
    key: c.key,
    type: c.type,
    colorKey: c.colorKey,
    sortOrder: c.sortOrder,
  };
}
export function txDTO(t: DbRecord, c: DbRecord): Transaction {
  return {
    id: String(t._id),
    type: t.type,
    categoryId: String(t.categoryId),
    amountMinor: Number(t.amountMinor),
    occurredOn: t.occurredOn,
    note: t.note,
    currency: 'INR',
    version: t.version,
    createdAt: new Date(t.createdAt).toISOString(),
    updatedAt: new Date(t.updatedAt).toISOString(),
    category: categoryDTO(c),
  };
}
