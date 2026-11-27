import {useEffect,useState} from 'react';
import {ArrowRight,CalendarDays,Shield,Ticket,BarChart3} from 'lucide-react';
import {useMatches,dayLabel,kickoff,type SeasonMatches,type SeasonMatch} from './matchData';
import {table,magicFor} from './race';
import type {Dataset} from './types';
import {Tile} from './components';
import {withBase} from './base.ts';
import MyClub from './MyClub';
import {useAccount} from './Account';
import {clubOf} from './accountApi';
import {teamLogo} from './logos';
import type {CSSProperties} from 'react';
import type {Team,League} from './types';

// 로그인하고 MY 팀을 고른 사람에게는 영상 대신 MY 팀 엠블럼을 멈춘 화면으로 보여 준다.
function ClubHero({team}:{team:Team}){
 return <div className="club-stage" aria-hidden="true" style={{'--club-color':team.color} as CSSProperties}><div className="club-ring">{teamLogo(team.id)&&<img src={teamLogo(team.id)} alt=""/>}</div><span className="club-caption">2026 / {team.name}</span></div>;
}

// 첫 화면 배경(데스크톱): K리그1·2 로고를 크게 두고, 아래에 구단 엠블럼이 천천히 흐르는 띠.
// 예전 배경 영상(public/media/hero.mp4)은 2026-11-22에 이 화면으로 바꾸면서 쓰지 않는다.
function LeagueStage(){
 return <div className="landing-stage league-stage" aria-hidden="true">
  <div className="league-stage-logos">
   <img src={withBase('/media/league/kleague1.png')} alt=""/>
   <img src={withBase('/media/league/kleague2.png')} alt=""/>
  </div>
 </div>;
}

// 휴대폰 첫 화면 배경: K리그1·2 로고를 흐리게 새겨 넣는다(영상 대신, CSS로 휴대폰에서만 보임).
function LeagueMarks(){
 return <div className="league-marks" aria-hidden="true">
  <img src={withBase('/media/league/kleague1.png')} alt=""/>
  <img src={withBase('/media/league/kleague2.png')} alt=""/>
 </div>;
}

// 휴대폰 첫 화면 바로 아래: 바로가기 3개 + 오늘(없으면 가장 가까운 날) 경기
const todayKST=()=>new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
// 오늘 경기가 있으면 오늘 전체(끝난 경기 포함), 없으면 가장 가까운 날의 경기 — MobileQuick·HeroFixtures 가 함께 쓴다.
function useNextMatchday(){
 const {data:season}=useMatches();
 const today=todayKST();
 const all=[...(season?.matches||[])].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const todays=all.filter(m=>m.date===today);
 const day=todays.length?today:all.find(m=>m.status==='NS'&&m.date>today)?.date;
 return {day,isToday:day===today,games:all.filter(m=>m.date===day),fetchedAt:season?.fetchedAt};
}

