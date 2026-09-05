import { list, get } from '@vercel/blob';

export const PREFIX='trail-tracking/';

export function teacherAuthorized(req){
  const expected=process.env.TEACHER_DASHBOARD_CODE;
  if(!expected)return false;
  const supplied=req.headers['x-teacher-code'] || req.query?.code || '';
  return String(supplied)===String(expected);
}

export async function readAllEvents(){
  const events=[];
  let cursor;
  do{
    const page=await list({prefix:PREFIX,limit:1000,cursor});
    for(const blob of page.blobs){
      try{
        const result=await get(blob.pathname,{access:'private'});
        if(!result || result.statusCode!==200)continue;
        const txt=await new Response(result.stream).text();
        const event=JSON.parse(txt);
        if(event && event.studentKey)events.push(event);
      }catch(e){}
    }
    cursor=page.cursor;
  }while(cursor);
  events.sort((a,b)=>String(a.serverTime||a.clientTime||'').localeCompare(String(b.serverTime||b.clientTime||'')));
  return events;
}

export function aggregateEvents(events){
  const students=new Map();
  const missions=['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10'];
  const emptyMission=()=>({startedAt:null,firstScore:null,bestScore:null,attempts:0,completed:false,lastActivity:null,lastDetails:null});
  for(const e of events){
    const key=String(e.studentKey);
    if(!students.has(key)){
      students.set(key,{studentKey:key,name:e.name||'Unknown',group:e.group||'',connectedAt:e.serverTime||e.clientTime||null,lastActivity:e.serverTime||e.clientTime||null,missions:Object.fromEntries(missions.map(m=>[m,emptyMission()]))});
    }
    const s=students.get(key);
    s.name=e.name||s.name; s.group=e.group||s.group;
    const when=e.serverTime||e.clientTime||null;
    if(when && (!s.connectedAt || when<s.connectedAt))s.connectedAt=when;
    if(when && (!s.lastActivity || when>s.lastActivity))s.lastActivity=when;
    if(!e.mission || !s.missions[e.mission])continue;
    const m=s.missions[e.mission];
    if(e.type==='started'){
      if(!m.startedAt)m.startedAt=when;
      m.lastActivity=when;
    }
    if(e.type==='attempt'){
      if(!m.startedAt)m.startedAt=when;
      m.attempts+=1;
      const score=Number(e.score);
      if(Number.isFinite(score)){
        if(m.firstScore===null)m.firstScore=Math.round(score);
        if(m.bestScore===null || score>m.bestScore)m.bestScore=Math.round(score);
      }
      m.completed=m.completed || !!e.completed;
      m.lastActivity=when;
      m.lastDetails=e.details||null;
    }
  }
  const rows=[...students.values()].map(s=>{
    let started=0,completed=0;
    for(const m of missions){ if(s.missions[m].startedAt)started++; if(s.missions[m].completed)completed++; }
    return {...s,startedMissions:started,completedMissions:completed,status:completed===missions.length?'All completed':started>0?'Active':'Connected — no mission started'};
  });
  rows.sort((a,b)=>(a.group||'').localeCompare(b.group||'') || (a.name||'').localeCompare(b.name||''));
  return rows;
}
