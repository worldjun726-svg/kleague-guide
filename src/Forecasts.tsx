import {useState} from 'react';
import {ArrowRight,Flame,RefreshCw} from 'lucide-react';
import type {Dataset} from './types';
import {sortedBigMatches,standings} from './data';
import {go,Heading,Pill,SectionTitle,Tile,Reveal,OutcomePicker,OddsChange,Actual,Empty,resultText,goalText,OUTCOMES} from './components';
export function FinalSimulator({data}:{data:Dataset}){
 const [selected,setSelected]=useState(''),[outcome,setOutcome]=useState<number|null>(null),[reveal,setReveal]=useState(false);
 const f=data.forecasts['31'],games=sortedBigMatches(data,31),active=games.find(m=>m.id===selected)||games[0];
 const team=(id:string)=>data.teams.find(t=>t.id===id)!;
 if(!f||!active)return <Empty>시뮬레이션 자료가 없습니다.</Empty>;
 const odds=outcome===null?f.baseline:f.games[active.id]?.outcomes[outcome];
 return <><Heading eyebrow="FINAL A / B LAB" title="만약 그 경기에서 이겼다면?" description="30라운드 종료 시점으로 돌아가, 한 경기의 결과가 만드는 변화를 살펴보세요." aside={<Pill>30R 종료 기준</Pill>}/>
 <div className="panel simulator-controls"><div><label htmlFor="sim-game">가정할 빅매치 · 31R</label><select id="sim-game" value={active.id} onChange={e=>{setSelected(e.target.value);setOutcome(null);setReveal(false)}}>{games.map(m=><option key={m.id} value={m.id}>{team(m.home).short} vs {team(m.away).short}</option>)}</select></div><div><label>경기 결과 가정</label><OutcomePicker value={outcome} set={setOutcome}/></div><button className="button" onClick={()=>{setSelected('');setOutcome(null);setReveal(false)}}><RefreshCw size={15}/>초기화</button><Reveal value={reveal} onChange={setReveal}/></div><div className="notice">{outcome===null?'아직 결과를 가정하지 않았어요. 기본 전망을 보고 있습니다.':team(active.home).short+' vs '+team(active.away).short+' · '+OUTCOMES[outcome]+' 가정 중입니다.'} 다른 경기는 모의실험으로 계산합니다.</div>
 <div className="panel content-panel"><SectionTitle aside={<span className="fine">파랑: 파이널 A · 주황: 강등권</span>}>12팀의 운명은 어떻게 달라질까요?</SectionTitle><div className="simulation-table">{standings(data,1,30).map(r=>{const b=f.baseline[r.team.id],n=odds?.[r.team.id];return <div className="simulation-row" key={r.team.id}><button className="team-link" onClick={()=>go('team/'+r.team.id)}><Tile team={r.team} small/>{r.team.short}</button>{b&&n?<><div><OddsChange label="파이널 A" base={b.finalA} next={n.finalA}/><div className="meter"><span style={{width:n.finalA+'%'}}/></div></div><div><OddsChange label="강등권" base={b.danger} next={n.danger} tone="orange"/><div className="meter orange-meter"><span style={{width:n.danger+'%'}}/></div></div></>:<span>자료 없음</span>}{reveal&&<span className="actual-inline">{goalText(data,r.team.id)}</span>}</div>})}</div></div>{reveal&&<Actual><p>가정한 경기의 예시 결과: {resultText(data,active)}. 과거 예측값은 그대로 유지됩니다.</p></Actual>}</>;
}
