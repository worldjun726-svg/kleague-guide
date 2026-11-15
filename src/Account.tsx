import {createContext, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import {Heart, LogIn, LogOut, Mail, Send, Trash2, X, UserRound} from 'lucide-react';
import {accountEnabled, addComment, deleteComment, listComments, listFavorites, myPredictions, nicknameOf, predictionSummary, savePrediction, sendLoginLink, setFavorite, signOut, useUser, type Comment, type FavoriteKind} from './accountApi';
import {OUTCOMES} from './components';

// ── 로그인 상태를 화면 전체에 나눠 주는 상자 ──
interface AccountState { user: User | null; ready: boolean; openLogin: (reason?: string) => void }
const AccountContext = createContext<AccountState>({user: null, ready: true, openLogin: () => {}});
export const useAccount = () => useContext(AccountContext);

export function AccountProvider({children}: {children: ReactNode}) {
  const {user, ready} = useUser();
  const [reason, setReason] = useState<string | null>(null);
  useEffect(() => { const close = () => setReason(null); window.addEventListener('hashchange', close); return () => window.removeEventListener('hashchange', close); }, []);
  return <AccountContext.Provider value={{user, ready, openLogin: r => setReason(r ?? '')}}>
    {children}
    {reason !== null && <LoginDialog reason={reason} onClose={() => setReason(null)}/>}
  </AccountContext.Provider>;
}

function LoginDialog({reason, onClose}: {reason: string; onClose: () => void}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState(''), [nickname, setNickname] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle'), [error, setError] = useState('');
  useEffect(() => { const d = ref.current; d?.showModal(); return () => d?.close(); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setState('sending');
    try { await sendLoginLink(email.trim(), nickname.trim() || email.split('@')[0]); setState('sent'); }
    catch (err) { setError((err as Error).message); setState('idle'); }
  }
  return <dialog ref={ref} className="account-dialog" onClose={onClose} aria-labelledby="login-title">
    <button className="dialog-close" onClick={onClose} aria-label="닫기"><X size={18}/></button>
    <p className="eyebrow">K LEAGUE GUIDE · ACCOUNT</p>
    <h2 id="login-title">로그인</h2>
    {!accountEnabled ? <p className="account-off">로그인 기능은 아직 준비 중입니다. 사이트 관리자가 Supabase 연결 정보를 넣으면 열립니다.</p>
      : state === 'sent' ? <div className="login-sent"><Mail size={28}/><p><b>{email}</b>로 로그인 링크를 보냈어요.</p><p>메일의 링크를 이 브라우저에서 누르면 로그인됩니다. 메일이 안 보이면 스팸함도 확인해 주세요.</p><button className="button" onClick={onClose}>확인</button></div>
      : <form onSubmit={submit} className="login-form">
        {reason && <p className="login-reason">{reason}</p>}
        <p>비밀번호 없이, 이메일로 받은 링크를 눌러 로그인해요. 처음이면 자동으로 가입됩니다.</p>
        <label htmlFor="login-email">이메일</label>
        <input id="login-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"/>
        <label htmlFor="login-nickname">닉네임 <small>응원 글에 보이는 이름 · 처음 가입할 때만 저장</small></label>
        <input id="login-nickname" maxLength={20} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="예: 수원의 함성"/>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button primary" disabled={state === 'sending'}><Send size={15}/>{state === 'sending' ? '보내는 중…' : '로그인 링크 받기'}</button>
      </form>}
  </dialog>;
}

export function AuthButton() {
  const {user, ready, openLogin} = useAccount();
  if (!ready) return null;
  if (!user) return <button className="auth-button" onClick={() => openLogin()}><LogIn size={15}/>로그인</button>;
  return <span className="auth-user"><a href="#/me" className="auth-button"><UserRound size={15}/>{nicknameOf(user)}</a><button className="auth-icon" onClick={() => signOut()} aria-label="로그아웃" title="로그아웃"><LogOut size={15}/></button></span>;
}

// ── 응원팀·관심 선수 저장 ──
export function FavoriteButton({kind, id, label}: {kind: FavoriteKind; id: string; label: string}) {
  const {user, openLogin} = useAccount();
  const [on, setOn] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { if (!user) { setOn(false); return; } listFavorites(user.id).then(f => setOn(f.some(x => x.kind === kind && x.item_id === id))).catch(() => {}); }, [user, kind, id]);
  async function toggle() {
    if (!user) return openLogin(`${label}을(를) 저장하려면 로그인해 주세요.`);
    setBusy(true); const next = !on; setOn(next);
    try { await setFavorite(user.id, kind, id, next); } catch { setOn(!next); } finally { setBusy(false); }
  }
  const what = kind === 'team' ? '응원팀' : '관심 선수';
  return <button className={'button favorite ' + (on ? 'on' : '')} aria-pressed={on} disabled={busy} onClick={toggle}><Heart size={15} fill={on ? 'currentColor' : 'none'}/>{on ? `${what}으로 저장됨` : `${what}으로 저장`}</button>;
}

// ── 경기 예측 ──
export function PredictionBox({matchId, kickoff, names}: {matchId: string; kickoff: Date; names: [string, string]}) {
  const {user, openLogin} = useAccount();
  const [sum, setSum] = useState<{counts: [number, number, number]; mine: number | null}>({counts: [0, 0, 0], mine: null});
  const [error, setError] = useState('');
  const closed = kickoff.getTime() <= Date.now();
  const load = () => predictionSummary(matchId, user?.id).then(setSum).catch(() => setError('예측 현황을 불러오지 못했습니다.'));
  useEffect(() => { if (accountEnabled) load(); }, [matchId, user?.id]);
  async function pick(i: number) {
    if (!user) return openLogin('경기 예측에 참여하려면 로그인해 주세요.');
    setError('');
    try { await savePrediction(user.id, matchId, i, kickoff); await load(); } catch (e) { setError((e as Error).message); }
  }
  const total = sum.counts.reduce((a, b) => a + b, 0);
  const labels = [`${names[0]} 승`, '무승부', `${names[1]} 승`];
  return <section className="panel predict-box" aria-labelledby={'predict-' + matchId}>
    <h3 id={'predict-' + matchId}>팬 예측</h3>
    {!accountEnabled ? <p className="account-off">로그인 기능이 연결되면 예측에 참여할 수 있어요.</p> : <>
      <p className="fine">{closed ? '경기가 시작되어 예측이 마감됐어요.' : '경기 시작 전까지 고르고 바꿀 수 있어요.'} · 참여 {total}명</p>
      <div className="predict-options">{labels.map((l, i) => {
        const share = total ? Math.round(sum.counts[i] / total * 100) : 0;
        return <button key={l} className={sum.mine === i ? 'mine' : ''} aria-pressed={sum.mine === i} disabled={closed} onClick={() => pick(i)}>
          <span>{l}</span><b>{share}%</b><i style={{width: share + '%'}}/>{sum.mine === i && <small>내 예측</small>}
        </button>;
      })}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </>}
  </section>;
}

// ── 응원 글 ──
export function CommentBox({target, title = '응원 글'}: {target: string; title?: string}) {
  const {user, openLogin} = useAccount();
  const [list, setList] = useState<Comment[]>([]), [body, setBody] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const load = () => listComments(target).then(setList).catch(() => setError('글을 불러오지 못했습니다.'));
  useEffect(() => { if (accountEnabled) load(); }, [target]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!user) return openLogin('응원 글을 남기려면 로그인해 주세요.');
    if (!body.trim()) return; setBusy(true); setError('');
    try { await addComment(user, target, body.trim()); setBody(''); await load(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function remove(id: number) { try { await deleteComment(id); await load(); } catch (err) { setError((err as Error).message); } }
  return <section className="panel comment-box" aria-labelledby={'c-' + target}>
    <h3 id={'c-' + target}>{title} <small>{list.length}</small></h3>
    {!accountEnabled ? <p className="account-off">로그인 기능이 연결되면 응원 글을 남길 수 있어요.</p> : <>
      <form onSubmit={submit} className="comment-form">
        <label htmlFor={'cf-' + target} className="sr-only">응원 글 쓰기</label>
        <textarea id={'cf-' + target} maxLength={300} rows={2} value={body} onChange={e => setBody(e.target.value)} onFocus={() => { if (!user) openLogin('응원 글을 남기려면 로그인해 주세요.'); }} placeholder={user ? '응원 한마디를 남겨 주세요 (300자 이내)' : '로그인하고 응원 글을 남겨 보세요'}/>
        <div><small>{body.length}/300</small><button className="button primary" disabled={busy || !body.trim()}><Send size={14}/>올리기</button></div>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {list.length ? <ul className="comments">{list.map(c => <li key={c.id}><div><b>{c.nickname}</b><time dateTime={c.created_at}>{new Date(c.created_at).toLocaleString('ko-KR', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</time>{user?.id === c.user_id && <button className="auth-icon" onClick={() => remove(c.id)} aria-label="내 글 지우기"><Trash2 size={14}/></button>}</div><p>{c.body}</p></li>)}</ul>
        : <p className="fine">아직 글이 없어요. 첫 응원을 남겨 보세요.</p>}
    </>}
  </section>;
}

// ── 내 페이지: 응원팀·관심 선수·내 예측 ──
export function MyPage({teamName, playerName, matchName}: {teamName: (id: string) => string | undefined; playerName: (id: string) => string | undefined; matchName: (id: string) => string | undefined}) {
  const {user, ready, openLogin} = useAccount();
  const [fav, setFav] = useState<{kind: FavoriteKind; item_id: string}[]>([]), [preds, setPreds] = useState<{match_id: string; pick: number}[]>([]);
  useEffect(() => { if (!user) return; listFavorites(user.id).then(setFav).catch(() => {}); myPredictions(user.id).then(setPreds).catch(() => {}); }, [user]);
  if (!accountEnabled) return <section className="panel"><h1>내 페이지</h1><p className="account-off">로그인 기능이 아직 연결되지 않았습니다.</p></section>;
  if (!ready) return null;
  if (!user) return <section className="panel"><h1>내 페이지</h1><p>로그인하면 응원팀, 관심 선수, 내 경기 예측을 한곳에서 볼 수 있어요.</p><button className="button primary" onClick={() => openLogin()}><LogIn size={15}/>로그인</button></section>;
  const teams = fav.filter(f => f.kind === 'team'), players = fav.filter(f => f.kind === 'player');
  return <div className="my-page">
    <div className="page-heading"><div><div className="eyebrow">MY K LEAGUE</div><h1>{nicknameOf(user)}님의 관전 노트</h1><p>저장한 응원팀과 선수, 내가 남긴 경기 예측입니다.</p></div></div>
    <div className="my-grid">
      <section className="panel"><h2>응원팀</h2>{teams.length ? <ul>{teams.map(t => <li key={t.item_id}><a href={'#/team/' + t.item_id}>{teamName(t.item_id) ?? t.item_id}</a></li>)}</ul> : <p className="fine">팀 화면에서 하트를 눌러 응원팀을 저장해 보세요. <a href="#/finder">나의 팀 찾기</a></p>}</section>
      <section className="panel"><h2>관심 선수</h2>{players.length ? <ul>{players.map(p => <li key={p.item_id}><a href={'#/player/' + p.item_id}>{playerName(p.item_id) ?? p.item_id}</a></li>)}</ul> : <p className="fine">선수 화면에서 하트를 눌러 저장할 수 있어요.</p>}</section>
      <section className="panel"><h2>내 경기 예측</h2>{preds.length ? <ul>{preds.map(p => <li key={p.match_id}><a href={'#/live/' + p.match_id}>{matchName(p.match_id) ?? p.match_id}</a> · <b>{OUTCOMES[p.pick]}</b></li>)}</ul> : <p className="fine"><a href="#/live">라이브 센터</a>에서 경기 결과를 예측해 보세요.</p>}</section>
    </div>
  </div>;
}
