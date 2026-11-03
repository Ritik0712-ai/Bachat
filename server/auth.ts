import {Router} from 'express';
import argon2 from 'argon2';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {CATEGORY_SEEDS,emailSchema,nameSchema,passwordSchema} from '../shared/domain.js';
import {atomic,UserModel,CategoryModel,TokenModel,SessionModel} from './db.js';
import {fail} from './errors.js';
import {makeToken,sendAccountMail,hashToken} from './mailer.js';
import {authenticate,clearSession,issueCsrf,publicRate,setLoginCookie} from './security.js';
import {userDTO} from './serializers.js';
export const authRouter=Router();
export const passwordHash=(password:string)=>argon2.hash(password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
const dummyHash=passwordHash(randomUUID());
const generic={data:{message:'If this address is eligible, an email will arrive shortly.'}};
authRouter.get('/csrf',issueCsrf);
authRouter.post('/register',async(req,res)=>{
  const {name,email,password}=z.object({name:nameSchema,email:emailSchema,password:passwordSchema}).strict().parse(req.body);
  await publicRate(req,res,'signup',5,3600000,email);
  const hashed=await passwordHash(password);let raw:string|undefined;
  try {await atomic(async session=>{
    const existing=await UserModel.findOne({emailNormalized:email}).session(session);
    if(existing){if(!existing.emailVerifiedAt){existing.ledgerRevision+=1n;await existing.save({session});raw=await makeToken(existing._id,'verify_email',session);}return;}
    const [user]=await UserModel.create([{name,emailNormalized:email,passwordHash:hashed,analyticsId:randomUUID()}],{session});
    await CategoryModel.insertMany(CATEGORY_SEEDS.map(([key,label,type],i)=>({userId:user._id,key,name:label,type,sortOrder:i+1,colorKey:type==='expense'?'expense-'+(i-3):'income-'+(i+1)})),{session});
    raw=await makeToken(user._id,'verify_email',session);
  });}catch(e){if((e as {code?:number}).code!==11000)throw e;}
  if(raw)await sendAccountMail(email,'verify_email',raw);res.status(202).json(generic);
});
authRouter.post('/login',async(req,res)=>{
  const {email,password}=z.object({email:emailSchema,password:z.string().min(1).max(128)}).strict().parse(req.body);await publicRate(req,res,'login',10,900000,email);
  const user=await UserModel.findOne({emailNormalized:email});const matches=await argon2.verify(user?.passwordHash||await dummyHash,password);
  if(!user||!matches)fail(401,'INVALID_CREDENTIALS','Email or password is incorrect.');
  if(!user.emailVerifiedAt)fail(403,'EMAIL_UNVERIFIED','Verify your email before signing in.');
  const session=await atomic(async s=>{
    const live=await UserModel.findOneAndUpdate({_id:user._id,passwordHash:user.passwordHash,authVersion:user.authVersion},{$inc:{ledgerRevision:1n}},{session:s,new:true});if(!live)fail(401,'INVALID_CREDENTIALS','Sign in again.');
    const now=new Date();const [row]=await SessionModel.create([{userId:user._id,authVersion:user.authVersion,createdAt:now,lastSeenAt:now,expiresAt:new Date(Date.now()+604800000)}],{session:s});return row;
  });await setLoginCookie(res,user,session);res.json({data:userDTO(user)});
});
authRouter.get('/session',authenticate,(req,res)=>res.json({data:userDTO(req.auth!.user)}));
authRouter.post('/logout',async(req,res)=>{
  // Invalid/expired cookies still clear safely. Authentication errors never block local sign-out.
  await new Promise<void>(resolve=>authenticate(req,res,()=>resolve()));
  if(req.auth)await SessionModel.updateOne({_id:req.auth.session._id},{$set:{revokedAt:new Date()}});
  clearSession(res);res.sendStatus(204);
});
authRouter.post('/logout-all',authenticate,async(req,res)=>{await atomic(async s=>{await UserModel.updateOne({_id:req.auth!.user._id},{$inc:{authVersion:1}},{session:s});await SessionModel.updateMany({userId:req.auth!.user._id},{$set:{revokedAt:new Date()}},{session:s});});clearSession(res);res.sendStatus(204);});
for(const [path,kind] of [['resend-verification','verify_email'],['forgot-password','reset_password']] as const){
  authRouter.post('/'+path,async(req,res)=>{
    const {email}=z.object({email:emailSchema}).strict().parse(req.body);await publicRate(req,res,kind==='verify_email'?'resend':'recovery',5,3600000,email);await publicRate(req,res,'cooldown-'+path,1,60000,email);
    let raw:string|undefined;
    await atomic(async s=>{const user=await UserModel.findOneAndUpdate({emailNormalized:email,...(kind==='verify_email'?{emailVerifiedAt:null}:{emailVerifiedAt:{$ne:null}})},{$inc:{ledgerRevision:1n}},{session:s,new:true});if(user)raw=await makeToken(user._id,kind,s);});
    if(raw)await sendAccountMail(email,kind,raw);res.status(202).json(generic);
  });
}
for(const [path,kind] of [['verify-email','verify_email'],['reset-password','reset_password']] as const){
  authRouter.post('/'+path,async(req,res)=>{
    const body=(kind==='verify_email'?z.object({token:z.string().length(64)}):z.object({token:z.string().length(64),newPassword:passwordSchema})).strict().parse(req.body);
    await publicRate(req,res,'account-token',20,900000);
    const hashed='newPassword' in body?await passwordHash(String(body.newPassword)):null;
    await atomic(async s=>{
      const token=await TokenModel.findOne({tokenHash:hashToken(body.token),kind,consumedAt:null,expiresAt:{$gt:new Date()}}).session(s);if(!token)fail(422,'INVALID_ACCOUNT_TOKEN','This link is invalid or expired. Request a new link.');
      const user=await UserModel.findOneAndUpdate({_id:token.userId},{$inc:{ledgerRevision:1n}},{session:s,new:true});if(!user)fail(422,'INVALID_ACCOUNT_TOKEN','This link is invalid or expired.');
      token.consumedAt=new Date();await token.save({session:s});
      if(kind==='verify_email'){user.emailVerifiedAt||=new Date();await user.save({session:s});}
      else {user.passwordHash=hashed!;user.authVersion+=1;await user.save({session:s});await SessionModel.updateMany({userId:user._id},{$set:{revokedAt:new Date()}},{session:s});}
    });if(kind==='reset_password')clearSession(res);res.json({data:{success:true}});
  });
}
