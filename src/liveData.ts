import {withBase} from './base.ts';

// 라이브 경기·세부 기록 데이터의 형태.
// 지금은 public/data/live-sample.json(임의 생성 샘플)을 읽는다.
// 실제 데이터 출처를 연결할 때는 같은 형태의 JSON을 만들어 LIVE_DATA_URL만 바꾸면 화면은 그대로 동작한다.
export const LIVE_DATA_URL = withBase('/data/live-sample.json');

export type MatchStatus = 'NS' | 'LIVE' | 'FT';
export type Side = 'home' | 'away';
export interface LivePlayer { id: string; name: string; number: number; pos: 'GK' | 'DF' | 'MF' | 'FW'; age: number; nation: string; playerId: string | null }
export interface Lineup { formation: string; players: LivePlayer[] }
export interface MatchStats { xg: [number, number]; shots: [number, number]; onTarget: [number, number]; possession: [number, number]; corners: [number, number]; fouls: [number, number]; passAccuracy: [number, number] }
export interface MatchEvent { minute: number; type: 'goal' | 'yellow' | 'red'; side: Side; player: string; assist?: string; xg?: number }
export interface LiveMatch {
  id: string; league: 1 | 2; round: number; date: string; kickoff: string; status: MatchStatus; minute: number | null;
  home: string; away: string; venue: string; probabilities: [number, number, number] | null;
  score: [number, number] | null; stats: MatchStats | null; events: MatchEvent[];
  lineups: { home: Lineup; away: Lineup; confirmed: boolean }; ratings?: Record<string, number>;
}
export interface LiveData { meta: { mode: 'sample' | 'live'; note: string; updatedAt: string; refresh: string; xgModel: string }; matches: LiveMatch[] }

export function validateLive(raw: unknown): LiveData {
  const d = raw as LiveData;
  if (!d || !d.meta || !Array.isArray(d.matches)) throw new Error('경기 데이터 형식이 올바르지 않습니다.');
  for (const m of d.matches) {
    if (!m.id || !m.home || !m.away || !['NS', 'LIVE', 'FT'].includes(m.status)) throw new Error('경기 정보가 빠졌습니다: ' + (m.id || '알 수 없는 경기'));
    if (m.status !== 'NS' && (!m.score || !m.stats)) throw new Error('진행·종료 경기에 점수나 기록이 없습니다: ' + m.id);
  }
  return d;
}

export async function loadLive(signal?: AbortSignal): Promise<LiveData> {
  const r = await fetch(LIVE_DATA_URL, { signal });
  if (!r.ok) throw new Error('경기 데이터를 불러오지 못했습니다. 다시 시도해 주세요.');
  return validateLive(await r.json());
}

// 경기 시작 시각(한국 시간). 예측 마감 판단에 쓴다.
export const kickoffAt = (m: LiveMatch) => new Date(`${m.date}T${m.kickoff}:00+09:00`);
export const STATUS_LABEL: Record<MatchStatus, string> = { NS: '경기 전', LIVE: '진행 중', FT: '경기 종료' };
