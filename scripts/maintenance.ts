import { config } from '../server/config.js';
import { connect, UserModel, TxModel, atomic } from '../server/db.js';
import { purgeUser } from '../server/me.js';
import mongoose from 'mongoose';
if (!config.mongo) throw new Error('Set MONGODB_URI before running maintenance.');
await connect(config.mongo);
let purged = 0,
  mismatches = 0;
for await (const user of UserModel.find({
  emailVerifiedAt: null,
  createdAt: { $lt: new Date(Date.now() - 604800000) },
}).cursor())
  if (await atomic((s) => purgeUser(user._id, s, 'unverified_expiry'))) purged++;
for await (const user of UserModel.find().cursor()) {
  const count = await TxModel.countDocuments({ userId: user._id });
  if (count !== user.transactionCount) mismatches++;
}
console.info(JSON.stringify({ purgedUnverifiedAccounts: purged, countMismatches: mismatches }));
await mongoose.disconnect();
if (mismatches) process.exitCode = 1;
