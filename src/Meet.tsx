// 직관 동행·티켓 양도 매칭 (#/meet, #/meet/new, #/meet/<글 번호>)
// 모집 글 → 신청 → 수락 → 1:1 실시간 채팅 → 경기 후 후기·신뢰도. 신고·차단으로 운영한다.
import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {ArrowLeft,ArrowRight,Users,Ticket,Send,Flag,Ban,Star,ShieldCheck,MessageCircle,Plus,CalendarDays} from 'lucide-react';
import type {Team} from './types';
import {Tile,go} from './components';
import {useAccount} from './Account';
import {accountEnabled} from './accountApi';
import {useMatches,dayLabel,type SeasonMatch} from './matchData';
import * as api from './meetApi';
import type {MeetPost,MeetRequest,MeetMessage,MeetKind,Trust,ReportReason} from './meetApi';
import './meet.css';

type Teams=Record<string,Team>;
const won=(n:number|null|undefined)=>n==null?'':n===0?'무료':n.toLocaleString('ko-KR')+'원';
const KIND_LABEL:Record<MeetKind,string>={companion:'동행',ticket:'양도'};
const STATUS_LABEL:Record<string,string>={pending:'수락 대기',accepted:'수락됨',rejected:'거절됨',cancelled:'취소됨'};
const fmtTime=(iso:string)=>new Date(iso).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});

export default function MeetPage({teams,param}:{teams:Teams;param?:string}){
 if(!accountEnabled)return <section className="panel"><h1>직관 동행·양도</h1><p>로그인 기능이 아직 연결되지 않았습니다.</p></section>;
 if(param==='new')return <NewPost teams={teams}/>;
 if(param&&/^\d+$/.test(param))return <PostDetail key={param} id={Number(param)} teams={teams}/>;
 return <MeetList teams={teams}/>;
}

function useUpcoming(){
 const {data}=useMatches();
 const now=Date.now();
 return useMemo(()=>(data?.matches??[]).filter(m=>m.status==='NS'&&new Date(`${m.date}T${m.time}:00+09:00`).getTime()>now).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),[data,now]);
}
const matchName=(m:SeasonMatch|undefined,teams:Teams)=>m?`${teams[m.home]?.short??m.home} vs ${teams[m.away]?.short??m.away}`:'';

