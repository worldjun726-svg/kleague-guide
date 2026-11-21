import type {League} from './types';
import {outlook,type SeasonMatches,type SeasonMatch} from './matchData';

// 승강 레이스 계산: 2026 실제 경기 결과로 순위표를 만들고, 매직넘버(확정 조건)와 남은 경기 시뮬레이션 확률을 낸다.
// 규정: K리그 공식 2026 대회요강 (https://www.kleague.com/about/competition.do)
//  - 순위: 승점 → 다득점 → 득실차 → 다승 → (승자승·벌점·추첨은 계산하지 않고 무작위로 처리)
//  - K리그1: 33R 후 1~6위 그룹A, 7~12위 그룹B. 그룹A가 1~6위, 그룹B가 7~12위로 최종 순위 결정.
//            김천상무 자동 강등. 김천이 12위가 아니면 12위는 승강 플레이오프.
//  - K리그2: 1·2위 자동 승격, 3~6위 플레이오프.

export type Outcome = 'H' | 'D' | 'A';
export const GIMCHEON = 'gimcheon';
export interface Row {team: string; played: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; remaining: number; max: number; group: 'A' | 'B' | null}

const better = (a: Row, b: Row) => b.pts - a.pts || b.gf - a.gf || (b.gf - b.ga) - (a.gf - a.ga) || b.w - a.w;

export function groupsOf(data: SeasonMatches, league: League): Record<string, 'A' | 'B'> {
  const out: Record<string, 'A' | 'B'> = {};
  if (league !== 1) return out;
  for (const m of data.matches) if (m.league === 1 && m.phase) { const g = m.phase.endsWith('A') ? 'A' : 'B'; out[m.home] = g; out[m.away] = g; }
  return out;
}

function emptyRow(team: string, group: 'A' | 'B' | null): Row {return {team, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, remaining: 0, max: 0, group}}
function add(r: Row, gf: number, ga: number) {
  r.played++; r.gf += gf; r.ga += ga;
  if (gf > ga) { r.w++; r.pts += 3; } else if (gf === ga) { r.d++; r.pts++; } else r.l++;
}

// 리그 순위(그룹 분리 반영). scores: 아직 안 한 경기에 가정한 점수.
export function table(data: SeasonMatches, league: League, scores: Record<string, [number, number]> = {}): Row[] {
  const groups = groupsOf(data, league), rows: Record<string, Row> = {};
  const row = (t: string) => rows[t] ??= emptyRow(t, groups[t] ?? null);
  for (const m of data.matches) {
    if (m.league !== league) continue;
    const h = row(m.home), a = row(m.away);
    const s = m.status === 'FT' && m.score ? m.score : scores[m.id];
    if (s) { add(h, s[0], s[1]); add(a, s[1], s[0]); } else { h.remaining++; a.remaining++; }
  }
  for (const r of Object.values(rows)) r.max = r.pts + 3 * r.remaining;
  return sortRows(Object.values(rows));
}
export function sortRows(rows: Row[]) {
  return [...rows].sort((a, b) => (a.group && b.group && a.group !== b.group ? (a.group < b.group ? -1 : 1) : 0) || better(a, b) || a.team.localeCompare(b.team));
}
export const remainingMatches = (data: SeasonMatches, league: League) => data.matches.filter(m => m.league === league && !(m.status === 'FT' && m.score));

// ── 매직넘버 ──
// "다른 팀 결과와 상관없이" 목표를 확정하는 데 필요한 추가 승점. 동률은 넘어서지 못한 것으로 보는 보수적 계산.
export interface Magic {label: string; tone: 'done' | 'live' | 'out' | 'info'; detail: string; number: number | null}
function clinchTop(r: Row, pool: Row[], k: number) {
  for (let x = 0; x <= 3 * r.remaining; x++) if (pool.filter(j => j.team !== r.team && j.max >= r.pts + x).length <= k - 1) return x;
  return null;
}
const outOfTop = (r: Row, pool: Row[], k: number) => pool.filter(j => j.team !== r.team && j.pts > r.max).length >= k;
function escapeLast(r: Row, pool: Row[]) {
  for (let x = 0; x <= 3 * r.remaining; x++) if (pool.some(j => j.team !== r.team && j.max < r.pts + x)) return x;
  return null;
}
const lockedLast = (r: Row, pool: Row[]) => pool.every(j => j.team === r.team || j.pts > r.max);

