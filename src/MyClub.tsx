import type {CSSProperties} from 'react';
import {CalendarDays,MapPin,Tv,Shield,MessageCircle,BarChart3,ArrowRight,Star,Newspaper,ExternalLink} from 'lucide-react';
import type {Dataset,League} from './types';
import {Tile,Form} from './components';
import {useAccount,ClubPicker} from './Account';
import {clubOf,nicknameOf} from './accountApi';
import {useMatches,dayLabel,type SeasonMatch} from './matchData';
import {table,magicFor} from './race';
import {useNews,newsFor} from './news';
import './myClub.css';

// 홈 화면 맨 위: 로그인한 사람의 MY 팀 대시보드 — 다가오는 일정과 MY 팀 뉴스를 가장 먼저.
// 구단을 아직 안 골랐으면 고르는 상자를 보여 준다.
export default function MyClub({data}:{data:Dataset}){
 const {user,ready}=useAccount();
 const {data:season}=useMatches();
 const {data:news,error:newsError}=useNews();
 if(!ready||!user)return null;
 const club=clubOf(user),team=club?data.teams.find(t=>t.id===club):undefined;
 if(!team)return <section className="myclub myclub-empty">
  <div><p className="eyebrow">MY CLUB</p><h2>{nicknameOf(user)}님, MY 팀을 골라 주세요</h2><p>고른 구단의 일정·뉴스·순위가 홈 화면 맨 위에 보여요.</p></div>
  <ClubPicker compact/>
 </section>;
 const row=data.seasonStats?.find(r=>r.teamId===team.id);
 const mine=(season?.matches||[]).filter(m=>m.home===team.id||m.away===team.id);
 const upcoming=mine.filter(m=>m.status==='NS').slice(0,4),last=[...mine].reverse().find(m=>m.status==='FT'&&m.score);
 const teamOf=(id:string)=>data.teams.find(t=>t.id===id),name=(id:string)=>teamOf(id)?.short||id;
 const race=season?(()=>{const rows=table(season,team.league as League),r=rows.find(x=>x.team===team.id);return r?{rank:rows.indexOf(r)+1,pts:r.pts,magic:magicFor(r,rows,team.league as League)}:null})():null;
 const rank=race?.rank??row?.rank,pts=race?.pts??row?.points;
 const opp=(m:SeasonMatch)=>m.home===team.id?m.away:m.home;
 const result=(m:SeasonMatch)=>{const [h,a]=m.score!,my=m.home===team.id?h:a,their=m.home===team.id?a:h;return my>their?'승':my===their?'무':'패'};
 const articles=news?newsFor(team,news.items,6):[];
 return <section className="myclub" style={{'--club-color':team.color} as CSSProperties} aria-label="MY 팀">
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
  <div className="mc-main">
   <div className="mc-card mc-schedule">
    <h3><CalendarDays size={15}/>다가오는 일정</h3>
    {upcoming.length?<ol>{upcoming.map((m,i)=>{const o=teamOf(opp(m));return <li key={m.id} className={i===0?'next':''}>
     <div className="mc-when"><b>{dayLabel(m)}</b><span>{m.time} · {m.round}R</span></div>
     <div className="mc-vs"><em>{m.home===team.id?'홈':'원정'}</em>{o&&<Tile team={o} small/>}<b>{name(opp(m))}</b></div>
     {i===0&&<p className="mc-meta"><MapPin size={12}/>{m.venue}{m.broadcast.length>0&&<><Tv size={12}/>{m.broadcast.join(' · ')}</>}</p>}
     <a className={i===0?'button primary':'text-button'} href={'#/game/'+m.id}>{i===0?'프리뷰 · 예매':'프리뷰'}<ArrowRight size={13}/></a>
    </li>})}</ol>:<p className="mc-meta">{season?'남은 경기가 없어요.':'일정을 불러오는 중…'}</p>}
    {last&&<p className="mc-last"><span className={'mc-res r'+result(last)}>{result(last)}</span>지난 경기 · {dayLabel(last)} {last.home===team.id?'홈':'원정'} vs <b>{name(opp(last))}</b> <strong>{last.score![0]} : {last.score![1]}</strong><a className="text-button" href={'#/game/'+last.id}>기록<ArrowRight size={12}/></a></p>}
   </div>
   <div className="mc-card mc-news">
    <h3><Newspaper size={15}/>{team.short} 뉴스</h3>
    {articles.length?<ul>{articles.map(a=><li key={a.seq}><a href={a.url} target="_blank" rel="noreferrer">
     {a.thumb?<img src={a.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.visibility='hidden'}}/>:<span className="mc-noimg"><Newspaper size={18}/></span>}
     <span className="mc-news-text"><small>{a.category==='club'?'구단 소식':'리그 소식'}{a.date?' · '+a.date.slice(5).replace('-','.'):''}</small><strong>{a.title.replace(/^\[[^\]]+\]\s*_?/,'')}</strong></span>
     <ExternalLink size={12}/>
    </a></li>)}</ul>:<p className="mc-meta">{newsError?'뉴스를 불러오지 못했어요.':news?`최근 공식 소식 중 ${team.short} 기사가 아직 없어요.`:'뉴스를 불러오는 중…'}</p>}
    <p className="mc-source">출처 K리그 공식 홈페이지 구단·리그 소식{news?` · ${new Date(news.retrievedAt).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})} 기준`:''}</p>
   </div>
  </div>
  <div className="mc-foot">
   {race&&race.magic[0]&&<span className={'mc-magic '+race.magic[0].tone}><Shield size={13}/><b>{race.magic[0].label}</b></span>}
   <nav className="mc-links" aria-label="MY 팀 바로가기">
    <a href={'#/schedule/'+team.id}><CalendarDays size={15}/>전체 일정</a>
    <a href={'#/center/'+team.id}><Shield size={15}/>매직넘버</a>
    <a href={'#/team/'+team.id}><BarChart3 size={15}/>팀 기록</a>
    <a href={'#/lounge/'+team.id}><MessageCircle size={15}/>직관 라운지</a>
    <a href="#/me"><Star size={15}/>MY 팀 바꾸기</a>
   </nav>
  </div>
 </section>;
}
