// K리그 공식 홈페이지 기록실의 선수 순위(리그별·기록별 상위 30명)를 받아 public/data/player-ranks.json 으로 저장한다.
// 기록실 화면(https://www.kleague.com/record/player.do)이 정렬할 때 부르는 주소를 그대로 사용한다.
// 실패하면 기존 파일을 그대로 두고 종료 코드 1로 끝난다(배포 작업은 continue-on-error 로 계속된다).
import {readFileSync,writeFileSync} from 'node:fs';

const OUT='public/data/player-ranks.json';
const URL='https://www.kleague.com/record/rankSort.do';
const YEAR=Number(process.env.KLEAGUE_YEAR||2026);
// 화면에 보여 줄 기록 종류 (공식 기록실의 정렬 코드)
const TYPES=['GOAL','ASSIST','AP','GAMECNT','ST','CLEAN','WARN'];

// 공식 팀 코드(K01 등) → 사이트 팀 ID. src/logos.ts 의 표를 그대로 읽는다.
const codeToTeam=Object.fromEntries([...readFileSync('src/logos.ts','utf8').matchAll(/(\w+):'(K\d+)'/g)].map(m=>[m[2],m[1]]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function fetchList(leagueId,recordType){
 const res=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8','Accept-Language':'ko-KR,ko;q=0.9','User-Agent':'kleague-guide (GitHub Pages fan site)'},body:JSON.stringify({year:String(YEAR),leagueId:String(leagueId),recordType})});
 if(!res.ok)throw Error(`${leagueId}/${recordType}: HTTP ${res.status}`);
 const json=await res.json();
 if(json.resultCode!=='200'||!Array.isArray(json.data?.list))throw Error(`${leagueId}/${recordType}: 응답 형식이 다릅니다`);
 return json.data.list.map(p=>{
  const teamId=codeToTeam[p.teamId];
  if(!teamId)throw Error(`알 수 없는 팀 코드 ${p.teamId} (${p.teamName})`);
  return {rank:p.rank,playerId:p.playerId,name:p.name,teamId,backNo:p.backNo??null,
   games:p.gameQty,subs:p.changeQty,goals:p.goalQty,assists:p.assistQty,attackPoints:p.apQty,
   shots:p.stQty,cleanSheets:p.clQty,conceded:p.lossQoal,yellow:p.warnQty,red:p.exitQty,perGame:Number(p.qtyPerGame)};
 });
}

const leagues={};
for(const league of [1,2]){
 leagues[league]={};
 for(const type of TYPES){
  const list=await fetchList(league,type);
  if(list.length<10)throw Error(`${league}/${type}: 선수가 ${list.length}명뿐입니다`);
  leagues[league][type]=list;
  await sleep(400); // 공식 서버에 부담을 주지 않도록 천천히 받는다
 }
}
const data={season:YEAR,retrievedAt:new Date().toISOString(),source:'https://www.kleague.com/record/player.do',leagues};
writeFileSync(OUT,JSON.stringify(data)+'\n');
console.log(`선수 순위 저장: K리그1·2 × ${TYPES.length}개 기록 → ${OUT}`);
