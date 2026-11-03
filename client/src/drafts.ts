// Financial drafts stay in this tab's memory only, never browser storage.
export type FinancialDraft = {
  ownerId: string;
  resourceId: string;
  type: 'income' | 'expense';
  amount: string;
  categoryId: string;
  occurredOn: string;
  note: string;
};
let draft: FinancialDraft | null = null;
export const rememberDraft = (value: FinancialDraft) => {
  draft = value;
};
export const pendingDraft = (ownerId: string, resourceId: string) =>
  draft?.ownerId === ownerId && draft.resourceId === resourceId ? draft : null;
export const clearDrafts = () => {
  draft = null;
};
export function retainOnlyOwner(ownerId: string) {
  if (draft && draft.ownerId !== ownerId) draft = null;
}
