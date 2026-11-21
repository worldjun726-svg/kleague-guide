import {useEffect,useState,type CSSProperties} from 'react';
import {Trophy,Target,MessageSquare,Heart,ArrowRight,Sparkles,Users} from 'lucide-react';
import type {Team} from './types';
import type {CurrentSeason} from './currentData';
import {Tile,OUTCOMES} from './components';
import {useAccount} from './Account';
import {clubOf,listFavorites,myPredictions,listMyComments,type FavoriteKind} from './accountApi';
import {useMatches} from './matchData';
import {withBase} from './base';

// 내 페이지 아래쪽: MY 팀 시즌 카드 · 내 경기 예측(적중률) · 내 응원 글 · 저장한 응원팀/관심 선수
interface Leader {name:string;teamId:string;goals:number;assists:number;games:number}
function useLeaders(){
 const [d,setD]=useState<{goals:Leader[];assists:Leader[]}|null>(null);
 useEffect(()=>{fetch(withBase('/data/player-ranks.json')).then(r=>r.json()).then(j=>{const all=(t:string)=>[...(j.leagues['1']?.[t]??[]),...(j.leagues['2']?.[t]??[])];setD({goals:all('GOAL'),assists:all('ASSIST')})}).catch(()=>{})},[]);
 return d;
}
const targetLink=(t:string)=>{const [k,id]=t.split(':');return k==='team'?'#/team/'+id:k==='tip'?'#/lounge/'+id:k==='game'||k==='match'?'#/game/'+id:'#/'};
const targetLabel=(t:string,teams:Record<string,Team>)=>{const [k,id]=t.split(':');return k==='team'?`${teams[id]?.short??id} 응원 글`:k==='tip'?`${teams[id]?.short??id} 직관 라운지`:'경기 응원 글'};

