import mongoose from 'mongoose';
import {Router} from 'express';
import {z} from 'zod';
import argon2 from 'argon2';
import {nameSchema,passwordSchema,versionSchema} from '../shared/domain.js';
import {UserModel,CategoryModel,TxModel,BudgetModel,SessionModel,TokenModel,ReceiptModel,RateModel,TombModel,atomic} from './db.js';
import type {ClientSession} from 'mongoose';
import {fail} from './errors.js';
import {clearSession,rateLimit} from './security.js';
import {userDTO} from './serializers.js';
import {passwordHash} from './auth.js';
export const meRouter=Router();
export async function purgeUser(userId:mongoose.Types.ObjectId,session:ClientSession,reason:'user_request'|'unverified_expiry'='user_request'){
  const user=await UserModel.findOneAndUpdate({_id:userId,...(reason==='unverified_expiry'?{emailVerifiedAt:null,createdAt:{$lt:new Date(Date.now()-604800000)}}:{})},{$inc:{ledgerRevision:1n}},{session,new:true});
  if(!user)return false;
  await TombModel.create([{deletedUserId:userId,deletedAt:new Date(),expiresAt:new Date(Date.now()+2592000000),reason}],{session});
  // Operations sharing a transaction/session run serially, never Promise.all.
  await TxModel.deleteMany({userId},{session});await BudgetModel.deleteMany({userId},{session});await CategoryModel.deleteMany({userId},{session});await SessionModel.deleteMany({userId},{session});await TokenModel.deleteMany({userId},{session});await ReceiptModel.deleteMany({userId},{session});await RateModel.deleteMany({userId},{session});await UserModel.deleteOne({_id:userId},{session});return true;
}
meRouter.patch('/',async(req,res)=>{const {name,version}=z.object({name:nameSchema,version:versionSchema}).strict().parse(req.body);const user=await UserModel.findOneAndUpdate({_id:req.auth!.user._id,version},{$set:{name},$inc:{version:1}},{new:true});if(!user)fail(409,'VERSION_CONFLICT','Your profile changed in another tab. Load the latest version.');res.json({data:userDTO(user)});});
meRouter.post('/change-password',async(req,res)=>{
  await rateLimit(req,res,'write',10,900000);
  const {currentPassword,newPassword}=z.object({currentPassword:z.string().min(1).max(128),newPassword:passwordSchema}).strict().parse(req.body),user=req.auth!.user;
  if(currentPassword===newPassword)fail(422,'VALIDATION_ERROR','Choose a different new password.');
  if(!await argon2.verify(user.passwordHash,currentPassword))fail(422,'CURRENT_PASSWORD_INCORRECT','Your current password is incorrect.');
  const hash=await passwordHash(newPassword);
  await atomic(async s=>{const updated=await UserModel.updateOne({_id:user._id,passwordHash:user.passwordHash,authVersion:user.authVersion},{$set:{passwordHash:hash},$inc:{authVersion:1}},{session:s});if(!updated.modifiedCount)fail(409,'VERSION_CONFLICT','Your account changed. Sign in again.');await SessionModel.updateMany({userId:user._id},{$set:{revokedAt:new Date()}},{session:s});});clearSession(res);res.sendStatus(204);
});
meRouter.delete('/',async(req,res)=>{
  await rateLimit(req,res,'write',5,900000);
  const {currentPassword}=z.object({currentPassword:z.string().min(1).max(128),confirmation:z.literal('DELETE')}).strict().parse(req.body),user=req.auth!.user;
  if(!await argon2.verify(user.passwordHash,currentPassword))fail(422,'CURRENT_PASSWORD_INCORRECT','Your current password is incorrect.');
  await atomic(async s=>{const current=await UserModel.findOne({_id:user._id,passwordHash:user.passwordHash,authVersion:user.authVersion}).session(s);if(!current)fail(401,'SESSION_EXPIRED','Sign in again before deleting your account.');if(!await purgeUser(user._id,s))fail(401,'SESSION_EXPIRED','Your session ended.');});clearSession(res);res.sendStatus(204);
});
