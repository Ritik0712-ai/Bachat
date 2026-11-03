import type {ErrorRequestHandler} from 'express';
import {ZodError} from 'zod';
export class ApiError extends Error {constructor(public status:number,public code:string,message:string,public fields?:Record<string,string>){super(message);}}
export const fail=(status:number,code:string,message:string):never=>{throw new ApiError(status,code,message);};
export const errorHandler:ErrorRequestHandler=(error,_req,res,_next)=>{
  if(error instanceof ZodError) {res.status(422).json({error:{code:'VALIDATION_ERROR',message:'Check the highlighted fields.',fields:Object.fromEntries(error.issues.map(i=>[i.path.join('.'),i.message]))},meta:{requestId:res.locals.requestId}});return;}
  if(error instanceof ApiError){res.status(error.status).json({error:{code:error.code,message:error.message,fields:error.fields},meta:{requestId:res.locals.requestId}});return;}
  const malformed=error.type==='entity.parse.failed'||error.type==='entity.too.large';
  if(!malformed) console.error(JSON.stringify({requestId:res.locals.requestId,code:'INTERNAL_ERROR',name:error.name}));
  res.status(malformed?400:500).json({error:{code:malformed?'BAD_REQUEST':'INTERNAL_ERROR',message:malformed?'The request could not be read.':'Something went wrong. Please try again.'},meta:{requestId:res.locals.requestId}});
};
