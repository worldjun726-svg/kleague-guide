import {useEffect, useState, type CSSProperties} from 'react';
import {ArrowLeft, Radio, LoaderCircle, RefreshCw} from 'lucide-react';
import type {Team} from './types';
import {Tile, Heading, Empty} from './components';
import {loadLive, kickoffAt, STATUS_LABEL, type LiveData, type LiveMatch, type LivePlayer, type MatchStats, type Side} from './liveData';
import {CommentBox, PredictionBox, FavoriteButton} from './Account';

export function useLive() {
  const [data, setData] = useState<LiveData | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => { const c = new AbortController(); setError(''); loadLive(c.signal).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); return () => c.abort(); }, [retry]);
  return {data, error, reload: () => setRetry(n => n + 1)};
}

function SampleNote({data}: {data: LiveData}) {
  return <p className="live-note"><Radio size={14}/><span><b>{data.meta.mode === 'sample' ? 'SAMPLE' : 'LIVE'}</b> · {data.meta.note} · 업데이트 {new Date(data.meta.updatedAt).toLocaleString('ko-KR', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})} · {data.meta.refresh}</span></p>;
}

function Status({m}: {m: LiveMatch}) {
  return <span className={'live-status ' + m.status.toLowerCase()}>{m.status === 'LIVE' ? <><i/>{m.minute}'</> : m.status === 'NS' ? m.kickoff : STATUS_LABEL.FT}</span>;
}

function MatchRow({m, teams}: {m: LiveMatch; teams: Record<string, Team>}) {
  const h = teams[m.home], a = teams[m.away];
  return <a className={'live-row ' + m.status.toLowerCase()} href={'#/live/' + m.id}>
    <Status m={m}/>
    <span className="live-team home"><b>{h.short}</b><Tile team={h} small/></span>
    <span className="live-score">{m.score ? <>{m.score[0]}<i>:</i>{m.score[1]}</> : 'VS'}</span>
    <span className="live-team away"><Tile team={a} small/><b>{a.short}</b></span>
    <span className="live-xg">{m.stats ? <>xG {m.stats.xg[0].toFixed(1)} – {m.stats.xg[1].toFixed(1)}</> : `${m.round}R`}</span>
  </a>;
}

export function LiveCenter({teams}: {teams: Record<string, Team>}) {
  const {data, error, reload} = useLive();
  const [league, setLeague] = useState<1 | 2>(1);
  if (error) return <Empty>{error} <button className="text-button" onClick={reload}><RefreshCw size={14}/>다시 불러오기</button></Empty>;
  if (!data) return <div className="live-loading"><LoaderCircle className="spin"/>경기 정보를 불러오는 중</div>;
  const list = data.matches.filter(m => m.league === league);
  const groups: [string, LiveMatch[]][] = [['진행 중', list.filter(m => m.status === 'LIVE')], ['다가오는 경기', list.filter(m => m.status === 'NS')], ['끝난 경기', list.filter(m => m.status === 'FT')]];
  return <>
    <Heading eyebrow="LIVE CENTER" title="지금, 그라운드에서." description="진행 중인 경기와 다가오는 경기, 끝난 경기의 슈팅·xG까지 한눈에." aside={<div className="tabs" aria-label="리그">{([1, 2] as const).map(l => <button key={l} aria-pressed={league === l} className={league === l ? 'selected' : ''} onClick={() => setLeague(l)}>K리그{l}</button>)}</div>}/>
    <SampleNote data={data}/>
    {groups.map(([title, ms]) => ms.length > 0 && <section key={title} className="live-group"><h2>{title} <small>{ms.length}</small></h2><div className="panel live-list">{ms.map(m => <MatchRow key={m.id} m={m} teams={teams}/>)}</div></section>)}
    {!list.length && <Empty>이 리그의 경기 정보가 없습니다.</Empty>}
  </>;
}

const STAT_ROWS: [keyof MatchStats, string, (v: number) => string][] = [
  ['xg', '기대 득점 (xG)', v => v.toFixed(2)], ['shots', '슈팅', String], ['onTarget', '유효 슈팅', String],
  ['possession', '점유율', v => v + '%'], ['passAccuracy', '패스 성공률', v => v + '%'], ['corners', '코너킥', String], ['fouls', '파울', String],
];
function StatBars({s, colors}: {s: MatchStats; colors: [string, string]}) {
  return <div className="stat-bars">{STAT_ROWS.map(([k, label, f]) => {
    const [h, a] = s[k], total = h + a || 1;
    return <div key={k} className="stat-bar"><b>{f(h)}</b><span>{label}</span><b>{f(a)}</b>
      <div className="bar-track" role="img" aria-label={`${label}: 홈 ${f(h)}, 원정 ${f(a)}`}><i style={{width: h / total * 100 + '%', background: colors[0]}}/><i style={{width: a / total * 100 + '%', background: colors[1]}}/></div></div>;
  })}</div>;
}

function Lineup({side, team, m, onPick}: {side: Side; team: Team; m: LiveMatch; onPick: (p: LivePlayer) => void}) {
  const l = m.lineups[side];
  const goals = (id: string) => m.events.filter(e => e.type === 'goal' && e.player === id).length;
  return <section className="panel lineup" style={{'--club-color': team.color} as CSSProperties}>
    <h3><Tile team={team} small/>{team.short} <small>{l.formation}</small></h3>
    <ol>{l.players.map(p => <li key={p.id}><button onClick={() => onPick(p)}><span className="no">{p.number}</span><span className="pos">{p.pos}</span><span className="nm">{p.name}{goals(p.id) > 0 && <em>⚽{goals(p.id) > 1 ? '×' + goals(p.id) : ''}</em>}</span>{m.ratings?.[p.id] != null && <b className={'rating ' + (m.ratings[p.id] >= 7.5 ? 'hi' : '')}>{m.ratings[p.id].toFixed(1)}</b>}</button></li>)}</ol>
  </section>;
}

function PlayerCard({p, team, m, onClose}: {p: LivePlayer; team: Team; m: LiveMatch; onClose: () => void}) {
  const shots = m.events.filter(e => e.type === 'goal' && e.player === p.id);
  const assists = m.events.filter(e => e.type === 'goal' && e.assist === p.id).length;
  return <section className="panel player-card" aria-live="polite">
    <div className="player-card-head"><span className="no">{p.number}</span><div><h3>{p.name}</h3><p>{team.name} · {p.pos} · {p.age}세 · {p.nation}</p></div><button className="text-button" onClick={onClose}>닫기</button></div>
    <dl><div><dt>이 경기 평점</dt><dd>{m.ratings?.[p.id]?.toFixed(1) ?? '—'}</dd></div><div><dt>득점</dt><dd>{shots.length}</dd></div><div><dt>도움</dt><dd>{assists}</dd></div><div><dt>득점 xG 합</dt><dd>{shots.length ? shots.reduce((s, e) => s + (e.xg ?? 0), 0).toFixed(2) : '—'}</dd></div></dl>
    <div className="row">{p.playerId ? <a className="button" href={'#/player/' + p.playerId}>시즌 기록 보기</a> : <span className="fine">시즌 기록이 수집되지 않은 선수예요.</span>}{p.playerId && <FavoriteButton kind="player" id={p.playerId} label={p.name}/>}</div>
  </section>;
}

export function LiveMatchPage({id, teams}: {id?: string; teams: Record<string, Team>}) {
  const {data, error, reload} = useLive();
  const [player, setPlayer] = useState<{p: LivePlayer; side: Side} | null>(null);
  if (error) return <Empty>{error} <button className="text-button" onClick={reload}>다시 불러오기</button></Empty>;
  if (!data) return <div className="live-loading"><LoaderCircle className="spin"/>경기 정보를 불러오는 중</div>;
  const m = data.matches.find(x => x.id === id);
  if (!m) return <Empty>경기를 찾을 수 없습니다. <a href="#/live">라이브 센터로</a></Empty>;
  const h = teams[m.home], a = teams[m.away], names: [string, string] = [h.short, a.short];
  const nameOf = (pid?: string) => [...m.lineups.home.players, ...m.lineups.away.players].find(p => p.id === pid)?.name ?? '';
  return <div className="live-match">
    <a className="text-button back" href="#/live"><ArrowLeft size={16}/>라이브 센터로</a>
    <SampleNote data={data}/>
    <section className="panel live-board">
      <p className="eyebrow">K LEAGUE {m.league} · {m.round}R · {m.date} {m.kickoff} · {m.venue}</p>
      <div className="board-line">
        <a href={'#/team/' + h.id} className="board-team"><Tile team={h}/><b>{h.name}</b></a>
        <div className="board-score">{m.score ? <strong>{m.score[0]} : {m.score[1]}</strong> : <strong>VS</strong>}<Status m={m}/></div>
        <a href={'#/team/' + a.id} className="board-team"><Tile team={a}/><b>{a.name}</b></a>
      </div>
      {m.events.length > 0 && <ol className="timeline">{m.events.map((e, i) => <li key={i} className={e.side}><span>{e.minute}'</span>{e.type === 'goal' ? <>⚽ <b>{nameOf(e.player)}</b>{e.assist && <small> 도움 {nameOf(e.assist)}</small>}{e.xg != null && <small> · xG {e.xg.toFixed(2)}</small>}</> : <><i className={'card ' + e.type}/>{nameOf(e.player)}</>}</li>)}</ol>}
      {m.probabilities && <p className="fine">경기 전 예측 확률: {h.short} 승 {m.probabilities[0]}% · 무 {m.probabilities[1]}% · {a.short} 승 {m.probabilities[2]}% (샘플)</p>}
    </section>
    <div className="live-grid">
      <div className="live-main">
        {m.stats ? <section className="panel"><h3>경기 기록 {m.status === 'LIVE' && <small>{m.minute}분까지</small>}</h3><StatBars s={m.stats} colors={[h.color, a.color]}/><p className="fine">xG(기대 득점): 슈팅 위치·상황으로 계산한 득점 가능성의 합. 샘플 값입니다.</p></section>
          : <section className="panel"><h3>경기 기록</h3><p className="fine">경기가 시작되면 슈팅·점유율·xG가 표시됩니다.</p></section>}
        {player && <PlayerCard p={player.p} team={player.side === 'home' ? h : a} m={m} onClose={() => setPlayer(null)}/>}
        <div className="lineups"><Lineup side="home" team={h} m={m} onPick={p => setPlayer({p, side: 'home'})}/><Lineup side="away" team={a} m={m} onPick={p => setPlayer({p, side: 'away'})}/></div>
        {!m.lineups.confirmed && <p className="fine">예상 라인업입니다. 경기 1시간 전쯤 확정됩니다.</p>}
      </div>
      <aside className="live-side">
        <PredictionBox matchId={m.id} kickoff={kickoffAt(m)} names={names}/>
        <CommentBox target={'match:' + m.id} title="이 경기 응원 글"/>
      </aside>
    </div>
  </div>;
}
