import {useEffect,useState,type CSSProperties} from 'react';
import {Ticket,Armchair,Backpack,Megaphone,HeartHandshake,ArrowRight,MessageCircleQuestion,Sparkles,CalendarDays,Check} from 'lucide-react';
import type {Team} from './types';
import {go,Tile} from './components';
import {CommentBox,useAccount} from './Account';
import {sampleTips,TIP_TOPICS} from './firstVisitSample';
import './firstVisit.css';

// 첫 직관 가이드: 어느 구장에나 통하는 기본 안내 + 팀별 선배 팬 꿀팁 게시판.
// 꿀팁 게시판은 응원 글과 같은 comments 표를 target 'tip:팀ID'로 쓴다.
const STEPS=[
 {icon:Ticket,title:'경기 고르기 · 예매',body:'일정·예매 메뉴에서 가까운 홈경기를 고르고 구단 예매처로 이동해요. 첫 직관은 순위 경쟁이나 라이벌전처럼 분위기가 뜨거운 경기가 좋아요.',link:['schedule','일정·예매 보기']},
 {icon:Armchair,title:'좌석 고르기',body:'응원석(서포터즈석)은 90분 내내 서서 노래해요. 경기를 차분히 보고 싶다면 일반석이나 가족석, 분위기를 느끼고 싶다면 응원석 근처를 골라 보세요. 상대 팀 팬 구역(원정석)은 따로 있어요.'},
 {icon:Backpack,title:'준비물',body:'유니폼이 없어도 괜찮아요. 팀 색 옷이면 충분해요. 늦가을·겨울 경기는 생각보다 추우니 담요와 핫팩을, 비 예보가 있으면 우산 대신 우비를 챙겨요.'},
 {icon:Megaphone,title:'응원 즐기기',body:'킥오프 1시간 전쯤 도착하면 선수 워밍업과 응원 준비까지 볼 수 있어요. 응원가는 몰라도 박수와 함성만으로 충분해요. 두세 번 가면 자연스럽게 따라 부르게 돼요.'},
 {icon:HeartHandshake,title:'직관 매너',body:'원정 팬 구역에는 그 팀 응원 도구를 들고 가지 않아요. 상대 선수가 다쳤을 때는 박수로 격려해요. 내 자리 쓰레기는 내가 챙겨요.'},
];
const CHECK_KEY='kleague-first-visit-check-v1';
const CHECKLIST=['경기 고르고 예매하기','좌석 구역 정하기','팀 색 옷·담요 챙기기','킥오프 1시간 전 도착','경기 후 응원 글 남기기'];
function readChecks():boolean[]{try{const v=JSON.parse(localStorage.getItem(CHECK_KEY)||'[]');return CHECKLIST.map((_,i)=>v[i]===true)}catch{return CHECKLIST.map(()=>false)}}

export default function FirstVisit({teams,teamId}:{teams:Team[];teamId?:string}){
 const {user,ready}=useAccount();
 if(!ready)return null;
 if(!user)return <LoungeGate/>;
 return <Lounge teams={teams} teamId={teamId}/>;
}

// 비로그인: 라운지에서 할 수 있는 일을 소개하고 로그인으로 안내한다.
function LoungeGate(){
 const {openLogin}=useAccount();
 return <div className="first-visit"><section className="first-hero lounge-gate">
  <p className="eyebrow">K LEAGUE MATCHDAY LOUNGE · 직관 라운지</p>
  <h1>로그인 후<br/>이용할 수 있어요.</h1>
  <p>직관 라운지는 K리그 팬들이 직관 꿀팁을 나누고, 처음 오는 팬의 질문에 답해 주는 커뮤니티예요. 이메일만 있으면 비밀번호 없이 바로 들어올 수 있어요.</p>
  <ul className="lounge-gate-list"><li><MessageCircleQuestion size={18}/>팀별 선배 팬 꿀팁 보기 · 질문하기</li><li><Ticket size={18}/>첫 직관 다섯 단계 가이드</li><li><Check size={18}/>나만의 직관 체크리스트</li></ul>
  <div className="first-hero-actions"><button className="button primary" onClick={()=>openLogin('직관 라운지는 로그인 후 이용할 수 있어요.')}>로그인하고 라운지 들어가기<ArrowRight size={16}/></button><a className="button" href="#/finder"><Sparkles size={16}/>먼저 나의 팀 찾기</a></div>
 </section></div>;
}

