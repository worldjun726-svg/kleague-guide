import {useEffect,useState,type CSSProperties} from 'react';
import {ArrowRight} from 'lucide-react';
import type {Dataset,League} from './types';
import {GuideHero,NextGuide} from './Guide';
import {go,Pill,SectionTitle,Tile,Reveal,OutcomePicker,OddsChange,Actual,Empty,resultText} from './components';

export default function BigMatches({data,teamId,roundParam}:{data:Dataset;teamId?:string;roundParam?:string}){
 const focused=data.teams.find(t=>t.id===teamId);
 const [league,setLeague]=useState<League>(focused?.league??1);
 const [round,setRound]=useState(31),[reveal,setReveal]=useState(false),[choices,setChoices]=useState<Record<string,number|null>>({});
 useEffect(()=>{if(focused)setLeague(focused.league);setReveal(false);setChoices({})},[teamId]);
 useEffect(()=>{const n=Number(roundParam);if(Number.isInteger(n)&&n>=1&&n<=39){setRound(n);setReveal(false);setChoices({})}},[roundParam]);
 const rounds=[...new Set(data.matches.filter(m=>m.league===league).map(m=>m.round))].sort((a,b)=>a-b);
 const activeRound=rounds.includes(round)?round:rounds[0];
 const forecast=league===1?data.forecasts[String(activeRound)]:undefined;
 const games=data.matches.filter(m=>m.league===league&&m.round===activeRound&&(!focused||m.home===focused.id||m.away===focused.id)).sort((a,b)=>(forecast?.games[b.id]?.index??-1)-(forecast?.games[a.id]?.index??-1)||a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const team=(id:string)=>data.teams.find(t=>t.id===id)!;
 const reset=()=>{setReveal(false);setChoices({})};
 const leading=games.find(m=>forecast?.games[m.id]);
 return <>
  <GuideHero step={2} title={'한 경기로\n달라지는 판도.'} teams={games[0]?[team(games[0].home),team(games[0].away)]:[]} description="결과에 따라 순위 경쟁이 달라지는 경기부터 골라보세요. 팀을 선택하면 그 팀의 경기만 볼 수 있어요.">
   <strong>{focused?`${focused.short}의 관전 포인트`:'순위 경쟁을 바꿀 한 경기'}</strong><p>{leading?`${team(leading.home).short} vs ${team(leading.away).short} · 이 목록에서 지수가 가장 높은 경기`:'리그와 라운드를 골라 경기와 계산 자료를 확인하세요.'}</p>
  </GuideHero>
  <div className="guide-controls panel"><div className="tabs" aria-label="빅매치 리그">{([1,2] as League[]).map(l=><button key={l} className={league===l?'selected':''} aria-pressed={league===l} onClick={()=>{setLeague(l);reset();go('big')}}>K리그 {l}</button>)}</div>
   <label>관전할 라운드<select aria-label="빅매치 라운드" value={activeRound??''} onChange={e=>{setRound(Number(e.target.value));reset()}}>{rounds.map(r=><option key={r} value={r}>{r}R</option>)}</select></label>
   <label>관심 팀<select aria-label="빅매치 관심 팀" value={focused?.id??''} onChange={e=>{reset();go(e.target.value?'big/'+e.target.value:'big')}}><option value="">전체 팀</option>{data.teams.filter(t=>t.league===league).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
   <Reveal value={reveal} onChange={setReveal}/>
  </div>
  <p className="fine">K리그 {league} · {activeRound}R 관전 · {activeRound-1}R 종료 기준 · {focused?'선택한 팀 경기 중 ':''}빅매치 지수 높은 순</p>
  {!forecast&&<div className="notice" role="status">이 리그·라운드의 빅매치 계산 데이터가 없습니다. 경기 일정은 볼 수 있으며, 지수나 중요도를 임의로 매기지 않습니다.</div>}
  {!games.length?<Empty>선택한 팀의 이 라운드 경기 자료가 없습니다.</Empty>:<>
   <div className="big-grid">{games.slice(0,3).map((m,i)=>{const g=forecast?.games[m.id],choice=choices[m.id]??null;return <article className={'panel big-card '+(i===0&&g?'featured-match':'')} key={m.id} style={{'--home-color':team(m.home).color,'--away-color':team(m.away).color} as CSSProperties}>
    <div className="rec-top"><Pill tone={g?'orange':'neutral'}>{g?(i===0?'먼저 볼 경기':`관전 후보 ${i+1}`):'라운드 경기'}</Pill><span className="big-index">{g?.index.toFixed(1)??'—'}<small>{g?'/100':'계산 자료 없음'}</small></span></div>
    <div className="versus"><div><Tile team={team(m.home)}/><strong>{team(m.home).short}</strong></div><span>VS</span><div><Tile team={team(m.away)}/><strong>{team(m.away).short}</strong></div></div>
    <div className="match-reason"><strong>{g?'왜 볼 만한가요?':'경기 일정'}</strong><p>{g?'승·무·패에 따라 두 팀의 파이널 A 또는 강등권 확률이 달라져요. 아래 결과를 눌러 변화의 크기를 비교해 보세요.':`${m.date} · 빅매치 지수가 준비되면 순위 경쟁에 미치는 영향을 함께 보여드려요.`}</p></div>
    {g&&forecast&&<><OutcomePicker value={choice} set={n=>setChoices(c=>({...c,[m.id]:n}))}/>{[m.home,m.away].map(id=>{const b=forecast.baseline[id],n=choice===null?b:g.outcomes[choice]?.[id];return b&&n?<div key={id} className="team-odds"><strong>{team(id).short}</strong><OddsChange label="파이널 A" base={b.finalA} next={n.finalA}/><OddsChange label="강등권" base={b.danger} next={n.danger} tone="orange"/></div>:null})}</>}
    {reveal&&<Actual><p>{resultText(data,m)}</p></Actual>}
    <div className="match-next"><span>이 경기가 잔류·승격에 갖는 의미는?</span>{[m.home,m.away].map(id=><button className="button" key={id} onClick={()=>go('center/'+id+'/'+(activeRound-1))}>{team(id).short} 승강 조건<ArrowRight size={14}/></button>)}</div>
    <button className="text-button full" onClick={()=>go('match/'+m.id)}>기록 더 보기 · 실제 스코어 포함<ArrowRight size={14}/></button>
   </article>})}</div>
   {games.length>3&&<details className="panel content-panel remaining supporting-details"><summary>같은 라운드의 나머지 {games.length-3}경기</summary>{games.slice(3).map(m=><div className="other-match" key={m.id}><strong>{team(m.home).short} vs {team(m.away).short}</strong><Pill tone="neutral">지수 {forecast?.games[m.id]?.index.toFixed(1)??'계산 자료 없음'}</Pill>{reveal&&<span>{m.score.join(' : ')}</span>}<button className="text-button" onClick={()=>go('big/'+m.home)}>관전 포인트<ArrowRight size={14}/></button></div>)}</details>}
  </>}
  {focused&&<NextGuide href={'#/center/'+focused.id+'/'+(activeRound-1)} label={`${focused.name}, 잔류·승격까지 얼마나 남았을까요?`} description="승강 센터에서 필요한 승점과 다음 라운드 조건을 확인하세요."/>}
  <details className="method"><summary>빅매치 지수의 계산 기준 보기</summary><p>{data.meta.notes}</p><p>지수가 클수록 결과별 확률 차이가 큽니다. 예측은 확정 결과가 아닙니다.</p></details>
 </>;
}
