// K리그 실시간 경기 중계 프록시 (Supabase Edge Function · Deno)
// 사이트(GitHub Pages)는 브라우저에서 K리그 공식 홈페이지를 직접 부를 수 없어서(CORS), 이 함수가 대신 받아 정리해 준다.
//  GET /functions/v1/kleague-live            → 오늘(한국 시간) K리그1·2 전 경기
//  GET /functions/v1/kleague-live?date=2026-11-22
// 공식 서버 부담을 줄이려고 같은 날짜 요청은 30초 동안 저장해 둔 결과를 돌려준다.

const BASE = 'https://www.kleague.com';
const TEAM: Record<string, string> = {
  K05: 'jeonbuk', K01: 'ulsan', K09: 'seoul', K03: 'pohang', K35: 'gimcheon', K10: 'daejeon', K22: 'gwangju', K21: 'gangwon',
  K27: 'anyang', K29: 'suwonfc', K04: 'jeju', K17: 'daegu', K18: 'incheon', K02: 'suwon', K06: 'busan', K08: 'seongnam',
  K26: 'bucheon', K07: 'jeonnam', K31: 'seoule', K34: 'asan', K37: 'cheongju', K38: 'cheonan', K36: 'gimpo', K32: 'ansan',
  K20: 'gyeongnam', K39: 'hwaseong', K40: 'paju', K41: 'gimhae', K42: 'yongin',
};
const CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, OPTIONS'};
const cache = new Map<string, {at: number; body: string}>();
const TTL = 30_000;

async function post(path: string, body: Record<string, string>, json = false) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: {'Content-Type': json ? 'application/json; charset=utf-8' : 'application/x-www-form-urlencoded', 'Accept-Language': 'ko-KR,ko;q=0.9', 'User-Agent': 'kleague-guide live (fan site)'},
    body: json ? JSON.stringify(body) : new URLSearchParams(body),
    signal: AbortSignal.timeout(10_000),
  });
  const d = await r.json();
  if (String(d.resultCode) !== '200') throw Error(`${path} ${d.resultCode}`);
  return d.data;
}

const pair = (h: unknown, a: unknown) => [Number(h ?? 0), Number(a ?? 0)];
function status(raw: string, endYn: string) {
  if (endYn === 'Y' || raw === 'FE') return {status: 'FT', minute: null, label: '경기 종료'};
  if (!raw) return {status: 'NS', minute: null, label: '경기 전'};
  const m = /^([12])S\s*(\d+)/.exec(raw);
  if (m) { const half = Number(m[1]), n = Number(m[2]); const minute = half === 1 ? n : (n < 45 ? 45 + n : n); return {status: 'LIVE', minute, label: (half === 1 ? '전반 ' : '후반 ') + minute + "'"}; }
  if (/HT|HALF|하프/i.test(raw)) return {status: 'LIVE', minute: 45, label: '하프타임'};
  return {status: 'LIVE', minute: null, label: raw};
}

const EVENT: Record<string, string> = {득점: 'goal', 자책골: 'ownGoal', 경고: 'yellow', 퇴장: 'red', 경고누적퇴장: 'red', 교체: 'sub'};

