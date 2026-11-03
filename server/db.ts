import mongoose,{Schema, type ClientSession} from 'mongoose';
import { config } from './config.js';
const oid={type:Schema.Types.ObjectId,required:true,index:false};
const options={versionKey:false,strict:'throw',timestamps:true} as const;
const userSchema=new Schema({name:{type:String,required:true,maxLength:80},emailNormalized:{type:String,required:true,unique:true,maxLength:254},passwordHash:{type:String,required:true},emailVerifiedAt:{type:Date,default:null},currency:{type:String,enum:['INR'],default:'INR'},timeZone:{type:String,default:'Asia/Kolkata'},authVersion:{type:Number,default:1},version:{type:Number,default:1},ledgerRevision:{type:BigInt,default:0n},transactionCount:{type:Number,default:0,min:0,max:10000},analyticsId:{type:String,required:true,unique:true}},options);
const categorySchema=new Schema({userId:oid,key:{type:String,required:true},name:{type:String,required:true},type:{type:String,enum:['income','expense'],required:true},colorKey:String,sortOrder:Number},{...options,timestamps:{createdAt:true,updatedAt:false}});
categorySchema.index({userId:1,key:1},{unique:true});categorySchema.index({userId:1,type:1,sortOrder:1});
interface TxRecord {userId:mongoose.Types.ObjectId;type:'income'|'expense';categoryId:mongoose.Types.ObjectId;amountMinor:bigint;currency:'INR';occurredOn:string;note:string;version:number;createdAt:Date;updatedAt:Date;}
const txSchema=new Schema<TxRecord>({userId:oid,type:{type:String,enum:['income','expense'],required:true},categoryId:oid,amountMinor:{type:BigInt,required:true,validate:(v:bigint)=>v>=1n&&v<=100000000n},currency:{type:String,default:'INR',enum:['INR']},occurredOn:{type:String,required:true},note:{type:String,default:''},version:{type:Number,default:1}},options);
txSchema.index({userId:1,occurredOn:-1,createdAt:-1,_id:-1});txSchema.index({userId:1,type:1,occurredOn:-1,createdAt:-1,_id:-1});txSchema.index({userId:1,categoryId:1,occurredOn:-1,createdAt:-1,_id:-1});
interface BudgetRecord {userId:mongoose.Types.ObjectId;month:string;limitMinor:bigint;currency:string;version:number;createdAt:Date;updatedAt:Date;}
const budgetSchema=new Schema<BudgetRecord>({userId:oid,month:{type:String,required:true},limitMinor:{type:BigInt,required:true,validate:(v:bigint)=>v>=1n&&v<=100000000n},currency:{type:String,default:'INR'},version:{type:Number,default:1}},options);budgetSchema.index({userId:1,month:1},{unique:true});
const sessionSchema=new Schema({userId:oid,authVersion:{type:Number,required:true},createdAt:{type:Date,required:true},lastSeenAt:{type:Date,required:true},expiresAt:{type:Date,required:true},revokedAt:{type:Date,default:null}},{versionKey:false,strict:'throw'});sessionSchema.index({userId:1,revokedAt:1});sessionSchema.index({expiresAt:1},{expireAfterSeconds:0});
const tokenSchema=new Schema({userId:oid,kind:{type:String,enum:['verify_email','reset_password'],required:true},tokenHash:{type:String,unique:true,required:true},createdAt:Date,expiresAt:Date,consumedAt:{type:Date,default:null}},{versionKey:false,strict:'throw'});tokenSchema.index({userId:1,kind:1,consumedAt:1});tokenSchema.index({expiresAt:1},{expireAfterSeconds:0});
const receiptSchema=new Schema({userId:oid,key:String,fingerprint:String,httpStatus:Number,response:{type:Schema.Types.Mixed,default:null},createdAt:Date,expiresAt:Date},{versionKey:false,strict:'throw'});receiptSchema.index({userId:1,key:1},{unique:true});receiptSchema.index({expiresAt:1},{expireAfterSeconds:0});
const rateSchema=new Schema({_id:String,scope:String,userId:{type:Schema.Types.ObjectId,default:null},count:Number,windowStart:Date,expiresAt:Date},{versionKey:false,strict:'throw'});rateSchema.index({expiresAt:1},{expireAfterSeconds:0});rateSchema.index({userId:1});
const tombSchema=new Schema({deletedUserId:{...oid,unique:true},deletedAt:Date,expiresAt:Date,reason:{type:String,enum:['user_request','unverified_expiry']}},{versionKey:false,strict:'throw'});tombSchema.index({expiresAt:1},{expireAfterSeconds:0});
// DTO serializers are the only boundary allowed to expose these models.
export const UserModel=mongoose.model('User',userSchema,'users');
export const CategoryModel=mongoose.model('Category',categorySchema,'categories');
export const TxModel=mongoose.model('Transaction',txSchema,'transactions');
export const BudgetModel=mongoose.model('Budget',budgetSchema,'budgets');
export const SessionModel=mongoose.model('Session',sessionSchema,'sessions');
export const TokenModel=mongoose.model('AccountToken',tokenSchema,'account_tokens');
export const ReceiptModel=mongoose.model('MutationReceipt',receiptSchema,'mutation_receipts');
export const RateModel=mongoose.model('RateLimit',rateSchema,'rate_limits');
export const control=mongoose.connection.useDb(config.controlDb,{useCache:true});
export const TombModel=control.model('DeletionTombstone',tombSchema,'deletion_tombstones');
export async function connect(uri:string) {await mongoose.connect(uri,{dbName:config.db,maxPoolSize:10,serverSelectionTimeoutMS:10000});await Promise.all([UserModel,CategoryModel,TxModel,BudgetModel,SessionModel,TokenModel,ReceiptModel,RateModel,TombModel].map(m=>m.init()));}
export async function atomic<T>(fn:(session:ClientSession)=>Promise<T>):Promise<T> {return mongoose.connection.transaction(fn,{readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:5000}) as Promise<T>;}
