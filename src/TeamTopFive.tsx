import {useState} from 'react';
import type {CurrentSeason} from './currentData';
import {SectionTitle} from './components';
export type LeaderMetric='goals'|'assists'|'appearances';
export interface LeaderEntry {name:string;value:number}
export interface TeamLeaders {season:number;provider:string;checkedAt:string;note:string;teams:Record<string,{sourceUrl:string;goals:LeaderEntry[];assists:LeaderEntry[];appearances:LeaderEntry[]}>}
const labels={goals:'득점',assists:'도움',appearances:'출전'};
const korean:Record<string,string>={'Seung-won Jeong':'정승원','Seung-Mo Lee':'이승모','Min-Kyu Song':'송민규','Seon-Min Moon':'문선민','Patryk Klimala':'클리말라','Dong-Kyung Lee':'이동경','Yago Cariello':'야고','Seung-Hyeon Jung':'정승현','Young-Gwon Kim':'김영권','Dae-Won Kim':'김대원','Jae-Hyeon Mo':'모재현','You-Hyeon Lee':'이유현','Dong-Ryul Lee':'이동률','Chung-Yong Lee':'이청용','Jae-Hyun Ko':'고재현','Se-Jin Park':'박세진','Joo-Chan Kim':'김주찬','In-Gyun Kim':'김인균','Yool Heo':'허율','Ho-Jae Lee':'이호재','Seung-Woo Lee':'이승우','Dong-Jun Lee':'이동준','Young-Bin Kim':'김영빈','Jin-Gyu Kim':'김진규','Wi-Je Cho':'조위제','Jung-In Park':'박정인','Jong-Woo Kim':'김종우','Sang-Jun Kim':'김상준','Geon-hee Lee':'이건희','Chang-Jun Park':'박창준','Min-seo Moon':'문민서','Chang-moo Sin':'신창무','Kyoung-Rok Choi':'최경록','Jae-Hee Jeong':'정재희','Min-Kyu Joo':'주민규','Jin-Su Seo':'서진수','Geon-Joo Choi':'최건주','Woon Kim':'김운','Jeong-Bin Lee':'이정빈','Joo-Ahn You':'유주안','Min-Ho Yun':'윤민호','Beom-Kyung Choi':'최범경','Jea-Ho Lee':'이재호','Joon-Suk Lee':'이준석','Dae-Gwang Lee':'이대광','Jong-Min Kim':'김종민','Joon-Ho Son':'손준호','Ju-Sung Kim':'김주성','Jun-Ho Lee':'이준호','Sang-Jun Lee':'이상준','Ga-On Baek':'백가온','Min-hyuk Kim':'김민혁','Jin-Hyeok Kim':'김진혁','Jae-Yong Park':'박재용','Ji-Ung Baek':'백지웅','In-pyo Oh':'오인표','Nam Ha':'하남','Sang-Hun Chu':'추상훈','Ji-Yong Jeong':'정지용','Jung-Woo Ha':'하정우','Seung-Bae Jung':'정승배','Gi-Yun Choi':'최기윤','Hyeon-Oh Kim':'김현오','Sang-Jun Cho':'조상준','Ki-Jong Won':'원기종','Jin-Hyuk Cho':'조진혁','Ho-Jun Son':'손호준','Hyun-Muk Kang':'강현묵','Hyeon-bin Park':'박현빈','Seong-Jin Kang':'강성진','Hyun-Jun Suk':'석현준','Chi-Ung Choi':'최치웅','Donggyu Yu':'유동규','Seung-Joon Lee':'이승준','Rae-Jun Lee':'이래준','Jae-Min Jegal':'제갈재민','Dong-Jin Park':'박동진','Si-Heon Lee':'이시헌','Jong-Eon Lee':'이종언','Jin-Woo Jeong':'정진우','Jae-Won Lee':'이재원','Seung-Wan Ryu':'류승완','In-Sung Kim':'김인성','Seung-Woo Ryu':'류승우','Je-Wook Woo':'우제욱','Seung-Jae Lee':'이승재'};
export default function TeamTopFive({data,teamId}:{data:CurrentSeason;teamId:string}){
 const [metric,setMetric]=useState<LeaderMetric>('goals');
 const source=data.teamLeaders,club=source.teams[teamId];
 const ordered=club[metric].map((p,i)=>({...p,sourceIndex:i})).sort((a,b)=>b.value-a.value||a.sourceIndex-b.sourceIndex);
 const rows=ordered.slice(0,5),team=data.teams.find(t=>t.id===teamId)!;
 return <section className="team-top-five" aria-label={team.name+' 선수 TOP 5'}>
  <SectionTitle aside={<span className="pill neutral">TOP 5</span>}>우리 팀을 이끄는 선수들</SectionTitle>
  <div className="toolbar"><div className="tabs" aria-label="TOP 5 기록 선택">{(Object.keys(labels) as LeaderMetric[]).map(key=><button key={key} className={metric===key?'selected':''} aria-pressed={metric===key} onClick={()=>setMetric(key)}>{labels[key]} TOP 5</button>)}</div><span className="fine">{source.season} 시즌 · {team.short}</span></div>
  <div className="panel table-scroll top-five-table"><table><caption>{team.name} · {labels[metric]} 상위 5명</caption><thead><tr><th scope="col">순위</th><th scope="col">선수</th><th scope="col">{labels[metric]}</th></tr></thead><tbody>{rows.map(p=>{const rank=ordered.findIndex(x=>x.value===p.value)+1,tied=ordered.filter(x=>x.value===p.value).length>1;return <tr key={p.name}><td><b className="rank">{rank}</b>{tied&&<small>공동</small>}</td><td><strong>{korean[p.name]||p.name}</strong>{korean[p.name]&&<small>{p.name}</small>}</td><td className="points">{p.value}<small>{metric==='goals'?'골':metric==='assists'?'도움':'경기'}</small></td></tr>})}</tbody></table></div>
  <p className="fine">기록 높은 순 · 동률은 공동 순위로 표시하며, 5명 경계에서는 출처의 표시 순서를 따릅니다.</p>
  <p className="record-source">{source.provider} 구단별 기록 · 확인일 {source.checkedAt} · 실시간 갱신 아님 <a href={club.sourceUrl} target="_blank" rel="noreferrer">팀별 기록 원문 ↗</a><br/>{source.note}</p>
  <a className="text-button" href="#/players">선수별 상세 기록 검색 →</a>
 </section>;
}