async function detail(g: Record<string, unknown>) {
  const key = {year: String(g.year), meetSeq: String(g.meetSeq ?? 1), gameId: String(g.gameId)};
  const [rec, info, all] = await Promise.all([
    post('/api/ddf/match/matchRecord.do', key),
    post('/api/ddf/match/matchInfo.do', key),
    post('/api/ddf/match/getMatchRecordAllDetail.do', {...key, yearTst: key.year, gameIdTst: key.gameId, homeTeam: String(g.homeTeam), awayTeam: String(g.awayTeam), roundId: String(g.roundId)}).catch(() => null),
  ]);
  const H = rec?.home ?? {}, A = rec?.away ?? {}, h = all?.sumH ?? {}, a = all?.sumA ?? {};
  const inBox = h.shootingInPa != null && a.shootingInPa != null && (h.shootingInPa + h.shootingOutPa + a.shootingInPa + a.shootingOutPa) > 0;
  const events = [...(info?.firstHalf ?? []), ...(info?.secondHalf ?? [])]
    .filter((e: Record<string, unknown>) => EVENT[String(e.eventName)])
    .map((e: Record<string, unknown>) => ({half: Number(e.halfType), minute: Number(e.timeMin) + (Number(e.halfType) === 2 && Number(e.timeMin) < 45 ? 45 : 0), type: EVENT[String(e.eventName)], side: e.homeOrAway === 'HOME' ? 'home' : 'away', player: e.playerName || '', player2: e.playerName2 || ''}));
  return {
    stats: {
      shots: pair(H.attempts, A.attempts), onTarget: pair(H.onTarget, A.onTarget), possession: pair(H.possession, A.possession),
      corners: pair(H.corners, A.corners), fouls: pair(H.fouls, A.fouls), offsides: pair(H.offsides, A.offsides),
      yellow: pair(H.yellowCards, A.yellowCards), red: pair((H.redCards ?? 0) + (H.doubleYellowCards ?? 0), (A.redCards ?? 0) + (A.doubleYellowCards ?? 0)),
      shotsInBox: inBox ? pair(h.shootingInPa, a.shootingInPa) : null, shotsOutBox: inBox ? pair(h.shootingOutPa, a.shootingOutPa) : null,
      passes: h.pass || a.pass ? pair(h.pass, a.pass) : null, keyPasses: h.exAttKeyPass != null ? pair(h.exAttKeyPass, a.exAttKeyPass) : null,
    },
    events,
  };
}

async function day(date: string) {
  const [y, mo] = date.split('-');
  const lists = await Promise.all([1, 2].map(l => post('/getScheduleList.do', {leagueId: String(l), year: y, month: mo}, true).then(d => d.scheduleList ?? [])));
  const dotted = date.replaceAll('-', '.');
  const games = lists.flat().filter((g: Record<string, unknown>) => g.gameDate === dotted);
  const matches = await Promise.all(games.map(async (g: Record<string, unknown>) => {
    const s = status(String(g.gameStatus ?? ''), String(g.endYn ?? 'N'));
    const base = {
      id: `${g.leagueId}-${g.gameId}`, league: Number(g.leagueId), round: Number(g.roundId), date, kickoff: String(g.gameTime),
      home: TEAM[String(g.homeTeam)] ?? String(g.homeTeam), away: TEAM[String(g.awayTeam)] ?? String(g.awayTeam),
      homeName: g.homeTeamName, awayName: g.awayTeamName, venue: g.fieldNameFull || g.fieldName, phase: g.codeName || null,
      broadcast: String(g.broadcastName ?? '').split('//').filter(Boolean), ...s,
      score: s.status === 'NS' ? null : [Number(g.homeGoal ?? 0), Number(g.awayGoal ?? 0)],
    };
    if (s.status === 'NS') return {...base, stats: null, events: []};
    try { return {...base, ...(await detail(g))}; } catch { return {...base, stats: null, events: []}; }
  }));
  matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff) || a.league - b.league);
  // 오늘 경기가 없으면 이번 달·다음 달에서 가장 가까운 경기일을 알려 준다.
  let next: string | null = null;
  if (!matches.length) {
    const all = lists.flat().map((g: Record<string, unknown>) => String(g.gameDate).replaceAll('.', '-')).filter(d => d > date).sort();
    next = all[0] ?? null;
  }
  return {date, updatedAt: new Date().toISOString(), source: BASE + '/schedule.do', next, matches};
}

const todayKST = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS});
  const url = new URL(req.url), date = url.searchParams.get('date') ?? todayKST();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Response(JSON.stringify({error: 'date 형식은 YYYY-MM-DD'}), {status: 400, headers: {...CORS, 'Content-Type': 'application/json'}});
  const hit = cache.get(date);
  if (hit && Date.now() - hit.at < TTL) return new Response(hit.body, {headers: {...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=20'}});
  try {
    const body = JSON.stringify(await day(date));
    cache.set(date, {at: Date.now(), body});
    return new Response(body, {headers: {...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=20'}});
  } catch (e) {
    if (hit) return new Response(hit.body, {headers: {...CORS, 'Content-Type': 'application/json; charset=utf-8'}});
    return new Response(JSON.stringify({error: '공식 홈페이지에서 경기 정보를 받지 못했습니다.', detail: String(e)}), {status: 502, headers: {...CORS, 'Content-Type': 'application/json'}});
  }
});
