import {useState,type CSSProperties} from 'react';
import {Download,Link2,Share2,Check} from 'lucide-react';
import type {Answers,Team} from './types';
import './firstVisit.css';

// 팀 찾기 결과를 친구에게 보내는 카드.
// 공유 링크는 #/finder/s-지역-스타일-성향 (각각 목록의 번호)로 만들어서, 받은 사람도 같은 결과를 본다.
export const REGIONS=['capital','any','서울','경기','인천','강원','대전','세종','충북','충남','전북','전남','광주','대구','경북','경남','울산','부산','제주'];
const STYLES=['attack','defense','open'],CHARACTERS=['strong','underdog'],MOODS=['loud','family','calm','any'],VISITS=['often','sometimes','tv'];
const STYLE_LABEL:Record<string,string>={attack:'골 넣는 즐거움',defense:'단단한 수비',open:'골이 많은 경기'};
const CHARACTER_LABEL:Record<string,string>={strong:'자주 이기는 팀',underdog:'언더독'};
const MOOD_LABEL:Record<string,string>={loud:'뜨거운 응원석',family:'편안한 분위기',calm:'경기에 집중'};
const regionLabel=(r:string)=>r==='capital'?'수도권':r==='any'?'지역 상관없음':r;

// 공유 코드: s-지역-스타일-성향[-분위기-빈도]. 예전 3자리 링크도 그대로 열린다.
export function encodeShare(a:Answers){
 const i=[REGIONS.indexOf(a.region),STYLES.indexOf(a.style),CHARACTERS.indexOf(a.character)];
 if(i.some(n=>n<0))return '';
 const more=a.mood&&a.visit?[MOODS.indexOf(a.mood),VISITS.indexOf(a.visit)]:[];
 return 's-'+[...i,...(more.some(n=>n<0)?[]:more)].join('-');
}
export function decodeShare(code?:string):Answers|null{
 const m=/^s-(\d+)-(\d+)-(\d+)(?:-(\d+)-(\d+))?$/.exec(code||'');if(!m)return null;
 const [region,style,character]=[REGIONS[+m[1]],STYLES[+m[2]],CHARACTERS[+m[3]]];
 if(!region||!style||!character)return null;
 const mood=m[4]!==undefined?MOODS[+m[4]]:undefined,visit=m[5]!==undefined?VISITS[+m[5]]:undefined;
 return {region,style,character,...(mood&&visit?{mood,visit}:{})};
}
export const tasteLine=(a:Answers)=>[regionLabel(a.region),STYLE_LABEL[a.style],CHARACTER_LABEL[a.character],a.mood?MOOD_LABEL[a.mood]:''].filter(Boolean).join(' · ');

interface Pick {team:Team;score:number}

// 인스타 스토리·카톡에 올리기 좋은 1080×1350 PNG. 외부 로고는 그리면 저장이 막히므로 팀 색과 약칭으로 그린다.
function drawCard(picks:Pick[],answers:Answers){
 const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d')!,font=(w:number,s:number)=>`${w} ${s}px 'Noto Sans KR','Malgun Gothic',sans-serif`;
 const best=picks[0].team;
 g.fillStyle='#11263d';g.fillRect(0,0,W,H);
 g.fillStyle=best.color;g.globalAlpha=.9;g.beginPath();g.arc(W-120,170,420,0,Math.PI*2);g.fill();g.globalAlpha=1;
 g.fillStyle='rgba(255,255,255,.75)';g.font=font(700,30);g.fillText('K LEAGUE GUIDE · FIND YOUR CLUB',80,120);
 g.fillStyle='#fff';g.font=font(800,64);g.fillText('나의 K리그 팀은',80,300);
 g.font=font(900,best.name.length>8?96:120);g.fillText(best.name,80,440);
 g.font=font(500,36);g.fillStyle='rgba(255,255,255,.85)';g.fillText(`K리그${best.league} · ${best.region} · 매칭 ${picks[0].score.toFixed(1)}점`,80,515);
 g.fillStyle='rgba(255,255,255,.12)';g.fillRect(80,580,W-160,110);
 g.fillStyle='#fff';g.font=font(500,34);g.fillText('내 취향  '+tasteLine(answers),120,648);
 g.fillStyle='rgba(255,255,255,.6)';g.font=font(700,30);g.fillText('다음 후보',80,790);
 picks.slice(1,3).forEach((p,i)=>{const y=840+i*150;
  g.fillStyle=p.team.color;g.beginPath();g.arc(140,y+50,50,0,Math.PI*2);g.fill();
  g.fillStyle='#fff';g.font=font(800,34);g.textAlign='center';g.fillText(p.team.short.slice(0,2),140,y+62);g.textAlign='left';
  g.font=font(800,46);g.fillText(p.team.name,220,y+48);
  g.fillStyle='rgba(255,255,255,.65)';g.font=font(500,30);g.fillText(`매칭 ${p.score.toFixed(1)}점`,220,y+92);g.fillStyle='#fff';
 });
 g.fillStyle='#da793e';g.fillRect(80,H-170,W-160,4);
 g.fillStyle='#fff';g.font=font(800,38);g.fillText('너의 팀은 어디야?  나도 찾아보기 →',80,H-100);
 g.fillStyle='rgba(255,255,255,.6)';g.font=font(500,28);g.fillText(location.host+location.pathname,80,H-55);
 return c;
}

