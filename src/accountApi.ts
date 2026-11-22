import {createClient, type SupabaseClient, type User} from '@supabase/supabase-js';
import {useEffect, useState} from 'react';
import {SUPABASE_URL, SUPABASE_ANON_KEY} from './supabaseConfig';

// 로그인·응원팀·경기 예측·응원 글을 Supabase에 저장한다.
// 화면은 이 파일의 함수만 쓰므로, 나중에 다른 백엔드로 바꿀 때 이 파일만 고치면 된다.
export const accountEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase: SupabaseClient | null = accountEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {auth: {flowType: 'pkce', detectSessionInUrl: true, persistSession: true}})
  : null;

// 선호 구단: 가입할 때 고르고, 내 페이지에서 바꾼다. Supabase 계정의 user_metadata.club 에 저장한다.
export const clubOf = (u: User | null) => (u?.user_metadata?.club as string | undefined) || null;
export async function setPreferredClub(club: string) {
  if (!supabase) throw new Error('로그인 기능이 아직 설정되지 않았습니다.');
  const {error} = await supabase.auth.updateUser({data: {club}});
  if (error) throw new Error('선호 구단을 저장하지 못했습니다: ' + error.message);
}
export async function setNickname(nickname: string) {
  if (!supabase) throw new Error('로그인 기능이 아직 설정되지 않았습니다.');
  const {data: s} = await supabase.auth.getSession();
  const id = s.session?.user.id;
  // 프로필 표(닉네임 중복 불가)에 먼저 저장하고, 성공하면 계정 정보에도 반영한다.
  if (id) {
    const {error: pe} = await supabase.from('profiles').upsert({id, nickname: nickname.trim(), updated_at: new Date().toISOString()});
    if (pe && pe.code === '23505') throw new Error('이미 사용 중인 닉네임이에요.');
    if (pe && pe.code !== '42P01') throw new Error('닉네임을 저장하지 못했습니다: ' + pe.message);
  }
  const {error} = await supabase.auth.updateUser({data: {nickname: nickname.trim()}});
  if (error) throw new Error('닉네임을 저장하지 못했습니다: ' + error.message);
}
// 이메일은 개인정보라 화면 이름으로 쓰지 않는다(닉네임이 없으면 '팬').
export const nicknameOf = (u: User | null) => (u?.user_metadata?.nickname as string | undefined)?.trim() || '팬';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!accountEnabled);
  // 비밀번호 재설정 메일의 링크로 들어오면 true → 새 비밀번호 입력 창을 띄운다.
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => { setUser(data.session?.user ?? null); setReady(true); });
    const {data} = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return {user, ready, recovery, endRecovery: () => setRecovery(false)};
}

// 로그인 링크가 돌아올 주소: 지금 보고 있는 사이트 주소(경로까지, ?·# 제외)
const redirectTo = () => location.origin + location.pathname;

