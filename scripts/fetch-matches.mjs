// 2026 K리그1·2 경기 일정·결과·경기별 기록을 K리그 공식 홈페이지(kleague.com)에서 받아 저장한다.
//
//   node scripts/fetch-matches.mjs            # 새로 끝난 경기만 추가로 받는다
//   node scripts/fetch-matches.mjs --refresh  # 끝난 경기 기록도 모두 다시 받는다
//
// 출력
//   public/data/matches-2026.json          일정·결과·팀 경기 기록 요약 (일정, 팀 분석, 프리뷰가 사용)
//   public/data/match/{league}-{gameId}.json  경기 타임라인·구간별 점유율·선수 평점 (경기 리포트가 사용)
//
// 끝난 경기의 상세 파일이 이미 있으면 다시 받지 않는다. 공식 서버에 부담을 주지 않도록 동시 요청 수를 제한한다.
// 공식 사이트가 제공하지 않는 값(xG, 슈팅 좌표 등)은 만들어 넣지 않는다.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {join} from 'node:path';

const SEASON = 2026;
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const OUT = join(ROOT, 'public/data');
const DETAIL_DIR = join(OUT, 'match');
const SUMMARY = join(OUT, `matches-${SEASON}.json`);
const BASE = 'https://www.kleague.com';
const UA = 'Mozilla/5.0 (kleague-guide data import)';
const REFRESH = process.argv.includes('--refresh');
const CONCURRENCY = 3;

// 앱 팀 ID ↔ 공식 구단 코드 (src/logos.ts와 같은 표를 사용한다)
const logos = readFileSync(join(ROOT, 'src/logos.ts'), 'utf8');
const codeToId = Object.fromEntries([...logos.matchAll(/(\w+):'(K\d+)'/g)].map(([, id, code]) => [code, id]));

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function post(path, body, json = false) {
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(BASE + path, {
        method: 'POST',
        headers: {'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9', 'Content-Type': json ? 'application/json' : 'application/x-www-form-urlencoded'},
        body: json ? JSON.stringify(body) : new URLSearchParams(body),
        signal: AbortSignal.timeout(20000),
      });
      const d = await r.json();
      if (String(d.resultCode) !== '200') throw Error(`${path} ${d.resultCode} ${d.resultMsg}`);
      return d.data;
    } catch (e) {
      if (attempt >= 3) throw e;
      await sleep(800 * attempt);
    }
  }
}
async function pool(items, fn) {
  let i = 0, done = 0;
  await Promise.all(Array.from({length: CONCURRENCY}, async () => {
    while (i < items.length) { const item = items[i++]; await fn(item); done++; if (done % 25 === 0) console.log(`  상세 기록 ${done}/${items.length}`); await sleep(150); }
  }));
}

const VENDOR = {T: '티켓링크', I: '인터파크 티켓'};
const date = s => s.replaceAll('.', '-');
const pair = (h, a) => [h ?? 0, a ?? 0];

// 1) 일정·결과
console.log('일정 받는 중…');
const schedule = [], clubs = {};
for (const league of [1, 2]) {
  for (let month = 1; month <= 12; month++) {
    const d = await post('/getScheduleList.do', {leagueId: String(league), year: String(SEASON), month: String(month).padStart(2, '0')}, true);
    for (const c of d.clubList ?? []) {
      const id = codeToId[c.teamId];
      if (id && !clubs[id]) clubs[id] = {code: c.teamId, homepage: c.homepage || null, instagram: c.clubInstagram || null, youtube: c.clubYoutube || null, facebook: c.clubFacebook || null, x: c.clubTwitter || null};
    }
    schedule.push(...(d.scheduleList ?? []).filter(m => m.leagueId === league && m.year === SEASON));
    await sleep(150);
  }
}
const seen = new Set();
const games = schedule.filter(m => { const k = m.leagueId + '-' + m.gameId; if (seen.has(k)) return false; seen.add(k); return true; });
const unknown = [...new Set(games.flatMap(m => [m.homeTeam, m.awayTeam]).filter(c => !codeToId[c]))];
if (unknown.length) throw Error('앱에 없는 구단 코드: ' + unknown.join(', '));

