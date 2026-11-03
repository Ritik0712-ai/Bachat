import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import {randomUUID} from 'node:crypto';
import mongoose from 'mongoose';
import {resolve} from 'node:path';
import {config} from './config.js';
import {csrf,authenticate,rateLimit} from './security.js';
import {authRouter} from './auth.js';
import {ledgerRouter} from './ledger.js';
import {meRouter} from './me.js';
import {ApiError,errorHandler} from './errors.js';
export function createApp(){
  const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
  app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:'],fontSrc:["'self'"],connectSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"],upgradeInsecureRequests:config.production?[]:null}},referrerPolicy:{policy:'no-referrer'}}));
  app.use(express.json({limit:'16kb'}));app.use(cookieParser());
  app.use('/api',(_req,res,next)=>{res.locals.requestId=randomUUID();res.set('Cache-Control','no-store');res.set('X-Request-Id',res.locals.requestId);next();});
  app.get('/api/v1/health/live',(_req,res)=>res.json({data:{status:'ok'}}));
  app.get('/api/v1/health/ready',(_req,res)=>res.status(mongoose.connection.readyState===1?200:503).json({data:{status:mongoose.connection.readyState===1?'ready':'unavailable'}}));
  app.get('/api/v1/public/config',(_req,res)=>res.json({data:{privacyContact:config.privacyContact||null,production:config.production}}));
  app.use('/api/v1',csrf);
  app.use('/api/v1/auth',authRouter);
  app.use('/api/v1',authenticate,async(req,res,next)=>{try{await rateLimit(req,res,'api',120,60000);next();}catch(e){next(e);}});
  app.use('/api/v1/me',meRouter);app.use('/api/v1',ledgerRouter);
  app.use('/api',(_req,_res,next)=>next(new ApiError(404,'RESOURCE_NOT_FOUND','Endpoint not found.')));
  if(config.production){app.use(express.static(resolve('dist/client'),{maxAge:'1h'}));app.get('/{*path}',(_req,res)=>res.set('Cache-Control','no-store').sendFile(resolve('dist/client/index.html')));}
  app.use(errorHandler);return app;
}
