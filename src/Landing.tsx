import {useRef} from 'react';
import {ArrowRight,ArrowDown,Heart,CalendarDays,Shield,Ticket,BarChart3} from 'lucide-react';
import {useMatches,dayLabel} from './matchData';
import type {Dataset} from './types';
import {Tile} from './components';
import {withBase} from './base.ts';
import MyClub from './MyClub';
import {useAccount} from './Account';
import {clubOf} from './accountApi';
import {teamLogo} from './logos';
import type {CSSProperties} from 'react';
import type {Team} from './types';

// 로그인하고 MY 팀을 고른 사람에게는 영상 대신 MY 팀 엠블럼을 멈춘 화면으로 보여 준다.
function ClubHero({team}:{team:Team}){
 return <div className="club-stage" aria-hidden="true" style={{'--club-color':team.color} as CSSProperties}><div className="club-ring">{teamLogo(team.id)&&<img src={teamLogo(team.id)} alt=""/>}</div><span className="club-caption">2026 / {team.name}</span></div>;
}

// 첫 화면 배경(데스크톱): K리그1·2 로고를 크게 두고, 아래에 구단 엠블럼이 천천히 흐르는 띠.
// 예전 배경 영상(public/media/hero.mp4)은 2026-11-22에 이 화면으로 바꾸면서 쓰지 않는다.
function LeagueStage({teams}:{teams:Team[]}){
 const logos=teams.map(t=>({id:t.id,src:teamLogo(t.id)})).filter(t=>t.src);
 return <div className="landing-stage league-stage" aria-hidden="true">
  <div className="league-stage-logos">
   <img src={withBase('/media/league/kleague1.png')} alt=""/>
   <img src={withBase('/media/league/kleague2.png')} alt=""/>
  </div>
  <div className="league-strip"><div className="league-strip-track">
   {[...logos,...logos].map((t,i)=><span key={t.id+i}><img src={t.src!} alt="" loading="lazy"/></span>)}
  </div></div>
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
function MobileQuick({data}:{data:Dataset}){
 const {data:season}=useMatches();
 const today=todayKST();
 const next=(season?.matches||[]).filter(m=>m.status==='NS'&&m.date>=today).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const day=next[0]?.date,games=next.filter(m=>m.date===day).slice(0,3);
 const team=(id:string)=>data.teams.find(t=>t.id===id);
 return <section className="mobile-quick" aria-label="바로가기와 오늘 경기">
  <nav className="mq-links" aria-label="바로가기">
   <a href="#/lounge"><Ticket size={20}/>직관 라운지</a>
   <a href="#/matches"><BarChart3 size={20}/>시즌 기록</a>
   <a href="#/schedule"><CalendarDays size={20}/>{day===today?'오늘 경기':'다음 경기'}</a>
  </nav>
  {games.length>0&&<div className="mq-games">
   <h2>{day===today?'오늘 경기':'다음 경기'}<span>{dayLabel(games[0])}</span></h2>
   <ul>{games.map(m=>{const h=team(m.home),a=team(m.away);return <li key={m.id}><a href={'#/game/'+m.id}>
    <time>{m.time}</time>
    <span className="mq-team">{h&&<Tile team={h} small/>}<b>{h?.short??m.home}</b></span>
    <em>vs</em>
    <span className="mq-team">{a&&<Tile team={a} small/>}<b>{a?.short??m.away}</b></span>
    <small>K리그{m.league} {m.round}R</small>
   </a></li>})}</ul>
   <a className="mq-more" href="#/schedule">전체 일정·예매<ArrowRight size={15}/></a>
  </div>}
 </section>;
}

export default function Landing({data}:{data:Dataset}){
 const features=useRef<HTMLElement>(null);
 const {user}=useAccount(),myTeam=data.teams.find(t=>t.id===clubOf(user));
 function explore(){features.current?.focus({preventScroll:true});features.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
 return <div className="landing-page">
  <MyClub data={data}/>
  <section className={"landing-hero"+(myTeam?"":" is-league")} aria-labelledby="landing-title">
   {myTeam?<ClubHero team={myTeam}/>:<LeagueStage teams={data.teams}/>}
   <LeagueMarks/>
   <div className="landing-shade" aria-hidden="true"/>
   <div className="landing-copy">
    <p className="landing-eyebrow"><span/>YOUR NEXT FAVORITE TEAM</p>
    <h1 id="landing-title">축구를 보는 순간,<br/>응원이 시작된다.</h1>
    <p className="landing-description">어느 팀을 응원할지, 어떤 경기를 볼지.<br/>당신의 취향과 데이터로 만나는 K리그.</p>
    <div className="landing-actions"><a className="landing-cta" href="#/finder">나의 팀 찾기<ArrowRight size={19}/></a><a className="landing-secondary" href="#/lounge">K리그 처음이세요? 직관 라운지<ArrowRight size={17}/></a><a className="landing-secondary" href="#/matches">시즌 기록 둘러보기<ArrowRight size={17}/></a></div>
   </div>
   <div className="landing-bottom"><button onClick={explore}>가이드 살펴보기<ArrowDown size={17}/></button><span>{data.meta.season} 시즌 <i/> SEASON JOURNAL</span></div>
  </section>
  <MobileQuick data={data}/>
  <section className="landing-intro" ref={features} tabIndex={-1} aria-labelledby="landing-intro-title">
   <div className="landing-intro-heading"><p>FIND YOUR REASON TO CHEER</p><h2 id="landing-intro-title">나의 팀부터,<br/>놓칠 수 없는 한 경기까지.</h2><span>K리그가 처음이어도 괜찮아요.<br/>기록 속에서 나만의 관전 포인트를 찾아보세요.</span></div>
   <div className="landing-features">
    <a href="#/finder"><div className="feature-icon"><Heart size={25}/><span>01</span></div><h3>나의 팀 찾기</h3><p>사는 지역, 좋아하는 경기, 마음이 가는 팀.<br/>세 가지 취향으로 응원 후보를 만나세요.</p><strong>취향으로 시작하기<ArrowRight size={18}/></strong></a>
    <a href="#/schedule"><div className="feature-icon"><CalendarDays size={25}/><span>02</span></div><h3>일정 · 프리뷰</h3><p>이번 주말 경기와 중계, 예매처를 확인하고<br/>기록으로 정리한 관전 포인트를 챙기세요.</p><strong>다음 경기 보기<ArrowRight size={18}/></strong></a>
    <a href="#/lounge"><div className="feature-icon"><Ticket size={25}/><span>03</span></div><h3>직관 라운지</h3><p>선배 팬에게 묻고, 직관 꿀팁을 나누는 커뮤니티.<br/>첫 직관 가이드와 체크리스트도 함께.</p><strong>라운지 들어가기<ArrowRight size={18}/></strong></a>
    <a href="#/center"><div className="feature-icon"><Shield size={25}/><span>04</span></div><h3>승강 센터</h3><p>잔류와 승격까지 필요한 조건을 살펴보세요.<br/>다음 경기에 응원할 이유가 더해집니다.</p><strong>우리 팀의 조건 보기<ArrowRight size={18}/></strong></a>
   </div>
  </section>
  <section className="landing-club-section" aria-label="참여 리그와 구단 안내"><div><p>K LEAGUE 1 & 2</p><h2>{data.teams.length}개 구단.<br/>당신의 팀은 어디인가요?</h2><a href="#/finder">나와 맞는 팀 만나기<ArrowRight size={17}/></a></div><div className="landing-club-list">{data.teams.map(team=><a href={'#/team/'+team.id} key={team.id} aria-label={team.name+' 팀 기록'} title={team.name}><Tile team={team}/></a>)}</div></section>
  <p className="landing-sample-note">{data.meta.season} 시즌 공식 순위·선수 기록을 살펴보세요. 기록별 기준일은 상세 화면에 표시됩니다.</p>
 </div>;
}
