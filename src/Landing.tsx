import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowDown,Heart,CalendarDays,Shield,Pause,Play,Ticket} from 'lucide-react';
import type {Dataset} from './types';
import {Tile} from './components';
import {withBase} from './base.ts';

// 첫 화면 영상 재생 속도. 1보다 작을수록 장면이 천천히 넘어간다.
const HERO_SPEED=0.5;
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
   {src&&!failed&&<video ref={video} className={'landing-video '+(ready?'ready':'')} src={src} poster={poster??undefined} autoPlay={!reduced} muted loop playsInline preload="metadata" tabIndex={-1} disablePictureInPicture onLoadedData={e=>{e.currentTarget.playbackRate=HERO_SPEED;setReady(true)}} onRateChange={e=>{if(e.currentTarget.playbackRate!==HERO_SPEED)e.currentTarget.playbackRate=HERO_SPEED}} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{setFailed(true);setPlaying(false)}}/>}
  </div>
  <div className="landing-media-tools">
   {src&&!failed?<button className="media-control" onClick={toggle} aria-label={playing?'배경 영상 일시정지':'배경 영상 재생'}>{playing?<Pause size={14}/>:<Play size={14}/>}<span>{playing?'영상 일시정지':'영상 재생'}</span></button>:null}
  </div>
 </>;
}

export default function Landing({data}:{data:Dataset}){
 const features=useRef<HTMLElement>(null);
 function explore(){features.current?.focus({preventScroll:true});features.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
 return <div className="landing-page">
  <section className="landing-hero" aria-labelledby="landing-title">
   <HeroMedia src={data.heroMedia?.videoSrc?withBase(data.heroMedia.videoSrc):null} poster={data.heroMedia?.posterSrc?withBase(data.heroMedia.posterSrc):null}/>
   <div className="landing-shade" aria-hidden="true"/>
   <div className="landing-copy">
    <p className="landing-eyebrow"><span/>YOUR NEXT FAVORITE TEAM</p>
    <h1 id="landing-title">축구를 보는 순간,<br/>응원이 시작된다.</h1>
    <p className="landing-description">어느 팀을 응원할지, 어떤 경기를 볼지.<br/>당신의 취향과 데이터로 만나는 K리그.</p>
    <div className="landing-actions"><a className="landing-cta" href="#/finder">나의 팀 찾기<ArrowRight size={19}/></a><a className="landing-secondary" href="#/lounge">K리그 처음이세요? 직관 라운지<ArrowRight size={17}/></a><a className="landing-secondary" href="#/matches">시즌 기록 둘러보기<ArrowRight size={17}/></a></div>
   </div>
   <div className="landing-bottom"><button onClick={explore}>가이드 살펴보기<ArrowDown size={17}/></button><span>{data.meta.season} 시즌 <i/> SEASON JOURNAL</span></div>
  </section>
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