// ── 목록 ──
function MeetList({teams}:{teams:Teams}){
 const {user,openLogin}=useAccount();
 const upcoming=useUpcoming();
 const [kind,setKind]=useState<MeetKind|''>(''),[match,setMatch]=useState('');
 const [posts,setPosts]=useState<MeetPost[]|null>(null),[names,setNames]=useState<Record<string,string>>({}),[error,setError]=useState('');
 const [blocked,setBlocked]=useState<Set<string>>(new Set());
 useEffect(()=>{setPosts(null);setError('');api.listPosts({kind:kind||undefined,matchId:match||undefined}).then(async p=>{setPosts(p);setNames(await api.nicknames(p.map(x=>x.author_id)))}).catch(e=>setError((e as Error).message))},[kind,match]);
 useEffect(()=>{if(user)api.myBlocks(user.id).then(setBlocked).catch(()=>{})},[user?.id]);
 const byId=Object.fromEntries(upcoming.map(m=>[m.id,m]));
 const visible=(posts??[]).filter(p=>!blocked.has(p.author_id));
 return <div className="meet">
  <header className="meet-head">
   <div><h1>직관 동행·양도</h1><p>같은 경기를 보러 갈 사람을 찾고, 못 가게 된 표를 정가 이하로 넘겨요. 신청이 수락되면 두 사람만 보는 채팅이 열려요.</p></div>
   <button className="button primary" onClick={()=>user?go('meet/new'):openLogin('모집 글을 쓰려면 로그인해 주세요.')}><Plus size={16}/>모집 글 쓰기</button>
  </header>
  <div className="meet-filters">
   <div className="meet-tabs" role="group" aria-label="종류">{([['','전체'],['companion','동행'],['ticket','양도']] as [MeetKind|'',string][]).map(([v,l])=><button key={v} className={kind===v?'on':''} aria-pressed={kind===v} onClick={()=>setKind(v)}>{l}</button>)}</div>
   <label className="meet-select"><span className="sr-only">경기</span><select value={match} onChange={e=>setMatch(e.target.value)}><option value="">모든 경기</option>{upcoming.slice(0,40).map(m=><option key={m.id} value={m.id}>{dayLabel(m)} {m.time} · {matchName(m,teams)}</option>)}</select></label>
  </div>
  <p className="meet-rule"><ShieldCheck size={16}/><span>티켓은 <b>정가 이하</b>로만 양도할 수 있어요. 돈은 사이트 밖에서 직접 주고받으니, 구단 양도 규정과 입장 방법을 꼭 확인하세요.</span></p>
  {error?<p className="form-error" role="alert">{error}</p>:posts===null?<p className="meet-empty">불러오는 중…</p>:!visible.length?<div className="meet-empty"><p>아직 모집 글이 없어요.</p><button className="button" onClick={()=>user?go('meet/new'):openLogin('모집 글을 쓰려면 로그인해 주세요.')}>첫 글 쓰기</button></div>:
  <ul className="meet-list">{visible.map(p=>{const m=byId[p.match_id];return <li key={p.id}><a href={'#/meet/'+p.id} className="meet-card">
   <span className={'meet-kind k-'+p.kind}>{p.kind==='ticket'?<Ticket size={14}/>:<Users size={14}/>}{KIND_LABEL[p.kind]}</span>
   <strong>{p.title}</strong>
   <span className="meet-match">{m?<>{teams[m.home]&&<Tile team={teams[m.home]} small/>}{matchName(m,teams)} · {dayLabel(m)} {m.time}</>:fmtTime(p.kickoff_at)}</span>
   <span className="meet-meta">{p.kind==='ticket'?<>{p.seats}장 · {won(p.ask_price)}<s>{p.ask_price!==p.face_price?won(p.face_price):''}</s></>:<>{p.seats}명 모집</>}{p.seat_area?` · ${p.seat_area}`:''} · {names[p.author_id]??'팬'}{p.status==='closed'&&<em>마감</em>}</span>
  </a></li>})}</ul>}
 </div>;
}

