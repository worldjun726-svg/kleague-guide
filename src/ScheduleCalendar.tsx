import {useEffect,useRef,useState,type RefObject} from 'react';
import {ChevronLeft,ChevronRight,X} from 'lucide-react';
import type {Team} from './types';
import {Tile} from './components';
import type {SeasonMatches,SeasonMatch} from './matchData';
import './scheduleCalendar.css';

// 일정·예매 탭의 월별 달력(날짜 선택 팝업 안에서 쓴다). 날짜에 마우스를 올리면(또는 키보드로 초점을 주면)
// 그날 경기 목록이 뜨고, 누르면 그 날짜를 고른다. K리그1은 어두운 점, K리그2는 노란 점.
const DOW=['일','월','화','수','목','금','토'];
const pad=(n:number)=>String(n).padStart(2,'0');
const todayKST=()=>new Date(Date.now()+9*3600_000).toISOString().slice(0,10);

export default function ScheduleCalendar({data,teams,selected,onSelect,focusTeam,startDate}:{data:SeasonMatches;teams:Record<string,Team>;selected:string|null;onSelect:(d:string)=>void;focusTeam?:string;startDate?:string}){
 const byDate=new Map<string,SeasonMatch[]>();
 for(const m of data.matches){if(focusTeam&&m.home!==focusTeam&&m.away!==focusTeam)continue;const l=byDate.get(m.date)??[];l.push(m);byDate.set(m.date,l)}
 const months=[...new Set(data.matches.map(m=>m.date.slice(0,7)))].sort();
 const init=(selected??startDate??todayKST()).slice(0,7);
 const [month,setMonth]=useState(months.includes(init)?init:months.find(m=>m>=init)??months.at(-1)!);
 const idx=months.indexOf(month),[y,mo]=month.split('-').map(Number);
 const first=new Date(Date.UTC(y,mo-1,1)).getUTCDay(),days=new Date(Date.UTC(y,mo,0)).getUTCDate();
 const cells:(string|null)[]=[...Array(first).fill(null),...Array.from({length:days},(_,i)=>`${month}-${pad(i+1)}`)];
 while(cells.length%7)cells.push(null);
 const today=todayKST(),name=(id:string)=>teams[id]?.short||id;
 const total=[...byDate.entries()].filter(([d])=>d.startsWith(month)).reduce((s,[,l])=>s+l.length,0);
 return <section className="sched-cal" aria-label="경기 달력">
  <div className="sc-head">
   <button className="icon-button" disabled={idx<=0} onClick={()=>setMonth(months[idx-1])} aria-label="이전 달"><ChevronLeft size={18}/></button>
   <div><strong>{y}년 {mo}월</strong><small>{focusTeam?`${name(focusTeam)} 경기 ${total}개`:`경기 ${total}개`}</small></div>
   <button className="icon-button" disabled={idx>=months.length-1} onClick={()=>setMonth(months[idx+1])} aria-label="다음 달"><ChevronRight size={18}/></button>
   <span className="sc-legend"><i className="k1"/>K리그1<i className="k2"/>K리그2</span>
  </div>
  <div className="sc-grid" role="grid">
   {DOW.map((d,i)=><div key={d} className={'sc-dow'+(i===0?' sun':i===6?' sat':'')} role="columnheader">{d}</div>)}
   {cells.map((d,i)=>{if(!d)return <div key={'e'+i} className="sc-cell empty"/>;
    const list=(byDate.get(d)??[]).sort((a,b)=>a.time.localeCompare(b.time)||a.league-b.league),col=i%7;
    const k1=list.filter(m=>m.league===1).length,k2=list.length-k1;
    const cls='sc-cell'+(list.length?' has':'')+(d===selected?' selected':'')+(d===today?' today':'')+(col===0?' sun':col===6?' sat':'')+(col>=4?' right':'');
    const day=Number(d.slice(8));
    if(!list.length)return <button key={d} className={cls} onClick={()=>onSelect(d)} aria-label={`${mo}월 ${day}일 경기 없음`} aria-pressed={d===selected}><span className="sc-day">{day}</span></button>;
    return <button key={d} className={cls} onClick={()=>onSelect(d)} aria-label={`${mo}월 ${day}일 경기 ${list.length}개`} aria-pressed={d===selected}>
     <span className="sc-day">{day}</span>
     <span className="sc-dots">{k1>0&&<i className="k1">{k1}</i>}{k2>0&&<i className="k2">{k2}</i>}</span>
     <span className="sc-pop" role="tooltip">
      <b>{mo}월 {day}일 경기 {list.length}개</b>
      {list.map(m=><span key={m.id} className="sc-row"><em className={'k'+m.league}>K{m.league}</em><small>{m.time}</small>{teams[m.home]&&<Tile team={teams[m.home]} small/>}<span>{name(m.home)}</span><strong>{m.status==='FT'&&m.score?`${m.score[0]} : ${m.score[1]}`:'vs'}</strong><span>{name(m.away)}</span>{teams[m.away]&&<Tile team={teams[m.away]} small/>}</span>)}
     </span>
    </button>;
   })}
  </div>
 </section>;
}

