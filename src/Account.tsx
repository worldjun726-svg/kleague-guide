import {createContext, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import {Heart, LogIn, LogOut, Mail, Send, Trash2, X, UserRound, Check} from 'lucide-react';
import {clubOf, setPreferredClub, setNickname, accountEnabled, addComment, deleteComment, listComments, listFavorites, myPredictions, nicknameOf, predictionSummary, savePrediction, setFavorite, signOut, useUser, signUpEmail, signInEmail, sendPasswordReset, updatePassword, signInWithProvider, providerOf, nicknameAvailable, getMyProfile, completeProfile, type Comment, type FavoriteKind, type SocialProvider, type Profile} from './accountApi';
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
  const {user, ready, recovery, endRecovery} = useUser();
  const [reason, setReason] = useState<string | null>(null);
  // 로그인했는데 닉네임·약관 동의가 비어 있으면(카카오·구글 첫 로그인, 예전 가입 회원) 가입 마무리 창
  const [profile, setProfile] = useState<Profile | null | 'none' | 'loading'>('loading');
  useEffect(() => { if (!user) { setProfile('loading'); return; } getMyProfile(user.id).then(setProfile); }, [user?.id]);
  useEffect(() => { const close = () => setReason(null); window.addEventListener('hashchange', close); return () => window.removeEventListener('hashchange', close); }, []);
  useEffect(() => { if (user) setReason(null); }, [user]);
  const needsFinish = !!user && !recovery && profile !== 'loading' && profile !== null && (profile === 'none' || !profile.nickname || !profile.terms_agreed_at);
  return <AccountContext.Provider value={{user, ready, openLogin: r => setReason(r ?? '')}}>
    {children}
    {reason !== null && !user && <AuthDialog reason={reason} onClose={() => setReason(null)}/>}
    {recovery && <RecoveryDialog onDone={endRecovery}/>}
    {needsFinish && <FinishSignupDialog user={user!} initialNickname={profile !== 'none' && profile ? profile.nickname ?? '' : nicknameOf(user)} onDone={() => getMyProfile(user!.id).then(setProfile)}/>}
  </AccountContext.Provider>;
}

// 모달 창 공통: 열리면 showModal, 닫기 버튼·Esc 로 닫힘
function Modal({title, onClose, children, closable = true}: {title: string; onClose?: () => void; children: ReactNode; closable?: boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; d?.showModal(); return () => d?.close(); }, []);
  return <dialog ref={ref} className="account-dialog" onCancel={e => { if (!closable) e.preventDefault(); }} onClose={() => onClose?.()} aria-labelledby="auth-title">
    {closable && <button className="dialog-close" onClick={() => ref.current?.close()} aria-label="닫기"><X size={18}/></button>}
    <p className="eyebrow">K LEAGUE GUIDE · ACCOUNT</p>
    <h2 id="auth-title">{title}</h2>
    {children}
  </dialog>;
}

// 비밀번호 규칙: 8자 이상, 영문, 숫자
const PW_RULES: [string, (p: string) => boolean][] = [['8자 이상', p => p.length >= 8], ['영문 포함', p => /[a-zA-Z]/.test(p)], ['숫자 포함', p => /\d/.test(p)]];
const pwOk = (p: string) => PW_RULES.every(([, t]) => t(p));
function PasswordRules({value}: {value: string}) {
  return <ul className="pw-rules" aria-label="비밀번호 규칙">{PW_RULES.map(([label, test]) => <li key={label} className={test(value) ? 'ok' : ''}><Check size={12}/>{label}</li>)}</ul>;
}

