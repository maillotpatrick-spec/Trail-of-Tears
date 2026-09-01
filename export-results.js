import ExcelJS from 'exceljs';
import { teacherAuthorized,readAllEvents,aggregateEvents } from './_tracking-store.js';
const missions=['m1','m2','m3','m4','m5','m6','m7'];
const missionNames={m1:'Native homelands',m2:'Forced removal',m3:'Compare maps',m4:'Knowledge challenge',m5:'Exit writing',m6:'Grammar Lab',m7:'Written Skills'};
function status(m){return m.completed?'Completed':m.attempts>0?'Attempted':m.startedAt?'Started':'Not started'}
function fmtDate(v){if(!v)return ''; const d=new Date(v); return Number.isNaN(d.getTime())?'':d;}
function styleHeader(row){row.font={bold:true,color:{argb:'FFFFFFFF'}};row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF6F4E37'}};row.alignment={vertical:'middle',horizontal:'center',wrapText:true};}
function addStatusFill(cell,value){const map={'Completed':'FFE2F0D9','Attempted':'FFFFF2CC','Started':'FFDDEBF7','Not started':'FFF4CCCC'};if(map[value])cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:map[value]}};}
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  if(!teacherAuthorized(req))return res.status(401).json({error:'Invalid teacher code'});
  try{
    const events=await readAllEvents();
    const students=aggregateEvents(events);
    const wb=new ExcelJS.Workbook(); wb.creator='Trail of Tears Teacher Dashboard'; wb.created=new Date();

    const summary=wb.addWorksheet('Student Summary',{views:[{state:'frozen',xSplit:2,ySplit:1}]});
    const headers=['Student','Class','Connected','Last activity','Overall status','Missions started','Missions completed'];
    missions.forEach(m=>headers.push(`${m.toUpperCase()} First try %`,`${m.toUpperCase()} Best %`,`${m.toUpperCase()} Tries`,`${m.toUpperCase()} Status`));
    summary.addRow(headers); styleHeader(summary.getRow(1));
    students.forEach(s=>{
      const row=[s.name,s.group,fmtDate(s.connectedAt),fmtDate(s.lastActivity),s.status,s.startedMissions,s.completedMissions];
      missions.forEach(m=>{const x=s.missions[m];row.push(x.firstScore??'',x.bestScore??'',x.attempts,status(x));});
      const r=summary.addRow(row);
      [3,4].forEach(c=>r.getCell(c).numFmt='dd/mm/yyyy hh:mm');
      let c=11; // first status col = 11
      missions.forEach(()=>{addStatusFill(r.getCell(c),r.getCell(c).value);c+=4;});
    });
    summary.autoFilter={from:'A1',to:{row:1,column:headers.length}};
    summary.columns.forEach((col,i)=>{col.width=i<2?22:(i===4?24:(i>=7?14:18));});
    summary.getColumn(1).width=25; summary.getColumn(2).width=16;

    const attempts=wb.addWorksheet('Attempts',{views:[{state:'frozen',ySplit:1}]});
    attempts.addRow(['Timestamp','Student','Class','Mission','Mission name','Event','Score %','Completed','Details']); styleHeader(attempts.getRow(1));
    events.filter(e=>e.type!=='registration').forEach(e=>{
      const r=attempts.addRow([fmtDate(e.serverTime||e.clientTime),e.name,e.group,e.mission||'',missionNames[e.mission]||'',e.type,e.score??'',e.completed?'Yes':'No',JSON.stringify(e.details||{})]);
      r.getCell(1).numFmt='dd/mm/yyyy hh:mm:ss';
    });
    attempts.autoFilter={from:'A1',to:'I1'}; attempts.columns=[{width:20},{width:25},{width:16},{width:10},{width:24},{width:13},{width:12},{width:12},{width:45}];

    const classes=wb.addWorksheet('Class Summary',{views:[{state:'frozen',ySplit:1}]});
    classes.addRow(['Class','Connected learners','Active learners','Connected but inactive','All 7 completed','Average completed missions']); styleHeader(classes.getRow(1));
    const groups=[...new Set(students.map(s=>s.group))].sort();
    groups.forEach(g=>{const xs=students.filter(s=>s.group===g);const active=xs.filter(s=>s.startedMissions>0).length;const all=xs.filter(s=>s.completedMissions===7).length;const avg=xs.length?xs.reduce((a,s)=>a+s.completedMissions,0)/xs.length:0;const r=classes.addRow([g,xs.length,active,xs.length-active,all,avg]);r.getCell(6).numFmt='0.0';});
    classes.columns=[{width:18},{width:20},{width:18},{width:24},{width:18},{width:28}];

    const buffer=await wb.xlsx.writeBuffer();
    const stamp=new Date().toISOString().slice(0,10);
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename="Trail_of_Tears_Tracking_${stamp}.xlsx"`);
    return res.status(200).send(Buffer.from(buffer));
  }catch(err){console.error(err);return res.status(500).json({error:'Could not create Excel export'});}
}