export function ShareCard({picks,answers}:{picks:Pick[];answers:Answers}){
 const [copied,setCopied]=useState(false),[error,setError]=useState('');
 const code=encodeShare(answers);
 if(!picks.length||!code)return null;
 const best=picks[0].team;
 const url=location.origin+location.pathname+'#/finder/'+code;
 const text=`나의 K리그 팀은 ${best.name}! (${tasteLine(answers)}) 너의 팀도 찾아봐`;
 async function share(){
  setError('');
  try{
   if(navigator.share){await navigator.share({title:'나의 K리그 팀 찾기',text,url});return}
   await navigator.clipboard.writeText(text+'\n'+url);setCopied(true);setTimeout(()=>setCopied(false),2500);
  }catch(e){if((e as Error).name!=='AbortError')setError('링크를 공유하지 못했습니다. 주소창의 링크를 복사해 주세요.')}
 }
 function save(){
  setError('');
  try{const a=document.createElement('a');a.href=drawCard(picks,answers).toDataURL('image/png');a.download=`my-kleague-team-${best.id}.png`;a.click()}
  catch{setError('이미지를 만들지 못했습니다.')}
 }
 return <section className="share-card-section" aria-labelledby="share-title">
  <div className="share-card" style={{'--club-color':best.color} as CSSProperties}>
   <span className="share-kicker">FIND YOUR CLUB</span>
   <p>나의 K리그 팀은</p>
   <strong>{best.name}</strong>
   <small>K리그{best.league} · {best.region} · 매칭 {picks[0].score.toFixed(1)}점</small>
   <span className="share-taste">{tasteLine(answers)}</span>
   <ol>{picks.slice(1,3).map(p=><li key={p.team.id} style={{'--club-color':p.team.color} as CSSProperties}><i>{p.team.short.slice(0,2)}</i>{p.team.name}<b>{p.score.toFixed(1)}점</b></li>)}</ol>
  </div>
  <div className="share-copy">
   <p className="eyebrow">SHARE YOUR CLUB</p>
   <h2 id="share-title">결과를 친구에게 보내 보세요</h2>
   <p>링크를 받은 친구도 같은 결과를 보고, 바로 자기 팀을 찾아볼 수 있어요. 함께 직관 갈 친구를 만드는 가장 쉬운 방법이에요.</p>
   <div className="share-actions">
    <button className="button primary" onClick={share}>{copied?<><Check size={16}/>링크를 복사했어요</>:navigator.share?<><Share2 size={16}/>공유하기</>:<><Link2 size={16}/>링크 복사</>}</button>
    <button className="button" onClick={save}><Download size={16}/>이미지 저장</button>
   </div>
   {error&&<p className="form-error" role="alert">{error}</p>}
  </div>
 </section>;
}