// 경기 상태: 자료(하루 두 번 갱신)의 결과가 있으면 종료+점수, 없으면 시간으로 예정/경기 중/결과 집계 중을 가린다.
type Phase='pre'|'live'|'pending'|'done';
function phaseOf(m:SeasonMatch,now:number):Phase{
 if(m.status==='FT'&&m.score)return 'done';
 const t=kickoff(m).getTime();
 return now<t?'pre':now<t+130*60e3?'live':'pending';
}
function useNow(){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),60e3);return()=>clearInterval(id)},[]);
 return now;
}
const stampKST=(iso?:string)=>{if(!iso)return '';const d=new Date(new Date(iso).getTime()+9*3600e3);return `${d.getUTCMonth()+1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;};
// 한 경기 줄의 가운데(점수 또는 vs)와 상태 표시
function MatchState({m,now}:{m:SeasonMatch;now:number}){
 const p=phaseOf(m,now);
 if(p==='done')return <span className="ms ms-done">종료</span>;
 if(p==='live')return <span className="ms ms-live"><i aria-hidden="true"/>경기 중</span>;
 if(p==='pending')return <span className="ms ms-pending">결과 집계 중</span>;
 return <time className="ms ms-pre">{m.time}</time>;
}
const scoreOrVs=(m:SeasonMatch)=>m.status==='FT'&&m.score?<strong className="ms-score">{m.score[0]}:{m.score[1]}</strong>:<em>vs</em>;
const hrefOf=(m:SeasonMatch,now:number)=>phaseOf(m,now)==='live'?'#/live':'#/game/'+m.id;

// 데스크톱 히어로 아래 띠: 그날 경기를 가로로 늘어놓는다(휴대폰에서는 CSS로 숨김). 경기 중이면 라이브로 간다.
function HeroFixtures({teams}:{teams:Team[]}){
 const {isToday,games,fetchedAt}=useNextMatchday();
 const now=useNow();
 if(!games.length)return null;
 const team=(id:string)=>teams.find(t=>t.id===id);
 const label=isToday?'오늘 경기':'다음 경기';
 return <div className="hero-fixtures" role="region" aria-label={label}>
  <div className="hf-head"><b>{label}</b><span>{dayLabel(games[0])}</span>{fetchedAt&&<small>기준 {stampKST(fetchedAt)}</small>}<a href="#/schedule">전체 일정·예매<ArrowRight size={14}/></a></div>
  <ul className="hf-list">{games.map(m=>{const h=team(m.home),a=team(m.away);return <li key={m.id}><a href={hrefOf(m,now)}>
   <MatchState m={m} now={now}/>
   <span className="hf-teams"><span>{h&&<Tile team={h} small/>}<b>{h?.short??m.home}</b></span>{scoreOrVs(m)}<span>{a&&<Tile team={a} small/>}<b>{a?.short??m.away}</b></span></span>
   <small>K리그{m.league} {m.round}R</small>
  </a></li>})}</ul>
 </div>;
}

// 시즌 막바지에 걸린 것: 승강 레이스 탭과 같은 매직넘버 계산(race.ts)으로 확정·경쟁 중인 팀을 센다.
function stakesOf(season:SeasonMatches,teams:Team[]){
 const short=(id:string)=>teams.find(t=>t.id===id)?.short??id;
 const out:string[]=[];
 const k1=table(season,1 as League),m1=k1.map(r=>({r,m:magicFor(r,k1,1 as League)[0]}));
 const champ=m1.find(x=>x.m.label==='우승 확정'),title=m1.filter(x=>x.m.label.startsWith('우승')&&x.m.tone==='live');
 if(champ)out.push(`${short(champ.r.team)} 우승 확정`);else if(title.length)out.push(`K리그1 우승 경쟁 ${title.length}팀`);
 const last=m1.find(x=>x.m.label==='12위 확정'),survive=m1.filter(x=>x.m.label.startsWith('12위 탈출')&&x.m.tone==='live');
 if(last)out.push(`${short(last.r.team)} 12위 확정`);else if(survive.length)out.push(`12위 피하기 경쟁 ${survive.length}팀`);
 const k2=table(season,2 as League),m2=k2.map(r=>({r,m:magicFor(r,k2,2 as League)[0]}));
 const up=m2.filter(x=>x.m.label==='자동 승격 확정'),upLive=m2.filter(x=>x.m.label.startsWith('자동 승격')&&x.m.tone==='live');
 if(up.length)out.push(`${up.map(x=>short(x.r.team)).join('·')} 자동 승격 확정`);
 if(upLive.length&&up.length<2)out.push(`K리그2 자동 승격 경쟁 ${upLive.length}팀`);
 return out;
}

// 히어로 제목: 경기가 있는 날은 그날 경기 수와 남은 라운드, 아니면 다음 경기일. 시즌이 끝나면 기본 문구.
function HeroCopy({teams}:{teams:Team[]}){
 const {data:season}=useMatches();
 const {isToday,games}=useNextMatchday();
 const actions=(race:boolean)=><div className="landing-actions"><a className="landing-cta" href="#/finder">나의 팀 찾기<ArrowRight size={19}/></a><a className="landing-secondary" href="#/lounge">K리그 처음이세요? 직관 라운지<ArrowRight size={17}/></a>{race?<a className="landing-secondary" href="#/center">승강 레이스 보기<ArrowRight size={17}/></a>:<a className="landing-secondary" href="#/matches">팀 순위 보기<ArrowRight size={17}/></a>}</div>;
 if(!season||!games.length)return <div className="landing-copy">
  <h1 id="landing-title">축구를 보는 순간,<br/>응원이 시작된다.</h1>
  <p className="landing-description">어느 팀을 응원할지, 어떤 경기를 볼지.<br/>당신의 취향과 데이터로 만나는 K리그.</p>
  {actions(false)}
 </div>;
 const g=games[0];
 const when=isToday?'오늘':`${Number(g.date.slice(5,7))}월 ${Number(g.date.slice(8))}일`;
 const k1Left=new Set(season.matches.filter(m=>m.league===1&&m.status==='NS').map(m=>m.round)).size;
 const line2=k1Left===1?'마지막 라운드.':k1Left<=3?`남은 건 ${k1Left}라운드.`:`첫 경기 ${g.time} 킥오프.`;
 const rounds=[1,2].map(l=>{const r=games.find(m=>m.league===l)?.round;return r?`K리그${l} ${r}R`:null}).filter(Boolean).join(' · ');
 const stakes=k1Left<=3?stakesOf(season,teams):[];
 return <div className="landing-copy">
  <h1 id="landing-title">{when} {games.length}경기,<br/>{line2}</h1>
  <p className="landing-description"><span className="hero-rounds">{rounds}</span>{stakes.length>0&&<span className="hero-stakes">{stakes.join(' · ')}</span>}</p>
  {actions(stakes.length>0)}
 </div>;
}

function MobileQuick({data}:{data:Dataset}){
 const {isToday,games:all,fetchedAt}=useNextMatchday();
 const now=useNow();
 const rank:Record<Phase,number>={live:0,pre:1,pending:2,done:3};
 const games=[...all].sort((a,b)=>rank[phaseOf(a,now)]-rank[phaseOf(b,now)]).slice(0,3);
 const team=(id:string)=>data.teams.find(t=>t.id===id);
 return <section className="mobile-quick" aria-label="오늘 경기">
  {games.length>0&&<div className="mq-games">
   <h2>{isToday?'오늘 경기':'다음 경기'}<span>{dayLabel(games[0])}{fetchedAt&&<small> · 기준 {stampKST(fetchedAt)}</small>}</span></h2>
   <ul>{games.map(m=>{const h=team(m.home),a=team(m.away);return <li key={m.id}><a href={hrefOf(m,now)}>
    <MatchState m={m} now={now}/>
    <span className="mq-team mq-home">{h&&<Tile team={h} small/>}<b>{h?.short??m.home}</b></span>
    {scoreOrVs(m)}
    <span className="mq-team mq-away">{a&&<Tile team={a} small/>}<b>{a?.short??m.away}</b></span>
    <small>K리그{m.league} {m.round}R</small>
   </a></li>})}</ul>
   <a className="mq-more" href="#/schedule">{all.length>3?`${isToday?'오늘':'이날'} ${all.length}경기 모두 보기`:'전체 일정·예매'}<ArrowRight size={15}/></a>
  </div>}
 </section>;
}

export default function Landing({data}:{data:Dataset}){
 const {user}=useAccount(),myTeam=data.teams.find(t=>t.id===clubOf(user));
 return <div className="landing-page">
  <MyClub data={data}/>
  <section className={"landing-hero"+(myTeam?"":" is-league")} aria-labelledby="landing-title">
   {myTeam?<ClubHero team={myTeam}/>:<LeagueStage/>}
   <LeagueMarks/>
   <div className="landing-shade" aria-hidden="true"/>
   <HeroCopy teams={data.teams}/>
   <HeroFixtures teams={data.teams}/>
  </section>
  <MobileQuick data={data}/>
  <section className="landing-intro" aria-labelledby="landing-intro-title">
   <h2 id="landing-intro-title" className="home-paths-title">나의 팀부터, 놓칠 수 없는 한 경기까지</h2>
   <div className="home-paths">
    <div className="home-path">
     <h3>K리그가 처음이라면</h3>
     <ul>
      <li><a href="#/lounge"><Ticket size={20}/><span><b>첫 직관 가이드</b><small>준비물 체크리스트와 구단별 꿀팁</small></span><ArrowRight size={16}/></a></li>
      <li><a href="#/schedule"><CalendarDays size={20}/><span><b>이번 주말 경기·예매</b><small>경기 시간, 중계, 예매처를 한곳에서</small></span><ArrowRight size={16}/></a></li>
     </ul>
    </div>
    <div className="home-path">
     <h3>응원팀이 있다면</h3>
     <ul>
      <li><a href="#/center"><Shield size={20}/><span><b>승강 레이스</b><small>잔류·승격까지 남은 승점, 매직넘버</small></span><ArrowRight size={16}/></a></li>
      <li><a href="#/matches"><BarChart3 size={20}/><span><b>팀 순위·선수 기록</b><small>2026 시즌 공식 기록</small></span><ArrowRight size={16}/></a></li>
     </ul>
    </div>
   </div>
  </section>
  <section className="landing-club-section" aria-labelledby="club-wall-title">
   <div className="club-wall-head"><h2 id="club-wall-title">{data.teams.length}개 구단, 당신의 팀은 어디인가요?</h2><a href="#/finder">나와 맞는 팀 만나기<ArrowRight size={17}/></a></div>
   {([1,2] as League[]).map(l=>{const list=data.teams.filter(t=>t.league===l);return <div className="club-wall" key={l}>
    <h3>K리그{l} <span>{list.length}개 구단</span></h3>
    <ul>{list.map(team=><li key={team.id}><a href={'#/team/'+team.id} aria-label={team.name+' 팀 기록'}><Tile team={team}/><span>{team.short}</span></a></li>)}</ul>
   </div>})}
  </section>
  <p className="landing-sample-note">{data.meta.season} 시즌 공식 순위·선수 기록을 살펴보세요. 기록별 기준일은 상세 화면에 표시됩니다.</p>
 </div>;
}