// ── 글쓰기 ──
function NewPost({teams}:{teams:Teams}){
 const {user,openLogin}=useAccount();
 const upcoming=useUpcoming();
 const [kind,setKind]=useState<MeetKind>('companion'),[matchId,setMatchId]=useState(''),[title,setTitle]=useState(''),[body,setBody]=useState(''),[seats,setSeats]=useState(1),[area,setArea]=useState(''),[face,setFace]=useState(''),[ask,setAsk]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!user)return <section className="panel meet-gate"><h1>모집 글 쓰기</h1><p>로그인하면 동행을 모집하거나 표를 양도할 수 있어요.</p><button className="button primary" onClick={()=>openLogin('모집 글을 쓰려면 로그인해 주세요.')}>로그인</button></section>;
 const faceN=Number(face),askN=Number(ask),overPrice=kind==='ticket'&&face!==''&&ask!==''&&askN>faceN;
 async function submit(e:FormEvent){
  e.preventDefault();setError('');
  const m=upcoming.find(x=>x.id===matchId);
  if(!m)return setError('경기를 골라 주세요.');
  if(kind==='ticket'&&(face===''||ask===''))return setError('정가와 양도 가격을 모두 입력해 주세요.');
  if(overPrice)return setError('양도 가격은 정가보다 높을 수 없어요.');
  setBusy(true);
  try{const id=await api.createPost(user!.id,{kind,match_id:m.id,kickoff_at:new Date(`${m.date}T${m.time}:00+09:00`).toISOString(),title:title.trim(),body:body.trim(),seats,seat_area:area.trim(),...(kind==='ticket'?{face_price:faceN,ask_price:askN}:{})});go('meet/'+id)}catch(err){setError((err as Error).message);setBusy(false)}
 }
 return <form className="panel meet-form" onSubmit={submit}>
  <a href="#/meet" className="meet-back"><ArrowLeft size={16}/>목록으로</a>
  <h1>모집 글 쓰기</h1>
  <div className="meet-tabs big" role="group" aria-label="글 종류">{(['companion','ticket'] as MeetKind[]).map(k=><button type="button" key={k} className={kind===k?'on':''} aria-pressed={kind===k} onClick={()=>setKind(k)}>{k==='ticket'?<Ticket size={16}/>:<Users size={16}/>}{k==='ticket'?'티켓 양도':'직관 동행'}</button>)}</div>
  <label>경기<select required value={matchId} onChange={e=>setMatchId(e.target.value)}><option value="">경기를 골라 주세요</option>{upcoming.slice(0,60).map(m=><option key={m.id} value={m.id}>{dayLabel(m)} {m.time} · K리그{m.league} {matchName(m,teams)}</option>)}</select></label>
  <label>제목<input required minLength={2} maxLength={60} value={title} onChange={e=>setTitle(e.target.value)} placeholder={kind==='ticket'?'N석 응원석 2장 정가 양도':'처음 직관 가는 분 같이 가요'}/></label>
  <div className="meet-row">
   <label>{kind==='ticket'?'장수':'함께 갈 인원'}<input type="number" min={1} max={10} required value={seats} onChange={e=>setSeats(Math.max(1,Math.min(10,Number(e.target.value)||1)))}/></label>
   <label>좌석·구역 <small>선택</small><input maxLength={40} value={area} onChange={e=>setArea(e.target.value)} placeholder="N석, 원정석, 가족석…"/></label>
  </div>
  {kind==='ticket'&&<><div className="meet-row">
   <label>정가(1장)<input type="number" inputMode="numeric" min={0} max={1000000} required value={face} onChange={e=>setFace(e.target.value)} placeholder="20000"/></label>
   <label>양도 가격(1장)<input type="number" inputMode="numeric" min={0} max={1000000} required value={ask} aria-invalid={overPrice} onChange={e=>setAsk(e.target.value)} placeholder="20000 이하"/></label>
  </div>{overPrice&&<p className="form-error" role="alert">양도 가격은 정가({won(faceN)})보다 높을 수 없어요.</p>}
  <p className="meet-note">웃돈을 받는 재판매(암표)는 법으로 금지돼 있어요. 구단 모바일 티켓은 양도가 안 될 수 있으니 구단 규정을 확인하세요. 돈은 사이트 밖에서 주고받으며, 사이트는 거래를 보증하지 않아요.</p></>}
  <label>내용<textarea required maxLength={1000} rows={5} value={body} onChange={e=>setBody(e.target.value)} placeholder={kind==='ticket'?'좌석 위치, 전달 방법(모바일 선물하기 등), 만날 장소…':'만날 장소·시간, 응원 스타일, 원하는 동행…'}/></label>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <button className="button primary" disabled={busy||overPrice}>{busy?'올리는 중…':'글 올리기'}<ArrowRight size={16}/></button>
 </form>;
}

