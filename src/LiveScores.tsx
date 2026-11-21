import {useEffect,useMemo,useState,type CSSProperties} from 'react';
import {LoaderCircle,Radio,Tv,MapPin,RefreshCw,Info} from 'lucide-react';
import type {League,Team} from './types';
import {Heading,Tile,Empty} from './components';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './supabaseConfig';
import {useMatches,outlook,type SeasonMatches} from './matchData';
import './liveScores.css';

// 라이브 탭: K리그1·2 오늘 경기의 실시간 점수와 분석.
// 실시간 자료는 Supabase Edge Function(supabase/functions/kleaguelive)이 공식 홈페이지에서 받아 준다.
// 함수가 아직 배포되지 않았거나 실패하면, 저장된 일정(matches-2026.json)으로 오늘 경기 목록만 보여 준다.
type Pair=[number,number];
interface LiveStats {shots:Pair;onTarget:Pair;possession:Pair;corners:Pair;fouls:Pair;offsides:Pair;yellow:Pair;red:Pair;shotsInBox:Pair|null;shotsOutBox:Pair|null;passes:Pair|null;keyPasses:Pair|null}
interface LiveEvent {half:number;minute:number;type:'goal'|'ownGoal'|'yellow'|'red'|'sub';side:'home'|'away';player:string;player2:string}
interface LiveGame {id:string;league:League;round:number;date:string;kickoff:string;home:string;away:string;venue:string;phase:string|null;broadcast:string[];status:'NS'|'LIVE'|'FT';minute:number|null;label:string;score:Pair|null;stats:LiveStats|null;events:LiveEvent[]}
interface LiveDay {date:string;updatedAt:string;source:string;next:string|null;matches:LiveGame[];offline?:boolean}

const FN_URL=SUPABASE_URL?SUPABASE_URL+'/functions/v1/kleaguelive':'';
const todayKST=()=>new Date(Date.now()+9*3600_000).toISOString().slice(0,10);

async function fetchLive(date:string,signal:AbortSignal):Promise<LiveDay>{
 if(!FN_URL)throw Error('no function');
 const r=await fetch(FN_URL+'?date='+date,{signal,headers:{apikey:SUPABASE_ANON_KEY}});
 if(!r.ok)throw Error('HTTP '+r.status);
 const d=await r.json();if(!Array.isArray(d.matches))throw Error('format');return d;
}
// 실시간 연결이 안 될 때: 저장된 일정으로 오늘(또는 다음 경기일) 목록을 만든다.
function fromSchedule(data:SeasonMatches,date:string):LiveDay{
 const pick=(d:string)=>data.matches.filter(m=>m.date===d);
 let day=date,list=pick(day);const next=list.length?null:[...new Set(data.matches.map(m=>m.date))].filter(d=>d>date).sort()[0]??null;
 return {date:day,updatedAt:data.fetchedAt,source:data.source.schedule,next,offline:true,matches:list.map(m=>({id:m.id,league:m.league,round:m.round,date:m.date,kickoff:m.time,home:m.home,away:m.away,venue:m.venue,phase:m.phase,broadcast:m.broadcast,status:m.status==='FT'?'FT':'NS',minute:null,label:m.status==='FT'?'경기 종료':'경기 전',score:m.score,stats:null,events:[]}))};
}

// 슈팅 위치로 추정한 기대득점. 공식 xG가 아니라 단순 모형이다.
function estXg(s:LiveStats):Pair{
 const side=(i:0|1)=>{const shots=s.shots[i],on=s.onTarget[i];if(s.shotsInBox&&s.shotsOutBox&&s.shotsInBox[i]+s.shotsOutBox[i]===shots)return s.shotsInBox[i]*.12+s.shotsOutBox[i]*.035;return on*.16+Math.max(0,shots-on)*.05};
 return [side(0),side(1)];
}
const pois=(k:number,l:number)=>{let p=Math.exp(-l);for(let i=1;i<=k;i++)p*=l/i;return p};
// 경기 전 기대득점(시즌 홈·원정 득실 모형)에 남은 시간 비율을 곱해, 지금 점수에서 끝까지 갔을 때의 승·무·패 확률.
function winProb(lh:number,la:number,score:Pair,minute:number|null,status:string):[number,number,number]{
 if(status==='FT')return score[0]>score[1]?[1,0,0]:score[0]===score[1]?[0,1,0]:[0,0,1];
 const f=status==='NS'?1:Math.max(0,Math.min(1,(90-(minute??45))/90));
 let H=0,D=0,A=0;for(let i=0;i<=9;i++)for(let j=0;j<=9;j++){const p=pois(i,lh*f)*pois(j,la*f),h=score[0]+i,a=score[1]+j;if(h>a)H+=p;else if(h===a)D+=p;else A+=p}
 const t=H+D+A;return [H/t,D/t,A/t];
}
const pc=(p:number)=>Math.round(p*100)+'%';