// 2) 끝난 경기의 상세 기록
mkdirSync(DETAIL_DIR, {recursive: true});
const previous = existsSync(SUMMARY) ? JSON.parse(readFileSync(SUMMARY, 'utf8')) : null;
const prevStats = Object.fromEntries((previous?.matches ?? []).filter(m => m.stats).map(m => [m.id, m.stats]));
const finished = games.filter(m => m.endYn === 'Y');
const todo = finished.filter(m => { const id = m.leagueId + '-' + m.gameId; return REFRESH || !prevStats[id] || !existsSync(join(DETAIL_DIR, id + '.json')); });
console.log(`경기 ${games.length}개 · 종료 ${finished.length}개 · 상세 기록 새로 받기 ${todo.length}개`);

const statsById = {...prevStats}, failed = [];
await pool(todo, async m => {
  const id = m.leagueId + '-' + m.gameId;
  const key = {year: String(SEASON), meetSeq: String(m.meetSeq), gameId: String(m.gameId)};
  try {
    const [rec, pos, all, info] = await Promise.all([
      post('/api/ddf/match/matchRecord.do', key),
      post('/api/ddf/match/possession.do', key),
      post('/api/ddf/match/getMatchRecordAllDetail.do', {...key, yearTst: key.year, gameIdTst: key.gameId, homeTeam: m.homeTeam, awayTeam: m.awayTeam, roundId: String(m.roundId)}),
      post('/api/ddf/match/matchInfo.do', key),
    ]);
    const H = rec.home, A = rec.away, h = all.sumH ?? {}, a = all.sumA ?? {};
    // 세부 기록(패스 등)이 집계되지 않은 경기는 0 대신 null로 둔다.
    const detail = (h.pass ?? 0) + (a.pass ?? 0) > 0;
    const dpair = (x, y) => detail ? pair(x, y) : null;
    statsById[id] = {
      possession: pair(H.possession, A.possession), shots: pair(H.attempts, A.attempts), onTarget: pair(H.onTarget, A.onTarget),
      shotsInBox: dpair(h.shootingInPa, a.shootingInPa), shotsOutBox: dpair(h.shootingOutPa, a.shootingOutPa),
      passes: dpair(h.pass, a.pass), passesAcc: dpair(h.passAcc, a.passAcc), keyPasses: dpair(h.exAttKeyPass, a.exAttKeyPass),
      finalThirdPasses: dpair(h.attAreaPass, a.attAreaPass), finalThirdPassesAcc: dpair(h.attAreaPassSuccess, a.attAreaPassSuccess),
      interceptions: dpair(h.intercept, a.intercept), tackles: dpair(h.tackleSuccess, a.tackleSuccess), recoveries: dpair(h.ballRecoverie, a.ballRecoverie),
      saves: dpair(h.goalkeeperSave, a.goalkeeperSave), corners: pair(H.corners, A.corners), fouls: pair(H.fouls, A.fouls),
      offsides: pair(H.offsides, A.offsides), yellow: pair(H.yellowCards, A.yellowCards), red: pair((H.redCards ?? 0) + (H.doubleYellowCards ?? 0), (A.redCards ?? 0) + (A.doubleYellowCards ?? 0)),
    };
    const periods = ['first_15', 'first_30', 'first_45', 'second_15', 'second_30', 'second_45'];
    // min은 각 하프 시작부터의 분(전반 50분 = 45+5분, 후반 10분 = 55분). 화면에서 변환한다.
    const own = new Set([...(info.homeScorer ?? []), ...(info.awayScorer ?? [])].filter(s => s.isOwnGoal).map(s => s.name + '@' + s.time));
    const TYPE = {득점: 'goal', 자책골: 'ownGoal', 경고: 'yellow', 퇴장: 'red', 경고누적퇴장: 'red', 교체: 'sub'};
    const events = [...(info.firstHalf ?? []), ...(info.secondHalf ?? [])]
      .filter(e => TYPE[e.eventName])
      .map(e => ({half: Number(e.halfType), min: e.timeMin, type: TYPE[e.eventName] === 'goal' && own.has(e.playerName + '@' + (e.timeMin + (Number(e.halfType) === 2 ? 45 : 0))) ? 'ownGoal' : TYPE[e.eventName], side: e.homeOrAway === 'HOME' ? 'home' : 'away', player: e.playerName || '', player2: e.playerName2 || ''}))
      .sort((x, y) => x.half - y.half || x.min - y.min);
    // 선수: [이름, 포지션, 출전 분, 평점, 득점, 도움, 슈팅, 키패스, 등번호]
    const players = list => (list ?? []).filter(p => p.minutePlay > 0).map(p => [p.playerName, p.playerPos, p.minutePlay, p.playerPoint ?? null, p.goal ?? 0, p.assist ?? 0, p.shot ?? 0, p.exAttKeyPass ?? 0, p.backNo ?? null]);
    writeFileSync(join(DETAIL_DIR, id + '.json'), JSON.stringify({
      id, possessionByPeriod: {home: periods.map(k => Number(pos.home?.[k] ?? NaN) || null), away: periods.map(k => Number(pos.away?.[k] ?? NaN) || null)},
      events, players: {home: players(all.listH), away: players(all.listA)},
    }));
  } catch (e) {
    failed.push(id + ' ' + e.message);
  }
});

