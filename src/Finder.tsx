import {useEffect,useState,type CSSProperties} from 'react';
import {Sparkles,ArrowRight,RefreshCw,Heart,MapPin,Goal,Users,CalendarDays,Check,PlayCircle,Ticket} from 'lucide-react';
import type {Dataset,Answers,Team,FinderExtra} from './types';
import {recommendations,finderExtra} from './data';
import {go,Pill,SectionTitle,Tile} from './components';
import {GuideHero} from './Guide';
import {ShareCard,decodeShare,tasteLine} from './ShareCard';
import {useMatches,dayLabel,type SeasonMatch} from './matchData';
import {useHighlights} from './news';
import {KITS,kitBackground} from './kits';
import {useAccount} from './Account';
import {clubOf,setPreferredClub,setPendingClub} from './accountApi';
const EMPTY:Answers={region:'',style:'',character:'',mood:'',visit:''};
const KEY='kleague-finder-v1';
const REGION_LIST=['서울','경기','인천','강원','대전','세종','충북','충남','전북','전남','광주','대구','경북','경남','울산','부산','제주'];
const MOODS:[string,string,string][]=[['loud','뜨거운 응원석','홈 평균 관중이 많은 경기장'],['family','편안한 분위기','관중이 리그 평균쯤인 경기장'],['calm','경기에 집중','관중이 적어 여유로운 경기장'],['any','상관없음','분위기는 고려하지 않아요']];
const VISITS:[string,string,string][]=[['often','한 달에 여러 번','가까운 연고지 팀을 더 우대해요'],['sometimes','시즌에 몇 번','남은 홈경기가 많은 팀을 우대해요'],['tv','주로 중계로','거리와 일정은 고려하지 않아요']];
// 다섯 질문 — 앞의 셋은 예전 저장값과 같고, 분위기·빈도는 2026-11 추가
const complete=(a:Answers)=>Boolean(a.region&&a.style&&a.character&&a.mood&&a.visit);
function restore(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');const a=v?.answers;if(a&&['','capital','any',...REGION_LIST].includes(a.region)&&['','attack','defense','open'].includes(a.style)&&['','strong','underdog'].includes(a.character)){const ans:Answers={region:a.region,style:a.style,character:a.character,mood:MOODS.some(([v])=>v===a.mood)?a.mood:'',visit:VISITS.some(([v])=>v===a.visit)?a.visit:''};return {answers:ans,submitted:!!(v.submitted&&complete(ans))};}}catch{}return {answers:EMPTY,submitted:false};}

// 지금 답변으로 보면 각 항목이 몇 점 만점인지(답하지 않은 항목·지역 상관없음은 나머지로 다시 나눔)
function weights(a:Answers):[string,number][]{
 const parts:[string,number][]=[['경기 스타일',25],['응원 성향',20]];
 if(a.mood&&a.mood!=='any')parts.push(['경기장 분위기',15]);
 if(a.visit==='often'||a.visit==='sometimes')parts.push(['직관 빈도',10]);
 const budget=a.region==='any'?100:70,sum=parts.reduce((s,[,w])=>s+w,0);
 return [...(a.region==='any'?[]:[['지역 일치',30] as [string,number]]),...parts.map(([n,w])=>[n,Math.round(w/sum*budget)] as [string,number])];
}

export default function Finder({data,share}:{data:Dataset;share?:string}){
 const [saved]=useState(restore);
 const {data:season}=useMatches();
 const extra:FinderExtra|undefined=season?finderExtra(season.matches):undefined;
 const shared=decodeShare(share),sharedPicks=shared?recommendations(data,shared,extra).slice(0,3):[];
 const [answers,setAnswers]=useState<Answers>(saved.answers),[submitted,setSubmitted]=useState(saved.submitted),[missing,setMissing]=useState(false),[storageError,setStorageError]=useState(false);
 const ready=complete(answers);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify({answers,submitted}));setStorageError(false)}catch{setStorageError(true)}},[answers,submitted]);
 const change=(field:keyof Answers,value:string)=>{setAnswers(a=>({...a,[field]:value}));setSubmitted(false)};
 const results=submitted?recommendations(data,answers,extra):[];
 const answered=[answers.region,answers.style,answers.character,answers.mood,answers.visit].filter(Boolean).length;
 const options=(field:'mood'|'visit',list:[string,string,string][],two=false)=><div className={'option-grid'+(two?' two':'')}>{list.map(([v,label,desc])=><button key={v} className={'option '+(answers[field]===v?'selected':'')} aria-pressed={answers[field]===v} onClick={()=>change(field,v)}><strong>{label}</strong><small>{desc}</small></button>)}</div>;
 return <>{shared&&sharedPicks.length>0&&<SharedBanner answers={shared} picks={sharedPicks}/>}<GuideHero season={data.meta.season} step={1} title={'어느 팀에\n심장이 뛰나요?'} teams={data.teams.filter(t=>['seoul','jeonbuk','anyang'].includes(t.id))} description="사는 곳, 좋아하는 경기, 경기장 분위기까지. 다섯 가지 취향으로 나의 응원 후보를 만나보세요."><strong>나와 잘 맞는 팀 3곳</strong><p>추천 이유를 읽고, 세 팀을 맛본 뒤 내 팀으로 정해 보세요.</p><span className="finder-progress" role="status">{answered} / 5개 선택 완료</span></GuideHero>
 <div className="finder-layout"><div className="finder-form">
 <section className={'panel question '+(missing&&!answers.region?'invalid':'')}><div className="question-title"><span>01</span><div><h2>어디에 살고 있나요?</h2><p>가까운 지역의 팀에 조금 더 마음이 갈 수 있으니까요.</p></div><MapPin/></div><label className="sr-only" htmlFor="region">사는 지역</label><select id="region" aria-invalid={missing&&!answers.region} value={answers.region} onChange={e=>change('region',e.target.value)}><option value="">지역을 선택해 주세요</option><option value="capital">수도권</option><option value="any">상관없음 · 경기와 팀 성향으로 고를래요</option>{REGION_LIST.map(r=><option key={r}>{r}</option>)}</select>{missing&&!answers.region&&<p className="field-error">사는 지역 또는 상관없음을 선택해 주세요.</p>}</section>
 <section className={'panel question '+(missing&&!answers.style?'invalid':'')}><div className="question-title"><span>02</span><div><h2>어떤 경기를 좋아하나요?</h2><p>승패만큼 중요한, 내가 즐기는 경기의 모습.</p></div><Goal/></div><div className="option-grid">{[['attack','골 넣는 즐거움','득점이 많은 팀','⚡'],['defense','단단한 수비','실점이 적은 팀','◈'],['open','골이 많은 경기',data.seasonStats?'경기당 양 팀 합계 득점이 많은 팀':'합계 3골 이상 경기가 많은 팀','↗']].map(([v,label,desc,icon])=><button className={'option '+(answers.style===v?'selected':'')} aria-pressed={answers.style===v} key={v} onClick={()=>change('style',v)}><span className="option-icon">{icon}</span><strong>{label}</strong><small>{desc}</small></button>)}</div>{missing&&!answers.style&&<p className="field-error">좋아하는 경기 스타일을 선택해 주세요.</p>}</section>
 <section className={'panel question '+(missing&&!answers.character?'invalid':'')}><div className="question-title"><span>03</span><div><h2>어떤 팀에 마음이 가나요?</h2><p>승리의 기쁨도, 도전의 과정도 응원의 이유가 되죠.</p></div><Heart/></div><div className="option-grid two">{[['strong','자주 이기는 팀','높은 승률의 팀을 응원하고 싶어요'],['underdog','언더독','승률이 낮아도 함께 올라가고 싶어요']].map(([v,label,desc])=><button key={v} className={'option '+(answers.character===v?'selected':'')} aria-pressed={answers.character===v} onClick={()=>change('character',v)}><strong>{label}</strong><small>{desc}</small></button>)}</div>{missing&&!answers.character&&<p className="field-error">응원하고 싶은 팀 성향을 선택해 주세요.</p>}</section>
 <section className={'panel question '+(missing&&!answers.mood?'invalid':'')}><div className="question-title"><span>04</span><div><h2>어떤 경기장 분위기가 좋아요?</h2><p>같은 리그 안에서 올 시즌 홈경기 평균 관중으로 비교해요.</p></div><Users/></div>{options('mood',MOODS,true)}{missing&&!answers.mood&&<p className="field-error">좋아하는 경기장 분위기를 선택해 주세요.</p>}</section>
 <section className={'panel question '+(missing&&!answers.visit?'invalid':'')}><div className="question-title"><span>05</span><div><h2>얼마나 자주 보러 갈 수 있나요?</h2><p>자주 갈수록 가까운 경기장과 남은 홈경기가 중요해져요.</p></div><CalendarDays/></div>{options('visit',VISITS)}{missing&&!answers.visit&&<p className="field-error">직관 빈도를 선택해 주세요.</p>}</section>
 <div className="finder-actions"><button className="button primary large" disabled={!ready} onClick={()=>{const ok=complete(answers);setMissing(!ok);setSubmitted(ok);if(ok)setTimeout(()=>document.getElementById('recommendations')?.scrollIntoView({behavior:'smooth',block:'start'}),50)}}><Sparkles size={18}/>나와 맞는 팀 추천받기<ArrowRight size={18}/></button><button className="text-button" onClick={()=>{setAnswers(EMPTY);setSubmitted(false);setMissing(false)}}><RefreshCw size={14}/>다시 시작</button></div>{!ready&&<p role="status">다섯 질문에 모두 답해 주세요. 미선택: {[!answers.region&&'사는 지역',!answers.style&&'경기 스타일',!answers.character&&'팀 성향',!answers.mood&&'경기장 분위기',!answers.visit&&'직관 빈도'].filter(Boolean).join(', ')}</p>}{storageError&&<p role="alert">브라우저에서 답변을 저장할 수 없습니다.</p>}{missing&&<p role="alert" className="field-error">다섯 질문에 모두 답해 주세요.</p>}
 </div><aside className="finder-aside">{data.seasonStats&&<p className="record-coverage">{data.meta.season} 공식 누적 기록 기준. 골이 많은 경기는 경기당 득점+실점으로, 경기장 분위기는 홈경기 평균 관중으로 비교합니다.</p>}<div className="editorial-label">THE SCOUT REPORT</div><span className="large-icon"><Heart size={28}/></span><h3>느낌에 기록을 더하면,<br/>응원이 조금 더 쉬워져요.</h3><p>K리그1·2 전체 팀을 추천해요. 스타일·성향·분위기는 같은 리그 안에서 비교해요. 매칭 점수는 승리 확률이 아니에요.</p>{weights(answers).map(([n,v])=><div className="weight-row" key={n}><span>{n}</span><b>{v}점</b></div>)}<small>답하지 않았거나 '상관없음'인 항목의 점수는 나머지 항목에 나눠요.<br/>답변은 같은 브라우저에 저장해요.</small></aside></div>
 {submitted&&<section id="recommendations" className="recommendations" aria-live="polite"><SectionTitle aside={<Pill>매칭 점수 높은 순</Pill>}>당신의 응원 후보를 만났어요</SectionTitle><div className="recommend-grid">{results.slice(0,3).map((r,i)=><article className={'panel recommendation '+(i===0?'first':'')} key={r.team.id} style={{'--club-color':r.team.color} as CSSProperties}><div className="rec-top"><Pill tone={i===0?'blue':'neutral'}>{i===0?'BEST MATCH':'MATCH 0'+(i+1)}</Pill><span className="rec-score">{r.score.toFixed(1)}<small>점</small></span></div><Tile team={r.team}/><h3>{r.team.name}</h3><small>K리그{r.team.league} · {r.team.region}</small><p>{r.region===30?r.team.region+' 연고지로 지역 점수 30점. ':''}{answers.style==='defense'?'경기당 실점 '+r.values[1].toFixed(2)+'골':answers.style==='open'?(data.seasonStats?'경기당 양 팀 합계 '+r.values[3].toFixed(2)+'골':'3골 이상 경기 비율 '+r.values[3].toFixed(1)+'%'):'경기당 득점 '+r.values[0].toFixed(2)+'골'}, 승률 {r.values[4].toFixed(1)}%{r.mood!==undefined&&r.audience!==undefined?`, 홈 평균 관중 ${Math.round(r.audience).toLocaleString('ko-KR')}명`:''}의 기록이 취향에 맞아요.</p><details className="score-details"><summary>매칭 점수의 근거 보기</summary><div className="rec-breakdown">지역 {r.region} + 스타일 {r.style.toFixed(1)} + 성향 {r.character.toFixed(1)}{r.mood!==undefined?` + 분위기 ${r.mood.toFixed(1)}`:''}{r.visit!==undefined?` + 빈도 ${r.visit.toFixed(1)}`:''}</div></details><button className="button primary rec-next" onClick={()=>go('schedule/'+r.team.id)}>이 팀의 다음 경기 보기<ArrowRight size={16}/></button><button className="text-button" onClick={()=>go('lounge/'+r.team.id)}>이 팀 직관 라운지<ArrowRight size={14}/></button><button className="text-button" onClick={()=>go('team/'+r.team.id)}>팀 기록 더 보기<ArrowRight size={14}/></button></article>)}</div>
 {results.length>=3&&<TasteCompare picks={results.slice(0,3)} matches={season?.matches??null} teams={data.teams}/>}
 <ShareCard picks={results.slice(0,3)} answers={answers}/><details className="panel remaining content-panel supporting-details"><summary>나머지 {results.length-3}팀 비교하기</summary><div className="remaining-grid">{results.slice(3).map((r,i)=><button key={r.team.id} onClick={()=>go('team/'+r.team.id)}><span>{i+4}</span><Tile team={r.team} small/><strong>{r.team.short}</strong><b>{r.score.toFixed(1)}점</b></button>)}</div><p className="fine">점수 동률이면 팀 이름순으로 표시합니다. 정렬은 반올림 전 점수 기준입니다.</p></details></section>}
 </>;
}

