import {useMemo, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {ArrowLeft, ArrowRight, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, RefreshCw, Ticket, Tv, MapPin, Newspaper, Instagram, Youtube, Globe, Users} from 'lucide-react';
import type {Team, League} from './types';
import {Tile, Heading, Empty, SectionTitle, Form, Chart} from './components';
import {CommentBox, PredictionBox} from './Account';
import {DatePopup, fmtDate} from './ScheduleCalendar';
import {
  useMatches, useMatchDetail, dayLabel, kickoff, minuteLabel, resultFor, teamProfile, metricTable, styleTags, outlook, backtest,
  matchInsights, previewPoints, METRICS, type SeasonMatch, type SeasonMatches, type MatchStats, type MatchDetail, type MetricKey, type Split, type TeamProfile,
} from './matchData';

type Teams = Record<string, Team>;
const fmt = (v: number | null | undefined, unit = '', digits = 1) => v == null ? '—' : v.toFixed(digits) + unit;
const officialMatchUrl = (m: SeasonMatch) => `https://www.kleague.com/match.do?year=2026&leagueId=${m.league}&gameId=${m.gameId}&meetSeq=${m.meetSeq}`;
// 두 팀 색이 비슷하면(예: 포항·제주) 원정 막대를 중립색으로 바꿔 구분되게 한다.
const rgb = (c: string) => { const n = parseInt(c.replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const awayColor = (home: string, away: string) => { const [a, b] = [rgb(home), rgb(away)]; return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 120 ? '#5d6b73' : away; };
const naverNews = (t: Team) => `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(t.name)}`;

function Loading({error, reload}: {error: string; reload: () => void}) {
  return error ? <Empty>{error} <button className="text-button" onClick={reload}><RefreshCw size={14}/>다시 불러오기</button></Empty>
    : <div className="live-loading"><LoaderCircle className="spin"/>경기 일정을 불러오는 중</div>;
}
function SourceLine({data}: {data: SeasonMatches}) {
  const at = new Date(data.fetchedAt).toLocaleString('ko-KR', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'});
  return <p className="record-source">{at} 업데이트 · 출처 <a href={data.source.schedule} target="_blank" rel="noreferrer">K리그 공식 홈페이지 <ExternalLink size={12}/></a></p>;
}

// ── 예매·캘린더 ───────────────────────────────────────────
function ticketHref(m: SeasonMatch, data: SeasonMatches) { return m.ticket?.url || data.clubs[m.home]?.homepage || data.source.schedule; }
function downloadIcs(m: SeasonMatch, teams: Teams) {
  const start = kickoff(m), end = new Date(start.getTime() + 2 * 3600e3);
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const title = `${teams[m.home].short} vs ${teams[m.away].short} · K리그${m.league} ${m.round}R`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kleague-guide//KO', 'BEGIN:VEVENT', `UID:${m.id}-2026@kleague-guide`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(start)}`, `DTEND:${z(end)}`,
    `SUMMARY:${title}`, `LOCATION:${m.venue}`, `DESCRIPTION:중계 ${m.broadcast.join(', ') || '미정'}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], {type: 'text/calendar'}));
  const a = document.createElement('a'); a.href = url; a.download = `kleague-${m.id}.ics`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function MatchActions({m, data, teams, compact = false}: {m: SeasonMatch; data: SeasonMatches; teams: Teams; compact?: boolean}) {
  if (m.status === 'FT') return <a className="button small" href={'#/game/' + m.id}>{m.stats ? '경기 리포트' : '경기 정보'}<ArrowRight size={14}/></a>;
  return <div className="match-actions">
    <a className="button small" href={'#/game/' + m.id}>프리뷰<ArrowRight size={14}/></a>
    <a className="button small primary" href={ticketHref(m, data)} target="_blank" rel="noreferrer"><Ticket size={14}/>예매{!compact && m.ticket?.vendor ? ' · ' + m.ticket.vendor : ''}</a>
    {!compact && <button className="button small ghost" onClick={() => downloadIcs(m, teams)} aria-label="내 캘린더에 추가"><CalendarPlus size={14}/></button>}
  </div>;
}

// ── 일정 ─────────────────────────────────────────────────
function FixtureRow({m, data, teams, focus}: {m: SeasonMatch; data: SeasonMatches; teams: Teams; focus?: string}) {
  const h = teams[m.home], a = teams[m.away], r = focus ? resultFor(m, focus) : null;
  return <div className={'fixture ' + (m.status === 'FT' ? 'ft' : 'ns')}>
    <span className="fixture-time">{m.time}{r && <Form values={[r]}/>}</span>
    <a className="fixture-teams" href={'#/game/' + m.id}>
      <span className="fx-team home"><b>{h.short}</b><Tile team={h} small/></span>
      <span className="fx-score">{m.score ? <>{m.score[0]}<i>:</i>{m.score[1]}</> : 'VS'}</span>
      <span className="fx-team away"><Tile team={a} small/><b>{a.short}</b></span>
    </a>
    <span className="fixture-meta"><span><MapPin size={12}/>{m.venue}</span>{m.status === 'FT' ? (m.audience ? <span><Users size={12}/>{m.audience.toLocaleString()}명</span> : null) : m.broadcast.length > 0 && <span><Tv size={12}/>{m.broadcast.join(' · ')}</span>}</span>
    <MatchActions m={m} data={data} teams={teams} compact/>
  </div>;
}
function ByDate({list, data, teams, focus}: {list: SeasonMatch[]; data: SeasonMatches; teams: Teams; focus?: string}) {
  const days = [...new Set(list.map(m => m.date))];
  return <>{days.map(d => { const ms = list.filter(m => m.date === d); return <section key={d} className="fixture-day"><h3>{dayLabel(ms[0])}{focus && <small>{ms[0].league === 1 ? 'K리그1' : 'K리그2'} {ms[0].round}R</small>}</h3><div className="panel fixture-list">{ms.map(m => <FixtureRow key={m.id} m={m} data={data} teams={teams} focus={focus}/>)}</div></section>; })}</>;
}

export function SchedulePage({teams, teamParam}: {teams: Teams; teamParam?: string}) {
  const {data, error, reload} = useMatches();
  const focusTeam = teamParam && teams[teamParam] ? teamParam : '';
  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const [league, setLeague] = useState<League>(focusTeam ? teams[focusTeam].league : 1);
  const [round, setRound] = useState<number | null>(null);
  // 기본은 오늘 날짜의 경기. 라운드 화살표를 누르면 라운드별 보기로 바뀐다. 팀 일정은 날짜를 고르기 전까지 팀 전체 일정.
  const [day, setDay] = useState(today), [mode, setMode] = useState<'day' | 'round'>('day'), [picked, setPicked] = useState(false), [pop, setPop] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  if (!data) return <Loading error={error} reload={reload}/>;
  const leagueMatches = data.matches.filter(m => m.league === league);
  const rounds = [...new Set(leagueMatches.map(m => m.round))].sort((x, y) => x - y);
  const nextRound = leagueMatches.find(m => m.status === 'NS')?.round ?? rounds.at(-1)!;
  const dayAll = data.matches.filter(m => m.date === day && (!focusTeam || m.home === focusTeam || m.away === focusTeam)).sort((a, b) => a.time.localeCompare(b.time) || a.league - b.league);
  const dayList = focusTeam ? dayAll : dayAll.filter(m => m.league === league), otherLeague = focusTeam ? [] : dayAll.filter(m => m.league !== league);
  const current = round ?? (mode === 'day' && dayList[0] ? dayList[0].round : nextRound);
  const shown = leagueMatches.filter(m => m.round === current);
  const upcoming = data.matches.filter(m => m.status === 'NS').slice(0, 1)[0];
  const teamList = focusTeam ? data.matches.filter(m => m.home === focusTeam || m.away === focusTeam) : [];
  const setTeam = (id: string) => { location.hash = '/schedule' + (id ? '/' + id : ''); if (id) setLeague(teams[id].league); setPicked(false); setMode('day'); };
  const goRound = (r: number) => { setRound(r); setMode('round'); };
  const showTeamAll = focusTeam && !picked;
  return <>
    <Heading eyebrow="2026 / FIXTURES & TICKETS" title="이번 주말, 어디로 갈까?" description="경기 일정과 중계, 예매처를 확인하고 경기 전 프리뷰로 관전 포인트를 챙기세요."
      aside={upcoming && <a className="button primary" href={'#/game/' + upcoming.id}>가장 가까운 경기<ArrowRight size={16}/></a>}/>
    <div className="toolbar">
      <div className="tabs" aria-label="리그">{([1, 2] as League[]).map(l => <button key={l} aria-pressed={!focusTeam && league === l} className={!focusTeam && league === l ? 'selected' : ''} onClick={() => { setTeam(''); setLeague(l); setRound(null); }}>K리그 {l}</button>)}</div>
      <label className="select-label">우리 팀 일정<select aria-label="팀별 일정" value={focusTeam} onChange={e => setTeam(e.target.value)}><option value="">전체 경기</option>{Object.values(teams).sort((x, y) => x.league - y.league || x.name.localeCompare(y.name)).map(t => <option key={t.id} value={t.id}>{t.name} · K{t.league}</option>)}</select></label>
    </div>
    <SourceLine data={data}/>
    <div className="date-bar">
      <div className="date-now"><small>{showTeamAll ? `${teams[focusTeam].short} 일정` : mode === 'round' ? '라운드별 보기' : '선택한 날짜'}</small><strong>{showTeamAll ? '시즌 전체 일정' : mode === 'round' ? `K리그${league} ${current}R` : fmtDate(day)}</strong>{!showTeamAll && mode === 'day' && day === today && <em>오늘</em>}</div>
      <button ref={opener} className="button primary" onClick={() => setPop(true)} aria-haspopup="dialog"><CalendarDays size={16}/>날짜 선택</button>
    </div>
    <DatePopup open={pop} onClose={() => setPop(false)} selected={day} onPick={d => { setDay(d); setMode('day'); setRound(null); setPicked(true); }} data={data} teams={teams} focusTeam={focusTeam || undefined} opener={opener}/>
    {showTeamAll ? <TeamFixtures team={teams[focusTeam]} list={teamList} data={data} teams={teams}/> : <>
      {!focusTeam && <div className="round-nav panel">
        <button className="icon-button" disabled={current === rounds[0]} onClick={() => goRound(rounds[rounds.indexOf(current) - 1])} aria-label="이전 라운드"><ChevronLeft size={18}/></button>
        <div><strong>{current}R</strong><span>{shown[0]?.phase ?? `K리그${league}`} · {shown.every(m => m.status === 'FT') ? '종료' : shown.some(m => m.status === 'FT') ? '진행 중' : '예정'}</span></div>
        <button className="icon-button" disabled={current === rounds.at(-1)} onClick={() => goRound(rounds[rounds.indexOf(current) + 1])} aria-label="다음 라운드"><ChevronRight size={18}/></button>
        {mode === 'round' && <button className="text-button" onClick={() => { setMode('day'); setRound(null); }}>선택한 날짜({fmtDate(day)})로</button>}
      </div>}
      {mode === 'round' ? <ByDate list={shown} data={data} teams={teams}/> : <section className="sc-dayview" aria-live="polite">
        {dayList.length ? <ByDate list={dayList} data={data} teams={teams} focus={focusTeam || undefined}/> : <Empty>해당 날짜에 예정된 경기가 없습니다.</Empty>}
        {otherLeague.length > 0 && <button className="text-button sc-other" onClick={() => setLeague(league === 1 ? 2 : 1)}>이날 K리그{league === 1 ? 2 : 1} 경기 {otherLeague.length}개 보기<ArrowRight size={14}/></button>}
        {focusTeam && <button className="text-button sc-other" onClick={() => setPicked(false)}><ArrowLeft size={14}/>{teams[focusTeam].short} 전체 일정으로</button>}
      </section>}
    </>}
    <p className="fine">예매는 각 구단의 공식 예매처(티켓링크·인터파크 티켓 등) 또는 구단 홈페이지에서 진행됩니다. 이 사이트는 예매를 대행하지 않습니다. 경기 시간·중계는 변경될 수 있으니 공식 일정을 확인하세요.</p>
  </>;
}
function TeamFixtures({team, list, data, teams}: {team: Team; list: SeasonMatch[]; data: SeasonMatches; teams: Teams}) {
  const next = list.filter(m => m.status === 'NS'), past = list.filter(m => m.status === 'FT').reverse();
  const [showAll, setShowAll] = useState(false);
  return <>
    {next[0] ? <NextMatchCard m={next[0]} team={team} data={data} teams={teams}/> : <Empty>{team.short}의 남은 정규 일정이 없습니다.</Empty>}
    {next.length > 1 && <><SectionTitle>남은 일정</SectionTitle><ByDate list={next.slice(1)} data={data} teams={teams} focus={team.id}/></>}
    <SectionTitle aside={<a className="text-button" href={'#/team/' + team.id + '/analysis'}>시즌 경기 분석<ArrowRight size={14}/></a>}>지난 경기</SectionTitle>
    <ByDate list={showAll ? past : past.slice(0, 6)} data={data} teams={teams} focus={team.id}/>
    {past.length > 6 && <button className="button" onClick={() => setShowAll(v => !v)}>{showAll ? '최근 6경기만 보기' : `지난 경기 모두 보기 (${past.length})`}</button>}
  </>;
}
export function NextMatchCard({m, team, data, teams}: {m: SeasonMatch; team: Team; data: SeasonMatches; teams: Teams}) {
  const opp = teams[m.home === team.id ? m.away : m.home], home = m.home === team.id;
  const days = Math.ceil((kickoff(m).getTime() - Date.now()) / 864e5);
  return <section className="next-card" style={{'--club-color': team.color} as CSSProperties}>
    <div className="next-when"><span>NEXT MATCH · {m.round}R{m.phase ? ' · ' + m.phase : ''}</span><strong>{days <= 0 ? '오늘' : `D-${days}`}</strong><p>{dayLabel(m)} {m.time}</p></div>
    <div className="next-vs"><Tile team={team}/><b>{home ? 'HOME' : 'AWAY'}</b><span>vs</span><Tile team={opp}/><div><h3>{opp.name}</h3><p><MapPin size={12}/>{m.venue}</p>{m.broadcast.length > 0 && <p><Tv size={12}/>{m.broadcast.join(' · ')}</p>}</div></div>
    <div className="next-cta">
      <a className="button primary" href={ticketHref(m, data)} target="_blank" rel="noreferrer"><Ticket size={16}/>예매하기{m.ticket?.vendor ? ' · ' + m.ticket.vendor : ''}</a>
      <a className="button" href={'#/game/' + m.id}>경기 프리뷰<ArrowRight size={16}/></a>
      <button className="button ghost" onClick={() => downloadIcs(m, teams)}><CalendarPlus size={16}/>캘린더에 추가</button>
    </div>
  </section>;
}

// ── 경기 상세: 리포트(종료) / 프리뷰(예정) ──────────────────
export function GamePage({id, teams}: {id?: string; teams: Teams}) {
  const {data, error, reload} = useMatches();
  const m = data?.matches.find(x => x.id === id);
  const {detail, missing} = useMatchDetail(m?.status === 'FT' ? id : undefined);
  if (!data) return <Loading error={error} reload={reload}/>;
  if (!m) return <Empty>경기를 찾을 수 없습니다. <a href="#/schedule">경기 일정으로</a></Empty>;
  const h = teams[m.home], a = teams[m.away], names: [string, string] = [h.short, a.short];
  return <div className="game-page" style={{'--home': h.color, '--away': awayColor(h.color, a.color)} as CSSProperties}>
    <a className="text-button back" href={'#/schedule'}><ArrowLeft size={16}/>경기 일정으로</a>
    <section className="panel live-board game-board">
      <p className="eyebrow">K LEAGUE {m.league} · {m.round}R{m.phase ? ' · ' + m.phase : ''} · {dayLabel(m)} {m.time}</p>
      <div className="board-line">
        <a href={'#/team/' + h.id} className="board-team"><Tile team={h}/><b>{h.name}</b></a>
        <div className="board-score"><strong>{m.score ? `${m.score[0]} : ${m.score[1]}` : 'VS'}</strong><span className="live-status">{m.status === 'FT' ? '경기 종료' : '경기 전'}</span></div>
        <a href={'#/team/' + a.id} className="board-team"><Tile team={a}/><b>{a.name}</b></a>
      </div>
      {detail && <Scorers detail={detail}/>}
      <p className="board-meta"><span><MapPin size={12}/>{m.venue}</span>{m.audience ? <span><Users size={12}/>관중 {m.audience.toLocaleString()}명</span> : null}{m.broadcast.length > 0 && <span><Tv size={12}/>{m.broadcast.join(' · ')}</span>}<a href={officialMatchUrl(m)} target="_blank" rel="noreferrer">공식 경기 기록 <ExternalLink size={11}/></a></p>
      {m.status === 'NS' && <div className="next-cta center"><a className="button primary" href={ticketHref(m, data)} target="_blank" rel="noreferrer"><Ticket size={16}/>예매하기{m.ticket?.vendor ? ' · ' + m.ticket.vendor : ''}</a><button className="button ghost" onClick={() => downloadIcs(m, teams)}><CalendarPlus size={16}/>캘린더에 추가</button></div>}
    </section>
    {m.status === 'FT' ? <Report m={m} names={names} detail={detail} missing={missing} teams={teams}/> : <Preview m={m} data={data} teams={teams} names={names}/>}
    <div className="live-grid game-fan">
      <CommentBox target={'game:' + m.id} title="이 경기 응원 글"/>
      {m.status === 'NS' && <PredictionBox matchId={'game-' + m.id} kickoff={kickoff(m)} names={names}/>}
    </div>
  </div>;
}

function Scorers({detail}: {detail: MatchDetail}) {
  const goals = detail.events.filter(e => e.type === 'goal' || e.type === 'ownGoal');
  const side = (s: 'home' | 'away') => goals.filter(g => (g.side === s) === (g.type === 'goal')).map((g, i) => <li key={i}>{g.type === 'ownGoal' ? `${g.player} (자책)` : g.player} {minuteLabel(g.half, g.min)}</li>);
  if (!goals.length) return null;
  return <div className="scorers"><ul>{side('home')}</ul><span>⚽</span><ul>{side('away')}</ul></div>;
}

const STAT_ROWS: [string, (s: MatchStats) => [number, number] | null, (v: number) => string][] = [
  ['점유율', s => s.possession, v => v + '%'],
  ['슈팅', s => s.shots, String], ['유효 슈팅', s => s.onTarget, String],
  ['박스 안 슈팅', s => s.shotsInBox, String], ['키패스', s => s.keyPasses, String],
  ['패스', s => s.passes, String],
  ['패스 성공률', s => s.passes && s.passesAcc ? [Math.round(s.passesAcc[0] / (s.passes[0] || 1) * 100), Math.round(s.passesAcc[1] / (s.passes[1] || 1) * 100)] : null, v => v + '%'],
  ['공격 지역 패스', s => s.finalThirdPasses, String], ['태클 성공', s => s.tackles, String], ['인터셉트', s => s.interceptions, String],
  ['선방', s => s.saves, String], ['코너킥', s => s.corners, String], ['파울', s => s.fouls, String], ['오프사이드', s => s.offsides, String],
  ['경고', s => s.yellow, String], ['퇴장', s => s.red, String],
];
function StatCompare({s}: {s: MatchStats}) {
  return <div className="stat-bars">{STAT_ROWS.map(([label, get, f]) => {
    const v = get(s); if (!v) return null;
    const [h, a] = v, total = h + a || 1;
    return <div key={label} className="stat-bar"><b className={h > a ? 'lead' : ''}>{f(h)}</b><span>{label}</span><b className={a > h ? 'lead' : ''}>{f(a)}</b>
      <div className="bar-track" role="img" aria-label={`${label}: 홈 ${f(h)}, 원정 ${f(a)}`}><i style={{width: h / total * 100 + '%', background: 'var(--home)'}}/><i style={{width: a / total * 100 + '%', background: 'var(--away)'}}/></div></div>;
  })}</div>;
}

function PossessionFlow({detail, names}: {detail: MatchDetail; names: [string, string]}) {
  const vals = detail.possessionByPeriod.home;
  if (vals.some(v => v == null)) return null;
  const labels = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90'];
  return <section className="panel"><h3>시간대별 점유율 흐름</h3>
    <div className="flow" role="img" aria-label={`홈팀 ${names[0]} 시간대별 점유율 ` + vals.map((v, i) => `${labels[i]}분 ${Math.round(v!)}%`).join(', ')}>
      {vals.map((v, i) => <div key={i} className="flow-col"><div className="flow-bar"><i style={{height: v + '%', background: 'var(--home)'}}/><i style={{height: 100 - v! + '%', background: 'var(--away)'}}/><span className="flow-mid"/></div><b>{Math.round(v!)}<small>:{Math.round(100 - v!)}</small></b><small>{labels[i]}′</small></div>)}
    </div>
    <p className="fine">막대 아래쪽이 {names[0]}, 위쪽이 {names[1]}의 점유율입니다. 각 구간 수치는 공식 기록의 구간별 값입니다.</p>
  </section>;
}

function Timeline({detail, names}: {detail: MatchDetail; names: [string, string]}) {
  const [subs, setSubs] = useState(false);
  const ev = detail.events.filter(e => subs || e.type !== 'sub');
  const icon = (t: string) => t === 'goal' ? '⚽' : t === 'ownGoal' ? '⚽' : t === 'sub' ? '⇄' : <i className={'card ' + (t === 'red' ? 'red' : '')}/>;
  return <section className="panel"><h3>타임라인 <small>{names[0]} ← → {names[1]}</small><button className="text-button" onClick={() => setSubs(v => !v)}>{subs ? '교체 숨기기' : '교체 보기'}</button></h3>
    <ol className="timeline">{ev.map((e, i) => <li key={i} className={e.side}><span>{minuteLabel(e.half, e.min)}</span>{icon(e.type)} <b>{e.player}</b>{e.type === 'ownGoal' && <small> 자책골</small>}{e.type === 'sub' && <small> → {e.player2}</small>}</li>)}</ol>
    {!ev.length && <p className="fine">기록된 주요 사건이 없습니다.</p>}
  </section>;
}

function Ratings({detail, names, teams, m}: {detail: MatchDetail; names: [string, string]; teams: Teams; m: SeasonMatch}) {
  const [side, setSide] = useState<'home' | 'away'>('home');
  const rows = [...detail.players[side]].sort((x, y) => (y[3] ?? 0) - (x[3] ?? 0));
  const team = teams[side === 'home' ? m.home : m.away];
  return <section className="panel ratings" style={{'--club-color': team.color} as CSSProperties}><h3>선수 평점 <div className="tabs small">{(['home', 'away'] as const).map((s, i) => <button key={s} aria-pressed={side === s} className={side === s ? 'selected' : ''} onClick={() => setSide(s)}>{names[i]}</button>)}</div></h3>
    <div className="table-scroll"><table><thead><tr><th>선수</th><th>포지션</th><th>출전</th><th>평점</th><th>골</th><th>도움</th><th>슈팅</th><th>키패스</th></tr></thead>
      <tbody>{rows.map(p => <tr key={p[0]}><td><b>{p[8] ? <small className="no">{p[8]}</small> : null}{p[0]}</b></td><td>{p[1]}</td><td>{p[2]}′</td><td><span className={'rating ' + ((p[3] ?? 0) >= 7.5 ? 'hi' : '')}>{p[3]?.toFixed(1) ?? '—'}</span></td><td>{p[4] || ''}</td><td>{p[5] || ''}</td><td>{p[6] || ''}</td><td>{p[7] || ''}</td></tr>)}</tbody></table></div>
    <p className="fine">평점·출전 시간(추가 시간 포함)은 K리그 공식 경기 기록 값입니다.</p>
  </section>;
}

function Report({m, names, detail, missing, teams}: {m: SeasonMatch; names: [string, string]; detail: MatchDetail | null; missing: boolean; teams: Teams}) {
  const insights = matchInsights(m, names, detail);
  if (!m.stats) return <Empty>이 경기의 세부 기록은 공식 사이트에서 아직 받지 못했습니다. <a href={officialMatchUrl(m)} target="_blank" rel="noreferrer">공식 경기 기록 보기</a></Empty>;
  return <div className="live-grid">
    <div className="live-main">
      {insights.length > 0 && <section className="panel insight"><h3>기록으로 읽는 경기</h3><ul>{insights.map((t, i) => <li key={i}>{t}</li>)}</ul><p className="fine">공식 기록 수치에서 규칙에 따라 자동으로 뽑은 문장입니다.</p></section>}
      <section className="panel"><h3>팀 기록 비교 <small>{names[0]} vs {names[1]}</small></h3><StatCompare s={m.stats}/>{!m.stats.passes && <p className="fine">이 경기는 패스·태클 등 세부 기록이 집계되지 않았습니다.</p>}</section>
      {detail && <PossessionFlow detail={detail} names={names}/>}
      {detail && <Ratings detail={detail} names={names} teams={teams} m={m}/>}
      {missing && <p className="fine">타임라인·선수 평점 파일을 불러오지 못했습니다.</p>}
    </div>
    <aside className="live-side">{detail && <Timeline detail={detail} names={names}/>}</aside>
  </div>;
}

function Preview({m, data, teams, names}: {m: SeasonMatch; data: SeasonMatches; teams: Teams; names: [string, string]}) {
  const {hp, ap, table, size, o, bt, h2h} = useMemo(() => {
    const {table, size} = metricTable(data, m.league);
    return {hp: teamProfile(data, m.home), ap: teamProfile(data, m.away), table, size, o: outlook(data, m.league, m.home, m.away), bt: backtest(data, m.league),
      h2h: data.matches.filter(x => x.status === 'FT' && ((x.home === m.home && x.away === m.away) || (x.home === m.away && x.away === m.home)))};
  }, [data, m]);
  const rankOf = (t: string) => Object.fromEntries(METRICS.map(x => [x.key, table[x.key].rank[t]])) as Record<MetricKey, number>;
  const points = previewPointsFor(hp, ap, names, h2h, {home: rankOf(m.home), away: rankOf(m.away)}, size, teams);
  return <div className="live-grid">
    <div className="live-main">
      <section className="panel insight"><h3>관전 포인트</h3><ul>{points.map((t, i) => <li key={i}>{t}</li>)}</ul></section>
      {o && <section className="panel outlook"><h3>기록 기반 전망 <small>단순 모형</small></h3>
        <div className="prob-strip big">{o.probs.map((p, i) => <span key={i} style={{width: p + '%'}} className={'prob-' + i}/>)}</div>
        <div className="prob-labels"><span>{names[0]} 승 <b>{o.probs[0].toFixed(0)}%</b></span><span>무 <b>{o.probs[1].toFixed(0)}%</b></span><span>{names[1]} 승 <b>{o.probs[2].toFixed(0)}%</b></span></div>
        <div className="team-record-numbers"><div className="panel"><span>예상 득점</span><strong className="nowrap">{o.xg[0].toFixed(1)} : {o.xg[1].toFixed(1)}</strong></div><div className="panel"><span>가장 가능성 높은 스코어</span><strong>{o.likely[0]} : {o.likely[1]}</strong></div></div>
        <details className="score-details"><summary>이 전망은 어떻게 계산하나요?</summary>
          <p>{names[0]}의 홈 경기 득·실점과 {names[1]}의 원정 경기 득·실점을 리그 평균과 비교해 공격·수비 지수를 만들고, 포아송 분포로 스코어별 확률을 더했습니다. 경기 수가 적은 팀이 과장되지 않도록 리그 평균 쪽으로 보정합니다. 부상·로테이션·동기·날씨는 반영하지 않습니다.</p>
          {bt.n > 0 && <p>이번 시즌 K리그{m.league}의 끝난 {bt.n}경기에 <b>그 경기 이전 기록만으로</b> 같은 계산을 해 보면, 가장 높은 확률의 결과가 맞은 비율은 <b>{bt.hitRate.toFixed(0)}%</b>였습니다 (항상 홈 승을 고르면 {bt.homeOnly.toFixed(0)}%, 브라이어 점수 {bt.brier.toFixed(3)}). 축구 결과는 이 정도로 불확실합니다.</p>}
          <p>참고용 분석이며 승부 예측·베팅 정보가 아닙니다.</p>
        </details>
      </section>}
      <section className="panel"><h3>시즌 기록 비교 <small>경기당 평균 · 괄호는 리그 {size}팀 중 순위</small></h3>
        <div className="table-scroll"><table className="compare"><thead><tr><th>{names[0]}</th><th>항목</th><th>{names[1]}</th></tr></thead><tbody>
          {METRICS.map(x => { const hv = hp.metrics[x.key], av = ap.metrics[x.key], hr = table[x.key].rank[m.home], ar = table[x.key].rank[m.away];
            return <tr key={x.key}><td className={hr < ar ? 'lead' : ''}>{fmt(hv, x.unit === '%' ? '%' : '')} <small>({hr ?? '—'})</small></td><th title={x.help}>{x.label}</th><td className={ar < hr ? 'lead' : ''}>{fmt(av, x.unit === '%' ? '%' : '')} <small>({ar ?? '—'})</small></td></tr>; })}
        </tbody></table></div>
        <p className="fine">굵게 표시한 쪽이 리그 순위가 더 높은 팀입니다. 허용 슈팅은 적을수록 좋은 기록입니다.</p>
      </section>
      <section className="panel"><h3>홈·원정 성적</h3><div className="split-grid"><SplitCard title={`${names[0]} 홈`} s={hp.home}/><SplitCard title={`${names[1]} 원정`} s={ap.away}/></div></section>
    </div>
    <aside className="live-side">
      <section className="panel"><h3>최근 5경기</h3>{[hp, ap].map((p, i) => <RecentList key={p.team} p={p} name={names[i]} teams={teams}/>)}</section>
      <section className="panel"><h3>이번 시즌 맞대결</h3>{h2h.length ? <ul className="mini-list">{h2h.map(x => <li key={x.id}><a href={'#/game/' + x.id}>{x.round}R · {teams[x.home].short} {x.score![0]}-{x.score![1]} {teams[x.away].short}</a></li>)}</ul> : <p className="fine">이번 시즌 첫 맞대결입니다.</p>}</section>
    </aside>
  </div>;
}
// matchData의 previewPoints를 팀 이름이 들어간 맞대결 문장으로 감싼다.
function previewPointsFor(hp: TeamProfile, ap: TeamProfile, names: [string, string], h2h: SeasonMatch[], ranks: {home: Record<string, number>; away: Record<string, number>}, size: number, teams: Teams) {
  const pts = previewPoints(hp, ap, names, ranks, size);
  if (h2h.length) pts.push(`이번 시즌 맞대결 ${h2h.length}번: ` + h2h.map(m => `${m.round}R ${teams[m.home].short} ${m.score![0]}-${m.score![1]} ${teams[m.away].short}`).join(', ') + '.');
  return pts;
}

function SplitCard({title, s}: {title: string; s: Split}) {
  return <div className="split"><span>{title}</span><strong>{s.played ? (s.points / s.played).toFixed(2) : '—'}<small> 승점/경기</small></strong><p>{s.w}승 {s.d}무 {s.l}패 · {s.gf}득 {s.ga}실</p></div>;
}
function RecentList({p, name, teams}: {p: TeamProfile; name: string; teams: Teams}) {
  return <div className="recent"><b>{name}</b><ul className="mini-list">{p.log.slice(-5).reverse().map(m => { const s = m.home === p.team ? 0 : 1, opp = teams[s === 0 ? m.away : m.home];
    return <li key={m.id}><a href={'#/game/' + m.id}><Form values={[resultFor(m, p.team)!]}/> {s === 0 ? 'vs' : '@'} {opp.short} {m.score![s]}-{m.score![1 - s]}</a></li>; })}</ul></div>;
}

// ── 팀 페이지: 다음 경기·공식 채널 / 경기 분석 탭 ───────────────
export function TeamHub({team, teams}: {team: Team; teams: Teams}) {
  const {data} = useMatches();
  if (!data) return null;
  const club = data.clubs[team.id], next = data.matches.find(m => m.status === 'NS' && (m.home === team.id || m.away === team.id));
  const links: [ReactNode, string, string | null][] = [[<Globe size={15}/>, '구단 홈페이지', club?.homepage ?? null], [<Instagram size={15}/>, '인스타그램', club?.instagram ?? null], [<Youtube size={15}/>, '유튜브', club?.youtube ?? null], [<Newspaper size={15}/>, '최신 뉴스 (네이버)', naverNews(team)]];
  return <div className="team-hub">
    {next && <NextMatchCard m={next} team={team} data={data} teams={teams}/>}
    <nav className="club-links panel" aria-label={team.name + ' 공식 채널과 뉴스'}><strong>공식 채널 · 뉴스</strong>{links.filter(l => l[2]).map(([icon, label, href]) => <a key={label} href={href!} target="_blank" rel="noreferrer">{icon}{label}<ExternalLink size={11}/></a>)}<a href={'#/schedule/' + team.id}>전체 일정 보기<ArrowRight size={13}/></a></nav>
  </div>;
}

export function TeamAnalysis({team, teams}: {team: Team; teams: Teams}) {
  const {data, error, reload} = useMatches();
  const calc = useMemo(() => {
    if (!data) return null;
    const {table, size, profiles} = metricTable(data, team.league);
    const p = profiles.find(x => x.team === team.id)!;
    const leader = [...profiles].sort((x, y) => y.all.points - x.all.points)[0];
    const leagueAvgPoints = profiles.reduce((s, x) => s + x.all.points / (x.all.played || 1), 0) / profiles.length;
    return {table, size, p, leader, leagueAvgPoints};
  }, [data, team]);
  const [sortKey, setSortKey] = useState<'rating' | 'keyPasses' | 'goals'>('rating');
  const [allGames, setAllGames] = useState(false);
  if (!data || !calc) return <Loading error={error} reload={reload}/>;
  const {table, size, p, leader, leagueAvgPoints} = calc;
  const rank = Object.fromEntries(METRICS.map(x => [x.key, table[x.key].rank[team.id]])) as Record<MetricKey, number>;
  const tags = styleTags(rank, size);
  const periods = ['0-15', '16-30', '31-45+', '46-60', '61-75', '76-90+'];
  const maxG = Math.max(1, ...p.goalsByPeriod.for, ...p.goalsByPeriod.against);
  const players = (data.players[team.id] ?? []).filter(r => r[3] >= 600);
  const sorted = [...players].sort((x, y) => sortKey === 'rating' ? (y[4] ?? 0) - (x[4] ?? 0) : sortKey === 'goals' ? (y[5] + y[6]) - (x[5] + x[6]) || y[5] - x[5] : y[8] / y[3] - x[8] / x[3]).slice(0, 10);
  const series = [{name: team.short, values: [0, ...p.points], color: team.color}];
  if (leader.team !== team.id) series.push({name: `${teams[leader.team].short} (선두)`, values: [0, ...leader.points], color: '#9aa3a1'});
  series.push({name: '리그 평균 페이스', values: [0, ...p.points.map((_, i) => Math.round(leagueAvgPoints * (i + 1)))], color: '#cfd5d2'});
  return <div className="team-analysis">
    <SourceLine data={data}/>
    <section className="panel style-card"><span className="eyebrow">TEAM PROFILE · {p.statGames}경기 기록</span><h3>{tags.length ? tags.join(' · ') : '리그 평균에 가까운 균형형'}</h3><p className="fine">같은 리그 {size}팀 중 상위·하위 25%에 드는 기록으로만 붙인 태그입니다.</p></section>
    <div className="split-grid three"><SplitCard title="전체" s={p.all}/><SplitCard title="홈" s={p.home}/><SplitCard title="원정" s={p.away}/></div>
    <section className="panel"><h3>경기당 기록과 리그 순위 <small>K리그{team.league} {size}팀</small></h3>
      <div className="metric-rows">{METRICS.map(x => { const v = p.metrics[x.key], r = rank[x.key], avg = table[x.key].avg;
        return <div key={x.key} className="metric-row" title={x.help}><span>{x.label}</span><b>{fmt(v, x.unit === '%' ? '%' : '')}</b><div className="rank-track" aria-label={`리그 ${size}팀 중 ${r}위`}><i style={{width: (size - (r ?? size) + 1) / size * 100 + '%'}}/></div><em className={r <= 3 ? 'top' : r > size - 3 ? 'low' : ''}>{r ?? '—'}위</em><small>평균 {fmt(avg, x.unit === '%' ? '%' : '')}</small></div>; })}</div>
      <p className="fine">막대가 길수록 리그 안에서 좋은 순위입니다. 허용 슈팅은 적을수록 높은 순위로 계산합니다.</p>
    </section>
    <section className="panel"><h3>시간대별 득점·실점</h3>
      <div className="period-chart" role="img" aria-label={periods.map((x, i) => `${x}분 득점 ${p.goalsByPeriod.for[i]} 실점 ${p.goalsByPeriod.against[i]}`).join(', ')}>
        {periods.map((x, i) => <div key={x} className="period-col"><div className="period-bars"><i className="for" style={{height: p.goalsByPeriod.for[i] / maxG * 100 + '%'}}><b>{p.goalsByPeriod.for[i]}</b></i><i className="against" style={{height: p.goalsByPeriod.against[i] / maxG * 100 + '%'}}><b>{p.goalsByPeriod.against[i]}</b></i></div><small>{x}′</small></div>)}
      </div>
      <p className="fine"><span className="key for"/>득점 <span className="key against"/>실점 · 전반 {p.firstHalf[0]}득 {p.firstHalf[1]}실 · 후반 {p.secondHalf[0]}득 {p.secondHalf[1]}실 · 추가 시간 골은 해당 하프의 마지막 구간에 포함</p>
    </section>
    <section className="panel"><h3>누적 승점 흐름</h3><Chart series={series} end={`${p.all.played}경기`}/></section>
    <section className="panel"><h3>선수 시즌 기록 <small>출전 600분 이상</small><div className="tabs small">{([['rating', '평균 평점'], ['goals', '공격 포인트'], ['keyPasses', '90분당 키패스']] as const).map(([k, n]) => <button key={k} aria-pressed={sortKey === k} className={sortKey === k ? 'selected' : ''} onClick={() => setSortKey(k)}>{n}</button>)}</div></h3>
      <div className="table-scroll"><table><thead><tr><th>선수</th><th>포지션</th><th>출전</th><th>분</th><th>평균 평점</th><th>골</th><th>도움</th><th>슈팅</th><th>키패스/90</th></tr></thead>
        <tbody>{sorted.map(r => <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3].toLocaleString()}</td><td><span className={'rating ' + ((r[4] ?? 0) >= 7.2 ? 'hi' : '')}>{r[4]?.toFixed(2) ?? '—'}</span></td><td>{r[5]}</td><td>{r[6]}</td><td>{r[7]}</td><td>{(r[8] / r[3] * 90).toFixed(2)}</td></tr>)}</tbody></table></div>
      <p className="fine">경기별 공식 기록(평점·출전 시간 포함)을 합산했습니다. 시즌 중 이적한 선수는 이 팀에서 뛴 경기만 포함합니다.</p>
    </section>
    <section className="panel"><h3>경기별 기록</h3>
      <div className="table-scroll"><table className="match-log"><thead><tr><th>라운드</th><th>상대</th><th>결과</th><th>점유율</th><th>슈팅</th><th>유효</th><th></th></tr></thead>
        <tbody>{[...p.log].reverse().slice(0, allGames ? undefined : 10).map(m => { const s = m.home === team.id ? 0 : 1, opp = teams[s === 0 ? m.away : m.home];
          return <tr key={m.id}><td>{m.round}R<small> {m.date.slice(5).replace('-', '.')}</small></td><td>{s === 0 ? 'vs' : '@'} {opp.short}</td><td><Form values={[resultFor(m, team.id)!]}/> {m.score![s]}-{m.score![1 - s]}</td><td>{m.stats ? m.stats.possession[s] + '%' : '—'}</td><td>{m.stats ? `${m.stats.shots[s]}-${m.stats.shots[1 - s]}` : '—'}</td><td>{m.stats ? `${m.stats.onTarget[s]}-${m.stats.onTarget[1 - s]}` : '—'}</td><td><a className="text-button" href={'#/game/' + m.id}>리포트<ArrowRight size={13}/></a></td></tr>; })}</tbody></table></div>
      {p.log.length > 10 && <button className="button" onClick={() => setAllGames(v => !v)}>{allGames ? '최근 10경기만 보기' : `전체 ${p.log.length}경기 보기`}</button>}
    </section>
  </div>;
}

// 내 페이지에서 예측한 경기 이름 표시용
export function useGameName(teams: Teams) {
  const {data} = useMatches();
  return (id: string) => { const m = data?.matches.find(x => 'game-' + x.id === id); return m ? `${m.round}R ${teams[m.home]?.short} vs ${teams[m.away]?.short}` : undefined; };
}
