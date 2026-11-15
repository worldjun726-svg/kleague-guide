import type {Team,League} from './types';
import {withBase} from './base.ts';
export interface SeasonRow {teamId:string;league:League;rank:number;played:number;points:number;wins:number;draws:number;losses:number;gf:number;ga:number;gd:number;form:string[];group:'A'|'B'|null}
export interface PlayerRecord {id:string;league:League;sourceRank:number;sourceUrl?:string;checkedAt?:string;name:string;sourceName:string;teamId:string;goals:number;assists:number;attackPoints:number;conceded:number|null;corners:number|null;fouls:number|null;shots:number|null;offsides:number|null;yellow:number|null;red:number|null;cleanSheets:number|null;appearances:number;substitutions:number|null}
export interface CurrentSeason {teamLeaders:import('./TeamTopFive').TeamLeaders;season:number;retrievedAt:string;coverage:string;sources:Record<string,{url:string;asOf:string}>;teams:Team[];standings:SeasonRow[];players:PlayerRecord[]}
export const PLAYER_STATS=[['goals','득점'],['assists','도움'],['attackPoints','공격 포인트'],['appearances','출전'],['shots','슈팅'],['corners','코너킥'],['fouls','파울'],['offsides','오프사이드'],['yellow','경고'],['red','퇴장'],['conceded','실점'],['cleanSheets','무실점 경기'],['substitutions','교체']] as const;
export function orderRows(rows:SeasonRow[]){return [...rows].sort((a,b)=>(a.group&&b.group?a.group.localeCompare(b.group):0)||b.points-a.points||b.gf-a.gf||b.gd-a.gd||a.rank-b.rank)}
export function validateCurrent(raw:unknown):CurrentSeason {
 const d=raw as CurrentSeason;
 if(!d||!Number.isInteger(d.season)||!d.sources||!Array.isArray(d.teams)||!Array.isArray(d.standings)||!Array.isArray(d.players))throw Error('현재 시즌 데이터 형식이 올바르지 않습니다.');
 const ids=new Set(d.teams.map(t=>t.id));
 if(!d.teamLeaders||d.teamLeaders.season!==d.season||!d.teamLeaders.checkedAt)throw Error('팀별 TOP 5 자료가 필요합니다.');
 for(const team of d.teams){const top=d.teamLeaders.teams[team.id];if(!top?.sourceUrl?.startsWith('https://footystats.org/clubs/'))throw Error('팀별 TOP 5 출처가 누락되었습니다.');for(const key of ['goals','assists','appearances'] as const){const rows=top[key];if(!Array.isArray(rows)||rows.length<5||new Set(rows.map(p=>p.name)).size!==rows.length||!rows.every(p=>p.name&&Number.isInteger(p.value)&&p.value>=0))throw Error('모든 팀에 기록별 TOP 5가 필요합니다.');}}
 if(ids.size!==d.teams.length||d.standings.length!==d.teams.length||new Set(d.standings.map(r=>r.teamId)).size!==ids.size)throw Error('팀 기록이 누락되거나 중복되었습니다.');
 for(const r of d.standings)if(!ids.has(r.teamId)||![r.played,r.points,r.wins,r.draws,r.losses,r.gf,r.ga].every(v=>Number.isInteger(v)&&v>=0)||r.played!==r.wins+r.draws+r.losses||r.points!==3*r.wins+r.draws||r.gd!==r.gf-r.ga)throw Error('팀 기록 합계가 올바르지 않습니다.');
 if(new Set(d.players.map(p=>p.id)).size!==d.players.length)throw Error('선수 기록이 중복되었습니다.');
 for(const p of d.players)if(!ids.has(p.teamId)||![1,2].includes(p.league)||!p.name||!PLAYER_STATS.every(([key])=>(p[key]===null?Boolean(p.sourceUrl):Number.isInteger(p[key])&&p[key]!>=0))||p.attackPoints!==p.goals+p.assists)throw Error('선수 기록이 올바르지 않습니다.');
 for(const key of ['team1','team2','player1','player2'])if(!d.sources[key]?.asOf||!d.sources[key]?.url?.startsWith('https://www.kleague.com/'))throw Error('기록의 기준일과 출처가 필요합니다.');
 return d;
}
export async function loadCurrentSeason(signal?:AbortSignal){const r=await fetch(withBase('/data/current-season.json'),{signal});if(!r.ok)throw Error('현재 시즌 기록을 불러오지 못했습니다. 다시 시도해 주세요.');return validateCurrent(await r.json())}

