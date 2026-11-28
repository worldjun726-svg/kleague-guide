// 직관 동행·티켓 양도 매칭 — Supabase 표(supabase/meetup.sql)와 실시간(Realtime) 연결.
// 권한·횟수 제한·정가 이하 규칙은 DB 가 강제하고, 여기서는 화면에 맞게 읽고 쓰기만 한다.
import {supabase} from './accountApi';

export type MeetKind = 'companion' | 'ticket';
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type ReportReason = 'scalping' | 'fraud' | 'abuse' | 'spam' | 'other';
export interface MeetPost {
  id: number; author_id: string; kind: MeetKind; match_id: string; kickoff_at: string; title: string; body: string;
  seats: number | null; seat_area: string | null; face_price: number | null; ask_price: number | null;
  status: 'open' | 'closed'; hidden: boolean; created_at: string;
}
export interface MeetRequest { id: number; post_id: number; applicant_id: string; message: string; status: RequestStatus; created_at: string; updated_at: string }
export interface MeetMessage { id: number; request_id: number; sender_id: string; body: string; created_at: string }
export interface Trust { reviews: number; avg_rating: number | null; meets: number }
export const REPORT_REASONS: [ReportReason, string][] = [['scalping', '웃돈 거래·암표'], ['fraud', '사기 의심'], ['abuse', '욕설·괴롭힘'], ['spam', '광고·도배'], ['other', '기타']];

const db = () => { if (!supabase) throw new Error('로그인 기능이 아직 설정되지 않았습니다.'); return supabase; };
// DB 오류 문구 중 사용자에게 보여 줄 한국어(트리거가 보낸 것)는 그대로, 나머지는 일반 안내로
const friendly = (m: string, fallback: string) => /[가-힣]/.test(m) && !m.includes('violates') ? m : m.includes('row-level security') ? '권한이 없어요. 가입 마무리(닉네임·약관 동의)를 했는지 확인해 주세요.' : m.includes('meet_posts_check') ? '양도 가격은 정가보다 높을 수 없어요.' : fallback;

export async function listPosts(opts: {matchId?: string; kind?: MeetKind} = {}) {
  let q = db().from('meet_posts').select('*').eq('hidden', false).gt('kickoff_at', new Date().toISOString()).order('kickoff_at').order('created_at', {ascending: false}).limit(100);
  if (opts.matchId) q = q.eq('match_id', opts.matchId);
  if (opts.kind) q = q.eq('kind', opts.kind);
  const {data, error} = await q;
  if (error) throw new Error(error.code === 'PGRST205' || error.code === '42P01' ? '직관 동행·양도 기능을 준비하고 있어요. 곧 열려요!' : '모집 글을 불러오지 못했어요.');
  return data as MeetPost[];
}
export async function getPost(id: number) {
  const {data, error} = await db().from('meet_posts').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('모집 글을 불러오지 못했어요.');
  return data as MeetPost | null;
}
export async function myPosts(userId: string) {
  const {data, error} = await db().from('meet_posts').select('*').eq('author_id', userId).order('created_at', {ascending: false}).limit(50);
  if (error) throw new Error('내 글을 불러오지 못했어요.');
  return data as MeetPost[];
}
export interface NewPost { kind: MeetKind; match_id: string; kickoff_at: string; title: string; body: string; seats: number; seat_area?: string; face_price?: number; ask_price?: number }
export async function createPost(authorId: string, p: NewPost) {
  if (p.kind === 'ticket' && (p.ask_price ?? 0) > (p.face_price ?? 0)) throw new Error('양도 가격은 정가보다 높을 수 없어요.');
  const {data, error} = await db().from('meet_posts').insert({author_id: authorId, ...p, seat_area: p.seat_area || null, face_price: p.kind === 'ticket' ? p.face_price : null, ask_price: p.kind === 'ticket' ? p.ask_price : null}).select('id').single();
  if (error) throw new Error(friendly(error.message, '글을 올리지 못했어요. 입력 내용을 확인해 주세요.'));
  return (data as {id: number}).id;
}
export async function setPostStatus(id: number, status: 'open' | 'closed') {
  const {error} = await db().from('meet_posts').update({status}).eq('id', id);
  if (error) throw new Error('모집 상태를 바꾸지 못했어요.');
}
export async function deletePost(id: number) {
  const {error} = await db().from('meet_posts').delete().eq('id', id);
  if (error) throw new Error('글을 지우지 못했어요.');
}

// 닉네임(공개 정보만)
export async function nicknames(ids: string[]) {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return {} as Record<string, string>;
  const {data} = await db().from('member_names').select('id,nickname').in('id', uniq);
  return Object.fromEntries((data ?? []).map((r: {id: string; nickname: string}) => [r.id, r.nickname])) as Record<string, string>;
}
export async function trustOf(userId: string): Promise<Trust> {
  const {data} = await db().rpc('meet_trust', {uid: userId});
  const r = (Array.isArray(data) ? data[0] : data) as {reviews: number; avg_rating: number | null; meets: number} | undefined;
  return {reviews: Number(r?.reviews ?? 0), avg_rating: r?.avg_rating == null ? null : Number(r.avg_rating), meets: Number(r?.meets ?? 0)};
}