// ── 글 상세: 신청·수락, 채팅, 후기, 신고·차단 ──
function PostDetail({id,teams}:{id:number;teams:Teams}){
 const {user,openLogin}=useAccount();
 const {data:season}=useMatches();
 const [post,setPost]=useState<MeetPost|null|undefined>(undefined),[reqs,setReqs]=useState<MeetRequest[]>([]),[names,setNames]=useState<Record<string,string>>({}),[trust,setTrust]=useState<Trust|null>(null),[error,setError]=useState('');
 const [open,setOpen]=useState<number|null>(null);
 const load=()=>api.getPost(id).then(p=>{setPost(p);if(p){api.trustOf(p.author_id).then(setTrust).catch(()=>{})}}).catch(e=>setError((e as Error).message));
 useEffect(()=>{load()},[id]);
 useEffect(()=>{if(!user||!post)return;api.requestsFor(post.id).then(setReqs).catch(()=>{});return api.subscribeRequests(post.id,r=>setReqs(rs=>rs.some(x=>x.id===r.id)?rs.map(x=>x.id===r.id?r:x):[...rs,r]))},[user?.id,post?.id]);
 useEffect(()=>{if(post)api.nicknames([post.author_id,...reqs.map(r=>r.applicant_id)]).then(setNames)},[post?.id,reqs.length]);
 if(error)return <p className="form-error" role="alert">{error}</p>;
 if(post===undefined)return <p className="meet-empty">불러오는 중…</p>;
 if(post===null)return <section className="panel meet-gate"><h1>글을 찾을 수 없어요</h1><p>지워졌거나 신고로 숨겨진 글이에요.</p><a className="button" href="#/meet">목록으로</a></section>;
 const m=season?.matches.find(x=>x.id===post.match_id);
 const mine=user?.id===post.author_id,myReq=reqs.find(r=>r.applicant_id===user?.id);
 const started=new Date(post.kickoff_at).getTime()<Date.now();
 const author=names[post.author_id]??'팬';
 return <div className="meet">
  <a href="#/meet" className="meet-back"><ArrowLeft size={16}/>목록으로</a>
  <article className="panel meet-post">
   <span className={'meet-kind k-'+post.kind}>{post.kind==='ticket'?<Ticket size={14}/>:<Users size={14}/>}{KIND_LABEL[post.kind]}{post.status==='closed'&&' · 마감'}</span>
   <h1>{post.title}</h1>
   <p className="meet-match big"><CalendarDays size={16}/>{m?<>{matchName(m,teams)} · {dayLabel(m)} {m.time} · {m.venue}</>:fmtTime(post.kickoff_at)}</p>
   <dl className="meet-facts">
    <div><dt>{post.kind==='ticket'?'장수':'모집 인원'}</dt><dd>{post.seats}{post.kind==='ticket'?'장':'명'}</dd></div>
    {post.seat_area&&<div><dt>좌석·구역</dt><dd>{post.seat_area}</dd></div>}
    {post.kind==='ticket'&&<div><dt>양도 가격(1장)</dt><dd>{won(post.ask_price)} <small>정가 {won(post.face_price)}</small></dd></div>}
   </dl>
   <p className="meet-body">{post.body}</p>
   <div className="meet-author"><span><b>{author}</b><TrustBadge t={trust}/></span>
    {user&&!mine&&<UserActions me={user.id} target={post.author_id} postId={post.id} name={author}/>}
   </div>
   {mine&&<div className="meet-owner"><button className="button" onClick={()=>api.setPostStatus(post.id,post.status==='open'?'closed':'open').then(load).catch(e=>setError((e as Error).message))}>{post.status==='open'?'모집 마감하기':'다시 모집하기'}</button><button className="text-button danger" onClick={()=>{if(confirm('이 글을 지울까요? 신청과 대화도 함께 지워져요.'))api.deletePost(post.id).then(()=>go('meet')).catch(e=>setError((e as Error).message))}}>글 지우기</button></div>}
  </article>

  {!user?<section className="panel meet-gate"><p>로그인하면 신청하고, 수락되면 글쓴이와 1:1로 대화할 수 있어요.</p><button className="button primary" onClick={()=>openLogin('신청하려면 로그인해 주세요.')}>로그인하고 신청하기</button></section>
  :mine?<section className="panel meet-requests"><h2>받은 신청 <span>{reqs.length}</span></h2>{!reqs.length?<p className="meet-empty">아직 신청이 없어요.</p>:<ul>{reqs.map(r=><li key={r.id}>
    <div className="mr-top"><b>{names[r.applicant_id]??'팬'}</b><span className={'mr-status s-'+r.status}>{STATUS_LABEL[r.status]}</span></div>
    <p>{r.message}</p>
    <div className="mr-actions">{r.status==='pending'&&<><button className="button primary" onClick={()=>api.setRequestStatus(r.id,'accepted').catch(e=>alert((e as Error).message))}>수락</button><button className="button" onClick={()=>api.setRequestStatus(r.id,'rejected').catch(e=>alert((e as Error).message))}>거절</button></>}
     {r.status==='accepted'&&<button className="button" onClick={()=>setOpen(open===r.id?null:r.id)}><MessageCircle size={16}/>{open===r.id?'대화 닫기':'대화 열기'}</button>}
     <UserActions me={user.id} target={r.applicant_id} postId={post.id} name={names[r.applicant_id]??'팬'}/></div>
    {r.status==='accepted'&&open===r.id&&<Chat req={r} me={user.id} other={r.applicant_id} otherName={names[r.applicant_id]??'팬'} started={started}/>}
   </li>)}</ul>}</section>
  :myReq?<section className="panel meet-requests"><h2>내 신청 <span className={'mr-status s-'+myReq.status}>{STATUS_LABEL[myReq.status]}</span></h2><p>{myReq.message}</p>
    {(myReq.status==='pending'||myReq.status==='accepted')&&<button className="text-button" onClick={()=>{if(confirm('신청을 취소할까요?'))api.setRequestStatus(myReq.id,'cancelled').catch(e=>alert((e as Error).message))}}>신청 취소</button>}
    {myReq.status==='accepted'&&<Chat req={myReq} me={user.id} other={post.author_id} otherName={author} started={started}/>}
   </section>
  :post.status==='open'&&!started?<ApplyForm me={user.id} postId={post.id} onDone={r=>setReqs(rs=>[...rs,r])}/>:<p className="meet-empty">모집이 끝난 글이에요.</p>}
 </div>;
}