function Lounge({teams,teamId}:{teams:Team[];teamId?:string}){
 const team=teams.find(t=>t.id===teamId);
 const [checks,setChecks]=useState(readChecks);
 useEffect(()=>{try{localStorage.setItem(CHECK_KEY,JSON.stringify(checks))}catch{}},[checks]);
 const done=checks.filter(Boolean).length;
 return <div className="first-visit">
  <section className="first-hero">
   <p className="eyebrow">K LEAGUE MATCHDAY LOUNGE · 직관 라운지</p>
   <h1>K리그, 처음이어도<br/>괜찮아요.</h1>
   <p>경기 고르기부터 좌석, 준비물, 응원 매너까지. 그리고 먼저 다녀온 팬들이 남긴 진짜 꿀팁까지 한곳에서 확인하세요.</p>
   <div className="first-hero-actions"><a className="button primary" href="#/finder"><Sparkles size={16}/>아직 팀이 없다면, 나의 팀 찾기</a><a className="button" href="#first-tips"><MessageCircleQuestion size={16}/>선배 팬 꿀팁 보기</a></div>
  </section>

  <section aria-labelledby="first-steps-title">
   <h2 id="first-steps-title" className="first-section-title">첫 직관, 다섯 단계면 충분해요</h2>
   <ol className="first-steps">{STEPS.map(({icon:Icon,title,body,link},i)=><li key={title}>
    <span className="first-step-no">{String(i+1).padStart(2,'0')}</span><Icon size={24}/>
    <h3>{title}</h3><p>{body}</p>
    {link&&<a href={'#/'+link[0]+(team?'/'+team.id:'')}>{link[1]}<ArrowRight size={14}/></a>}
   </li>)}</ol>
   <p className="fine">구장마다 좌석 이름과 반입 규정이 달라요. 예매 전에 구단 공지를 한 번 확인해 주세요.</p>
  </section>

  <section className="first-checklist panel" aria-labelledby="first-check-title">
   <div><h2 id="first-check-title">나의 첫 직관 체크리스트</h2><p>{done===CHECKLIST.length?'준비 완료! 즐거운 직관 되세요.':`${done} / ${CHECKLIST.length} 준비했어요`}</p></div>
   <ul>{CHECKLIST.map((item,i)=><li key={item}><label><input type="checkbox" checked={checks[i]} onChange={e=>setChecks(c=>c.map((v,j)=>j===i?e.target.checked:v))}/><span className="first-check-box"><Check size={14}/></span>{item}</label></li>)}</ul>
   <small>체크 상태는 이 브라우저에만 저장돼요.</small>
  </section>

  <section id="first-tips" className="first-tips" aria-labelledby="first-tips-title">
   <h2 id="first-tips-title" className="first-section-title">선배 팬 꿀팁 · 질문하기</h2>
   <p className="first-tips-lead">팀을 고르면 그 팀 팬들이 남긴 꿀팁을 볼 수 있어요. 처음이라 궁금한 것도 편하게 물어보세요.</p>
   <div className="first-team-picker" role="list">{teams.map(t=><button role="listitem" key={t.id} className={t.id===team?.id?'selected':''} aria-pressed={t.id===team?.id} onClick={()=>go('lounge/'+t.id)} title={t.name}><Tile team={t} small/><span>{t.short}</span></button>)}</div>
   {team?<TeamTips team={team}/>:<p className="first-pick-hint">위에서 팀을 골라 주세요. 응원팀이 아직 없다면 <a href="#/finder">나의 팀 찾기</a>부터 해 보세요.</p>}
  </section>
 </div>;
}

function TeamTips({team}:{team:Team}){
 const tips=sampleTips(team);
 return <div className="first-team-tips" style={{'--club-color':team.color} as CSSProperties}>
  <header><Tile team={team}/><div><h3>{team.name} 첫 직관 꿀팁</h3><small>K리그{team.league} · {team.region}</small></div><a className="button" href={'#/schedule/'+team.id}><CalendarDays size={15}/>{team.short} 경기 일정</a></header>
  <div className="sample-notice"><b>예시 꿀팁</b> 게시판이 어떻게 보일지 보여 주는 샘플이에요. 실제 팬이 쓴 글이 아니니 정보로 믿지 마세요.</div>
  <ul className="tip-list">{tips.map(t=><li key={t.id}><span className="tip-topic">{TIP_TOPICS[t.topic]}</span><p>{t.body}</p><div><b>{t.nickname}</b><span>도움돼요 {t.likes}</span></div></li>)}</ul>
  <CommentBox target={'tip:'+team.id} title={`${team.short} 팬에게 꿀팁 남기기 · 질문하기`} placeholder={`${team.short} 직관 꿀팁이나 궁금한 점을 남겨 주세요 (300자 이내)`} empty={`아직 ${team.short} 팬의 진짜 꿀팁이 없어요. 첫 꿀팁이나 질문을 남겨 보세요.`}/>
 </div>;
}
