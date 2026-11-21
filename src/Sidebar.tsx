import type {CSSProperties} from 'react';
import {Radio,ChevronRight} from 'lucide-react';
import type {Team,League} from './types';
import type {SeasonRow} from './currentData';
import {Tile} from './components';
import {withBase} from './base';
import {useAccount} from './Account';
import {clubOf} from './accountApi';

// 왼쪽 사이드바(넓은 화면 전용): 라이브 바로가기 + K리그1·K리그2 구단 목록(현재 순위 순).
export default function Sidebar({teams,standings,activeTeam}:{teams:Team[];standings:SeasonRow[];activeTeam?:string}){
 const {user}=useAccount(),mine=clubOf(user);
 const byLeague=(l:League)=>standings.filter(r=>r.league===l).sort((a,b)=>a.rank-b.rank).map(r=>({row:r,team:teams.find(t=>t.id===r.teamId)})).filter(x=>x.team);
 return <aside className="sidebar" aria-label="리그와 구단">
  <a className="side-live" href="#/live"><span className="side-live-dot"><Radio size={14}/></span><span><b>LIVE CENTER</b><small>K리그1·2 실시간 점수</small></span><ChevronRight size={16}/></a>
  {([1,2] as League[]).map(l=><section key={l} className="side-league">
   <h2><img src={withBase(`/media/league/kleague${l}.png`)} alt={`K LEAGUE ${l}`}/></h2>
   <ul>{byLeague(l).map(({row,team})=><li key={team!.id}><a href={'#/team/'+team!.id} className={(activeTeam===team!.id?'active ':'')+(mine===team!.id?'mine':'')} title={mine===team!.id?'내 선호 구단':undefined} style={{'--club-color':team!.color} as CSSProperties}>
    <span className="side-rank">{row.rank}</span><Tile team={team!} small/><span className="side-name">{team!.short}{mine===team!.id&&<em className="side-mine">MY</em>}</span><span className="side-pts">{row.points}</span>
   </a></li>)}</ul>
  </section>)}
  <p className="side-note">순위·승점은 시즌 기록 기준일 자료예요.</p>
 </aside>;
}
