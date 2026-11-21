import {useEffect, useState} from 'react';
import {withBase} from './base.ts';
import type {League} from './types';

// public/data/matches-2026.json (scripts/fetch-matches.mjs가 공식 홈페이지 자료로 만든다)
export type Pair = [number, number];
export interface MatchStats {
  possession: Pair; shots: Pair; onTarget: Pair; corners: Pair; fouls: Pair; offsides: Pair; yellow: Pair; red: Pair;
  // 세부 기록이 집계되지 않은 경기는 null
  shotsInBox: Pair | null; shotsOutBox: Pair | null; passes: Pair | null; passesAcc: Pair | null; keyPasses: Pair | null;
  finalThirdPasses: Pair | null; finalThirdPassesAcc: Pair | null; interceptions: Pair | null; tackles: Pair | null; recoveries: Pair | null; saves: Pair | null;
}
export interface SeasonMatch {
  id: string; league: League; round: number; gameId: number; meetSeq: number; date: string; time: string; weekday: string;
  home: string; away: string; venue: string; status: 'FT' | 'NS'; score: Pair | null; audience: number | null;
  broadcast: string[]; phase: string | null; ticket: {vendor: string | null; url: string | null} | null;
  stats: MatchStats | null;
  goals: [0 | 1, number, number, 0 | 1][] | null; // [득점 쪽, 하프, 하프 기준 분, 자책골]
}
export interface Club {code: string; homepage: string | null; instagram: string | null; youtube: string | null; facebook: string | null; x: string | null}
// [이름, 포지션, 출전, 출전 분, 평균 평점, 득점, 도움, 슈팅, 키패스, 등번호]
export type PlayerTotal = [string, string, number, number, number | null, number, number, number, number, string | null];
export interface SeasonMatches {season: number; fetchedAt: string; source: {schedule: string; match: string}; note: string; clubs: Record<string, Club>; matches: SeasonMatch[]; players: Record<string, PlayerTotal[]>}
// [이름, 포지션, 출전 분, 평점, 득점, 도움, 슈팅, 키패스, 등번호]
export type MatchPlayer = [string, string, number, number | null, number, number, number, number, string | null];
export interface MatchEvent {half: number; min: number; type: 'goal' | 'ownGoal' | 'yellow' | 'red' | 'sub'; side: 'home' | 'away'; player: string; player2: string}
export interface MatchDetail {id: string; possessionByPeriod: {home: (number | null)[]; away: (number | null)[]}; events: MatchEvent[]; players: {home: MatchPlayer[]; away: MatchPlayer[]}}

export function validateMatches(raw: unknown): SeasonMatches {
  const d = raw as SeasonMatches;
  if (!d || !Number.isInteger(d.season) || !Array.isArray(d.matches) || !d.clubs || !d.players) throw Error('경기 일정 데이터 형식이 올바르지 않습니다.');
  for (const m of d.matches) {
    if (!m.id || !m.home || !m.away || !/^\d{4}-\d\d-\d\d$/.test(m.date)) throw Error('경기 정보가 빠졌습니다: ' + (m.id || '알 수 없는 경기'));
    if (m.status === 'FT' && !m.score) throw Error('끝난 경기에 점수가 없습니다: ' + m.id);
    if (m.goals && m.score && (m.goals.filter(g => g[0] === 0).length !== m.score[0] || m.goals.filter(g => g[0] === 1).length !== m.score[1])) throw Error('득점 기록이 점수와 맞지 않습니다: ' + m.id);
  }
  return d;
}

let cache: Promise<SeasonMatches> | null = null;
export function loadMatches() {
  cache ??= fetch(withBase('/data/matches-2026.json')).then(async r => {
    if (!r.ok) throw Error('경기 일정을 불러오지 못했습니다. 다시 시도해 주세요.');
    return validateMatches(await r.json());
  }).catch(e => { cache = null; throw e; });
  return cache;
}
export function useMatches() {
  const [data, setData] = useState<SeasonMatches | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => { let alive = true; setError(''); loadMatches().then(d => alive && setData(d)).catch(e => alive && setError(e.message)); return () => { alive = false; }; }, [retry]);
  return {data, error, reload: () => setRetry(n => n + 1)};
}
export function useMatchDetail(id?: string) {
  const [detail, setDetail] = useState<MatchDetail | null>(null), [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!id) return;
    const c = new AbortController(); setDetail(null); setMissing(false);
    fetch(withBase(`/data/match/${id}.json`), {signal: c.signal}).then(r => r.ok ? r.json() : Promise.reject(Error('none'))).then(setDetail).catch(e => { if (e.name !== 'AbortError') setMissing(true); });
    return () => c.abort();
  }, [id]);
  return {detail, missing};
}

