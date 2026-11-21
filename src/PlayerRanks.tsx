import {useEffect,useState,type CSSProperties} from 'react';
import {ExternalLink,LoaderCircle,Trophy,Search} from 'lucide-react';
import type {League,Team} from './types';
import {Heading,Tile,Empty} from './components';
import {withBase} from './base';
import './playerRanks.css';

// 순위 탭 · 선수 기록 순위. scripts/fetch-player-ranks.mjs 가 공식 기록실에서 받은 리그별 상위 30명을 보여 준다.
interface RankRow {rank:number;playerId:string;name:string;teamId:string;backNo:number|null;games:number;subs:number;goals:number;assists:number;attackPoints:number;shots:number;cleanSheets:number;conceded:number;yellow:number;red:number;perGame:number}
interface RankData {season:number;retrievedAt:string;source:string;leagues:Record<string,Record<string,RankRow[]>>}

const TYPES:{id:string;label:string;short:string;key:keyof RankRow;unit:string;perGame?:string}[]=[
 {id:'GOAL',label:'득점',short:'득점왕',key:'goals',unit:'골',perGame:'경기당 득점'},
 {id:'ASSIST',label:'도움',short:'도움왕',key:'assists',unit:'도움',perGame:'경기당 도움'},
 {id:'AP',label:'공격 포인트',short:'공격 포인트',key:'attackPoints',unit:'P',perGame:'경기당 포인트'},
 {id:'GAMECNT',label:'출전',short:'최다 출전',key:'games',unit:'경기'},
 {id:'ST',label:'슈팅',short:'최다 슈팅',key:'shots',unit:'개',perGame:'경기당 슈팅'},
 {id:'CLEAN',label:'무실점',short:'무실점(GK)',key:'cleanSheets',unit:'경기'},
 {id:'WARN',label:'경고',short:'최다 경고',key:'yellow',unit:'장'},
];
const officialPlayer=(id:string)=>'https://www.kleague.com/record/playerDetail.do?playerId='+id;

export default function PlayerRanks({teams}:{teams:Record<string,Team>}){
 const [data,setData]=useState<RankData|null>(null),[error,setError]=useState('');
 const [league,setLeague]=useState<League>(1),[type,setType]=useState('GOAL'),[query,setQuery]=useState('');
 useEffect(()=>{const c=new AbortController();fetch(withBase('/data/player-ranks.json'),{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(setData).catch(e=>{if(e.name!=='AbortError')setError('선수 순위를 불러오지 못했습니다.')});return()=>c.abort()},[]);
 if(error)return <Empty>{error}</Empty>;
 if(!data)return <div className="ranks-loading"><LoaderCircle className="spin"/>선수 순위를 불러오는 중</div>;
 const board=data.leagues[league]||{},meta=TYPES.find(t=>t.id===type)!;
 const side=([['goals','득점'],['assists','도움'],['shots','슈팅']] as [keyof RankRow,string][]).filter(([k])=>k!==meta.key);
 const rows=(board[type]||[]).filter(r=>!query.trim()||r.name.includes(query.trim())||teams[r.teamId]?.name.includes(query.trim()));
 const updated=new Date(data.retrievedAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
 return <section className="player-ranks">
  <Heading eyebrow={`${data.season} / PLAYER RANKINGS`} title="누가 시즌을 이끌고 있나." description="K리그1·2 리그별 선수 기록 순위. 득점왕 레이스부터 철벽 골키퍼까지 한눈에 비교하세요."/>
  <div className="ranks-toolbar">
   <div className="tabs" aria-label="리그">{([1,2] as League[]).map(l=><button key={l} aria-pressed={league===l} className={l===league?'selected':''} onClick={()=>{setLeague(l);setQuery('')}}>K리그 {l}</button>)}</div>
   <label className="record-search"><Search size={17}/><input aria-label="선수·구단 검색" placeholder="선수 또는 구단 이름" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  </div>
  <div className="rank-leaders" role="list" aria-label={`K리그${league} 부문별 1위`}>{TYPES.map(t=>{const top=board[t.id]?.[0];const team=top&&teams[top.teamId];return <button role="listitem" key={t.id} className={'rank-leader'+(t.id===type?' selected':'')} aria-pressed={t.id===type} onClick={()=>setType(t.id)} style={{'--club-color':team?.color||'#11263d'} as CSSProperties}>
   <span className="rank-leader-label">{t.short}</span>
   {top?<><strong>{top.name}</strong><small>{team?.short||top.teamId}</small><b>{String(top[t.key])}<i>{t.unit}</i></b></>:<small>기록 없음</small>}
  </button>})}</div>
  <div className="rank-table-head"><h2><Trophy size={18}/>K리그{league} {meta.label} 순위</h2><span>상위 {board[type]?.length||0}명</span></div>
  {rows.length?<div className="table-scroll"><table className="rank-table">
   <thead><tr><th>순위</th><th>선수</th><th className="num main">{meta.label}</th>{meta.key!=='games'&&<th className="num">출전</th>}{meta.perGame&&<th className="num">{meta.perGame}</th>}{side.map(([k,l])=><th key={k} className="num hide-sm">{l}</th>)}</tr></thead>
   <tbody>{rows.map(r=>{const team=teams[r.teamId];return <tr key={r.playerId} className={r.rank<=3?'podium':''}>
    <td><span className={'rank-no r'+Math.min(r.rank,4)}>{r.rank}</span></td>
    <td><div className="rank-player">{team&&<Tile team={team} small/>}<div><a href={officialPlayer(r.playerId)} target="_blank" rel="noreferrer">{r.name}<ExternalLink size={11}/></a><small>{team?.short||r.teamId}{r.backNo!==null&&` · ${r.backNo}번`}</small></div></div></td>
    <td className="num main">{String(r[meta.key])}</td>{meta.key!=='games'&&<td className="num">{r.games}</td>}{meta.perGame&&<td className="num">{r.games?(Number(r[meta.key])/r.games).toFixed(2):'—'}</td>}
    {side.map(([k])=><td key={k} className="num hide-sm">{String(r[k])}</td>)}
   </tr>})}</tbody>
  </table></div>:<Empty>검색 결과가 없습니다. 순위표는 부문별 상위 30명만 담고 있어요.</Empty>}
  <p className="record-source">{updated} 업데이트 · 출처 <a href={data.source} target="_blank" rel="noreferrer">K리그 공식 기록실 <ExternalLink size={12}/></a> · 부문별 상위 30명 · 동률은 공식 기록실 순서 · 출전은 경기 수입니다. <a href="#/players/search">수집된 선수 상세 기록 검색 →</a></p>
 </section>;
}
