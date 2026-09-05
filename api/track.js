import { put } from '@vercel/blob';
import { PREFIX } from '../_tracking-store.js';

function clean(v,max=120){return String(v??'').trim().slice(0,max)}
function safeSegment(v){return clean(v,100).toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'') || 'unknown'}
function safeDetails(v){
  if(!v || typeof v!=='object' || Array.isArray(v))return {};
  try{
    const txt=JSON.stringify(v);
    if(txt.length>30000)return {note:'Details omitted because payload was too large.'};
    return v;
  }catch(e){return {};}
}
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const b=req.body||{};
    const type=['registration','connected','started','attempt'].includes(b.type)?b.type:null;
    if(!type)return res.status(400).json({error:'Invalid event type'});
    const name=clean(b.name||b.student||b.studentName,80);
    const group=clean(b.group||b.class||b.className,60);
    const studentKey=clean(b.studentKey,120);
    if(!name || !group || !studentKey)return res.status(400).json({error:'Missing learner identity'});
    const mission=b.mission && /^m(?:[1-9]|10)$/i.test(String(b.mission))?String(b.mission).toLowerCase():null;
    const raw=Number(b.score);const score=(b.score===null||b.score===undefined||!Number.isFinite(raw))?null:Math.max(0,Math.min(100,Math.round(raw)));
    const event={type,mission,studentKey,name,group,score,completed:!!b.completed,details:safeDetails(b.details),clientTime:clean(b.clientTime,40)||null,serverTime:new Date().toISOString(),appVersion:clean(b.appVersion,20)||null};
    const id=(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
    const path=`${PREFIX}${safeSegment(group)}/${safeSegment(studentKey)}/${Date.now()}-${id}.json`;
    await put(path,JSON.stringify(event),{access:'private',contentType:'application/json'});
    return res.status(200).json({ok:true});
  }catch(err){console.error('tracking write failed',err);return res.status(503).json({error:'Tracking service unavailable'});}
}