export default function MyExtras({data}:{data:CurrentSeason}){
 const {user}=useAccount();
 const {data:season}=useMatches();
 const leaders=useLeaders();
 const [fav,setFav]=useState<{kind:FavoriteKind;item_id:string}[]>([]),[preds,setPreds]=useState<{match_id:string;pick:number}[]>([]),[posts,setPosts]=useState<{id:number;target:string;body:string;created_at:string}[]>([]);
 useEffect(()=>{if(!user)return;listFavorites(user.id).then(setFav).catch(()=>{});myPredictions(user.id).then(setPreds).catch(()=>{});listMyComments(user.id).then(setPosts).catch(()=>{})},[user]);
 if(!user)return null;
 const teams=Object.fromEntries(data.teams.map(t=>[t.id,t])),my=teams[clubOf(user)??''],row=my&&data.standings.find(r=>r.teamId===my.id);
 const topBy=(list:Leader[]|undefined)=>list?.find(p=>p.teamId===my?.id);
 const scorer=topBy(leaders?.goals),assister=topBy(leaders?.assists);
 // 예측 결과: 경기 ID는 'game-1-211' 형태
 const graded=preds.map(p=>{const m=season?.matches.find(x=>'game-'+x.id===p.match_id||x.id===p.match_id);const res=m&&m.status==='FT'&&m.score?(m.score[0]>m.score[1]?0:m.score[0]===m.score[1]?1:2):null;return {p,m,res}});
 const done=graded.filter(g=>g.res!==null),hit=done.filter(g=>g.res===g.p.pick).length;
 const favTeams=fav.filter(f=>f.kind==='team'),favPlayers=fav.filter(f=>f.kind==='player');
 return <div className="my-extras">
  <section className="panel me-card me-club" style={{'--club-color':my?.color??'#1b1d21'} as CSSProperties}>
   <h2><Trophy size={17}/>MY 팀 시즌</h2>
   {my&&row?<>
    <div className="me-club-head"><Tile team={my}/><div><b>{my.name}</b><small>K리그{my.league} · {row.rank}위 · 승점 {row.points}</small></div></div>
    <div className="me-stats"><div><small>승·무·패</small><b>{row.wins}-{row.draws}-{row.losses}</b></div><div><small>득점</small><b>{row.gf}</b></div><div><small>실점</small><b>{row.ga}</b></div><div><small>득실</small><b>{row.gd>0?'+':''}{row.gd}</b></div></div>
    <ul className="me-leaders">
     <li><small>팀 득점 1위</small>{scorer?<b>{scorer.name} <i>{scorer.goals}골</i></b>:<span>리그 득점 상위 30명 안에 없어요</span>}</li>
     <li><small>팀 도움 1위</small>{assister?<b>{assister.name} <i>{assister.assists}도움</i></b>:<span>리그 도움 상위 30명 안에 없어요</span>}</li>
    </ul>
    <a className="text-button" href={'#/team/'+my.id}>팀 기록 자세히<ArrowRight size={13}/></a>
   </>:<p className="fine">위 '내 정보'에서 MY 팀을 고르면 시즌 기록이 여기에 보여요.</p>}
  </section>
  <section className="panel me-card">
   <h2><Target size={17}/>내 경기 예측</h2>
   <div className="me-stats"><div><small>참여</small><b>{preds.length}</b></div><div><small>결과 나온 경기</small><b>{done.length}</b></div><div><small>적중</small><b>{hit}</b></div><div className="accent"><small>적중률</small><b>{done.length?Math.round(hit/done.length*100)+'%':'—'}</b></div></div>
   {graded.length?<ul className="me-list">{graded.slice(-6).reverse().map(({p,m,res})=><li key={p.match_id}>
    <span className={'me-tag '+(res===null?'wait':res===p.pick?'hit':'miss')}>{res===null?'대기':res===p.pick?'적중':'빗나감'}</span>
    {m?<a href={'#/game/'+m.id}>{m.round}R {teams[m.home]?.short} vs {teams[m.away]?.short}</a>:<span>{p.match_id}</span>}
    <small>내 예측 {OUTCOMES[p.pick]}{m?.score?` · 결과 ${m.score[0]}:${m.score[1]}`:''}</small>
   </li>)}</ul>:<p className="fine">경기 프리뷰 화면에서 승·무·패를 예측해 보세요. <a href="#/schedule">일정 보기</a></p>}
  </section>
  <section className="panel me-card">
   <h2><MessageSquare size={17}/>내가 쓴 글</h2>
   {posts.length?<ul className="me-list">{posts.map(c=><li key={c.id}><a href={targetLink(c.target)}>{targetLabel(c.target,teams)}</a><p>{c.body}</p><small>{new Date(c.created_at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</small></li>)}</ul>
    :<p className="fine">아직 쓴 글이 없어요. <a href={'#/lounge'+(my?'/'+my.id:'')}>직관 라운지</a>에서 꿀팁을 나누거나 팀 화면에서 응원 글을 남겨 보세요.</p>}
  </section>
  <section className="panel me-card">
   <h2><Heart size={17}/>저장한 응원팀 · 관심 선수</h2>
   {favTeams.length?<div className="me-chips">{favTeams.map(f=>{const t=teams[f.item_id];return <a key={f.item_id} href={'#/team/'+f.item_id}>{t&&<Tile team={t} small/>}{t?.short??f.item_id}</a>})}</div>:<p className="fine">팀 화면에서 하트를 눌러 응원팀을 저장할 수 있어요.</p>}
   {favPlayers.length?<div className="me-chips">{favPlayers.map(f=><a key={f.item_id} href={'#/player/'+f.item_id}><Users size={13}/>{data.players.find(p=>p.id===f.item_id)?.name??f.item_id}</a>)}</div>:<p className="fine">선수 화면에서 하트를 눌러 관심 선수를 저장할 수 있어요.</p>}
   <div className="me-ctas"><a className="button" href="#/finder"><Sparkles size={14}/>나의 팀 찾기</a><a className="button" href="#/players">선수 기록 보기</a></div>
  </section>
 </div>;
}
