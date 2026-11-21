import {createContext, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import {Heart, LogIn, LogOut, Mail, Send, Trash2, X, UserRound} from 'lucide-react';
import {clubOf, setPreferredClub, setNickname, accountEnabled, addComment, deleteComment, listComments, listFavorites, myPredictions, nicknameOf, predictionSummary, savePrediction, sendLoginLink, setFavorite, signOut, useUser, type Comment, type FavoriteKind} from './accountApi';
import {OUTCOMES} from './components';

// 가입 창·구단 선택에 쓰는 구단 목록. App이 현재 시즌 자료를 받으면 채운다.
export interface ClubOption {id: string; name: string; league: number}
let CLUBS: ClubOption[] = [];
export const setClubOptions = (list: ClubOption[]) => { CLUBS = list; };
function ClubSelect({id, value, onChange}: {id: string; value: string; onChange: (v: string) => void}) {
  return <select id={id} value={value} onChange={e => onChange(e.target.value)}>
    <option value="">구단을 골라 주세요</option>
    {[1, 2].map(l => <optgroup key={l} label={'K리그' + l}>{CLUBS.filter(c => c.league === l).sort((a, b) => a.name.localeCompare(b.name, 'ko')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}
  </select>;
}
// 선호 구단 고르기·바꾸기 (내 페이지, 홈 화면 안내에서 사용)
export function ClubPicker({compact = false}: {compact?: boolean}) {
  const {user} = useAccount();
  const [value, setValue] = useState(clubOf(user) ?? ''), [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle'), [error, setError] = useState('');
  useEffect(() => { setValue(clubOf(user) ?? ''); }, [user]);
  async function save() {
    if (!value) return; setState('saving'); setError('');
    try { await setPreferredClub(value); setState('saved'); setTimeout(() => setState('idle'), 2000); } catch (e) { setError((e as Error).message); setState('idle'); }
  }
  return <div className={'club-picker' + (compact ? ' compact' : '')}>
    <label htmlFor="club-pick" className="sr-only">선호 구단</label>
    <ClubSelect id="club-pick" value={value} onChange={v => { setValue(v); setState('idle'); }}/>
    <button className="button primary" disabled={!value || value === clubOf(user) || state === 'saving'} onClick={save}>{state === 'saving' ? '저장 중…' : state === 'saved' ? '저장했어요' : '저장'}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}

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
  const [email, setEmail] = useState(''), [nickname, setNickname] = useState(''), [club, setClub] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle'), [error, setError] = useState('');
  useEffect(() => { const d = ref.current; d?.showModal(); return () => d?.close(); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setState('sending');
    try { await sendLoginLink(email.trim(), nickname.trim() || email.split('@')[0], club || undefined); setState('sent'); }
    catch (err) { setError((err as Error).message); setState('idle'); }
  }
  return <dialog ref={ref} className="account-dialog" onClose={onClose} aria-labelledby="login-title">
    <button className="dialog-close" onClick={onClose} aria-label="닫기"><X size={18}/></button>
    <p className="eyebrow">K LEAGUE GUIDE · ACCOUNT</p>
    <h2 id="login-title">로그인</h2>
    {!accountEnabled ? <p className="account-off">지금은 로그인을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.</p>
      : state === 'sent' ? <div className="login-sent"><Mail size={28}/><p><b>{email}</b>로 로그인 링크를 보냈어요.</p><p>메일의 링크를 이 브라우저에서 누르면 로그인됩니다. 메일이 안 보이면 스팸함도 확인해 주세요.</p><button className="button" onClick={onClose}>확인</button></div>
      : <form onSubmit={submit} className="login-form">
        {reason && <p className="login-reason">{reason}</p>}
        <p>비밀번호 없이, 이메일로 받은 링크를 눌러 로그인해요. 처음이면 자동으로 가입됩니다.</p>
        <label htmlFor="login-email">이메일</label>
        <input id="login-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"/>
        <label htmlFor="login-nickname">닉네임 <small>응원 글에 보이는 이름 · 처음 가입할 때만 저장</small></label>
        <input id="login-nickname" maxLength={20} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="예: 수원의 함성"/>
        <label htmlFor="login-club">선호 구단 <small>처음 가입할 때 저장 · 내 페이지에서 언제든 바꿀 수 있어요</small></label>
        <ClubSelect id="login-club" value={club} onChange={setClub}/>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button primary" disabled={state === 'sending'}><Send size={15}/>{state === 'sending' ? '보내는 중…' : '로그인 링크 받기'}</button>
      </form>}
  </dialog>;
}

export function AuthButton() {
  const {user, ready, openLogin} = useAccount();
  if (!ready) return null;
  if (!user) return <button className="auth-button" onClick={() => openLogin()}><LogIn size={15}/>로그인</button>;
  return <span className="auth-user"><a href="#/me" className="auth-button" title="내 정보 · MY 팀 변경"><UserRound size={15}/>{nicknameOf(user)}<span className="auth-sub">내 정보</span></a><button className="auth-icon" onClick={() => signOut()} aria-label="로그아웃" title="로그아웃"><LogOut size={15}/></button></span>;
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
export function CommentBox({target, title = '응원 글', placeholder = '응원 한마디를 남겨 주세요 (300자 이내)', empty = '아직 글이 없어요. 첫 응원을 남겨 보세요.'}: {target: string; title?: string; placeholder?: string; empty?: string}) {
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
        <textarea id={'cf-' + target} maxLength={300} rows={2} value={body} onChange={e => setBody(e.target.value)} onFocus={() => { if (!user) openLogin('응원 글을 남기려면 로그인해 주세요.'); }} placeholder={user ? placeholder : '로그인하고 글을 남겨 보세요'}/>
        <div><small>{body.length}/300</small><button className="button primary" disabled={busy || !body.trim()}><Send size={14}/>올리기</button></div>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {list.length ? <ul className="comments">{list.map(c => <li key={c.id}><div><b>{c.nickname}</b><time dateTime={c.created_at}>{new Date(c.created_at).toLocaleString('ko-KR', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</time>{user?.id === c.user_id && <button className="auth-icon" onClick={() => remove(c.id)} aria-label="내 글 지우기"><Trash2 size={14}/></button>}</div><p>{c.body}</p></li>)}</ul>
        : <p className="fine">{empty}</p>}
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
    <MyInfo/>
  </div>;
}

// ── 내 정보: 이메일, 닉네임 변경, MY 팀(선호 구단) 변경 ──
function MyInfo() {
  const {user} = useAccount();
  const [nick, setNick] = useState(nicknameOf(user)), [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle'), [error, setError] = useState('');
  useEffect(() => { setNick(nicknameOf(user)); }, [user]);
  if (!user) return null;
  async function saveNick(e: React.FormEvent) {
    e.preventDefault(); const v = nick.trim(); if (!v) return;
    setState('saving'); setError('');
    try { await setNickname(v); setState('saved'); setTimeout(() => setState('idle'), 2000); } catch (err) { setError((err as Error).message); setState('idle'); }
  }
  return <section className="panel my-info" id="my-info" aria-labelledby="my-info-title">
    <h2 id="my-info-title">내 정보</h2>
    <dl>
      <div><dt>이메일</dt><dd>{user.email}</dd></div>
      <div><dt>닉네임</dt><dd><form onSubmit={saveNick} className="my-nick"><label htmlFor="my-nick" className="sr-only">닉네임</label><input id="my-nick" maxLength={20} value={nick} onChange={e => { setNick(e.target.value); setState('idle'); }}/><button className="button" disabled={!nick.trim() || nick.trim() === nicknameOf(user) || state === 'saving'}>{state === 'saving' ? '저장 중…' : state === 'saved' ? '저장했어요' : '닉네임 저장'}</button></form>{error && <p className="form-error" role="alert">{error}</p>}<small>앞으로 쓰는 응원 글에 이 이름이 보여요.</small></dd></div>
      <div><dt>MY 팀</dt><dd><ClubPicker/><small>MY 팀의 순위·다음 경기가 홈 화면 맨 위에 보이고, 홈 배경색과 왼쪽 순위표 강조가 이 팀으로 바뀌어요.</small></dd></div>
    </dl>
  </section>;
}
