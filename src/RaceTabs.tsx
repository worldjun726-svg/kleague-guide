import {useMemo,useState,type CSSProperties} from 'react';
import {LoaderCircle,RefreshCw,ExternalLink,Flame,ArrowRight,RotateCcw} from 'lucide-react';
import type {League,Team} from './types';
import {Heading,Tile,Empty} from './components';
import {useMatches,type SeasonMatches} from './matchData';
import {table,magicFor,simulate,bigMatches,remainingMatches,kickoffLabel,KEYS,GIMCHEON,type Row,type Outcome,type SimResult} from './race';
import './race.css';

type Teams=Record<string,Team>;
const pct=(p:number)=>p>=1?'100%':p>=.995?'>99%':p<=0?'0%':p<.005?'<1%':Math.round(p*100)+'%';
const RULES='https://www.kleague.com/about/competition.do';

function useLeague(){return useState<League>(1)}
function LeagueTabs({league,set}:{league:League;set:(l:League)=>void}){return <div className="tabs" aria-label="리그">{([1,2] as League[]).map(l=><button key={l} aria-pressed={league===l} className={l===league?'selected':''} onClick={()=>set(l)}>K리그 {l}</button>)}</div>}
function Loading({data,error,reload,children}:{data:SeasonMatches|null;error:string;reload:()=>void;children:(d:SeasonMatches)=>React.ReactNode}){
 if(error)return <div className="race-state"><p role="alert">{error}</p><button className="button" onClick={reload}><RefreshCw size={15}/>다시 불러오기</button></div>;
 if(!data)return <div className="race-state"><LoaderCircle className="spin"/>2026 경기 결과를 불러오는 중</div>;
 return <>{children(data)}</>;
}
const asOf=(d:SeasonMatches)=>new Date(d.fetchedAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
function TeamCell({team,id}:{team?:Team;id:string}){return <span className="race-team">{team&&<Tile team={team} small/>}<b>{team?.short||id}</b></span>}
function Bar({p,tone}:{p:number;tone:string}){return <span className={'race-bar '+tone}><i style={{width:Math.max(p*100,p>0?2:0)+'%'}}/><b>{pct(p)}</b></span>}
function RuleNote({league}:{league:League}){
 return <div className="race-rules">{league===1?<>
  <span><b>2026 K리그1</b> 33라운드 후 1~6위 그룹A(우승 경쟁), 7~12위 그룹B(생존 경쟁)로 나뉘어 5경기를 더 치러요.</span>
  <span><b>강등</b> 김천상무는 순위와 관계없이 자동 강등. 김천이 12위가 아니면 12위 팀이 K리그2 승격결정전 패배팀과 승강 플레이오프를 치러요.</span>
 </>:<>
  <span><b>2026 K리그2</b> 17팀이 34라운드(팀당 32경기)를 치러요.</span>
  <span><b>승격</b> 1·2위 자동 승격. 3~6위는 준플레이오프·플레이오프(승격결정전)를 치러요.</span>
 </>}<a href={RULES} target="_blank" rel="noreferrer">공식 대회요강 <ExternalLink size={11}/></a></div>;
}
function useSim(data:SeasonMatches,league:League,fixed:Record<string,Outcome>={}){
 const key=JSON.stringify(fixed);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 return useMemo(()=>simulate(data,league,fixed),[data,league,key]);
}

// ── 승강 매직넘버 ──
export function RaceCenter({teams}:{teams:Teams}){
 const {data,error,reload}=useMatches();const [league,setLeague]=useLeague();
 return <section className="race">
  <Heading eyebrow="2026 / PROMOTION & RELEGATION RACE" title="끝까지 가는 승강 레이스." description="실제 2026 경기 결과로 계산한 매직넘버와, 남은 경기를 수천 번 시뮬레이션한 확률을 함께 보세요."/>
  <LeagueTabs league={league} set={setLeague}/>
  <Loading data={data} error={error} reload={reload}>{d=><CenterBody data={d} league={league} teams={teams}/>}</Loading>
 </section>;
}
function CenterBody({data,league,teams}:{data:SeasonMatches;league:League;teams:Teams}){
 const rows=table(data,league),sim=useSim(data,league),left=remainingMatches(data,league);
 return <>
  <RuleNote league={league}/>
  <p className="race-meta">{asOf(data)} 기준 경기 결과 · 남은 경기 {left.length}개 · 시뮬레이션 {sim.runs.toLocaleString()}회</p>
  {league===1?<>
   <RaceTable title="그룹A · 우승 경쟁" rows={rows.filter(r=>r.group==='A')} all={rows} league={1} sim={sim} teams={teams} probKey="title" probLabel="우승 확률"/>
   <RaceTable title="그룹B · 생존 경쟁" rows={rows.filter(r=>r.group==='B')} all={rows} league={1} sim={sim} teams={teams} probKey="last" probLabel="12위 확률" startRank={7}/>
  </>:<RaceTable title="K리그2 · 승격 경쟁" rows={rows} all={rows} league={2} sim={sim} teams={teams} probKey="auto" probLabel="자동 승격" probKey2="po" probLabel2="PO 진출(3~6위)"/>}
  <details className="race-method"><summary>계산 방법</summary>
   <p><b>매직넘버</b>는 "다른 팀이 남은 경기를 모두 이겨도" 목표를 확정하는 데 필요한 추가 승점이에요. 승점이 같아지면 넘어서지 못한 것으로 보는 보수적인 계산이라, 실제로는 다득점·득실차 덕분에 더 일찍 확정될 수 있어요.</p>
   <p><b>확률</b>은 남은 경기마다 두 팀의 이번 시즌 홈·원정 득실점으로 기대득점을 구하고(포아송 모형), 점수를 무작위로 뽑아 시즌을 {sim.runs.toLocaleString()}번 끝까지 치러 본 결과예요. 승점·다득점·득실차·다승까지 같으면 무작위로 순위를 정했어요(승자승·벌점은 반영하지 않음). 부상·동기부여 같은 요소는 반영하지 않으니 참고용으로 봐 주세요.</p>
  </details>
 </>;
}
function RaceTable({title,rows,all,league,sim,teams,probKey,probLabel,probKey2,probLabel2,startRank=1}:{title:string;rows:Row[];all:Row[];league:League;sim:SimResult;teams:Teams;probKey:string;probLabel:string;probKey2?:string;probLabel2?:string;startRank?:number}){
 return <div className="race-block"><h2>{title}</h2><div className="table-scroll"><table className="race-table">
  <thead><tr><th>순위</th><th>팀</th><th className="num">승점</th><th className="num">경기</th><th className="num hide-sm">남은</th><th className="num hide-sm">최대 승점</th><th>매직넘버</th><th>{probLabel}</th>{probKey2&&<th>{probLabel2}</th>}</tr></thead>
  <tbody>{rows.map((r,i)=>{const rank=startRank+i,zone=league===2?(rank<=2?'zone-up':rank<=6?'zone-po':''):r.group==='B'&&rank===12?'zone-down':'';return <tr key={r.team} className={zone}>
   <td><span className="race-rank">{rank}</span></td>
   <td><TeamCell team={teams[r.team]} id={r.team}/>{r.team===GIMCHEON&&<small className="race-flag">자동 강등</small>}</td>
   <td className="num strong">{r.pts}</td><td className="num">{r.played}</td><td className="num hide-sm">{r.remaining}</td><td className="num hide-sm">{r.max}</td>
   <td><div className="race-magic">{magicFor(r,all,league).map(m=><span key={m.label} className={'magic '+m.tone} title={m.detail}>{m.label}</span>)}</div></td>
   <td><Bar p={sim.prob[r.team]?.[probKey]??0} tone={probKey==='last'?'down':'up'}/></td>
   {probKey2&&<td><Bar p={sim.prob[r.team]?.[probKey2]??0} tone="po"/></td>}
  </tr>})}</tbody>
 </table></div></div>;
}

// ── 빅매치 ──
export function RaceBigMatches({teams}:{teams:Teams}){
 const {data,error,reload}=useMatches();const [league,setLeague]=useLeague();
 return <section className="race">
  <Heading eyebrow="2026 / BIG MATCHES" title="이 경기에 시즌이 걸려 있다." description="남은 경기 중 결과에 따라 우승·강등·승격 확률이 가장 크게 흔들리는 경기부터 보여 드려요."/>
  <LeagueTabs league={league} set={setLeague}/>
  <Loading data={data} error={error} reload={reload}>{d=><BigBody data={d} league={league} teams={teams}/>}</Loading>
 </section>;
}
function BigBody({data,league,teams}:{data:SeasonMatches;league:League;teams:Teams}){
 const sim=useSim(data,league),list=bigMatches(data,league,sim);
 if(!list.length)return <Empty>K리그{league}에 남은 경기가 없어요.</Empty>;
 const name=(id:string)=>teams[id]?.short||id;
 return <>
  <p className="race-meta">{asOf(data)} 기준 · 남은 {list.length}경기 중 빅매치 지수 순 · 지수 = 결과에 따라 달라지는 확률 폭의 합</p>
  <div className="rbig-list">{list.map(({match:m,stakes,index},i)=>{const c=sim.cond[m.id],n=c.H.n+c.D.n+c.A.n,home=teams[m.home],away=teams[m.away];const hot=i<3&&index>=10;
   return <article key={m.id} className={'rbig-card'+(hot?' hot':'')} style={{'--home':home?.color||'#11263d','--away':away?.color||'#11263d'} as CSSProperties}>
    <div className="rbig-top"><span>{m.round}R · {kickoffLabel(m)}{m.phase?' · '+m.phase:''}</span><span className="rbig-index">{hot&&<Flame size={14}/>}빅매치 지수 {Math.round(index)}</span></div>
    <div className="rbig-teams"><div><TeamCell team={home} id={m.home}/><small>홈</small></div><span className="rbig-vs">VS</span><div><TeamCell team={away} id={m.away}/><small>원정</small></div></div>
    <div className="rbig-odds" aria-label="시뮬레이션 결과 비율"><span style={{flex:c.H.n}}>{name(m.home)} 승 {pct(c.H.n/n)}</span><span style={{flex:c.D.n}}>무 {pct(c.D.n/n)}</span><span style={{flex:c.A.n}}>{name(m.away)} 승 {pct(c.A.n/n)}</span></div>
    {stakes.filter(s=>s.swing>=.02).slice(0,3).map(s=><p key={s.team+s.key} className="rbig-stake"><b>{name(s.team)} {s.label} 확률</b><span>{name(m.home)} 승 {pct(s.ifHome)} · 무 {pct(s.ifDraw)} · {name(m.away)} 승 {pct(s.ifAway)}</span></p>)}
    {!stakes.some(s=>s.swing>=.02)&&<p className="rbig-stake quiet">순위 경쟁에 큰 영향이 없는 경기예요.</p>}
    <div className="rbig-foot"><span>{m.venue}</span><a href="#/final">결과 가정해 보기<ArrowRight size={13}/></a></div>
   </article>})}</div>
 </>;
}

// ── 파이널 시뮬레이터 ──
export function RaceSimulator({teams}:{teams:Teams}){
 const {data,error,reload}=useMatches();const [league,setLeague]=useLeague();
 return <section className="race">
  <Heading eyebrow="2026 / WHAT-IF SIMULATOR" title="남은 경기, 내가 정해 본다." description="남은 경기 결과를 골라 보세요. 고른 경기는 그 결과로 고정하고, 나머지는 시뮬레이션해서 순위 확률을 다시 계산해요."/>
  <LeagueTabs league={league} set={setLeague}/>
  <Loading data={data} error={error} reload={reload}>{d=><SimBody key={league} data={d} league={league} teams={teams}/>}</Loading>
 </section>;
}
function SimBody({data,league,teams}:{data:SeasonMatches;league:League;teams:Teams}){
 const [fixed,setFixed]=useState<Record<string,Outcome>>({});
 const base=useSim(data,league),sim=useSim(data,league,fixed),left=remainingMatches(data,league),rows=table(data,league,Object.fromEntries(Object.entries(fixed).map(([id,o])=>[id,(o==='H'?[1,0]:o==='D'?[1,1]:[0,1]) as [number,number]]))),keys=KEYS[league].filter(k=>k.sim);
 const rounds=[...new Set(left.map(m=>m.round))];
 const pick=(id:string,o:Outcome)=>setFixed(f=>{const n={...f};if(n[id]===o)delete n[id];else n[id]=o;return n});
 const name=(id:string)=>teams[id]?.short||id;
 const expected=(t:string)=>{const p=sim.pos[t];let best=1;for(let i=1;i<p.length;i++)if(p[i]>p[best])best=i;return best};
 const order=[...rows].sort((a,b)=>expected(a.team)-expected(b.team));
 return <div className="sim-layout">
  <div className="sim-fixtures">
   <div className="sim-head"><h2>남은 경기 {left.length}개</h2>{Object.keys(fixed).length>0&&<button className="text-button" onClick={()=>setFixed({})}><RotateCcw size={14}/>모두 초기화</button>}</div>
   {rounds.map(rd=><div key={rd} className="sim-round"><h3>{rd}R</h3>{left.filter(m=>m.round===rd).map(m=><div key={m.id} className="sim-match">
    <span className="sim-date">{kickoffLabel(m)}</span>
    <div className="sim-pick" role="group" aria-label={`${name(m.home)} 대 ${name(m.away)} 결과 가정`}>
     {(['H','D','A'] as Outcome[]).map(o=><button key={o} aria-pressed={fixed[m.id]===o} className={fixed[m.id]===o?'on':''} onClick={()=>pick(m.id,o)}>{o==='H'?<><TeamCell team={teams[m.home]} id={m.home}/>승</>:o==='D'?'무':<><TeamCell team={teams[m.away]} id={m.away}/>승</>}</button>)}
    </div>
   </div>)}</div>)}
  </div>
  <div className="sim-result">
   <h2>예상 최종 순위</h2>
   <p className="race-meta">{Object.keys(fixed).length}경기 결과 가정 · 나머지 {left.length-Object.keys(fixed).length}경기 {sim.runs.toLocaleString()}회 시뮬레이션</p>
   <div className="table-scroll"><table className="race-table compact">
    <thead><tr><th>예상</th><th>팀</th><th className="num">승점</th>{keys.map(k=><th key={k.id}>{k.label}</th>)}</tr></thead>
    <tbody>{order.map(r=><tr key={r.team}>
     <td><span className="race-rank">{expected(r.team)}</span></td><td><TeamCell team={teams[r.team]} id={r.team}/></td><td className="num strong">{r.pts}</td>
     {keys.map(k=>{const p=sim.prob[r.team]?.[k.id]??0,d=p-(base.prob[r.team]?.[k.id]??0);return <td key={k.id}><span className="sim-prob">{pct(p)}{Math.abs(d)>=.01&&<small className={(k.id==='last'?d<0:d>0)?'good':'bad'}>{d>0?'+':''}{Math.round(d*100)}%p</small>}</span></td>})}
    </tr>)}</tbody>
   </table></div>
   <p className="fine">"예상"은 시뮬레이션에서 가장 많이 나온 최종 순위예요. 승점은 지금까지의 실제 승점에 고른 결과(승 3점·무 1점)를 더한 값이에요. 변화량은 아무 결과도 고르지 않았을 때와 비교한 값이에요.</p>
  </div>
 </div>;
}
