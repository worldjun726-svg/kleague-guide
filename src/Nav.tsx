import {useEffect,useRef,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import './nav.css';

// 상단 메뉴: 9개 화면을 4개 묶음으로 보여 주고, 묶음을 누르면 세부 메뉴가 펼쳐진다.
export const NAV_GROUPS:{label:string;items:[id:string,label:string,desc:string][]}[]=[
 {label:'경기',items:[['live','라이브','진행 중인 경기 센터'],['schedule','일정·예매','경기 일정과 예매처']]},
 {label:'커뮤니티',items:[['lounge','직관 라운지','직관 꿀팁·질문 나누기'],['finder','나의 팀 찾기','취향으로 응원팀 추천']]},
 {label:'기록',items:[['matches','순위','시즌 순위와 팀 기록'],['team','팀','팀·선수 기록']]},
 {label:'전망',items:[['big','빅매치','놓치면 아쉬운 경기'],['final','파이널 시뮬레이터','파이널 라운드 경우의 수'],['center','승강 센터','잔류·승격 조건']]},
];
export const NAV:[string,string][]=NAV_GROUPS.flatMap(g=>g.items.map(([id,label])=>[id,label] as [string,string]));
const TEAM_PAGES=['big','center','team','schedule'];

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
  return <div className={'nav-group-wrap'+(isOpen?' open':'')} key={g.label}>
   <button type="button" className={'nav-group'+(current?' active':'')} aria-expanded={isOpen} aria-controls={menuId} onClick={()=>setOpen(isOpen?null:g.label)}>
    {g.label}{current&&<span className="nav-current">· {g.items.find(([id])=>id===active)![1]}</span>}<ChevronDown size={13}/>
   </button>
   <ul className="nav-menu" id={menuId} hidden={!isOpen}>{g.items.map(([id,label,desc])=><li key={id}>
    <a className={'nav-item'+(active===id?' active':'')} aria-current={active===id?'page':undefined} href={'#/'+id+(teamId&&TEAM_PAGES.includes(id)?'/'+teamId:'')} onClick={()=>setOpen(null)}>
     <strong>{label}</strong><small>{desc}</small>
    </a>
   </li>)}</ul>
  </div>;
 })}</nav>;
}