// ── 표시 도우미 ──────────────────────────────────────────
export const minuteLabel = (half: number, min: number) => half === 1 ? (min > 45 ? `45+${min - 45}'` : `${min}'`) : (min > 45 ? `90+${min - 45}'` : `${min + 45}'`);
export const absoluteMinute = (half: number, min: number) => half === 1 ? Math.min(min, 45) : 45 + Math.min(min, 45);
export const kickoff = (m: SeasonMatch) => new Date(`${m.date}T${m.time}:00+09:00`);
const WEEK: Record<string, string> = {Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토', Sun: '일'};
export const dayLabel = (m: SeasonMatch) => `${Number(m.date.slice(5, 7))}월 ${Number(m.date.slice(8))}일 (${WEEK[m.weekday] ?? m.weekday})`;
export const sideOf = (m: SeasonMatch, team: string) => m.home === team ? 0 : 1;
export function resultFor(m: SeasonMatch, team: string): '승' | '무' | '패' | null {
  if (!m.score) return null;
  const s = sideOf(m, team), mine = m.score[s], theirs = m.score[1 - s];
  return mine > theirs ? '승' : mine === theirs ? '무' : '패';
}

// ── 팀 시즌 프로필 ───────────────────────────────────────
export interface Split {played: number; w: number; d: number; l: number; gf: number; ga: number; points: number}
const emptySplit = (): Split => ({played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, points: 0});
function addResult(s: Split, gf: number, ga: number) { s.played++; s.gf += gf; s.ga += ga; if (gf > ga) { s.w++; s.points += 3; } else if (gf === ga) { s.d++; s.points++; } else s.l++; }

export const METRICS = [
  {key: 'shots', label: '슈팅', unit: '회', higher: true, help: '경기당 슈팅 수'},
  {key: 'onTarget', label: '유효 슈팅', unit: '회', higher: true, help: '골문으로 향한 슈팅'},
  {key: 'accuracy', label: '슈팅 정확도', unit: '%', higher: true, help: '슈팅 중 유효 슈팅 비율'},
  {key: 'conversion', label: '결정력', unit: '%', higher: true, help: '슈팅 중 골 비율'},
  {key: 'boxShare', label: '박스 안 슈팅 비율', unit: '%', higher: true, help: '페널티 박스 안에서 때린 슈팅 비율'},
  {key: 'possession', label: '점유율', unit: '%', higher: true, help: '경기 평균 점유율'},
  {key: 'passAcc', label: '패스 성공률', unit: '%', higher: true, help: '성공한 패스 / 전체 패스'},
  {key: 'keyPasses', label: '키패스', unit: '회', higher: true, help: '슈팅으로 이어진 패스'},
  {key: 'finalThird', label: '공격 지역 패스', unit: '회', higher: true, help: '상대 진영 3분의 1 지역에서의 패스'},
  {key: 'shotsAgainst', label: '허용 슈팅', unit: '회', higher: false, help: '상대에게 내준 슈팅 (낮을수록 좋음)'},
  {key: 'onTargetAgainst', label: '허용 유효 슈팅', unit: '회', higher: false, help: '상대에게 내준 유효 슈팅 (낮을수록 좋음)'},
  {key: 'defActions', label: '태클+인터셉트', unit: '회', higher: true, help: '성공 태클과 가로채기 합'},
] as const;
export type MetricKey = typeof METRICS[number]['key'];

export interface TeamProfile {
  team: string; all: Split; home: Split; away: Split; firstHalf: [number, number]; secondHalf: [number, number];
  goalsByPeriod: {for: number[]; against: number[]}; // 0-15, 16-30, 31-45+, 46-60, 61-75, 76-90+
  metrics: Record<MetricKey, number | null>; statGames: number;
  points: number[]; // 경기 순서별 누적 승점
  log: SeasonMatch[];
}
export function teamProfile(data: SeasonMatches, team: string, before?: string): TeamProfile {
  const log = data.matches.filter(m => m.status === 'FT' && (m.home === team || m.away === team) && (!before || m.date + m.time < before));
  const all = emptySplit(), home = emptySplit(), away = emptySplit();
  const firstHalf: [number, number] = [0, 0], secondHalf: [number, number] = [0, 0];
  const goalsByPeriod = {for: [0, 0, 0, 0, 0, 0], against: [0, 0, 0, 0, 0, 0]};
  const sum: Record<string, number> = {}, cnt: Record<string, number> = {};
  const acc = (k: string, v: number | null | undefined, n = 1) => { if (v == null || Number.isNaN(v)) return; sum[k] = (sum[k] ?? 0) + v; cnt[k] = (cnt[k] ?? 0) + n; };
  const points: number[] = [];
  let statGames = 0;
  for (const m of log) {
    const s = sideOf(m, team), o = 1 - s, gf = m.score![s], ga = m.score![o];
    addResult(all, gf, ga); addResult(s === 0 ? home : away, gf, ga);
    points.push(all.points);
    for (const [side, half, min] of m.goals ?? []) {
      const bucket = Math.min(5, Math.floor((absoluteMinute(half, min) - 1) / 15));
      if (side === s) { goalsByPeriod.for[Math.max(0, bucket)]++; (half === 1 ? firstHalf : secondHalf)[0]++; }
      else { goalsByPeriod.against[Math.max(0, bucket)]++; (half === 1 ? firstHalf : secondHalf)[1]++; }
    }
    const st = m.stats; if (!st) continue;
    statGames++;
    acc('shots', st.shots[s]); acc('onTarget', st.onTarget[s]); acc('possession', st.possession[s]);
    acc('shotsAgainst', st.shots[o]); acc('onTargetAgainst', st.onTarget[o]);
    acc('accN', st.onTarget[s], 0); acc('accD', st.shots[s], 0); acc('goalsN', gf, 0);
    if (st.shotsInBox) { acc('boxN', st.shotsInBox[s], 0); acc('boxD', st.shots[s], 0); }
    if (st.passes && st.passesAcc) { acc('passN', st.passesAcc[s], 0); acc('passD', st.passes[s], 0); }
    if (st.keyPasses) acc('keyPasses', st.keyPasses[s]);
    if (st.finalThirdPasses) acc('finalThird', st.finalThirdPasses[s]);
    if (st.tackles && st.interceptions) acc('defActions', st.tackles[s] + st.interceptions[s]);
  }
  const avg = (k: string) => cnt[k] ? sum[k] / cnt[k] : null;
  const ratio = (n: string, d: string) => sum[d] ? sum[n] / sum[d] * 100 : null;
  const metrics = {
    shots: avg('shots'), onTarget: avg('onTarget'), accuracy: ratio('accN', 'accD'), conversion: ratio('goalsN', 'accD'),
    boxShare: ratio('boxN', 'boxD'), possession: avg('possession'), passAcc: ratio('passN', 'passD'), keyPasses: avg('keyPasses'),
    finalThird: avg('finalThird'), shotsAgainst: avg('shotsAgainst'), onTargetAgainst: avg('onTargetAgainst'), defActions: avg('defActions'),
  } as Record<MetricKey, number | null>;
  return {team, all, home, away, firstHalf, secondHalf, goalsByPeriod, metrics, statGames, points, log};
}

export function leagueTeams(data: SeasonMatches, league: League) {
  return [...new Set(data.matches.filter(m => m.league === league).flatMap(m => [m.home, m.away]))];
}
// 같은 리그 안에서의 순위(1 = 가장 좋음)와 리그 평균
export function metricTable(data: SeasonMatches, league: League) {
  const profiles = leagueTeams(data, league).map(t => teamProfile(data, t));
  const out = {} as Record<MetricKey, {avg: number; rank: Record<string, number>}>;
  for (const m of METRICS) {
    const vals = profiles.map(p => [p.team, p.metrics[m.key]] as const).filter((x): x is readonly [string, number] => x[1] != null);
    const sorted = [...vals].sort((a, b) => m.higher ? b[1] - a[1] : a[1] - b[1]);
    out[m.key] = {avg: vals.reduce((s, [, v]) => s + v, 0) / (vals.length || 1), rank: Object.fromEntries(sorted.map(([t], i) => [t, i + 1]))};
  }
  return {profiles, table: out, size: profiles.length};
}

// 순위 기반 팀 컬러 태그. 같은 리그 상위/하위 25% 안에 들 때만 붙인다.
export function styleTags(rank: Record<MetricKey, number | undefined>, size: number) {
  const top = (k: MetricKey) => (rank[k] ?? 99) <= Math.ceil(size / 4), bottom = (k: MetricKey) => (rank[k] ?? 0) > size - Math.ceil(size / 4);
  const tags: string[] = [];
  if (top('possession') && top('passAcc')) tags.push('점유형 빌드업');
  else if (bottom('possession')) tags.push('선 수비 후 역습');
  if (top('shots')) tags.push('슈팅 물량 공세');
  if (top('boxShare')) tags.push('박스 안 공략');
  if (top('conversion')) tags.push('높은 결정력');
  if (bottom('conversion') && top('shots')) tags.push('결정력이 숙제');
  if (top('shotsAgainst')) tags.push('슈팅을 막는 수비');
  if (bottom('shotsAgainst')) tags.push('슈팅 허용 많음');
  if (top('keyPasses')) tags.push('찬스 메이킹');
  return tags.slice(0, 4);
}

// ── 단순 포아송 전망 ─────────────────────────────────────
// 홈/원정 각각의 득점·실점률을 리그 평균으로 나눈 공격·수비 지수로 기대 득점을 정한다.
// 경기 수가 적을 때 과장되지 않도록 리그 평균 쪽으로 당긴다(가상 경기 SHRINK개).
const SHRINK = 6, MAXG = 10;
function factorial(n: number) { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; }
const pois = (k: number, l: number) => Math.exp(-l) * l ** k / factorial(k);
export interface Outlook {xg: Pair; probs: [number, number, number]; likely: Pair; sample: Pair}
export function outlook(data: SeasonMatches, league: League, home: string, away: string, before?: string): Outlook | null {
  const pool = data.matches.filter(m => m.league === league && m.status === 'FT' && (!before || m.date + m.time < before));
  if (pool.length < 20) return null;
  const hAvg = pool.reduce((s, m) => s + m.score![0], 0) / pool.length, aAvg = pool.reduce((s, m) => s + m.score![1], 0) / pool.length;
  const rate = (team: string, atHome: boolean) => {
    const g = pool.filter(m => (atHome ? m.home : m.away) === team);
    const gf = g.reduce((s, m) => s + m.score![atHome ? 0 : 1], 0), ga = g.reduce((s, m) => s + m.score![atHome ? 1 : 0], 0);
    const base = atHome ? [hAvg, aAvg] : [aAvg, hAvg];
    return {n: g.length, att: (gf + SHRINK * base[0]) / (g.length + SHRINK) / base[0], def: (ga + SHRINK * base[1]) / (g.length + SHRINK) / base[1]};
  };
  const h = rate(home, true), a = rate(away, false);
  const lh = hAvg * h.att * a.def, la = aAvg * a.att * h.def;
  let pH = 0, pD = 0, pA = 0, best: Pair = [0, 0], bestP = 0;
  for (let i = 0; i <= MAXG; i++) for (let j = 0; j <= MAXG; j++) {
    const p = pois(i, lh) * pois(j, la);
    if (i > j) pH += p; else if (i === j) pD += p; else pA += p;
    if (p > bestP) { bestP = p; best = [i, j]; }
  }
  const t = pH + pD + pA;
  return {xg: [lh, la], probs: [pH / t * 100, pD / t * 100, pA / t * 100], likely: best, sample: [h.n, a.n]};
}
// 이번 시즌 이미 끝난 경기에 같은 모형을 "그 경기 이전 자료만으로" 적용해 본 결과
export function backtest(data: SeasonMatches, league: League) {
  let n = 0, hit = 0, brier = 0, baseHit = 0;
  const done = data.matches.filter(m => m.league === league && m.status === 'FT');
  const homeWinShare = done.filter(m => m.score![0] > m.score![1]).length / (done.length || 1);
  for (const m of done) {
    const o = outlook(data, league, m.home, m.away, m.date + m.time);
    if (!o || o.sample[0] < 4 || o.sample[1] < 4) continue;
    const actual = m.score![0] > m.score![1] ? 0 : m.score![0] === m.score![1] ? 1 : 2;
    const pick = o.probs.indexOf(Math.max(...o.probs));
    n++; if (pick === actual) hit++; if (actual === 0) baseHit++;
    brier += o.probs.reduce((s, p, i) => s + (p / 100 - (i === actual ? 1 : 0)) ** 2, 0);
  }
  return {n, hitRate: n ? hit / n * 100 : 0, brier: n ? brier / n : 0, homeOnly: n ? baseHit / n * 100 : homeWinShare * 100};
}

// ── 경기 해설 문장 (기록으로만 만든다) ────────────────────
export function matchInsights(m: SeasonMatch, names: [string, string], detail: MatchDetail | null): string[] {
  const st = m.stats, sc = m.score; if (!st || !sc) return [];
  const out: string[] = [];
  const win = sc[0] > sc[1] ? 0 : sc[0] < sc[1] ? 1 : null, lose = win == null ? null : 1 - win;
  if (win != null && lose != null) {
    if (st.possession[win] <= 42) out.push(`${names[win]}은(는) 점유율 ${st.possession[win]}%로 공을 덜 갖고도 이겼습니다. 공이 없을 때 버티고 기회에서 끝낸 경기.`);
    if (st.shots[lose] >= st.shots[win] + 5) out.push(`${names[lose]}이(가) 슈팅 ${st.shots[lose]}-${st.shots[win]}로 더 많이 두드렸지만 결과를 얻지 못했습니다.`);
    if (st.onTarget[win] > 0 && sc[win] / st.onTarget[win] >= 0.6 && sc[win] >= 2) out.push(`${names[win]}은(는) 유효 슈팅 ${st.onTarget[win]}개 중 ${sc[win]}개를 골로 연결한 높은 효율을 보였습니다.`);
  } else {
    const more = st.shots[0] > st.shots[1] ? 0 : 1;
    if (Math.abs(st.shots[0] - st.shots[1]) >= 6) out.push(`무승부였지만 슈팅은 ${names[more]}이(가) ${st.shots[more]}-${st.shots[1 - more]}로 크게 앞섰습니다.`);
  }
  const gap = st.possession[0] - st.possession[1];
  if (Math.abs(gap) >= 20) out.push(`점유율 ${st.possession[0]}:${st.possession[1]}, 한쪽이 공을 쥐고 다른 쪽이 기다린 경기였습니다.`);
  if (st.red[0] + st.red[1] > 0) {
    const r = st.red[0] > 0 ? 0 : 1;
    out.push(`${names[r]}의 퇴장이 나왔습니다. 수적 열세가 경기 흐름에 영향을 줬을 수 있어요.`);
  }
  if (detail && sc[0] !== sc[1]) {
    const goals = detail.events.filter(e => e.type === 'goal' || e.type === 'ownGoal');
    const winSide = sc[0] > sc[1] ? 'home' : 'away';
    // 결승골: 승리 팀의 (진 팀 점수 + 1)번째 골
    let count = 0, winner: MatchEvent | undefined;
    for (const g of goals) { const credited = (g.side === 'home') === (g.type === 'goal') ? 'home' : 'away'; if (credited === winSide && ++count === Math.min(sc[0], sc[1]) + 1) { winner = g; break; } }
    if (winner) out.push(`결승골은 ${minuteLabel(winner.half, winner.min)} ${winner.type === 'ownGoal' ? '상대 자책골' : winner.player}${winner.half === 2 && winner.min >= 35 ? ' — 막판에 갈린 승부' : ''}.`);
  }
  if (detail) {
    const all = [...detail.players.home.map(p => [p, 0] as const), ...detail.players.away.map(p => [p, 1] as const)].filter(([p]) => p[3] != null && p[2] >= 30);
    const best = all.sort((a, b) => (b[0][3] ?? 0) - (a[0][3] ?? 0))[0];
    if (best) out.push(`최고 평점은 ${names[best[1]]} ${best[0][0]} (${best[0][3]!.toFixed(1)})${best[0][4] ? ` · ${best[0][4]}골` : ''}${best[0][5] ? ` · ${best[0][5]}도움` : ''}.`);
  }
  if (st.passes && st.passesAcc) {
    const acc = [0, 1].map(i => st.passes![i] ? st.passesAcc![i] / st.passes![i] * 100 : 0);
    if (Math.abs(acc[0] - acc[1]) >= 8) { const b = acc[0] > acc[1] ? 0 : 1; out.push(`패스 성공률은 ${names[b]} ${acc[b].toFixed(0)}% 대 ${acc[1 - b].toFixed(0)}%로 차이가 컸습니다.`); }
  }
  return out.slice(0, 5);
}

// 프리뷰 관전 포인트
export function previewPoints(hp: TeamProfile, ap: TeamProfile, names: [string, string], ranks: {home: Record<string, number>; away: Record<string, number>}, size: number): string[] {
  const out: string[] = [];
  const ppg = (s: Split) => s.played ? s.points / s.played : 0;
  out.push(`${names[0]}의 홈 경기당 승점 ${ppg(hp.home).toFixed(2)} (${hp.home.w}승 ${hp.home.d}무 ${hp.home.l}패) vs ${names[1]}의 원정 경기당 승점 ${ppg(ap.away).toFixed(2)} (${ap.away.w}승 ${ap.away.d}무 ${ap.away.l}패).`);
  const last = (p: TeamProfile) => p.log.slice(-5).map(m => resultFor(m, p.team)).join('');
  out.push(`최근 5경기 (왼쪽이 오래된 경기): ${names[0]} ${last(hp) || '—'} · ${names[1]} ${last(ap) || '—'}.`);
  const lateFor = (p: TeamProfile) => p.goalsByPeriod.for[5], lateAg = (p: TeamProfile) => p.goalsByPeriod.against[5];
  if (lateFor(hp) + lateAg(ap) >= 12 || lateFor(ap) + lateAg(hp) >= 12) {
    const t = lateFor(hp) + lateAg(ap) >= lateFor(ap) + lateAg(hp) ? 0 : 1, p = t === 0 ? hp : ap, q = t === 0 ? ap : hp;
    out.push(`76분 이후를 주목하세요. ${names[t]}은(는) 이 시간대에 ${lateFor(p)}골을 넣었고, ${names[1 - t]}은(는) ${lateAg(q)}골을 내줬습니다.`);
  }
  if (ranks.home.shots && ranks.away.shotsAgainst) {
    if (ranks.home.shots <= 3 && ranks.away.shotsAgainst >= size - 2) out.push(`${names[0]}은(는) 슈팅 리그 ${ranks.home.shots}위, ${names[1]}은(는) 허용 슈팅이 많은 편(리그 ${ranks.away.shotsAgainst}위)이라 ${names[0]}의 공세가 예상됩니다.`);
    if (ranks.away.shots <= 3 && ranks.home.shotsAgainst >= size - 2) out.push(`${names[1]}은(는) 슈팅 리그 ${ranks.away.shots}위로, 허용 슈팅이 많은 ${names[0]}(리그 ${ranks.home.shotsAgainst}위)의 수비를 시험합니다.`);
  }
  if (ranks.home.possession && ranks.away.possession && Math.abs(ranks.home.possession - ranks.away.possession) >= size / 2) {
    const own = ranks.home.possession < ranks.away.possession ? 0 : 1;
    out.push(`스타일 대결: 점유율 상위 ${names[own]} vs 공을 내주고 기다리는 ${names[1 - own]}.`);
  }
  return out;
}