// ── 추천 다음 단계: 세 팀 맛보기 → 이 팀으로 정하기 ──
// 다음 홈경기·예매, 최근 하이라이트, MY 팀 배경(2026 홈 유니폼) 미리보기를 나란히 보고 고른다.
function TasteCompare({picks,matches,teams}:{picks:{team:Team;score:number;audience?:number}[];matches:SeasonMatch[]|null;teams:Team[]}){
 const {user,openLogin}=useAccount();
 const [chosen,setChosen]=useState<string>(()=>clubOf(user)??'');
 const [state,setState]=useState<'idle'|'saving'|'saved'|'pending'|'error'>('idle');
 useEffect(()=>{if(user&&clubOf(user))setChosen(clubOf(user)!)},[user]);
 async function choose(t:Team){
  setChosen(t.id);
  if(!user){setPendingClub(t.id);setState('pending');openLogin(`고른 팀(${t.short})을 내 팀으로 저장하려면 로그인해 주세요. 가입하면 바로 MY 팀이 돼요.`);return}
  setState('saving');
  try{await setPreferredClub(t.id);setPendingClub('');setState('saved')}catch{setState('error')}
 }
 const chosenTeam=picks.find(p=>p.team.id===chosen)?.team;
 return <section className="taste" aria-labelledby="taste-title">
  <div className="taste-head"><h2 id="taste-title">세 팀 맛보기</h2><p>다음 홈경기, 최근 하이라이트, 내 팀이 되면 바뀌는 배경까지 비교하고 골라 보세요.</p></div>
  <div className="taste-grid">{picks.map(p=><TasteColumn key={p.team.id} teams={teams} team={p.team} audience={p.audience} matches={matches} chosen={chosen===p.team.id} busy={state==='saving'} onChoose={()=>choose(p.team)}/>)}</div>
  <p className="taste-status" role="status">{state==='saved'&&chosenTeam?<>내 팀으로 저장했어요: {chosenTeam.name}. 홈 화면 맨 위에서 일정·순위·뉴스를 볼 수 있어요. <a href="#/">홈으로 가기</a></>:state==='pending'&&chosenTeam?<>로그인하거나 가입하면 고른 팀({chosenTeam.short})이 바로 MY 팀으로 저장돼요.</>:state==='error'?'내 팀을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.':''}</p>
 </section>;
}
function TasteColumn({teams,team,audience,matches,chosen,busy,onChoose}:{teams:Team[];team:Team;audience?:number;matches:SeasonMatch[]|null;chosen:boolean;busy:boolean;onChoose:()=>void}){
 const highlights=useHighlights(team.id);
 const today=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
 const next=matches?.filter(m=>m.home===team.id&&m.status==='NS'&&m.date>=today).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))[0];
 const kit=KITS[team.id];
 const clip=highlights?.[0];
 return <article className={'taste-col'+(chosen?' chosen':'')} style={{'--club-color':team.color} as CSSProperties}>
  <div className="taste-kit" style={kit?{background:kitBackground(kit)}:{background:team.color}} aria-hidden="true"><Tile team={team}/></div>
  <h3>{team.name}</h3>
  <dl>
   <div><dt><CalendarDays size={15}/>다음 홈경기</dt><dd>{matches===null?'불러오는 중…':next?<>{dayLabel(next)} {next.time}<span>vs {teams.find(t=>t.id===next.away)?.short??next.away}</span>{next.ticket?.url&&<a href={next.ticket.url} target="_blank" rel="noreferrer"><Ticket size={14}/>예매</a>}</>:'올 시즌 남은 홈경기가 없어요'}</dd></div>
   <div><dt><Users size={15}/>홈 평균 관중</dt><dd>{audience!==undefined?`${Math.round(audience).toLocaleString('ko-KR')}명`:'기록 없음'}</dd></div>
   <div><dt><PlayCircle size={15}/>최근 하이라이트</dt><dd>{highlights===null?'불러오는 중…':clip?<a href={clip.url} target="_blank" rel="noreferrer" className="taste-clip">{clip.thumb&&<img src={clip.thumb} alt="" loading="lazy" referrerPolicy="no-referrer"/>}<span>{clip.title}</span></a>:'영상이 아직 없어요'}</dd></div>
  </dl>
  <button className={'button '+(chosen?'':'primary')} onClick={onChoose} disabled={busy} aria-pressed={chosen}>{chosen?<><Check size={16}/>내 팀으로 정했어요</>:<>이 팀으로 정하기<ArrowRight size={16}/></>}</button>
 </article>;
}

// 친구가 보낸 링크로 들어왔을 때: 친구의 결과를 먼저 보여 주고, 내 답변은 건드리지 않는다.
function SharedBanner({answers,picks}:{answers:Answers;picks:{team:Team;score:number}[]}){
 const best=picks[0].team;
 return <section className="shared-banner" style={{'--club-color':best.color} as CSSProperties} aria-labelledby="shared-title">
  <Tile team={best}/>
  <div><p className="eyebrow">친구가 보낸 결과</p><h2 id="shared-title">친구의 K리그 팀은 <b>{best.name}</b></h2><p>{tasteLine(answers)} · 다음 후보 {picks.slice(1).map(p=>p.team.short).join(', ')}</p></div>
  <div className="shared-actions"><button className="button primary" onClick={()=>{go('finder');setTimeout(()=>document.getElementById('region')?.focus(),80)}}><Sparkles size={16}/>나도 내 팀 찾기</button><button className="text-button" onClick={()=>go('lounge/'+best.id)}>{best.short} 직관 라운지<ArrowRight size={14}/></button></div>
 </section>;
}
