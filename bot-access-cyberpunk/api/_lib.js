const {createClient}=require('@supabase/supabase-js');
function clients(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Server Supabase configuration is missing.');return {admin:createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}}
function send(res,status,body){return res.status(status).json(body)}
async function getCaller(req,admin){const m=(req.headers.authorization||'').match(/^Bearer\s+(.+)$/i);if(!m)return{error:'Login required.',status:401};const {data,error}=await admin.auth.getUser(m[1]);if(error||!data.user)return{error:'Invalid or expired session.',status:401};const {data:r,error:e}=await admin.from('user_roles').select('role,active').eq('user_id',data.user.id).maybeSingle();if(e||!r||r.active!==true)return{error:'Account has no active dashboard role.',status:403};return{user:data.user,role:r.role}}
module.exports={clients,send,getCaller};