function TrustBadge({t}:{t:Trust|null}){
 if(!t)return null;
 if(!t.reviews&&!t.meets)return <span className="trust new">새 회원</span>;
 return <span className="trust" title="함께한 직관 후 받은 후기 평균"><Star size={13}/>{t.avg_rating?.toFixed(1)??'-'} · 후기 {t.reviews} · 직관 {t.meets}회</span>;
}

function ApplyForm({me,postId,onDone}:{me:string;postId:number;onDone:(r:MeetRequest)=>void}){
 const [msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{await api.apply(me,postId,msg);const rs=await api.requestsFor(postId);const mine=rs.find(r=>r.applicant_id===me);if(mine)onDone(mine)}catch(err){setError((err as Error).message)}setBusy(false)}
 return <form className="panel meet-apply" onSubmit={submit}><h2>신청하기</h2><label htmlFor="apply-msg">글쓴이에게 한마디</label><textarea id="apply-msg" required maxLength={300} rows={3} value={msg} onChange={e=>setMsg(e.target.value)} placeholder="예: 처음 직관이라 같이 가고 싶어요. 2명이에요."/>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary" disabled={busy||!msg.trim()}>{busy?'신청하는 중…':'신청하기'}<ArrowRight size={16}/></button><small>수락되면 두 사람만 보는 채팅이 열려요. 전화번호·계좌 같은 개인정보는 신중하게 나눠 주세요.</small></form>;
}

// 1:1 실시간 채팅: 처음 목록을 읽고, 새 메시지는 Supabase Realtime(WebSocket) 구독으로 받는다.
function Chat({req,me,other,otherName,started}:{req:MeetRequest;me:string;other:string;otherName:string;started:boolean}){
 const [list,setList]=useState<MeetMessage[]>([]),[text,setText]=useState(''),[error,setError]=useState(''),[live,setLive]=useState('');
 const box=useRef<HTMLOListElement>(null);
 useEffect(()=>{api.messages(req.id).then(setList).catch(e=>setError((e as Error).message));return api.subscribeMessages(req.id,m=>setList(l=>l.some(x=>x.id===m.id)?l:[...l,m]),setLive)},[req.id]);
 useEffect(()=>{box.current?.scrollTo({top:box.current.scrollHeight})},[list.length]);
 async function send(e:FormEvent){e.preventDefault();const t=text.trim();if(!t)return;setError('');setText('');try{await api.sendMessage(me,req.id,t)}catch(err){setError((err as Error).message);setText(t)}}
 return <div className="meet-chat">
  <div className="mc-bar"><b>{otherName}님과의 대화</b><span className={'mc-live '+(live==='SUBSCRIBED'?'on':'')}>{live==='SUBSCRIBED'?'실시간 연결됨':'연결 중…'}</span></div>
  <ol ref={box} aria-live="polite">{list.map(m=><li key={m.id} className={m.sender_id===me?'me':''}><p>{m.body}</p><time>{fmtTime(m.created_at)}</time>{m.sender_id!==me&&<ReportMessage me={me} message={m} other={other}/>}</li>)}{!list.length&&<li className="mc-empty">첫 메시지를 보내 보세요. 만날 장소와 시간을 정해요.</li>}</ol>
  <form onSubmit={send}><label className="sr-only" htmlFor={'msg-'+req.id}>메시지</label><input id={'msg-'+req.id} maxLength={500} value={text} onChange={e=>setText(e.target.value)} placeholder="메시지 입력" autoComplete="off"/><button className="button primary" aria-label="보내기" disabled={!text.trim()}><Send size={16}/></button></form>
  {error&&<p className="form-error" role="alert">{error}</p>}
  {started&&<ReviewBox req={req} me={me} other={other} otherName={otherName}/>}
 </div>;
}

