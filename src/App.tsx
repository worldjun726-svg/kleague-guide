import {useEffect,useState,type CSSProperties} from 'react';
import {Goal,Info,Sparkles,LoaderCircle,RefreshCw} from 'lucide-react';
import type {Dataset} from './types';
import {loadSampleDataset} from './sampleApi';
import {loadCurrentSeason,type CurrentSeason} from './currentData';
import {SeasonRecords,CurrentTeam,PlayerBrowser,PlayerPage} from './Records';
import {Home,MatchPage} from './HomeTeam';
import Finder from './Finder';
import FirstVisit from './FirstVisit';
import Sidebar from './Sidebar';
import MyExtras from './MyExtras';
import {TermsPage,PrivacyPage} from './Legal';
import {withBase} from './base';
import LiveScores from './LiveScores';
import {RaceCenter,RaceBigMatches,RaceSimulator} from './RaceTabs';
import PlayerRanks from './PlayerRanks';
import {MainNav} from './Nav';
import Landing from './Landing';
import {Empty} from './components';
import {useLive} from './Live';
import {AccountProvider,AuthButton,FavoriteButton,CommentBox,MyPage,setClubOptions,useAccount} from './Account';
import {clubOf} from './accountApi';
import {KITS,kitBackground,kitInk} from './kits';
import {SchedulePage,GamePage,useGameName} from './Schedule';
function MyRoute({data}:{data:CurrentSeason}){
 const {data:live}=useLive();
 const team=(id:string)=>data.teams.find(t=>t.id===id);
 const gameName=useGameName(Object.fromEntries(data.teams.map(t=>[t.id,t])));
 return <><MyPage teamName={id=>team(id)?.name} playerName={id=>data.players.find(p=>p.id===id)?.name} matchName={id=>{const m=live?.matches.find(x=>x.id===id);return m?`${m.round}R ${team(m.home)?.short} vs ${team(m.away)?.short}`:gameName(id)}}/><MyExtras data={data}/></>;
}
export default function App(){
 return <AccountProvider><AppBody/></AccountProvider>;
}
function AppBody(){
 const [route,setRoute]=useState(()=>location.hash.slice(2)||'landing');
 const [sample,setSample]=useState<Dataset|null>(null),[current,setCurrent]=useState<CurrentSeason|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[demo,setDemo]=useState(false);
 const [page,param,roundParam]=route.split('/');
 const {user}=useAccount();
 useEffect(()=>{const read=()=>{setRoute(location.hash.slice(2)||'landing');setDemo(false);window.scrollTo(0,0)};window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read)},[]);
 useEffect(()=>{const controller=new AbortController();setError('');Promise.all([loadSampleDataset(controller.signal),loadCurrentSeason(controller.signal)]).then(([s,c])=>{setSample(s);setCurrent(c)}).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>controller.abort()},[retry]);
 if(error||!sample||!current)return <div className="load-screen"><span className="brand-mark"><Goal/></span><h1>K LEAGUE GUIDE</h1>{error?<><p role="alert">{error}</p><button className="button primary" onClick={()=>setRetry(n=>n+1)}><RefreshCw size={16}/>다시 불러오기</button></>:<><LoaderCircle className="spin"/><p>이번 시즌 기록을 준비하고 있어요.</p></>}</div>;
 setClubOptions(current.teams);
 const data:Dataset={...sample,teams:current.teams,matches:[],forecasts:{},seasonStats:current.standings,meta:{...sample.meta,mode:'verified',season:current.season,source:'K리그 공식 순위·선수 기록',sourceUrl:'https://www.kleague.com/record/player.do',model:'',simulationRuns:0,generatedAt:current.retrievedAt}};
 const active=page==='first'?'lounge':['player','players'].includes(page)?'players':['team','match','archive'].includes(page)?'matches':page==='game'?'schedule':page;
 const teamMap=Object.fromEntries(current.teams.map(t=>[t.id,t]));
 const contextTeam=current.teams.find(t=>t.id===param);
 const dates=[...new Set(Object.values(current.sources).map(s=>s.asOf))].sort();
 const samplePage=page==='archive'||page==='match';
 const myKit=KITS[clubOf(user)??''],myInk=myKit?kitInk(myKit):null;
 return <div className={'app-shell '+(page==='landing'?'is-landing':'')+(myInk?' club-bg '+(myInk.dark?'club-dark':'club-light'):'')} style={myKit&&myInk?({'--club-main':myKit.base,'--kit-bg':kitBackground(myKit),'--on-club':myInk.ink} as CSSProperties):undefined}><a className="skip-link" href="#main" onClick={e=>{e.preventDefault();document.getElementById('main')?.focus()}}>본문으로 이동</a><header className="header"><div className="header-inner"><a className="brand" href="#/" aria-label="K LEAGUE GUIDE 홈"><img className="brand-emblem" src={withBase('/media/league/kleague-emblem.png')} alt=""/><span className="brand-word">K LEAGUE<b>GUIDE</b></span></a><MainNav active={active} teamId={contextTeam?.id}/><span className="season-tag"><i/>{samplePage?'2025 예시':current.season+' SEASON'}</span><AuthButton/></div></header>
 {samplePage&&<div className="demo-banner"><Info size={14}/><span>{samplePage?<><strong>SAMPLE EDITION · 2025</strong> · 기능 체험용 예시 데이터입니다.</>:<><strong>LIVE CENTER · PREVIEW</strong> · 실제 경기 연동 전 미리보기 화면입니다.</>}</span></div>}
 <div className="shell-body"><Sidebar teams={current.teams} standings={current.standings} activeTeam={page==='team'?param:undefined}/><main id="main" tabIndex={-1} className="container" data-core={page}>
 {page==='landing'&&<Landing data={data}/>}
 {['matches','team','players','player'].includes(page)&&<div className="season-nav"><a href="#/matches">시즌 순위</a><span>/</span><a href="#/team">팀 기록</a><span>/</span><a href="#/players">선수 기록</a></div>}
 {page==='matches'&&<><SeasonRecords data={current}/><p className="fine">경기별 일정·결과와 경기 리포트는 <a href="#/schedule">일정·예매</a>에서 볼 수 있습니다. · <a href="#/archive">2025 예시 경기 아카이브</a></p></>}
 {page==='finder'&&<Finder key={param||'own'} data={data} share={param}/>}
 {(page==='lounge'||page==='first')&&<FirstVisit teams={current.teams} teamId={param}/>}
 {page==='team'&&<><CurrentTeam key={param} data={current} id={param} initialTab={roundParam}/>{(()=>{const t=current.teams.find(x=>x.id===param)||current.teams[0];return <div className="fan-zone"><FavoriteButton kind="team" id={t.id} label={t.name}/><CommentBox target={'team:'+t.id} title={t.short+' 응원 글'}/></div>})()}</>}
 {page==='players'&&(param==='search'?<PlayerBrowser data={current}/>:<PlayerRanks teams={teamMap}/>)}
 {page==='player'&&<><PlayerPage data={current} id={param}/>{param&&current.players.some(p=>p.id===param)&&<div className="fan-zone"><FavoriteButton kind="player" id={param} label={current.players.find(p=>p.id===param)!.name}/></div>}</>}
 {page==='schedule'&&<SchedulePage key={param||'all'} teams={teamMap} teamParam={param}/>}
 {page==='game'&&<GamePage key={param} id={param} teams={teamMap}/>}
 {page==='live'&&<LiveScores teams={teamMap}/>}
 {page==='terms'&&<TermsPage/>}
 {page==='privacy'&&<PrivacyPage/>}
 {page==='me'&&<MyRoute data={current}/>}
 {page==='big'&&<RaceBigMatches teams={teamMap}/>}
 {page==='final'&&<RaceSimulator teams={teamMap}/>}
 {page==='center'&&<RaceCenter teams={teamMap} teamId={param}/>}
 {page==='archive'&&<Home data={sample}/>}
 {page==='match'&&<MatchPage data={sample} id={param}/>}
 {!['landing','live','schedule','game','me','matches','finder','team','big','final','center','match','players','player','archive','lounge','first','terms','privacy'].includes(page)&&<Empty>찾을 수 없는 화면입니다. <a href="#/matches">시즌 순위로 돌아가기</a></Empty>}
 </main></div><footer><div className="container footer-inner"><div><strong>K LEAGUE GUIDE</strong><p>숫자를 이해하면, 응원이 더 재미있어집니다.</p></div><div><strong>데이터 출처</strong><p>K리그 공식 기록 / FootyStats 팀별 TOP 5 · {current.season}시즌 · 수집일 {current.retrievedAt}</p><small>각 기록의 원문 링크와 기준일은 상세 화면에서 확인할 수 있습니다.</small><p><a href="#/players">선수 기록 보기</a> · <a href="#/schedule">경기 일정·리포트</a> · <a href="#/archive">2025 예시 경기</a></p></div></div></footer></div>;
}

