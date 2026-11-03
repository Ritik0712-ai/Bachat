import 'dotenv/config';
import { randomBytes } from 'node:crypto';
export const production=process.env.NODE_ENV==='production';
function secret(key:string) {
  const value=process.env[key];
  if(value&&value.length>=32) return value;
  if(production) throw new Error(`${key} must contain at least 32 characters`);
  return randomBytes(32).toString('hex');
}
export const config={
  production,port:Number(process.env.PORT||4000),origin:process.env.FRONTEND_ORIGIN||'http://localhost:5173',
  db:process.env.APP_DB||'bachat_app',controlDb:process.env.CONTROL_DB||'bachat_control',
  mongo:process.env.MONGODB_URI||'',jwt:secret('JWT_SIGNING_KEY'),csrf:secret('CSRF_SIGNING_KEY'),rate:secret('RATE_LIMIT_HASH_KEY'),
  kid:process.env.JWT_KEY_ID||'v1',resend:process.env.RESEND_API_KEY||'',mailFrom:process.env.MAIL_FROM||'',privacyContact:process.env.PRIVACY_CONTACT||'',
};
if(production&&(!config.mongo||!config.resend||!config.mailFrom||!config.privacyContact||!config.origin.startsWith('https://'))) throw new Error('Production requires database, email sender, HTTPS origin and privacy contact configuration.');
export const sessionCookie=production?'__Host-pft_session':'bachat_dev_session';
export const csrfCookie=production?'__Host-pft_csrf':'bachat_dev_csrf';
export const cookieOptions={httpOnly:true,secure:production,sameSite:'lax' as const,path:'/'};