// 닉네임 입력 + 중복 확인
type NickState = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid' | 'error';
function useNicknameCheck(initial = '') {
  const [nick, setNick] = useState(initial), [state, setState] = useState<NickState>('idle');
  async function check(v = nick) {
    const t = v.trim();
    if (t.length < 2 || t.length > 20) { setState('invalid'); return false; }
    setState('checking');
    try { const ok = await nicknameAvailable(t); setState(ok ? 'ok' : 'taken'); return ok; } catch { setState('error'); return false; }
  }
  return {nick, setNick: (v: string) => { setNick(v); setState('idle'); }, state, check};
}
function NicknameField({id, n}: {id: string; n: ReturnType<typeof useNicknameCheck>}) {
  const msg: Record<NickState, string> = {idle: '2~20자 · 응원 글에 보이는 이름', checking: '확인하는 중…', ok: '사용할 수 있는 닉네임이에요.', taken: '이미 사용 중인 닉네임이에요.', invalid: '2~20자로 입력해 주세요.', error: '확인하지 못했어요. 잠시 후 다시 눌러 주세요.'};
  return <>
    <label htmlFor={id}>닉네임</label>
    <div className="nick-row"><input id={id} maxLength={20} required value={n.nick} onChange={e => n.setNick(e.target.value)} onBlur={() => n.nick.trim() && n.state === 'idle' && n.check()} placeholder="예: 수원의 함성" aria-describedby={id + '-msg'}/><button type="button" className="button" onClick={() => n.check()} disabled={n.state === 'checking'}>중복 확인</button></div>
    <small id={id + '-msg'} className={'field-msg ' + (n.state === 'ok' ? 'good' : ['taken', 'invalid', 'error'].includes(n.state) ? 'bad' : '')} role="status">{msg[n.state]}</small>
  </>;
}

// 약관 동의: [필수] 이용약관, [필수] 개인정보 수집·이용, [선택] 소식 알림
function Consents({v, set}: {v: {terms: boolean; privacy: boolean; marketing: boolean}; set: (v: {terms: boolean; privacy: boolean; marketing: boolean}) => void}) {
  const all = v.terms && v.privacy && v.marketing;
  const base = location.origin + location.pathname;
  return <fieldset className="consents">
    <legend className="sr-only">약관 동의</legend>
    <label className="consent-all"><input type="checkbox" checked={all} onChange={e => set({terms: e.target.checked, privacy: e.target.checked, marketing: e.target.checked})}/>전체 동의</label>
    <label><input type="checkbox" required checked={v.terms} onChange={e => set({...v, terms: e.target.checked})}/><b>[필수]</b> 이용약관 동의 <a href={base + '#/terms'} target="_blank" rel="noreferrer">보기</a></label>
    <label><input type="checkbox" required checked={v.privacy} onChange={e => set({...v, privacy: e.target.checked})}/><b>[필수]</b> 개인정보 수집·이용 동의 <a href={base + '#/privacy'} target="_blank" rel="noreferrer">보기</a></label>
    <label><input type="checkbox" checked={v.marketing} onChange={e => set({...v, marketing: e.target.checked})}/>[선택] 경기·이벤트 소식 메일 받기</label>
  </fieldset>;
}

function SocialButtons({onError}: {onError: (m: string) => void}) {
  const go = (p: SocialProvider) => signInWithProvider(p).catch(e => onError((e as Error).message));
  return <div className="social-login">
    <button type="button" className="social kakao" onClick={() => go('kakao')}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.87 5.35 4.68 6.77l-.95 3.48c-.08.3.26.54.52.37l4.13-2.74c.53.07 1.07.12 1.62.12 5.52 0 10-3.58 10-8S17.52 3 12 3z"/></svg>카카오로 시작하기</button>
    <button type="button" className="social google" onClick={() => go('google')}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"/></svg>Google로 시작하기</button>
  </div>;
}

