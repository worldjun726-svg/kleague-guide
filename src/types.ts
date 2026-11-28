export type League = 1 | 2;
export interface Team { id:string; name:string; short:string; region:string; color:string; league:League }
export interface Match { id:string; league:League; round:number; date:string; home:string; away:string; score:[number,number]; probabilities:[number,number,number] | null }
export interface Odds { finalA:number; danger:number; direct:number }
export interface ForecastGame { index:number; outcomes:[Record<string,Odds>,Record<string,Odds>,Record<string,Odds>] }
export interface Forecast { asOfRound:number; baseline:Record<string,Odds>; games:Record<string,ForecastGame> }
export interface Dataset { seasonStats?: import('./currentData').SeasonRow[]; heroMedia?: {videoSrc:string|null;posterSrc:string|null}; relegation?: Record<string, Record<string, {goals:Record<string,{label:string;number:number|null;reason:string}>;nextRound?:{conditions:string[]}[];actual?:string}>>; meta:{mode:'demo'|'verified';season:number;source:string;sourceUrl?:string;generatedAt:string;model:string;simulationRuns:number;notes:string;relegationCertified:boolean};teams:Team[];matches:Match[];forecasts:Record<string,Forecast> }
export interface Row { team:Team; played:number; wins:number; draws:number; losses:number; gf:number; ga:number; gd:number; points:number; form:string[]; rank:number; tied:boolean }
// 팀 찾기 답변. mood(경기장 분위기)·visit(직관 빈도)는 2026-11 추가 — 예전 공유 링크엔 없으므로 선택 항목.
export interface Answers { region:string; style:string; character:string; mood?:string; visit?:string }
// 팀 찾기에 쓰는 시즌 경기 자료 요약: 홈경기 평균 관중, 남은 홈경기 수
export interface FinderExtra { audience:Record<string,number>; homeLeft:Record<string,number> }
