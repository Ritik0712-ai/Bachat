import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {SignJWT,jwtVerify} from 'jose';
import type {Request,Response,NextFunction} from 'express';
import {config,cookieOptions,csrfCookie,sessionCookie} from './config.js';
import {RateModel,SessionModel,UserModel} from './db.js';
import {fail} from './errors.js';
import type {DbRecord} from './serializers.js';
declare global {namespace Express {interface Request {auth?:{user:DbRecord;session:DbRecord}}}}
const key=new TextEncoder().encode(config.jwt);
export const hmac=(value:string,secret=config.csrf)=>createHmac('sha256',secret).update(value).digest('hex');
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function issueCsrf(_req:Request,res:Response){const value=randomBytes(24).toString('hex')+'.'+Date.now();const token=value+'.'+hmac(value);res.cookie(csrfCookie,token,{...cookieOptions,maxAge:3600000});res.json({data:{token}});}
export function csrf(req:Request,_res:Response,next:NextFunction){
  if(['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  if(req.get('origin')!==config.origin) return next(new ErrorWithCode(403,'ORIGIN_DENIED','This request came from an untrusted origin.'));
  const token=req.get('x-csrf-token')||'', cookie=req.cookies[csrfCookie]||'';
  const [nonce,time,signature]=token.split('.');const value=nonce+'.'+time;
  if(!nonce||!time||!signature||!equal(signature,hmac(value))||!equal(token,cookie)) return next(new ErrorWithCode(403,'CSRF_INVALID','Refresh this page and try again.'));
  if(Date.now()-Number(time)>3600000||Number(time)>Date.now()+60000) return next(new ErrorWithCode(403,'CSRF_EXPIRED','Refresh your session and retry.'));
  next();
}
import {ApiError as ErrorWithCode} from './errors.js';
export async function authenticate(req:Request,_res:Response,next:NextFunction){
  const token=req.cookies[sessionCookie];if(!token) return next(new ErrorWithCode(401,'UNAUTHENTICATED','Sign in to continue.'));
  try {
    const {payload}=await jwtVerify(token,key,{algorithms:['HS256'],issuer:'bachat',audience:'bachat-web'});
    const session=await SessionModel.findOne({_id:String(payload.sid),userId:payload.sub,revokedAt:null,expiresAt:{$gt:new Date()},lastSeenAt:{$gt:new Date(Date.now()-86400000)}}).lean();
    const user=session?await UserModel.findOne({_id:String(payload.sub),emailVerifiedAt:{$ne:null},authVersion:Number(payload.av)}).lean():null;
    if(!session||!user||session.authVersion!==user.authVersion) return next(new ErrorWithCode(401,'SESSION_EXPIRED','Your session ended. Sign in again.'));
    req.auth={user,session};
    if(Date.now()-new Date(session.lastSeenAt).getTime()>300000) await SessionModel.updateOne({_id:session._id,revokedAt:null},{$set:{lastSeenAt:new Date()}});
    next();
  }catch{next(new ErrorWithCode(401,'SESSION_EXPIRED','Your session ended. Sign in again.'));}
}
export async function setLoginCookie(res:Response,user:DbRecord,session:DbRecord){
  const token=await new SignJWT({sid:String(session._id),av:user.authVersion}).setProtectedHeader({alg:'HS256',kid:config.kid}).setSubject(String(user._id)).setIssuer('bachat').setAudience('bachat-web').setIssuedAt().setExpirationTime('7d').sign(key);
  res.cookie(sessionCookie,token,{...cookieOptions,maxAge:604800000});
}
export const clearSession=(res:Response)=>res.clearCookie(sessionCookie,cookieOptions);
export async function rateLimit(req:Request,res:Response,scope:string,limit:number,windowMs:number,identity?:string){
  const windowStart=new Date(Math.floor(Date.now()/windowMs)*windowMs),expiresAt=new Date(windowStart.getTime()+windowMs);
  const key=scope+':'+hmac(identity||String(req.auth?.session._id||req.ip),config.rate)+':'+windowStart.getTime();
  const counter=await RateModel.findOneAndUpdate({_id:key},{$inc:{count:1},$setOnInsert:{scope,userId:req.auth?.user._id||null,windowStart,expiresAt}},{upsert:true,new:true});
  if((counter.count||0)>limit){res.set('Retry-After',String(Math.ceil((expiresAt.getTime()-Date.now())/1000)));fail(429,'RATE_LIMITED','Too many attempts. Please try again later.');}
}
export async function publicRate(req:Request,res:Response,scope:string,limit:number,ms:number,email?:string){await rateLimit(req,res,scope,limit,ms,'ip:'+req.ip);if(email)await rateLimit(req,res,scope,limit,ms,'email:'+email);}