function topMagic(r: Row, pool: Row[], k: number, goal: string): Magic {
  if (outOfTop(r, pool, k)) return {label: goal + ' 불가', tone: 'out', detail: `남은 경기를 모두 이겨도 ${k}위 안에 들 수 없어요.`, number: null};
  const x = clinchTop(r, pool, k);
  if (x === 0) return {label: goal + ' 확정', tone: 'done', detail: `${k}위 밖으로 밀려날 수 없어요.`, number: 0};
  if (x === null) return {label: goal + ' 경쟁 중', tone: 'live', detail: '스스로 확정할 수는 없어요. 다른 팀 결과가 필요해요.', number: null};
  return {label: `${goal} 매직넘버 ${x}`, tone: 'live', detail: `승점 ${x}점을 더 따면 다른 팀 결과와 상관없이 확정이에요.`, number: x};
}

export function magicFor(r: Row, rows: Row[], league: League): Magic[] {
  if (league === 2) { const auto = topMagic(r, rows, 2, '자동 승격'); return auto.tone === 'done' ? [auto] : [auto, topMagic(r, rows, 6, 'PO권')]; }
  const pool = rows.filter(j => j.group === r.group);
  if (r.group === 'A') return [topMagic(r, pool, 1, '우승')];
  if (r.team === GIMCHEON) return [{label: '자동 강등', tone: 'info', detail: '김천상무는 순위와 관계없이 K리그2로 강등돼요.', number: null}];
  if (lockedLast(r, pool)) return [{label: '12위 확정', tone: 'out', detail: '김천상무가 12위가 아니면 승강 플레이오프로 가요.', number: null}];
  const x = escapeLast(r, pool);
  if (x === 0) return [{label: '12위 탈출 확정', tone: 'done', detail: '12위로 떨어질 수 없어요.', number: 0}];
  if (x === null) return [{label: '12위 탈출 경쟁 중', tone: 'live', detail: '스스로 확정할 수는 없어요. 다른 팀 결과가 필요해요.', number: null}];
  return [{label: `12위 탈출 매직넘버 ${x}`, tone: 'live', detail: `승점 ${x}점을 더 따면 12위 밖이 확정이에요.`, number: x}];
}

// ── 시뮬레이션 ──
// 남은 경기마다 기존 경기 예측 모형(포아송, matchData.outlook)의 기대득점으로 점수를 뽑아 시즌 끝 순위를 센다.
// big: 빅매치 카드에서 쓰는지, sim: 시뮬레이터 표에 보이는지
export const KEYS: Record<League, {id: string; label: string; big: boolean; sim: boolean; test: (pos: number, team: string, final: string[]) => boolean}[]> = {
  1: [
    {id: 'title', label: '우승', big: true, sim: true, test: pos => pos === 1},
    {id: 'last', label: '12위', big: true, sim: true, test: pos => pos === 12},
  ],
  2: [
    {id: 'auto', label: '자동 승격', big: true, sim: true, test: pos => pos <= 2},
    {id: 'po', label: 'PO 진출', big: false, sim: true, test: pos => pos >= 3 && pos <= 6},
    {id: 'top6', label: '6위 이내(승격 기회)', big: true, sim: false, test: pos => pos <= 6},
  ],
};
export interface SimResult {
  runs: number;
  prob: Record<string, Record<string, number>>; // team → key → 확률(0~1)
  pos: Record<string, number[]>; // team → 최종 순위별 횟수
  cond: Record<string, Record<Outcome, {n: number; prob: Record<string, Record<string, number>>}>>; // 경기 → 결과 → team → key → 확률
  lambdas: Record<string, [number, number]>;
}
function rng(seed: number) {return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };}
function poisson(l: number, r: () => number) {const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1;}
const outcomeOf = (h: number, a: number): Outcome => h > a ? 'H' : h === a ? 'D' : 'A';