function ReviewBox({req,me,other,otherName}:{req:MeetRequest;me:string;other:string;otherName:string}){
 const [done,setDone]=useState<boolean|null>(null),[rating,setRating]=useState(5),[comment,setComment]=useState(''),[error,setError]=useState('');
 useEffect(()=>{api.myReviewFor(req.id,me).then(setDone)},[req.id]);
 if(done===null)return null;
 if(done)return <p className="meet-note">후기를 남겼어요. 고마워요!</p>;
 async function submit(e:FormEvent){e.preventDefault();setError('');try{await api.review(me,req.id,other,rating,comment);setDone(true)}catch(err){setError((err as Error).message)}}
 return <form className="meet-review" onSubmit={submit}><h3>{otherName}님과의 직관은 어땠나요?</h3><div className="stars" role="radiogroup" aria-label="별점">{[1,2,3,4,5].map(n=><button type="button" key={n} role="radio" aria-checked={rating===n} aria-label={n+'점'} className={n<=rating?'on':''} onClick={()=>setRating(n)}><Star size={20}/></button>)}</div><input maxLength={200} value={comment} onChange={e=>setComment(e.target.value)} placeholder="한 줄 후기(선택)"/>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary">후기 남기기</button></form>;
}

// 신고·차단
function UserActions({me,target,postId,name}:{me:string;target:string;postId:number;name:string}){
 const [mode,setMode]=useState<''|'report'>(''),[reason,setReason]=useState<ReportReason>('scalping'),[detail,setDetail]=useState(''),[note,setNote]=useState('');
 if(target===me)return null;
 async function doReport(e:FormEvent){e.preventDefault();try{await api.report(me,{target_user:target,post_id:postId,reason,detail});setNote('신고를 접수했어요. 운영자가 확인할게요.');setMode('')}catch(err){setNote((err as Error).message)}}
 async function doBlock(){if(!confirm(`${name}님을 차단할까요? 서로 신청·대화를 할 수 없고, 목록에서도 이 사람의 글이 안 보여요.`))return;try{await api.block(me,target);setNote(`${name}님을 차단했어요.`)}catch(err){setNote((err as Error).message)}}
 return <div className="meet-user-actions">
  <button type="button" className="text-button" onClick={()=>setMode(mode?'':'report')}><Flag size={14}/>신고</button>
  <button type="button" className="text-button" onClick={doBlock}><Ban size={14}/>차단</button>
  {mode==='report'&&<form className="meet-report" onSubmit={doReport}><label>사유<select value={reason} onChange={e=>setReason(e.target.value as ReportReason)}>{api.REPORT_REASONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><input maxLength={300} value={detail} onChange={e=>setDetail(e.target.value)} placeholder="자세한 내용(선택)"/><button className="button">신고하기</button></form>}
  {note&&<p className="meet-note" role="status">{note}</p>}
 </div>;
}
function ReportMessage({me,message,other}:{me:string;message:MeetMessage;other:string}){
 const [sent,setSent]=useState(false);
 return <button type="button" className="mc-report" aria-label="이 메시지 신고" disabled={sent} onClick={()=>{if(confirm('이 메시지를 신고할까요?'))api.report(me,{target_user:other,message_id:message.id,reason:'abuse'}).then(()=>setSent(true)).catch(()=>{})}}>{sent?'신고됨':<Flag size={12}/>}</button>;
}
