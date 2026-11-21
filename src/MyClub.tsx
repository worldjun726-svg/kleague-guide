import type {CSSProperties} from 'react';
import {CalendarDays,MapPin,Tv,Trophy,Shield,MessageCircle,BarChart3,ArrowRight,Star} from 'lucide-react';
import type {Dataset,League} from './types';
import {Tile,Form} from './components';
import {useAccount,ClubPicker} from './Account';
import {clubOf,nicknameOf} from './accountApi';
import {useMatches,dayLabel,type SeasonMatch} from './matchData';
import {table,magicFor} from './race';
import './myClub.css';

// 홈 화면 맨 위: 로그인한 사람의 선호 구단 대시보드. 구단을 아직 안 골랐으면 고르는 상자를 보여 준다.
export default function MyClub({data}:{data:Dataset}){
 const {user,ready}=useAccount();
 const {data:season}=useMatches();
 if(!ready||!user)return null;
 const club=clubOf(user),team=club?data.teams.find(t=>t.id===club):undefined;
 if(!team)return <section className="myclub myclub-empty">
  <div><p className="eyebrow">MY CLUB</p><h2>{nicknameOf(user)}님, 선호 구단을 골라 주세요</h2><p>고른 구단의 순위·다음 경기·매직넘버가 홈 화면 맨 위에 보여요.</p></div>
  <ClubPicker compact/>
 </section>;
 const row=data.seasonStats?.find(r=>r.teamId===team.id);
 const mine=(season?.matches||[]).filter(m=>m.home===team.id||m.away===team.id);
 const next=mine.find(m=>m.status==='NS'),last=[...mine].reverse().find(m=>m.status==='FT'&&m.score);
 const name=(id:string)=>data.teams.find(t=>t.id===id)?.short||id;
 const race=season?(()=>{const rows=table(season,team.league as League),r=rows.find(x=>x.team===team.id);return r?{rank:rows.indexOf(r)+1,pts:r.pts,magic:magicFor(r,rows,team.league as League)}:null})():null;
 const rank=race?.rank??row?.rank,pts=race?.pts??row?.points;
 const opp=(m:SeasonMatch)=>m.home===team.id?m.away:m.home;
 const result=(m:SeasonMatch)=>{const [h,a]=m.score!,my=m.home===team.id?h:a,their=m.home===team.id?a:h;return my>their?'승':my===their?'무':'패'};
 return <section className="myclub" style={{'--club-color':team.color} as CSSProperties} aria-label="내 선호 구단">
  <div className="mc-head">
   <Tile team={team}/>
   <div><p className="eyebrow"><Star size={12}/> MY CLUB · K리그{team.league}</p><h2>{team.name}</h2></div>
   <div className="mc-kpis">
    <div><small>순위</small><b>{rank??'—'}<i>위</i></b></div>
    <div><small>승점</small><b>{pts??'—'}</b></div>
    {row&&<div><small>승·무·패</small><b className="sm">{row.wins}-{row.draws}-{row.losses}</b></div>}
    {row&&<div className="hide-sm"><small>최근 5경기</small><Form values={row.form.slice(-5)}/></div>}
   </div>
  </div>
  <div className="mc-grid">
   <div className="mc-card">
    <h3><CalendarDays size={15}/>다음 경기</h3>
    {next?<><p className="mc-match">{next.home===team.id?'홈':'원정'} vs {data.teams.find(t=>t.id===opp(next))&&<Tile team={data.teams.find(t=>t.id===opp(next))!} small/>}<b>{name(opp(next))}</b></p>
     <p className="mc-meta">{dayLabel(next)} {next.time} · {next.round}R</p>
     <p className="mc-meta"><MapPin size={12}/>{next.venue}{next.broadcast.length>0&&<><Tv size={12}/>{next.broadcast.join(' · ')}</>}</p>
     <a className="button primary" href={'#/game/'+next.id}>경기 프리뷰 · 예매<ArrowRight size={14}/></a></>
     :<p className="mc-meta">{season?'남은 경기가 없어요.':'일정을 불러오는 중…'}</p>}
   </div>
   <div className="mc-card">
    <h3><Trophy size={15}/>지난 경기</h3>
    {last?<><p className="mc-match"><span className={'mc-res r'+result(last)}>{result(last)}</span>{last.home===team.id?'홈':'원정'} vs <b>{name(opp(last))}</b></p>
     <p className="mc-score">{name(last.home)} <b>{last.score![0]} : {last.score![1]}</b> {name(last.away)}</p>
     <p className="mc-meta">{dayLabel(last)} · {last.round}R</p>
     <a className="text-button" href={'#/game/'+last.id}>경기 기록 보기<ArrowRight size={13}/></a></>
     :<p className="mc-meta">{season?'아직 치른 경기가 없어요.':'기록을 불러오는 중…'}</p>}
   </div>
   <div className="mc-card">
    <h3><Shield size={15}/>승강 레이스</h3>
    {race?race.magic.map(m=><p key={m.label} className={'mc-magic '+m.tone}><b>{m.label}</b><span>{m.detail}</span></p>):<p className="mc-meta">계산 중…</p>}
    <a className="text-button" href={'#/center/'+team.id}>매직넘버 자세히<ArrowRight size={13}/></a>
   </div>
  </div>
  <nav className="mc-links" aria-label="내 구단 바로가기">
   <a href={'#/schedule/'+team.id}><CalendarDays size={15}/>전체 일정</a>
   <a href={'#/team/'+team.id}><BarChart3 size={15}/>팀 기록</a>
   <a href={'#/lounge/'+team.id}><MessageCircle size={15}/>직관 라운지</a>
   <a href="#/me"><Star size={15}/>선호 구단 바꾸기</a>
  </nav>
 </section>;
}