export function simulate(data: SeasonMatches, league: League, fixed: Record<string, Outcome> = {}, runs = 6000): SimResult {
  const left = remainingMatches(data, league), base = table(data, league), keys = KEYS[league];
  const lambdas: Record<string, [number, number]> = {};
  for (const m of left) { const o = outlook(data, league, m.home, m.away); lambdas[m.id] = o ? [o.xg[0], o.xg[1]] : [1.3, 1.1]; }
  const teams = base.map(r => r.team), r = rng(20261121 + left.length);
  const pos: Record<string, number[]> = Object.fromEntries(teams.map(t => [t, Array(teams.length + 1).fill(0)]));
  const hit: Record<string, Record<string, number>> = Object.fromEntries(teams.map(t => [t, Object.fromEntries(keys.map(k => [k.id, 0]))]));
  const condHit: Record<string, Record<Outcome, {n: number; hit: Record<string, Record<string, number>>}>> = {};
  for (const m of left) condHit[m.id] = Object.fromEntries((['H', 'D', 'A'] as Outcome[]).map(o => [o, {n: 0, hit: Object.fromEntries(teams.map(t => [t, Object.fromEntries(keys.map(k => [k.id, 0]))]))}])) as never;
  for (let i = 0; i < runs; i++) {
    const rows: Record<string, Row> = Object.fromEntries(base.map(b => [b.team, {...b}]));
    const res: Record<string, Outcome> = {};
    for (const m of left) {
      const [lh, la] = lambdas[m.id]; let h = 0, a = 0;
      const want = fixed[m.id];
      for (let tries = 0; tries < 40; tries++) { h = poisson(lh, r); a = poisson(la, r); if (!want || outcomeOf(h, a) === want) break; }
      if (want && outcomeOf(h, a) !== want) [h, a] = want === 'H' ? [1, 0] : want === 'D' ? [1, 1] : [0, 1];
      add(rows[m.home], h, a); add(rows[m.away], a, h); res[m.id] = outcomeOf(h, a);
    }
    // 동률(승점·다득점·득실·다승)이면 무작위
    const jitter: Record<string, number> = Object.fromEntries(teams.map(t => [t, r()]));
    const final = [...Object.values(rows)].sort((a, b) => (a.group && b.group && a.group !== b.group ? (a.group < b.group ? -1 : 1) : 0) || better(a, b) || jitter[a.team] - jitter[b.team]).map(x => x.team);
    final.forEach((t, idx) => {
      const p = idx + 1; pos[t][p]++;
      for (const k of keys) if (k.test(p, t, final)) { hit[t][k.id]++; for (const m of left) condHit[m.id][res[m.id]].hit[t][k.id]++; }
    });
    for (const m of left) condHit[m.id][res[m.id]].n++;
  }
  const norm = (h: Record<string, Record<string, number>>, n: number) => Object.fromEntries(Object.entries(h).map(([t, v]) => [t, Object.fromEntries(Object.entries(v).map(([k, c]) => [k, n ? c / n : 0]))]));
  const cond: SimResult['cond'] = {};
  for (const [id, byO] of Object.entries(condHit)) cond[id] = Object.fromEntries(Object.entries(byO).map(([o, v]) => [o, {n: v.n, prob: norm(v.hit, v.n)}])) as never;
  return {runs, prob: norm(hit, runs), pos, cond, lambdas};
}

// 빅매치 지수: 이 경기의 홈 승과 원정 승에 따라 걸린 확률(우승·12위·승격·PO)이 얼마나 달라지는지의 합.
export interface Stake {team: string; key: string; label: string; ifHome: number; ifDraw: number; ifAway: number; swing: number}
export function bigMatches(data: SeasonMatches, league: League, sim: SimResult) {
  const keys = KEYS[league].filter(k => k.big);
  return remainingMatches(data, league).map(m => {
    const c = sim.cond[m.id], stakes: Stake[] = [];
    for (const t of [m.home, m.away]) for (const k of keys) {
      const ifHome = c.H.prob[t]?.[k.id] ?? 0, ifDraw = c.D.prob[t]?.[k.id] ?? 0, ifAway = c.A.prob[t]?.[k.id] ?? 0;
      const swing = Math.max(ifHome, ifDraw, ifAway) - Math.min(ifHome, ifDraw, ifAway);
      if (c.H.n > 50 && c.A.n > 50) stakes.push({team: t, key: k.id, label: k.label, ifHome, ifDraw, ifAway, swing});
    }
    stakes.sort((a, b) => b.swing - a.swing);
    return {match: m, stakes, index: stakes.reduce((s, x) => s + x.swing, 0) * 100, lambdas: sim.lambdas[m.id]};
  }).sort((a, b) => b.index - a.index);
}
export type BigMatch = ReturnType<typeof bigMatches>[number];
export const kickoffLabel = (m: SeasonMatch) => `${Number(m.date.slice(5, 7))}.${Number(m.date.slice(8))} ${m.time}`;
