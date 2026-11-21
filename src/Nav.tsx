import {useEffect,useRef,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import './nav.css';

// 상단 메뉴: 라이브·순위·일정예매·승강 레이스·커뮤니티 5개 탭. 세부 화면이 여럿인 탭은 누르면 펼쳐진다.
export const NAV_GROUPS:{label:string;items:[id:string,label:string,desc:string][]}[]=[
 {label:'라이브',items:[['live','라이브','K리그1·2 실시간 경기 센터']]},
 {label:'순위',items:[['matches','팀 순위','K리그1·2 시즌 순위'],['players','선수 기록','득점·도움·출전 순위']]},
 {label:'일정·예매',items:[['schedule','일정·예매','경기 일정과 예매처']]},
 {label:'승강 레이스',items:[['center','승강 매직넘버','잔류·승격까지 남은 승점'],['big','빅매치','순위가 걸린 경기'],['final','파이널 시뮬레이터','파이널 라운드 경우의 수']]},
 {label:'커뮤니티',items:[['lounge','직관 라운지','직관 꿀팁·질문 나누기'],['finder','나의 팀 찾기','취향으로 응원팀 추천']]},
];
export const NAV:[string,string][]=NAV_GROUPS.flatMap(g=>g.items.map(([id,label])=>[id,label] as [string,string]));
const TEAM_PAGES=['big','center','schedule'];
const href=(id:string,teamId?:string)=>'#/'+id+(teamId&&TEAM_PAGES.includes(id)?'/'+teamId:'');

export function MainNav({active,teamId}:{active:string;teamId?:string}){
 const [open,setOpen]=useState<string|null>(null);
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{
  const close=()=>setOpen(null);
  const outside=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))close()};
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close()};
  window.addEventListener('hashchange',close);document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);
  return()=>{window.removeEventListener('hashchange',close);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key)};
 },[]);
 return <nav aria-label="주 메뉴" ref={ref}>{NAV_GROUPS.map(g=>{
  const current=g.items.some(([id])=>id===active),isOpen=open===g.label,menuId='nav-'+g.label;
  if(g.items.length===1){const [id]=g.items[0];return <div className="nav-group-wrap" key={g.label}><a className={'nav-group'+(current?' active':'')} href={href(id,teamId)} aria-current={current?'page':undefined}>{g.label}</a></div>}
  return <div className={'nav-group-wrap'+(isOpen?' open':'')} key={g.label}>
   <button type="button" className={'nav-group'+(current?' active':'')} aria-expanded={isOpen} aria-controls={menuId} onClick={()=>setOpen(isOpen?null:g.label)}>
    {g.label}{current&&<span className="nav-current">· {g.items.find(([id])=>id===active)![1]}</span>}<ChevronDown size={13}/>
   </button>
   <ul className="nav-menu" id={menuId} hidden={!isOpen}>{g.items.map(([id,label,desc])=><li key={id}>
    <a className={'nav-item'+(active===id?' active':'')} aria-current={active===id?'page':undefined} href={href(id,teamId)} onClick={()=>setOpen(null)}>
     <strong>{label}</strong><small>{desc}</small>
    </a>
   </li>)}</ul>
  </div>;
 })}</nav>;
}