type Mode = 'login' | 'signup' | 'reset' | 'signup-sent' | 'reset-sent';
function AuthDialog({reason, onClose}: {reason: string; onClose: () => void}) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [club, setClub] = useState('');
  const [consent, setConsent] = useState({terms: false, privacy: false, marketing: false});
  const n = useNicknameCheck();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const go = (m: Mode) => { setMode(m); setError(''); };
  async function run(fn: () => Promise<void>) { setBusy(true); setError(''); try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  const login = (e: React.FormEvent) => { e.preventDefault(); run(() => signInEmail(email.trim(), pw)); };
  const reset = (e: React.FormEvent) => { e.preventDefault(); run(async () => { await sendPasswordReset(email.trim()); go('reset-sent'); }); };
  const signup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwOk(pw)) return setError('비밀번호 규칙을 확인해 주세요.');
    if (pw !== pw2) return setError('비밀번호 확인이 일치하지 않아요.');
    if (!consent.terms || !consent.privacy) return setError('필수 약관에 동의해 주세요.');
    run(async () => {
      if (!(await n.check())) throw new Error('닉네임을 확인해 주세요.');
      const r = await signUpEmail({email: email.trim(), password: pw, nickname: n.nick, club: club || undefined, marketing: consent.marketing});
      if (r.needsConfirm) go('signup-sent');
    });
  };
  const title = mode === 'signup' ? '회원가입' : mode === 'reset' ? '비밀번호 찾기' : mode === 'signup-sent' ? '인증 메일을 보냈어요' : mode === 'reset-sent' ? '재설정 메일을 보냈어요' : '로그인';
  return <Modal title={title} onClose={onClose}>
    {!accountEnabled ? <p className="account-off">지금은 로그인을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.</p>
    : mode === 'signup-sent' || mode === 'reset-sent' ? <div className="login-sent"><Mail size={28}/>
        <p><b>{email}</b>로 {mode === 'signup-sent' ? '인증 메일' : '비밀번호 재설정 메일'}을 보냈어요.</p>
        <p>{mode === 'signup-sent' ? '메일의 링크를 누르면 가입이 끝나고 자동으로 로그인돼요.' : '메일의 링크를 누르면 새 비밀번호를 정하는 창이 열려요.'} 메일이 안 보이면 스팸함도 확인해 주세요.</p>
        <button className="button" onClick={() => go('login')}>로그인 화면으로</button></div>
    : <>
      {mode !== 'reset' && <div className="auth-tabs" role="tablist">{(['login', 'signup'] as Mode[]).map(m => <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => go(m)}>{m === 'login' ? '로그인' : '회원가입'}</button>)}</div>}
      {reason && <p className="login-reason">{reason}</p>}
      {mode !== 'reset' && <><SocialButtons onError={setError}/><p className="or"><span>또는 이메일로</span></p></>}
      {mode === 'login' && <form onSubmit={login} className="login-form">
        <label htmlFor="li-email">이메일</label><input id="li-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"/>
        <label htmlFor="li-pw">비밀번호</label><input id="li-pw" type="password" required autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)}/>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button primary" disabled={busy}><LogIn size={15}/>{busy ? '로그인 중…' : '로그인'}</button>
        <div className="auth-links"><button type="button" className="text-button" onClick={() => go('reset')}>비밀번호를 잊으셨나요?</button><button type="button" className="text-button" onClick={() => go('signup')}>처음이세요? 회원가입</button></div>
      </form>}
      {mode === 'signup' && <form onSubmit={signup} className="login-form">
        <label htmlFor="su-email">이메일</label><input id="su-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"/>
        <label htmlFor="su-pw">비밀번호</label><input id="su-pw" type="password" required autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)}/>
        <PasswordRules value={pw}/>
        <label htmlFor="su-pw2">비밀번호 확인</label><input id="su-pw2" type="password" required autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)}/>
        {pw2 && <small className={'field-msg ' + (pw === pw2 ? 'good' : 'bad')}>{pw === pw2 ? '비밀번호가 일치해요.' : '비밀번호가 일치하지 않아요.'}</small>}
        <NicknameField id="su-nick" n={n}/>
        <label htmlFor="su-club">MY 팀 <small>선택 · 나중에 내 정보에서 바꿀 수 있어요</small></label><ClubSelect id="su-club" value={club} onChange={setClub}/>
        <Consents v={consent} set={setConsent}/>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button primary" disabled={busy || !pwOk(pw) || pw !== pw2 || !consent.terms || !consent.privacy || n.state === 'taken' || n.state === 'invalid'}><Send size={15}/>{busy ? '가입하는 중…' : '가입하고 인증 메일 받기'}</button>
      </form>}
      {mode === 'reset' && <form onSubmit={reset} className="login-form">
        <p>가입한 이메일을 입력하면 비밀번호를 다시 정하는 링크를 보내 드려요. 예전에 이메일 링크로 가입하셨다면 여기서 비밀번호를 처음 만들 수 있어요.</p>
        <label htmlFor="rs-email">이메일</label><input id="rs-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button primary" disabled={busy}><Mail size={15}/>{busy ? '보내는 중…' : '재설정 링크 받기'}</button>
        <button type="button" className="text-button" onClick={() => go('login')}>로그인으로 돌아가기</button>
      </form>}
    </>}
  </Modal>;
}

