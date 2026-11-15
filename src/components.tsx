import {useState,type ReactNode,type CSSProperties} from 'react';
import {teamLogo} from './logos';
import {ArrowRight,Eye,EyeOff,Info,ChevronRight,Flame,TrendingUp} from 'lucide-react';
import type {Team,Dataset,Match,League} from './types';
import {standings} from './data';
export const go=(path:string)=>{location.hash='/'+path};
export const OUTCOMES=['홈 승','무승부','원정 승'];
export function Tile({team,small=false}:{team:Team;small?:boolean}){
 const src=teamLogo(team.id);
 const [failed,setFailed]=useState<string>();
 const showLogo=Boolean(src&&failed!==src);
 return <span className={'team-tile '+(small?'small ':'')+(showLogo?'with-logo':'')} style={{'--team-color':team.color} as CSSProperties}>
  {showLogo?<img key={src} src={src} alt={`${team.name} 로고`} decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(src)}/>:<span aria-label={team.name}>{team.short.slice(0,2)}</span>}
 </span>;
}
export function Pill({children,tone='blue'}:{children:ReactNode;tone?:string}){return <span className={'pill '+tone}>{children}</span>}
export function Empty({children}:{children:ReactNode}){return <div className="empty"><Info size={22}/><p>{children}</p></div>}
export function Reveal({value,onChange}:{value:boolean;onChange:(v:boolean)=>void}){return <button className={'button reveal '+(value?'active':'')} role="switch" aria-checked={value} onClick={()=>onChange(!value)}>{value?<EyeOff size={16}/>:<Eye size={16}/>}실제 결과 보기<span className="switch-track"><span/></span></button>}
export function Heading({eyebrow,title,description,aside}:{eyebrow:string;title:string;description:string;aside?:ReactNode}){return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{aside}</div>}
export function SectionTitle({children,aside}:{children:ReactNode;aside?:ReactNode}){return <div className="section-title"><h2>{children}</h2>{aside}</div>}
export function Form({values}:{values:string[]}){return <span className="form">{values.map((v,i)=><span key={i} className={v==='승'?'win':v==='패'?'loss':'draw'}>{v}</span>)}</span>}
export function Chart({series,reverse=false,end='시즌 종료'}:{series:{name:string;values:number[];color:string}[];reverse?:boolean;end?:string}){
 const max=reverse?Math.max(12,...series.flatMap(s=>s.values)):Math.max(10,...series.flatMap(s=>s.values));
 return <div className="chart"><div className="chart-legend">{series.map(s=><span key={s.name}><i style={{background:s.color}}/>{s.name}</span>)}</div><svg viewBox="0 0 680 190" role="img" aria-label={reverse?'라운드별 순위 흐름':'라운드별 누적 승점'}>{[0,.25,.5,.75,1].map(v=><g key={v}><line x1="35" y1={15+v*150} x2="665" y2={15+v*150} stroke="#e2e8ef" strokeDasharray="3 4"/><text x="2" y={19+v*150} fontSize="11" fill="#68788d">{reverse?Math.round(1+(max-1)*v):Math.round(max*(1-v))}</text></g>)}{series.map(s=><polyline key={s.name} points={s.values.map((v,i)=>[35+i/Math.max(1,s.values.length-1)*630,15+(reverse?(v-1)/(max-1):1-v/max)*150].join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth="2.7" strokeLinejoin="round"/>)}<text x="35" y="188" fontSize="11" fill="#68788d">{reverse?'1R':'시즌 시작'}</text><text x="665" y="188" textAnchor="end" fontSize="11" fill="#68788d">{end}</text></svg><details><summary>그래프 수치 보기</summary><div className="table-scroll"><table><thead><tr><th>시점</th>{series.map(s=><th key={s.name}>{s.name}</th>)}</tr></thead><tbody>{series[0]?.values.map((_,i)=><tr key={i}><td>{reverse?i+1:i}R</td>{series.map(s=><td key={s.name}>{s.values[i]??'—'}</td>)}</tr>)}</tbody></table></div></details></div>;
}
export function Standings({data,league,round}:{data:Dataset;league:League;round:number}){
 const rows=standings(data,league,round);
 return <div className="table-scroll"><table className="standings"><caption>{round}R 종료 · 승점 → 다득점 → 득실차</caption><thead><tr><th>순위</th><th>팀</th><th>승점</th><th>득점</th><th>득실</th><th>최근 5</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.team.id} className={league===1&&i===5?'cutline':''}><td><span className={'rank '+(i<3?'top':'')}>{r.rank}{r.tied?'*':''}</span></td><td><button className="team-link" onClick={()=>go('team/'+r.team.id)}><Tile team={r.team} small/>{r.team.short}</button></td><td className="points">{r.points}</td><td>{r.gf}</td><td>{r.gd>0?'+':''}{r.gd}</td><td><Form values={r.form}/></td></tr>)}</tbody></table><p className="fine">{league===1?'점선: 상·하위 6팀 경계':'1위 승격 · 2~5위 승격 경쟁'}{rows.some(r=>r.tied)&&' · * 완전 동률: 추가 기준 확인 필요'}</p></div>;
}
export function MatchCard({data,m}:{data:Dataset;m:Match}){
 const h=data.teams.find(t=>t.id===m.home)!,a=data.teams.find(t=>t.id===m.away)!;const o=m.score[0]>m.score[1]?0:m.score[0]===m.score[1]?1:2;const upset=m.probabilities&&m.probabilities[o]<25;
 return <button className="match-card" onClick={()=>go('match/'+m.id)}><div className="card-meta"><span>{m.date.slice(5).replace('-','.')} · {m.round}R</span><span>경기 종료</span></div><div className="scoreline"><div><Tile team={h}/><strong>{h.short}</strong><small>HOME</small></div><b>{m.score[0]} <span>:</span> {m.score[1]}</b><div><Tile team={a}/><strong>{a.short}</strong><small>AWAY</small></div></div><div className="prob-strip">{m.probabilities?.map((p,i)=><span key={i} style={{width:p+'%'}} className={'prob-'+i}/>)}</div><div className="prob-labels">{m.probabilities?m.probabilities.map((p,i)=><span key={i}>{OUTCOMES[i]} {Math.round(p)}%</span>):'경기 전 확률 자료 없음'}</div><div className="match-note">{upset?<><Flame size={14}/>낮은 확률을 뒤집은 이변</>:<><TrendingUp size={14}/>{o===1?'승점 1점씩 나눠 가진 경기':(o===0?h.short:a.short)+', 승점 3점의 기쁨'}</>}<ChevronRight size={14}/></div></button>;
}
export function OutcomePicker({value,set}:{value:number|null;set:(n:number|null)=>void}){return <div className="outcome-picker" aria-label="경기 결과 가정">{OUTCOMES.map((s,i)=><button key={s} className={value===i?'selected':''} aria-pressed={value===i} onClick={()=>set(value===i?null:i)}>{s}</button>)}</div>}
export function OddsChange({label,base,next,tone='blue'}:{label:string;base:number;next:number;tone?:string}){return <div className="odds-change"><span>{label}</span><div><span className="baseline">{base.toFixed(1)}%</span><ArrowRight size={12}/><b className={tone}>{next.toFixed(1)}%</b><small>{next>base?'+':''}{(next-base).toFixed(1)}%p</small></div></div>}
export function Actual({children}:{children:ReactNode}){return <div className="actual"><strong>실제 결과 비교 · 현재는 합성 예시 결과</strong>{children}</div>}
export function resultText(data:Dataset,m:Match){return `${data.teams.find(t=>t.id===m.home)!.short} ${m.score[0]} : ${m.score[1]} ${data.teams.find(t=>t.id===m.away)!.short}`}
export function goalText(data:Dataset,id:string){const a=standings(data,1,33).find(r=>r.team.id===id)!,r=standings(data,1,38).find(r=>r.team.id===id)!;return `${a.rank<=6?'파이널 A':'파이널 B'} · 최종 ${r.rank}위`}