// 한국 날짜 표시: 2026-11-21 → 11월 21일 (토)
export const fmtDate=(d:string)=>{const [y,m,dd]=d.split('-').map(Number);return `${m}월 ${dd}일 (${DOW[new Date(Date.UTC(y,m-1,dd)).getUTCDay()]})`};

// 날짜 선택 팝업. 화면 가운데 모달로 열리고, 날짜를 누르면 고른 값을 넘기고 닫힌다.
// 바깥 영역·닫기 버튼·Esc 는 날짜를 바꾸지 않고 닫는다. 열린 동안 배경 스크롤을 막고, 닫히면 여는 버튼으로 초점을 돌린다.
export function DatePopup({open,onClose,selected,onPick,data,teams,focusTeam,opener}:{open:boolean;onClose:()=>void;selected:string;onPick:(d:string)=>void;data:SeasonMatches;teams:Record<string,Team>;focusTeam?:string;opener:RefObject<HTMLButtonElement|null>}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const dlg=ref.current;if(!dlg)return;
  if(!open){if(dlg.open)dlg.close();return}
  if(!dlg.open)dlg.showModal();
  const html=document.documentElement,prevHtml=html.style.overflow,prevBody=document.body.style.overflow;
  html.style.overflow='hidden';document.body.style.overflow='hidden';
  // 고른 날짜(없으면 첫 날짜 버튼)에 초점
  requestAnimationFrame(()=>(dlg.querySelector<HTMLElement>('.sc-cell.selected')??dlg.querySelector<HTMLElement>('.sc-cell:not(.empty)'))?.focus());
  return()=>{html.style.overflow=prevHtml;document.body.style.overflow=prevBody};
 },[open]);
 const closed=()=>{onClose();requestAnimationFrame(()=>opener.current?.focus())};
 // 팝업 안쪽은 .dp-inner 가 채우므로, dialog 자체를 누른 것은 바깥(배경)을 누른 것이다.
 return <dialog ref={ref} className="date-popup" aria-labelledby="dp-title" onClose={closed} onClick={e=>{if(e.target===ref.current)ref.current?.close()}}>
  {open&&<div className="dp-inner">
   <div className="dp-head"><h2 id="dp-title">날짜 선택</h2><button className="icon-button dp-close" onClick={()=>ref.current?.close()} aria-label="닫기"><X size={18}/></button></div>
   <ScheduleCalendar data={data} teams={teams} selected={selected} focusTeam={focusTeam} onSelect={d=>{onPick(d);ref.current?.close()}}/>
   <p className="dp-hint">날짜를 누르면 그날 경기로 바뀌어요. Esc 키나 바깥을 누르면 그대로 닫혀요.</p>
  </div>}
 </dialog>;
}