export default function LiveScores({teams}:{teams:Record<string,Team>}){
 const {data:season}=useMatches();
 const [date,setDate]=useState(todayKST),[live,setLive]=useState<LiveDay|null>(null),[offline,setOffline]=useState(false),[tick,setTick]=useState(0),[league,setLeague]=useState<0|League>(0);
 useEffect(()=>{const c=new AbortController();fetchLive(date,c.signal).then(d=>{setLive(d);setOffline(false)}).catch(e=>{if(e.name!=='AbortError')setOffline(true)});return()=>c.abort()},[date,tick]);
 // 진행 중인 경기가 있으면 30초, 없으면 2분마다 새로 받는다. 탭이 숨겨져 있으면 멈춘다.
 const anyLive=live?.matches.some(m=>m.status==='LIVE');
 useEffect(()=>{if(offline)return;const id=setInterval(()=>{if(!document.hidden)setTick(t=>t+1)},anyLive?30_000:120_000);return()=>clearInterval(id)},[anyLive,offline]);
 const day:LiveDay|null=!offline?live:season?fromSchedule(season,date):null;
 // 오늘 경기가 없으면 다음 경기일로 한 번 넘어간다.
 useEffect(()=>{if(day&&!day.matches.length&&day.next&&date===todayKST())setDate(day.next)},[day?.next,day?.matches.length]);
 const games=(day?.matches||[]).filter(m=>!league||m.league===league);
 const counts={LIVE:day?.matches.filter(m=>m.status==='LIVE').length||0};
 const updated=day?new Date(day.updatedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'';
 return <section className="live-scores">
  <Heading eyebrow="K LEAGUE 1·2 / LIVE CENTER" title="지금, 모든 경기장의 점수." description="K리그1·2 전 경기의 실시간 점수와 슈팅·점유율, 기대득점과 실시간 승리 확률을 한 화면에서 보세요."/>
  <div className="ls-toolbar">
   <div className="tabs" aria-label="리그">{([0,1,2] as (0|League)[]).map(l=><button key={l} aria-pressed={league===l} className={league===l?'selected':''} onClick={()=>setLeague(l)}>{l?'K리그 '+l:'전체'}</button>)}</div>
   <div className="ls-status">{day&&<><span className={'ls-dot'+(counts.LIVE?' on':'')}/>{counts.LIVE?`진행 중 ${counts.LIVE}경기`:'진행 중인 경기 없음'} · {Number(day.date.slice(5,7))}월 {Number(day.date.slice(8))}일</>}<button className="text-button" onClick={()=>setTick(t=>t+1)} aria-label="새로고침"><RefreshCw size={13}/>{updated} 업데이트</button></div>
  </div>
  {offline&&<p className="ls-offline"><Info size={14}/>실시간 연결이 아직 준비되지 않아 저장된 일정만 보여 드려요. 점수와 기록은 경기가 끝난 다음 날 아침에 반영돼요.</p>}
  {!day?<div className="ls-loading"><LoaderCircle className="spin"/>경기 정보를 불러오는 중</div>:!games.length?<Empty>{day.next?`이날은 경기가 없어요. 다음 경기는 ${day.next}이에요.`:'경기가 없어요.'}</Empty>:
   <div className="ls-grid">{games.map(g=><GameCard key={g.id} g={g} teams={teams} season={season}/>)}</div>}
  <p className="record-source">출처 K리그 공식 홈페이지 · 진행 중일 때 30초마다 자동 갱신 · 기대득점은 슈팅 위치로 계산한 추정치이고, 승리 확률은 이번 시즌 홈·원정 득실 모형에 남은 시간과 현재 점수를 반영한 참고값이에요.</p>
 </section>;
}

function GameCard({g,teams,season}:{g:LiveGame;teams:Record<string,Team>;season:SeasonMatches|null}){
 const home=teams[g.home],away=teams[g.away];
 const model=useMemo(()=>season?outlook(season,g.league,g.home,g.away,g.date+g.kickoff):null,[season,g.league,g.home,g.away,g.date,g.kickoff]);
 const prob=model?winProb(model.xg[0],model.xg[1],g.score||[0,0],g.minute,g.status):null;
 const xg=g.stats?estXg(g.stats):null;
 const goals=g.events.filter(e=>e.type==='goal'||e.type==='ownGoal'),cards=g.events.filter(e=>e.type==='red');
 const name=(id:string)=>teams[id]?.short||id;
 return <article className={'ls-card '+g.status.toLowerCase()} style={{'--home':home?.color||'#11263d','--away':away?.color||'#11263d'} as CSSProperties}>
  <div className="ls-top"><span>K리그{g.league} · {g.round}R{g.phase&&g.phase!=='일반'?' · '+g.phase:''}</span><span className={'ls-badge '+g.status.toLowerCase()}>{g.status==='LIVE'&&<Radio size={12}/>}{g.status==='NS'?g.kickoff+' 킥오프':g.label}</span></div>
  <div className="ls-score">
   <div className="ls-team">{home&&<Tile team={home}/>}<b>{name(g.home)}</b></div>
   <div className="ls-num">{g.score?<><span>{g.score[0]}</span><i>:</i><span>{g.score[1]}</span></>:<em>VS</em>}</div>
   <div className="ls-team">{away&&<Tile team={away}/>}<b>{name(g.away)}</b></div>
  </div>
  {goals.length>0&&<ul className="ls-goals">{goals.map((e,i)=><li key={i} className={e.side}>⚽ {e.player}{e.type==='ownGoal'?' (자책)':''} <small>{e.minute}'</small></li>)}{cards.map((e,i)=><li key={'r'+i} className={e.side}>🟥 {e.player} <small>{e.minute}'</small></li>)}</ul>}
  {prob&&<div className="ls-prob" aria-label="승리 확률"><div className="ls-prob-bar"><span style={{flex:prob[0]}}/><span style={{flex:prob[1]}}/><span style={{flex:prob[2]}}/></div><div className="ls-prob-label"><span>{name(g.home)} {pc(prob[0])}</span><span>무 {pc(prob[1])}</span><span>{name(g.away)} {pc(prob[2])}</span></div><small>{g.status==='LIVE'?'실시간 승리 확률':g.status==='NS'?'경기 전 예측':'최종 결과'}</small></div>}
  {g.stats&&xg?<div className="ls-stats">
   <Stat label="추정 xG" v={[+xg[0].toFixed(2),+xg[1].toFixed(2)]} fmt={n=>n.toFixed(2)}/>
   <Stat label="슈팅" v={g.stats.shots}/>
   <Stat label="유효 슈팅" v={g.stats.onTarget}/>
   {g.stats.possession[0]+g.stats.possession[1]>0&&<Stat label="점유율" v={g.stats.possession} fmt={n=>n+'%'}/>}
   <Stat label="코너킥" v={g.stats.corners}/>
   {g.stats.keyPasses&&<Stat label="키패스" v={g.stats.keyPasses}/>}
  </div>:g.status==='NS'?<div className="ls-pre">{model&&<p>모형 기대득점 <b>{model.xg[0].toFixed(2)} : {model.xg[1].toFixed(2)}</b> · 가장 가능성 높은 점수 {model.likely[0]}:{model.likely[1]}</p>}</div>:null}
  <div className="ls-foot"><span><MapPin size={12}/>{g.venue}</span>{g.broadcast.length>0&&<span><Tv size={12}/>{g.broadcast.join(' · ')}</span>}</div>
 </article>;
}
function Stat({label,v,fmt=(n:number)=>String(n)}:{label:string;v:Pair;fmt?:(n:number)=>string}){
 const t=v[0]+v[1];
 return <div className="ls-stat"><span>{fmt(v[0])}</span><div><small>{label}</small><div className={'ls-stat-bar'+(t?'':' empty')}><i style={{width:(t?v[0]/t*100:50)+'%'}}/><i style={{width:(t?v[1]/t*100:50)+'%'}}/></div></div><span>{fmt(v[1])}</span></div>;
}
