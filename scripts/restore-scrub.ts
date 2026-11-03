import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
// Run against an ISOLATED restored database only. Live control source is mandatory.
const restoredUri = process.env.RESTORE_MONGODB_URI,
  controlUri = process.env.LIVE_CONTROL_MONGODB_URI;
if (!restoredUri || !controlUri || process.env.CONFIRM_ISOLATED_RESTORE !== 'YES')
  throw new Error(
    'Provide isolated restore URI, authoritative live control URI, and CONFIRM_ISOLATED_RESTORE=YES.',
  );
const appDb = process.env.RESTORE_APP_DB || 'bachat_restore',
  controlDb = process.env.CONTROL_DB || 'bachat_control';
if (appDb === (process.env.APP_DB || 'bachat_app'))
  throw new Error('Use an isolated restore database name, not the active application DB.');
const source = new MongoClient(controlUri),
  target = new MongoClient(restoredUri);
await source.connect();
await target.connect();
try {
  const tombstones = await source
    .db(controlDb)
    .collection('deletion_tombstones')
    .find({ expiresAt: { $gt: new Date() } })
    .toArray();
  const database = target.db(appDb);
  let purged = 0;
  for (const tombstone of tombstones) {
    const userId = tombstone.deletedUserId;
    for (const collection of [
      'transactions',
      'budgets',
      'categories',
      'sessions',
      'account_tokens',
      'mutation_receipts',
      'rate_limits',
    ])
      await database.collection(collection).deleteMany({ userId });
    await database.collection('users').deleteOne({ _id: userId });
    purged++;
  }
  await database.collection('sessions').deleteMany({});
  await database.collection('account_tokens').deleteMany({});
  console.info(
    JSON.stringify({
      status: 'scrubbed-not-promoted',
      deletionControlsApplied: purged,
      sessionsAndTokensInvalidated: true,
    }),
  );
} finally {
  await source.close();
  await target.close();
  await mongoose.disconnect();
}