// 비밀번호 재설정 메일의 링크로 들어왔을 때
function RecoveryDialog({onDone}: {onDone: () => void}) {
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!pwOk(pw)) return setError('비밀번호 규칙을 확인해 주세요.'); if (pw !== pw2) return setError('비밀번호 확인이 일치하지 않아요.');
    setBusy(true); setError(''); try { await updatePassword(pw); setDone(true); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <Modal title="새 비밀번호 정하기" onClose={onDone}>
    {done ? <div className="login-sent"><Check size={28}/><p>새 비밀번호로 바꿨어요. 다음부터 이 비밀번호로 로그인하세요.</p><button className="button primary" onClick={onDone}>확인</button></div>
    : <form onSubmit={submit} className="login-form">
      <label htmlFor="rc-pw">새 비밀번호</label><input id="rc-pw" type="password" required autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)}/>
      <PasswordRules value={pw}/>
      <label htmlFor="rc-pw2">새 비밀번호 확인</label><input id="rc-pw2" type="password" required autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)}/>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy || !pwOk(pw) || pw !== pw2}>{busy ? '바꾸는 중…' : '비밀번호 바꾸기'}</button>
    </form>}
  </Modal>;
}

// 카카오·구글 첫 로그인(또는 예전 가입 회원): 닉네임·MY 팀·약관 동의를 받아 가입을 마무리한다.
function FinishSignupDialog({user, initialNickname, onDone}: {user: User; initialNickname: string; onDone: () => void}) {
  const n = useNicknameCheck(initialNickname);
  const [club, setClub] = useState(clubOf(user) ?? ''), [consent, setConsent] = useState({terms: false, privacy: false, marketing: false});
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!consent.terms || !consent.privacy) return setError('필수 약관에 동의해 주세요.');
    setBusy(true); setError('');
    try { if (!(await n.check())) throw new Error('닉네임을 확인해 주세요.'); await completeProfile(user.id, {nickname: n.nick, club: club || undefined, marketing: consent.marketing}); onDone(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  const via = providerOf(user) === 'kakao' ? '카카오' : providerOf(user) === 'google' ? 'Google' : '이메일';
  return <Modal title="가입 마무리" closable={false}>
    <form onSubmit={submit} className="login-form">
      <p>{via} 계정으로 로그인했어요. 사이트에서 쓸 닉네임과 약관 동의만 받으면 가입이 끝나요.</p>
      <NicknameField id="fs-nick" n={n}/>
      <label htmlFor="fs-club">MY 팀 <small>선택</small></label><ClubSelect id="fs-club" value={club} onChange={setClub}/>
      <Consents v={consent} set={setConsent}/>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy || !consent.terms || !consent.privacy || n.state === 'taken' || n.state === 'invalid'}>{busy ? '저장하는 중…' : '가입 완료'}</button>
      <button type="button" className="text-button" onClick={() => signOut()}>나중에 할게요 (로그아웃)</button>
    </form>
  </Modal>;
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
