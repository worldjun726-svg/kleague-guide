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
export const nicknameOf = (u: User | null) => (u?.user_metadata?.nickname as string | undefined) || (u?.email ? u.email.split('@')[0] : '팬');

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!accountEnabled);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => { setUser(data.session?.user ?? null); setReady(true); });
    const {data} = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return {user, ready};
}

// 로그인 링크가 돌아올 주소: 지금 보고 있는 사이트 주소(경로까지, ?·# 제외)
const redirectTo = () => location.origin + location.pathname;

export async function sendLoginLink(email: string, nickname: string, club?: string) {
  if (!supabase) throw new Error('로그인 기능이 아직 설정되지 않았습니다.');
  const {error} = await supabase.auth.signInWithOtp({email, options: {emailRedirectTo: redirectTo(), data: club ? {nickname, club} : {nickname}}});
  if (error) throw new Error(error.message.includes('rate') ? '잠시 후 다시 시도해 주세요. 메일 발송 횟수 제한에 걸렸습니다.' : '로그인 링크를 보내지 못했습니다: ' + error.message);
}
export async function signOut() { await supabase?.auth.signOut(); }

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
  const {data, error} = await supabase.from('predictions').select('pick,user_id').eq('match_id', matchId);
  if (error) throw error;
  const counts: [number, number, number] = [0, 0, 0];
  let mine: number | null = null;
  for (const r of data as {pick: number; user_id: string}[]) { counts[r.pick]++; if (r.user_id === userId) mine = r.pick; }
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
export async function addComment(user: User, target: string, body: string) {
  if (!supabase) return;
  const {error} = await supabase.from('comments').insert({user_id: user.id, nickname: nicknameOf(user), target, body});
  if (error) throw new Error('글을 올리지 못했습니다. 300자 이내로 써 주세요.');
}
export async function deleteComment(id: number) {
  if (!supabase) return;
  const {error} = await supabase.from('comments').delete().eq('id', id);
  if (error) throw new Error('글을 지우지 못했습니다.');
}
