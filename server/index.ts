import 'dotenv/config';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
// Persist development-only secrets before loading configuration across watch restarts.
if(process.env.NODE_ENV!=='production'){
  await mkdir('.data',{recursive:true});const path=resolve('.data/dev-secrets.json');
  if(!existsSync(path))writeFileSync(path,JSON.stringify(Object.fromEntries(['JWT_SIGNING_KEY','CSRF_SIGNING_KEY','RATE_LIMIT_HASH_KEY'].map(k=>[k,randomBytes(32).toString('hex')]))),{mode:0o600});
  for(const [key,value]of Object.entries(JSON.parse(readFileSync(path,'utf8'))))if(!process.env[key])process.env[key]=String(value);
}
const {config}=await import('./config.js');const {connect}=await import('./db.js');const {createApp}=await import('./app.js');
let local:{stop:()=>Promise<unknown>}|undefined;let uri=config.mongo;
if(!uri&&!config.production){
  const {MongoMemoryReplSet}=await import('mongodb-memory-server');await mkdir('.data/db',{recursive:true});
  const repl=await MongoMemoryReplSet.create({instanceOpts:[{dbPath:resolve('.data/db'),port:27018}],replSet:{count:1,storageEngine:'wiredTiger'}});local=repl;uri=repl.getUri();console.info('Local MongoDB replica set ready on port 27018.');
}
await connect(uri);const app=createApp();const server=app.listen(config.port,config.production?'0.0.0.0':'127.0.0.1',()=>console.info(`Bachat API ready on port ${config.port}.`));
const stop=async()=>{server.close(async()=>{const mongoose=(await import('mongoose')).default;await mongoose.disconnect();if(local)await local.stop();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