// 3) 요약 파일
// 상세 파일에서 득점 시간과 팀별 선수 시즌 합계를 만든다. 자책골은 상대 팀 득점으로 센다.
const playerTotals = {};
const readDetail = id => { const f = join(DETAIL_DIR, id + '.json'); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; };
const matches = games.map(m => {
  const id = m.leagueId + '-' + m.gameId, ft = m.endYn === 'Y';
  const detail = ft ? readDetail(id) : null;
  let goals = null;
  if (detail) {
    // [득점한 쪽 0=홈 1=원정, 하프, 하프 시작부터의 분, 자책골 1/0]
    goals = detail.events.filter(e => e.type === 'goal' || e.type === 'ownGoal')
      .map(e => [(e.side === 'home') === (e.type === 'goal') ? 0 : 1, e.half, e.min, e.type === 'ownGoal' ? 1 : 0]);
    for (const [side, teamCode] of [['home', m.homeTeam], ['away', m.awayTeam]]) {
      const team = codeToId[teamCode], rows = (playerTotals[team] ??= {});
      for (const [name, pos, min, rating, g, a, shots, kp, no] of detail.players[side]) {
        const r = (rows[name] ??= {name, pos, apps: 0, minutes: 0, ratingSum: 0, rated: 0, goals: 0, assists: 0, shots: 0, keyPasses: 0, no});
        r.apps++; r.minutes += min; r.goals += g; r.assists += a; r.shots += shots; r.keyPasses += kp; r.pos = pos; r.no = no ?? r.no;
        if (rating != null && rating > 0) { r.ratingSum += rating; r.rated++; }
      }
    }
  }
  return {
    id, league: m.leagueId, round: m.roundId, gameId: m.gameId, meetSeq: m.meetSeq,
    date: date(m.gameDate), time: m.gameTime, weekday: m.weekdayShort,
    home: codeToId[m.homeTeam], away: codeToId[m.awayTeam], venue: m.fieldNameFull || m.fieldName,
    status: ft ? 'FT' : 'NS', score: ft ? [m.homeGoal, m.awayGoal] : null,
    audience: ft ? m.audienceQty ?? null : null,
    broadcast: (m.broadcastName || '').split('//').map(s => s.trim()).filter(Boolean),
    phase: m.codeName && m.codeName !== '일반' && m.codeName !== '스플릿일반' ? m.codeName : null,
    ticket: ft ? null : {vendor: VENDOR[m.company] ?? null, url: m.externalUrl || null},
    stats: ft ? statsById[id] ?? null : null,
    goals,
  };
}).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time) || x.league - y.league);
// 선수: [이름, 포지션, 출전, 출전 분, 평균 평점, 득점, 도움, 슈팅, 키패스, 등번호]
const players = Object.fromEntries(Object.entries(playerTotals).map(([team, rows]) => [team,
  Object.values(rows).sort((x, y) => y.minutes - x.minutes)
    .map(r => [r.name, r.pos, r.apps, r.minutes, r.rated ? Math.round(r.ratingSum / r.rated * 100) / 100 : null, r.goals, r.assists, r.shots, r.keyPasses, r.no])]));

writeFileSync(SUMMARY, JSON.stringify({
  season: SEASON,
  fetchedAt: new Date().toISOString(),
  source: {schedule: BASE + '/schedule.do', match: BASE + '/match.do'},
  note: 'K리그 공식 홈페이지 일정·경기 기록을 저장한 자료입니다. 실시간 갱신이 아닙니다.',
  clubs, matches, players,
}));
console.log(`저장 완료: 경기 ${matches.length}개, 기록 있는 경기 ${matches.filter(m => m.stats).length}개`);
if (failed.length) { console.warn(`상세 기록 실패 ${failed.length}개 (다음 실행 때 다시 시도):\n  ` + failed.join('\n  ')); }
