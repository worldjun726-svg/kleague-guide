import {useEffect,useState} from 'react';
import {Goal,Info,Sparkles,LoaderCircle,RefreshCw} from 'lucide-react';
import type {Dataset} from './types';
import {loadSampleDataset} from './sampleApi';
import {loadCurrentSeason,type CurrentSeason} from './currentData';
import {SeasonRecords,CurrentTeam,PlayerBrowser,PlayerPage} from './Records';
import {Home,MatchPage} from './HomeTeam';
import Finder from './Finder';
import Landing from './Landing';
import {FinalSimulator} from './Forecasts';
import BigMatches from './MatchGuide';
import Center from './Center';
import {Empty} from './components';
const NAV=[['matches','경기'],['big','빅매치'],['team','팀'],['final','파이널 시뮬레이터'],['center','승강 센터'],['finder','나의 팀 찾기']];
export default function App(){
 const [route,setRoute]=useState(()=>location.hash.slice(2)||'landing');
 const [sample,setSample]=useState<Dataset|null>(null),[current,setCurrent]=useState<CurrentSeason|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[demo,setDemo]=useState(false);
 const [page,param,roundParam]=route.split('/');
 useEffect(()=>{const read=()=>{setRoute(location.hash.slice(2)||'landing');setDemo(false);window.scrollTo(0,0)};window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read)},[]);
 useEffect(()=>{const controller=new AbortController();setError('');Promise.all([loadSampleDataset(controller.signal),loadCurrentSeason(controller.signal)]).then(([s,c])=>{setSample(s);setCurrent(c)}).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>controller.abort()},[retry]);
 if(error||!sample||!current)return <div className="load-screen"><span className="brand-mark"><Goal/></span><h1>K리그 관전 가이드</h1>{error?<><p role="alert">{error}</p><button className="button primary" onClick={()=>setRetry(n=>n+1)}><RefreshCw size={16}/>다시 불러오기</button></>:<><LoaderCircle className="spin"/><p>이번 시즌 기록을 준비하고 있어요.</p></>}</div>;
 const data:Dataset={...sample,teams:current.teams,matches:[],forecasts:{},seasonStats:current.standings,meta:{...sample.meta,mode:'verified',season:current.season,source:'K리그 공식 순위·선수 기록',sourceUrl:'https://www.kleague.com/record/player.do',model:'',simulationRuns:0,generatedAt:current.retrievedAt}};
 const active=['player','players'].includes(page)?'team':page==='match'?'matches':page;
 const contextTeam=current.teams.find(t=>t.id===param);
 const dates=[...new Set(Object.values(current.sources).map(s=>s.asOf))].sort();
 const pending=['big','final','center'].includes(page),samplePage=(pending&&demo)||page==='archive'||page==='match';
 return <div className={'app-shell '+(page==='landing'?'is-landing':'')}><a className="skip-link" href="#main" onClick={e=>{e.preventDefault();document.getElementById('main')?.focus()}}>본문으로 이동</a><header className="header"><div className="header-inner"><a className="brand" href="#/"><span className="brand-mark"><Goal size={24}/></span><span>K리그 <b>관전 가이드</b><small>YOUR NEXT FAVORITE TEAM</small></span></a><nav aria-label="주 메뉴">{NAV.map(([id,label])=><a key={id} href={'#/'+id+(contextTeam&&['big','center','team'].includes(id)?'/'+contextTeam.id:'')} className={active===id?'active':''} aria-current={active===id?'page':undefined}>{label}{id==='finder'&&<Sparkles size={13}/>}</a>)}</nav><span className="season-tag"><i/>{samplePage?'2025 예시':current.season+' SEASON'}</span></div></header>
 {page!=='landing'&&<div className="demo-banner"><Info size={14}/><span>{samplePage?<><strong>SAMPLE EDITION · 2025</strong> · 합성 예시입니다. 현재 시즌 실제 기록·확률이 아닙니다.</>:<><strong>{current.season} SEASON</strong> · 기록 저장본 · 표마다 출처·확인일 표시 · 실시간 갱신 아님</>}</span></div>}
 <main id="main" tabIndex={-1} className="container" data-core={page}>
 {page==='landing'&&<Landing data={data}/>}
 {['matches','team','players','player'].includes(page)&&<div className="season-nav"><a href="#/matches">시즌 순위</a><span>/</span><a href="#/team">팀 기록</a><span>/</span><a href="#/players">선수 기록</a></div>}
 {page==='matches'&&<><SeasonRecords data={current}/><p className="fine">경기별 일정·결과는 아직 현재 시즌 자료가 연결되지 않았습니다. <a href="#/archive">2025 예시 경기 아카이브</a></p></>}
 {page==='finder'&&<Finder data={data}/>}
 {page==='team'&&<CurrentTeam data={current} id={param}/>}
 {page==='players'&&<PlayerBrowser data={current}/>}
 {page==='player'&&<PlayerPage data={current} id={param}/>}
 {page==='center'&&<p className="record-coverage">2026 규정 안내: 김천상무는 최종 순위와 관계없이 강등되며, K리그2 1·2위는 자동 승격합니다. 기존 예시의 고정 방식과 다릅니다. <a href="https://www.kleague.com/about/competition.do" target="_blank" rel="noreferrer">공식 대회요강</a></p>}
 {pending&&<section className="panel current-notice"><h2>{current.season} {NAV.find(([id])=>id===page)?.[1]}</h2><p>현재 시즌의 전체 경기 일정과 결과별 계산 자료가 아직 연결되지 않았습니다. 현재 순위만으로 빅매치 지수나 매직넘버를 계산하지 않습니다.</p><p>아래 예시 체험은 2025 합성 데이터와 초기 고정 승강 규칙을 사용합니다. 2026시즌 승강 판정에 사용할 수 없습니다.</p><a className="text-button" href={'#/team/'+(contextTeam?.id||'seoul')}>현재 시즌 팀 기록 보기</a><br/><button className="button" onClick={()=>setDemo(v=>!v)}>{demo?'예시 체험 닫기':'2025 예시 기능 체험하기'}</button></section>}
 {page==='big'&&demo&&<BigMatches data={sample} teamId={sample.teams.some(t=>t.id===param)?param:undefined} roundParam={roundParam}/>}
 {page==='final'&&demo&&<FinalSimulator data={sample}/>}
 {page==='center'&&demo&&<Center data={sample} teamId={sample.teams.some(t=>t.id===param)?param:undefined} roundParam={roundParam}/>}
 {page==='archive'&&<Home data={sample}/>}
 {page==='match'&&<MatchPage data={sample} id={param}/>}
 {!['landing','matches','finder','team','big','final','center','match','players','player','archive'].includes(page)&&<Empty>찾을 수 없는 화면입니다. <a href="#/matches">시즌 순위로 돌아가기</a></Empty>}
 </main><footer><div className="container footer-inner"><div><strong>K리그 관전 가이드</strong><p>숫자를 이해하면, 응원이 더 재미있어집니다.</p></div><div><strong>데이터 출처</strong><p>K리그 공식 기록 / FootyStats 팀별 TOP 5 · {current.season}시즌 · 수집일 {current.retrievedAt}</p><small>팀 순위·TOP 5 29팀 · 공식 개별 선수 기록 {current.players.length}명<br/>각 기록의 원문 링크와 기준일을 상세 화면에 제공합니다.</small><p><a href="#/players">선수 기록 보기</a> · <a href="#/archive">2025 예시 경기</a></p></div></div></footer></div>;
}