// ── 회원가입·로그인 ──
// Supabase 오류 문구를 사용자에게 보여 줄 한국어로 바꾼다.
function authMessage(m: string) {
  const t = m.toLowerCase();
  if (t.includes('invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (t.includes('email not confirmed')) return '아직 이메일 인증을 하지 않으셨어요. 받은 메일의 인증 링크를 눌러 주세요.';
  if (t.includes('already registered') || t.includes('already been registered')) return '이미 가입된 이메일이에요. 로그인하거나 비밀번호 찾기를 이용해 주세요.';
  if (t.includes('database error saving new user')) return '이미 사용 중인 닉네임이에요. 다른 닉네임으로 다시 시도해 주세요.';
  if (t.includes('password') && (t.includes('at least') || t.includes('weak') || t.includes('should'))) return '비밀번호가 규칙에 맞지 않아요. 8자 이상, 영문과 숫자를 함께 써 주세요.';
  if (t.includes('rate') || t.includes('security purposes')) return '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.';
  if (t.includes('provider') && (t.includes('not enabled') || t.includes('unsupported'))) return '아직 연결되지 않은 로그인 방식이에요. 잠시 후 다시 시도해 주세요.';
  if (t.includes('same password') || t.includes('different from the old')) return '이전과 다른 비밀번호를 써 주세요.';
  return '요청을 처리하지 못했어요: ' + m;
}
const need = () => { if (!supabase) throw new Error('로그인 기능이 아직 설정되지 않았습니다.'); return supabase; };

export interface SignUpInput {email: string; password: string; nickname: string; club?: string; marketing: boolean}
// 이메일 가입: 인증 메일을 보내고, 메일의 링크를 누르면 가입이 끝난다.
export async function signUpEmail(v: SignUpInput) {
  const now = new Date().toISOString();
  const {data, error} = await need().auth.signUp({email: v.email, password: v.password, options: {emailRedirectTo: redirectTo(),
    data: {nickname: v.nickname.trim(), ...(v.club ? {club: v.club} : {}), terms_agreed_at: now, privacy_agreed_at: now, marketing: v.marketing}}});
  if (error) throw new Error(authMessage(error.message));
  // 이미 가입된 이메일이면 Supabase가 오류 대신 identities 가 빈 사용자를 돌려준다.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error(authMessage('already registered'));
  return {needsConfirm: !data.session};
}
export async function signInEmail(email: string, password: string) {
  const {error} = await need().auth.signInWithPassword({email, password});
  if (error) throw new Error(authMessage(error.message));
}
export async function sendPasswordReset(email: string) {
  const {error} = await need().auth.resetPasswordForEmail(email, {redirectTo: redirectTo()});
  if (error) throw new Error(authMessage(error.message));
}
export async function updatePassword(password: string) {
  const {error} = await need().auth.updateUser({password});
  if (error) throw new Error(authMessage(error.message));
}
export type SocialProvider = 'kakao' | 'google';
export async function signInWithProvider(provider: SocialProvider) {
  const {error} = await need().auth.signInWithOAuth({provider, options: {redirectTo: redirectTo()}});
  if (error) throw new Error(authMessage(error.message));
}
export const providerOf = (u: User | null) => (u?.app_metadata?.provider as string | undefined) ?? 'email';

// ── 닉네임 중복 확인·프로필 ──
export async function nicknameAvailable(name: string) {
  const {data, error} = await need().rpc('nickname_available', {name: name.trim()});
  if (error) throw new Error('닉네임을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
  return Boolean(data);
}
export interface Profile {nickname: string | null; terms_agreed_at: string | null; privacy_agreed_at: string | null; marketing: boolean}
// 프로필 표가 아직 없으면(SQL 실행 전) null — 이때는 가입 마무리 화면을 띄우지 않는다.
export async function getMyProfile(userId: string): Promise<Profile | null | 'none'> {
  const {data, error} = await need().from('profiles').select('nickname,terms_agreed_at,privacy_agreed_at,marketing').eq('id', userId).maybeSingle();
  if (error) return null;
  return data ? data as Profile : 'none';
}
// 카카오·구글 첫 로그인, 또는 예전 방식으로 가입한 회원의 가입 마무리
export async function completeProfile(userId: string, v: {nickname: string; club?: string; marketing: boolean}) {
  const now = new Date().toISOString();
  const {error} = await need().from('profiles').upsert({id: userId, nickname: v.nickname.trim(), terms_agreed_at: now, privacy_agreed_at: now, marketing: v.marketing, updated_at: now});
  if (error) throw new Error(error.code === '23505' ? '이미 사용 중인 닉네임이에요.' : '가입 정보를 저장하지 못했어요: ' + error.message);
  const {error: ue} = await need().auth.updateUser({data: {nickname: v.nickname.trim(), ...(v.club ? {club: v.club} : {})}});
  if (ue) throw new Error('가입 정보를 저장하지 못했어요: ' + ue.message);
}
// 로그아웃: 이 기기의 로그인 정보를 먼저 지운다(scope 'local').
// 기본값('global')은 서버 요청이 실패하면(만료된 토큰·일시적 네트워크 오류) 로그인 정보를 그대로 남겨
// 버튼을 눌러도 아무 일도 없는 것처럼 보였다. 'local'도 서버에 이 기기 로그인 무효화 요청은 보낸다.
export async function signOut() {
  if (!supabase) return;
  try { await supabase.auth.signOut({scope: 'local'}); } catch { /* 아래에서 정리 */ }
  // 그래도 남아 있으면 저장된 로그인 정보를 직접 지우고 새로고침한다.
  const {data} = await supabase.auth.getSession().catch(() => ({data: {session: null}}));
  if (data.session) {
    try { Object.keys(localStorage).filter(k => /^sb-.*-auth-token/.test(k)).forEach(k => localStorage.removeItem(k)); } catch { /* 저장소 접근 불가 */ }
    location.reload();
    return;
  }
  if (location.hash.startsWith('#/me')) location.hash = '#/';
}
// 회원 탈퇴: 계정과 프로필·응원팀·예측·응원 글을 모두 지운다(supabase/security-hardening.sql 의 delete_my_account).
export async function deleteMyAccount() {
  const {error} = await need().rpc('delete_my_account');
  if (error) throw new Error('탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
  await need().auth.signOut({scope: 'local'});
}

// ── 응원팀·관심 선수 ──
export type FavoriteKind = 'team' | 'player';
export async function listFavorites(userId: string) {
  if (!supabase) return [];
  const {data, error} = await supabase.from('favorites').select('kind,item_id').eq('user_id', userId);
  if (error) throw error;
  return data as {kind: FavoriteKind; item_id: string}[];
}
export async function setFavorite(userId: string, kind: FavoriteKind, itemId: string, on: boolean) {
  if (!supabase) return;
  const q = on
    ? supabase.from('favorites').insert({user_id: userId, kind, item_id: itemId})
    : supabase.from('favorites').delete().match({user_id: userId, kind, item_id: itemId});
  const {error} = await q;
  if (error && error.code !== '23505') throw error; // 23505: 이미 저장됨
}

// ── 경기 예측 ── pick: 0 홈 승, 1 무승부, 2 원정 승
export async function predictionSummary(matchId: string, userId?: string) {
  if (!supabase) return {counts: [0, 0, 0] as [number, number, number], mine: null as number | null};
  // 다른 회원의 예측은 집계 숫자만 받는다(누가 골랐는지는 서버 밖으로 나가지 않음).
  const {data, error} = await supabase.rpc('prediction_counts', {p_match_id: matchId});
  if (error?.code === 'PGRST202') { // security-hardening.sql 실행 전: 예전 방식으로 집계
    const {data: rows, error: e2} = await supabase.from('predictions').select('pick,user_id').eq('match_id', matchId);
    if (e2) throw e2;
    const c: [number, number, number] = [0, 0, 0]; let m: number | null = null;
    for (const r of rows as {pick: number; user_id: string}[]) { c[r.pick]++; if (r.user_id === userId) m = r.pick; }
    return {counts: c, mine: m};
  }
  if (error) throw error;
  const counts: [number, number, number] = [0, 0, 0];
  for (const r of (data ?? []) as {pick: number; votes: number}[]) counts[r.pick] = Number(r.votes);
  let mine: number | null = null;
  if (userId) {
    const {data: own} = await supabase.from('predictions').select('pick').eq('match_id', matchId).eq('user_id', userId).maybeSingle();
    mine = own ? (own as {pick: number}).pick : null;
  }
  return {counts, mine};
}
export async function savePrediction(userId: string, matchId: string, pick: number, kickoff: Date) {
  if (!supabase) return;
  const {error} = await supabase.from('predictions').upsert({user_id: userId, match_id: matchId, pick, kickoff_at: kickoff.toISOString()}, {onConflict: 'user_id,match_id'});
  if (error) throw new Error(error.message.includes('row-level security') ? '경기가 시작되어 예측을 바꿀 수 없습니다.' : '예측을 저장하지 못했습니다.');
}
export async function myPredictions(userId: string) {
  if (!supabase) return [];
  const {data, error} = await supabase.from('predictions').select('match_id,pick').eq('user_id', userId);
  if (error) throw error;
  return data as {match_id: string; pick: number}[];
}

// ── 응원 글 ── target 예: 'match:k1-r36-seoul-gangwon', 'team:seoul'
export interface Comment { id: number; user_id: string; nickname: string; body: string; created_at: string }
export async function listComments(target: string) {
  if (!supabase) return [];
  const {data, error} = await supabase.from('comments').select('id,user_id,nickname,body,created_at').eq('target', target).order('created_at', {ascending: false}).limit(50);
  if (error) throw error;
  return data as Comment[];
}
// 내가 쓴 글 (내 페이지)
export async function listMyComments(userId: string) {
  if (!supabase) return [];
  const {data, error} = await supabase.from('comments').select('id,target,body,created_at').eq('user_id', userId).order('created_at', {ascending: false}).limit(6);
  if (error) throw error;
  return data as {id: number; target: string; body: string; created_at: string}[];
}
export async function addComment(user: User, target: string, body: string) {
  if (!supabase) return;
  const {error} = await supabase.from('comments').insert({user_id: user.id, nickname: nicknameOf(user), target, body});
  if (error) throw new Error(error.message.includes('가입 마무리') ? '가입 마무리(닉네임·약관 동의)를 먼저 해 주세요.' : error.message.includes('잠시 후') ? '잠시 후 다시 써 주세요.' : '글을 올리지 못했습니다. 300자 이내로 써 주세요.');
}
export async function deleteComment(id: number) {
  if (!supabase) return;
  const {error} = await supabase.from('comments').delete().eq('id', id);
  if (error) throw new Error('글을 지우지 못했습니다.');
}