// 신청
export async function requestsFor(postId: number) {
  const {data, error} = await db().from('meet_requests').select('*').eq('post_id', postId).order('created_at');
  if (error) throw new Error('신청 목록을 불러오지 못했어요.');
  return data as MeetRequest[];
}
export async function myRequests(userId: string) {
  const {data, error} = await db().from('meet_requests').select('*').eq('applicant_id', userId).order('created_at', {ascending: false}).limit(50);
  if (error) throw new Error('내 신청을 불러오지 못했어요.');
  return data as MeetRequest[];
}
export async function apply(userId: string, postId: number, message: string) {
  const {error} = await db().from('meet_requests').insert({post_id: postId, applicant_id: userId, message: message.trim()});
  if (error) throw new Error(error.code === '23505' ? '이미 신청한 글이에요.' : friendly(error.message, '신청하지 못했어요. 모집이 끝났거나 신청할 수 없는 글일 수 있어요.'));
}
export async function setRequestStatus(id: number, status: RequestStatus) {
  const {error} = await db().from('meet_requests').update({status}).eq('id', id);
  if (error) throw new Error(friendly(error.message, '신청 상태를 바꾸지 못했어요.'));
}

// 1:1 채팅 — 처음엔 목록을 읽고, 이후 새 메시지는 Realtime(WebSocket)으로 받는다.
export async function messages(requestId: number) {
  const {data, error} = await db().from('meet_messages').select('*').eq('request_id', requestId).order('created_at').limit(300);
  if (error) throw new Error('대화를 불러오지 못했어요.');
  return data as MeetMessage[];
}
export async function sendMessage(userId: string, requestId: number, body: string) {
  const {error} = await db().from('meet_messages').insert({request_id: requestId, sender_id: userId, body: body.trim()});
  if (error) throw new Error(friendly(error.message, '메시지를 보내지 못했어요.'));
}
export function subscribeMessages(requestId: number, onMessage: (m: MeetMessage) => void, onStatus?: (s: string) => void) {
  const ch = db().channel('meet-chat-' + requestId)
    .on('postgres_changes', {event: 'INSERT', schema: 'public', table: 'meet_messages', filter: 'request_id=eq.' + requestId}, p => onMessage(p.new as MeetMessage))
    .subscribe(s => onStatus?.(s));
  return () => { db().removeChannel(ch); };
}
// 신청 상태가 바뀌면(수락·거절·취소) 바로 화면에 반영
export function subscribeRequests(postId: number, onChange: (r: MeetRequest) => void) {
  const ch = db().channel('meet-req-' + postId)
    .on('postgres_changes', {event: '*', schema: 'public', table: 'meet_requests', filter: 'post_id=eq.' + postId}, p => { if (p.new && (p.new as MeetRequest).id) onChange(p.new as MeetRequest); })
    .subscribe();
  return () => { db().removeChannel(ch); };
}

// 후기·신고·차단
export async function myReviewFor(requestId: number, userId: string) {
  const {data} = await db().from('meet_reviews').select('id').eq('request_id', requestId).eq('reviewer_id', userId).maybeSingle();
  return Boolean(data);
}
export async function review(userId: string, requestId: number, revieweeId: string, rating: number, comment: string) {
  const {error} = await db().from('meet_reviews').insert({request_id: requestId, reviewer_id: userId, reviewee_id: revieweeId, rating, comment: comment.trim() || null});
  if (error) throw new Error(error.code === '23505' ? '이미 후기를 남겼어요.' : friendly(error.message, '후기는 함께한 경기가 시작된 뒤에 남길 수 있어요.'));
}
export async function report(userId: string, r: {target_user?: string; post_id?: number; message_id?: number; reason: ReportReason; detail?: string}) {
  const {error} = await db().from('meet_reports').insert({reporter_id: userId, target_user: r.target_user ?? null, post_id: r.post_id ?? null, message_id: r.message_id ?? null, reason: r.reason, detail: r.detail?.trim() || null});
  if (error && error.code !== '23505') throw new Error('신고를 접수하지 못했어요.');
}
export async function myBlocks(userId: string) {
  const {data} = await db().from('meet_blocks').select('blocked_id').eq('blocker_id', userId);
  return new Set((data ?? []).map((r: {blocked_id: string}) => r.blocked_id));
}
export async function block(userId: string, blockedId: string) {
  const {error} = await db().from('meet_blocks').insert({blocker_id: userId, blocked_id: blockedId});
  if (error && error.code !== '23505') throw new Error('차단하지 못했어요.');
}
export async function unblock(userId: string, blockedId: string) {
  const {error} = await db().from('meet_blocks').delete().match({blocker_id: userId, blocked_id: blockedId});
  if (error) throw new Error('차단을 풀지 못했어요.');
}
