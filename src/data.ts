import type { Dataset, Match, Team, Row, Answers, League } from './types';
export const compareRows=(a:Pick<Row,'points'|'gf'|'gd'>,b:Pick<Row,'points'|'gf'|'gd'>)=> b.points-a.points || b.gf-a.gf || b.gd-a.gd;
export function standings(data:Dataset,league:League,round:number):Row[] {
 const rows=new Map(data.teams.filter(t=>t.league===league).map(team=>[team.id,{team,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,gd:0,points:0,form:[],rank:0,tied:false} as Row]));
 const matches=data.matches.filter(m=>m.league===league&&m.round<=round).sort((a,b)=>a.round-b.round||a.date.localeCompare(b.date));
 for(const m of matches) for(const [id,g,c] of [[m.home,m.score[0],m.score[1]],[m.away,m.score[1],m.score[0]]] as [string,number,number][]){
  const r=rows.get(id)!; r.played++;r.gf+=g;r.ga+=c;r.gd=r.gf-r.ga;
  const outcome=g>c?'승':g===c?'무':'패';r.form.push(outcome);r.form=r.form.slice(-5);
  if(g>c){r.wins++;r.points+=3}else if(g===c){r.draws++;r.points++}else r.losses++;
 }
 let list=[...rows.values()].sort((a,b)=>compareRows(a,b)||a.team.id.localeCompare(b.team.id));
 let groupA:string[]=[];
 if(league===1&&round>33){groupA=standings(data,1,33).slice(0,6).map(r=>r.team.id);list=[...list.filter(r=>groupA.includes(r.team.id)),...list.filter(r=>!groupA.includes(r.team.id))]}
 list.forEach((r,i)=>{const same=(x:Row|undefined)=>x&&compareRows(r,x)===0&&(!groupA.length||groupA.includes(r.team.id)===groupA.includes(x.team.id));r.rank=i+1;r.tied=Boolean(same(list[i-1])||same(list[i+1]))});
 return list;
}
export function percentile(values:number[],value:number,reverse=false){
 if(!values.length)return 0;
 if(values.every(v=>v===values[0]))return 50;
 const less=values.filter(v=>v<value).length, equal=values.filter(v=>v===value).length;
 const p=(less+(equal-1)/2)/(values.length-1)*100;
 return reverse?100-p:p;
}
export function metrics(data:Dataset,team:Team){
 const current=data.seasonStats?.find(r=>r.teamId===team.id);
 if(current){const n=current.played||1;return [current.gf/n,current.ga/n,0,(current.gf+current.ga)/n,current.wins/n*100,current.draws/n*100]}
 const ms=data.matches.filter(m=>m.home===team.id||m.away===team.id);
 const r=standings(data,team.league,99).find(r=>r.team.id===team.id)!;
 return [r.played?r.gf/r.played:0,r.played?r.ga/r.played:0,ms.length?ms.filter(m=>m.score[m.home===team.id?1:0]===0).length/ms.length*100:0,ms.length?ms.filter(m=>m.score[0]+m.score[1]>=3).length/ms.length*100:0,r.played?r.wins/r.played*100:0,r.played?r.draws/r.played*100:0];
}
export const metricNames=['경기당 득점','경기당 실점','무실점 비율','3골 이상 경기','승률','무승부율'];
export function recommendations(data:Dataset,answers:Answers){
 const teams=data.teams,all=teams.map(t=>metrics(data,t));
 if(!answers.region||!answers.style||!answers.character)return []; 
 return teams.map((team,i)=>{
  const pool=all.filter((_,j)=>teams[j].league===team.league);
  const v=all[i];const idx=answers.style==='attack'?0:answers.style==='defense'?1:3;
  const style=percentile(pool.map(x=>x[idx]),v[idx],idx===1);
  const character=percentile(pool.map(x=>x[4]),v[4],answers.character==='underdog');
  const region=answers.region==='any'?0:(answers.region===team.region||(answers.region==='capital'&&['서울','경기','인천'].includes(team.region)))?40:0;
  const weight=answers.region==='any'?.5:.3;
  return {team,score:region+style*weight+character*weight,region,style:style*weight,character:character*weight,values:v};
 }).sort((a,b)=>b.score-a.score||a.team.name.localeCompare(b.team.name,'ko'));
}
export function matchResult(m:Match,id:string){const a=m.score[id===m.home?0:1],b=m.score[id===m.home?1:0];return a>b?'승':a===b?'무':'패'}
export function cumulative(data:Dataset,id:string,limit=99){let p=0;return [0,...data.matches.filter(m=>(m.home===id||m.away===id)&&m.round<=limit).sort((a,b)=>a.round-b.round).map(m=>{p+=matchResult(m,id)==='승'?3:matchResult(m,id)==='무'?1:0;return p})]}
export function sortedBigMatches(data:Dataset,round:number){
 const f=data.forecasts[String(round)];
 return data.matches.filter(m=>m.league===1&&m.round===round).sort((a,b)=>(f?.games[b.id]?.index??-1)-(f?.games[a.id]?.index??-1)||a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
export function validateData(raw:unknown):Dataset {
 if(!raw||typeof raw!=='object')throw new Error('데이터 형식을 확인해주세요.');
 const d=raw as Dataset;
 if(!d.meta||!['demo','verified'].includes(d.meta.mode)||!Array.isArray(d.teams)||!Array.isArray(d.matches)||!d.forecasts)throw new Error('팀·경기·예측 데이터가 필요합니다.');
 const ids=new Set(d.teams.map(t=>t.id));if(ids.size!==d.teams.length)throw new Error('팀 ID가 중복되었습니다.');
 const games=new Set<string>();
 for(const m of d.matches){
  if(games.has(m.id)||!ids.has(m.home)||!ids.has(m.away)||m.home===m.away||!Array.isArray(m.score)||m.score.length!==2||!m.score.every(n=>Number.isInteger(n)&&n>=0)||!Number.isInteger(m.round)||m.round<1)throw new Error('경기 데이터에 중복 또는 잘못된 값이 있습니다.');
  games.add(m.id);
  if(m.probabilities&&(!m.probabilities.every(v=>Number.isFinite(v)&&v>=0&&v<=100)||m.probabilities.length!==3||Math.abs(m.probabilities.reduce((a,b)=>a+b,0)-100)>.1))throw new Error('경기 확률의 범위 또는 합계가 올바르지 않습니다.');
 }
 for(const f of Object.values(d.forecasts))for(const odds of [f.baseline,...Object.values(f.games).flatMap(g=>g.outcomes)])for(const o of Object.values(odds))if(![o.finalA,o.danger,o.direct].every(v=>Number.isFinite(v)&&v>=0&&v<=100))throw new Error('시뮬레이션 확률이 올바르지 않습니다.');
 return d;
}
export function certifiedStatus(data:Dataset,league:League,round:number,id:string,target:number){
 const rows=standings(data,league,round),row=rows.find(r=>r.team.id===id)!;
 const total=league===1?38:39; const remaining=total-row.played;
 if(league===1&&round>=33){
  const top=standings(data,1,33).slice(0,6).some(r=>r.team.id===id);
  if(top&&target>=6)return {label:'확정',number:0,reason:'파이널 A 소속으로 해당 목표 순위를 확보했습니다.'};
 }
 if(!remaining){return row.tied?{label:'동률 조건 확인 필요',number:null,reason:'세 순위 기준까지 같아 추가 확인이 필요합니다.'}:row.rank<=target?{label:'확정',number:0,reason:'시즌 종료 순위로 목표를 달성했습니다.'}:{label:'불가능',number:null,reason:'시즌 종료 순위가 목표에 미치지 못했습니다.'}}
 const eligible=league===1&&round>=33?rows.filter(r=>standings(data,1,33).slice(0,6).some(x=>x.team.id===r.team.id)===standings(data,1,33).slice(0,6).some(x=>x.team.id===id)):rows;
 const localTarget=eligible.length===6?target-6:target;
 const rivals=eligible.filter(r=>r.team.id!==id);
 if(rivals.filter(r=>r.points+3*(total-r.played)>=row.points).length<localTarget)return {label:'확정',number:0,reason:'다른 팀의 최대 승점으로도 목표 밖으로 밀려나지 않습니다.'};
 if(rivals.filter(r=>r.points>row.points+3*remaining).length>=localTarget)return {label:'불가능',number:null,reason:'남은 경기에서 모두 이겨도 필요한 순위에 도달할 수 없습니다.'};
 return {label:'정밀 계산 자료 필요',number:null,reason:'자력 가능 여부·정확한 매직넘버는 남은 맞대결과 다득점 조건을 함께 계산해야 합니다.'};
}
