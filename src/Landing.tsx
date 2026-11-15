import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowDown,Heart,Flame,Shield,Pause,Play} from 'lucide-react';
import type {Dataset} from './types';
import {Tile} from './components';

function HeroMedia({src,poster}:{src?:string|null;poster?:string|null}){
 const video=useRef<HTMLVideoElement>(null);
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [playing,setPlaying]=useState(false),[failed,setFailed]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const change=()=>setReduced(preference.matches);
  preference.addEventListener('change',change);return()=>preference.removeEventListener('change',change);
 },[]);
 useEffect(()=>{setFailed(false);setReady(false);setPlaying(false)},[src]);
 useEffect(()=>{
  const element=video.current;if(!element||failed)return;
  if(reduced)element.pause();else void element.play().catch(()=>setPlaying(false));
  return()=>element.pause();
 },[src,reduced,failed]);
 async function toggle(){const element=video.current;if(!element)return;if(element.paused){try{await element.play()}catch{setPlaying(false)}}else element.pause()}
 return <>
  <div className="landing-stage" aria-hidden="true">
   <div className="stadium-glow"/><div className="stadium-field"><span className="field-midline"/><span className="field-circle"/><span className="field-goal left"/><span className="field-goal right"/></div>
   {poster&&<img key={poster} className="landing-poster" src={poster} alt="" onError={e=>{e.currentTarget.hidden=true}}/>}
   {src&&!failed&&<video ref={video} className={'landing-video '+(ready?'ready':'')} src={src} poster={poster??undefined} autoPlay={!reduced} muted loop playsInline preload="metadata" tabIndex={-1} disablePictureInPicture onLoadedData={()=>setReady(true)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{setFailed(true);setPlaying(false)}}/>}
  </div>
  <div className="landing-media-tools">
   {src&&!failed?<button className="media-control" onClick={toggle} aria-label={playing?'배경 영상 일시정지':'배경 영상 재생'}>{playing?<Pause size={14}/>:<Play size={14}/>}<span>{playing?'영상 일시정지':'영상 재생'}</span></button>:<span className="media-placeholder">{failed?'영상 대신 임시 배경을 표시합니다':'영상 준비 중'}</span>}
  </div>
 </>;
}

export default function Landing({data}:{data:Dataset}){
 const features=useRef<HTMLElement>(null);
 function explore(){features.current?.focus({preventScroll:true});features.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
 return <div className="landing-page">
  <div className="journal-masthead"><span>THE K LEAGUE JOURNAL</span><span>취향으로 찾고, 기록으로 즐기는 K리그</span><span>SEASON {data.meta.season}</span></div>
  <section className="landing-hero" aria-labelledby="landing-title">
   <div className="landing-copy">
    <p className="landing-eyebrow"><span/>THE BEAUTIFUL GAME, YOUR WAY</p>
    <h1 id="landing-title">축구를 보는<br/>새로운 <em>시선.</em></h1>
    <p className="landing-description">어느 팀을 응원할지, 어떤 경기를 볼지.<br/>당신의 취향과 기록 사이에서<br/>나만의 K리그 이야기를 발견하세요.</p>
    <div className="landing-actions"><a className="landing-cta" href="#/finder">나의 팀 찾기<ArrowRight size={19}/></a><a className="landing-secondary" href="#/matches">시즌 기록 둘러보기<ArrowRight size={17}/></a></div>
   </div>
   <div className="landing-cover"><div className="landing-cover-media"><HeroMedia src={data.heroMedia?.videoSrc} poster={data.heroMedia?.posterSrc}/></div><div className="landing-cover-caption"><div><span>CLUB SPOTLIGHT</span><strong>{data.teams.length}개의 팀, 서로 다른 응원의 이유.</strong></div><span className="cover-season">{data.meta.season}<small>K LEAGUE 1 & 2</small></span></div></div>
   <div className="landing-bottom"><button onClick={explore}>가이드 살펴보기<ArrowDown size={16}/></button><span>YOUR NEXT FAVORITE TEAM <i/> STARTS HERE</span></div>
  </section>
  <section className="landing-intro" ref={features} tabIndex={-1} aria-labelledby="landing-intro-title">
   <div className="landing-intro-heading"><p>THE STARTING LINEUP</p><h2 id="landing-intro-title">응원이 더 재미있어지는 방법.</h2><span>K리그가 처음이어도 괜찮아요.<br/>관전의 시작을 함께할 세 가지 가이드.</span></div>
   <div className="landing-features">
    <a href="#/finder"><div className="feature-icon"><Heart size={23}/><span>01 / FIND YOUR CLUB</span></div><h3>마음이 가는 팀을 찾다.</h3><p>사는 지역, 좋아하는 경기, 마음이 가는 팀.<br/>세 가지 취향으로 응원 후보를 만나세요.</p><strong>나의 팀 찾기<ArrowRight size={18}/></strong></a>
    <a href="#/big"><div className="feature-icon"><Flame size={23}/><span>02 / THE BIG MATCH</span></div><h3>한 경기, 그 이상의 이야기.</h3><p>한 경기의 결과가 순위 경쟁을 어떻게 바꿀까요?<br/>예시 체험으로 관전 포인트를 살펴보세요.</p><strong>빅매치 가이드<ArrowRight size={18}/></strong></a>
    <a href="#/center"><div className="feature-icon"><Shield size={23}/><span>03 / THE NEXT CHAPTER</span></div><h3>끝까지 응원할 이유.</h3><p>잔류와 승격을 가르는 조건이 궁금하다면.<br/>시즌 규정과 승강 예시를 함께 살펴보세요.</p><strong>승강 센터<ArrowRight size={18}/></strong></a>
   </div>
  </section>
  <section className="landing-club-section" aria-label="참여 리그와 구단 안내"><div><p>ONE LEAGUE. COUNTLESS STORIES.</p><h2><span>{data.teams.length}</span>개 구단.<br/>당신의 팀은 어디인가요?</h2><a href="#/finder">나와 맞는 팀 만나기<ArrowRight size={17}/></a></div><div className="landing-club-list">{data.teams.map(team=><a href={'#/team/'+team.id} key={team.id} aria-label={team.name+' 팀 기록'} title={team.name}><Tile team={team}/><span>{team.short}</span></a>)}</div></section>
  <p className="landing-sample-note">{data.meta.season} 시즌 공식 순위·선수 기록을 살펴보세요. 기록별 기준일은 상세 화면에 표시됩니다.</p>
 </div>;
}
