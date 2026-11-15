import type {ReactNode,CSSProperties} from 'react';
import type {Team} from './types';
import {Tile} from './components';
import {ArrowRight,Heart,Flame,Shield} from 'lucide-react';

export function GuideHero({season=2025,step,title,description,children,teams=[]}:{season?:number;step:1|2|3;title:string;description:string;children:ReactNode;teams?:Team[]}){
 const Icon=[Heart,Flame,Shield][step-1];
 const edition=['FIND YOUR CLUB','MATCHDAY SPECIAL','THE SURVIVAL RACE'][step-1];
 return <section className={'guide-hero magazine-cover cover-'+step}>
  <div className="cover-edition"><span>K LEAGUE / FAN JOURNAL</span><span>{season} · VOL. 0{step}</span></div>
  <div className="guide-hero-copy"><div className="guide-kicker"><Icon size={16}/>{['나의 팀 찾기','빅매치','승강 센터'][step-1]}</div>
   <h1>{title}</h1><p>{description}</p>
  </div><div className="cover-visual"><span className="cover-word" aria-hidden="true">{step===1?'MY CLUB':step===2?'BIG MATCH':'STAY UP'}</span>
   <div className={'cover-clubs clubs-'+step} aria-hidden="true">{teams.slice(0,3).map((team,i)=><div key={team.id} className="cover-club" style={{'--club-color':team.color} as CSSProperties}><span className="club-ticket">{step===2?(i===0?'HOME':'AWAY'):'K LEAGUE '+team.league}</span><Tile team={team}/><strong>{team.short}</strong></div>)}{step===2&&<span className="cover-vs">VS</span>}</div>
   <div className="guide-hero-result"><span className="guide-result-label">{edition}</span>{children}</div>
  </div><div className="cover-footer"><span>YOUR TEAM. YOUR GAME. YOUR STORY.</span><span>관전 가이드 / 0{step}</span></div>
 </section>;
}
export function NextGuide({href,label,description}:{href:string;label:string;description:string}){
 return <a className="next-guide" href={href}><span><small>다음 관전 포인트</small><strong>{label}</strong><span>{description}</span></span><ArrowRight size={22}/></a>;
}
