-- K LEAGUE GUIDE · 직관 동행·티켓 양도 매칭 (2026-11)
-- schema.sql, auth-upgrade.sql, security-hardening.sql 을 실행한 뒤에 실행하세요.
-- Supabase 대시보드 → SQL Editor → New query 에 통째로 붙여 넣고 Run. 여러 번 실행해도 안전합니다.
--
-- 흐름: 모집 글(동행/양도) → 신청 → 글쓴이 수락 → 두 사람만 보는 1:1 채팅(Supabase Realtime) → 경기 후 서로 후기 → 신뢰도
-- 운영: 신고(3명 이상 신고된 글은 자동 숨김), 차단(서로 신청·채팅 불가), 글·신청·메시지 횟수 제한
-- 티켓 양도는 정가 이하만(양도 가격 <= 정가). 돈은 사이트에서 주고받지 않는다.

-- 0) 공개 닉네임: 다른 회원에게는 닉네임만 보여 준다(이메일·약관 정보는 비공개)
create or replace view public.member_names as
  select id, nickname from public.profiles where nickname is not null;
revoke all on public.member_names from public;
grant select on public.member_names to anon, authenticated;

-- 가입 마무리(닉네임·약관 동의)를 한 회원인지
create or replace function public.is_member(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and nickname is not null and terms_agreed_at is not null);
$$;
revoke all on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;

-- 1) 차단: 내가 차단한 사람 목록(본인만 보고 관리)
create table if not exists public.meet_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.meet_blocks enable row level security;
drop policy if exists "blocks: 내 것" on public.meet_blocks;
create policy "blocks: 내 것" on public.meet_blocks for all to authenticated
  using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
grant select, insert, delete on public.meet_blocks to authenticated;

-- 둘 중 한 사람이라도 상대를 차단했는지
create or replace function public.meet_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.meet_blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;
revoke all on function public.meet_blocked(uuid, uuid) from public, anon;
grant execute on function public.meet_blocked(uuid, uuid) to authenticated;

-- 2) 모집 글
create table if not exists public.meet_posts (
  id          bigint generated always as identity primary key,
  author_id   uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('companion','ticket')),
  match_id    text not null check (char_length(match_id) between 1 and 80),
  kickoff_at  timestamptz not null,
  title       text not null check (char_length(btrim(title)) between 2 and 60),
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  seats       smallint check (seats between 1 and 10),           -- 동행: 함께 갈 인원 / 양도: 장수
  seat_area   text check (seat_area is null or char_length(seat_area) <= 40),
  face_price  integer check (face_price is null or face_price between 0 and 1000000),   -- 양도: 정가(1장)
  ask_price   integer check (ask_price is null or ask_price between 0 and 1000000),     -- 양도: 양도 가격(1장)
  status      text not null default 'open' check (status in ('open','closed')),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now(),
  -- 양도 글은 정가·양도 가격이 필수이고 양도 가격은 정가 이하(웃돈 금지)
  check (kind <> 'ticket' or (face_price is not null and ask_price is not null and ask_price <= face_price))
);
create index if not exists meet_posts_match_idx on public.meet_posts (match_id, created_at desc);
create index if not exists meet_posts_open_idx on public.meet_posts (status, kickoff_at);
alter table public.meet_posts enable row level security;
drop policy if exists "meet_posts: 보기" on public.meet_posts;
drop policy if exists "meet_posts: 쓰기" on public.meet_posts;
drop policy if exists "meet_posts: 내 글 고치기" on public.meet_posts;
drop policy if exists "meet_posts: 내 글 지우기" on public.meet_posts;
create policy "meet_posts: 보기" on public.meet_posts for select using (hidden = false or author_id = auth.uid());
create policy "meet_posts: 쓰기" on public.meet_posts for insert to authenticated
  with check (auth.uid() = author_id and hidden = false and status = 'open' and kickoff_at > now() and public.is_member(auth.uid()));
create policy "meet_posts: 내 글 고치기" on public.meet_posts for update to authenticated
  using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "meet_posts: 내 글 지우기" on public.meet_posts for delete to authenticated using (auth.uid() = author_id);
grant select on public.meet_posts to anon, authenticated;
grant insert, delete on public.meet_posts to authenticated;
-- 글쓴이가 바꿀 수 있는 칸만 열어 둔다(숨김·글쓴이·경기는 못 바꿈)
grant update (title, body, seats, seat_area, face_price, ask_price, status) on public.meet_posts to authenticated;

-- 하루 5개까지
create or replace function public.meet_posts_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.meet_posts where author_id = new.author_id and created_at > now() - interval '1 day') >= 5 then
    raise exception '모집 글은 하루 5개까지 쓸 수 있어요.';
  end if;
  return new;
end $$;
drop trigger if exists meet_posts_limit on public.meet_posts;
create trigger meet_posts_limit before insert on public.meet_posts for each row execute function public.meet_posts_limit();

-- 3) 신청: 글마다 한 사람 한 번. 글쓴이가 수락/거절, 신청자는 취소
create table if not exists public.meet_requests (
  id           bigint generated always as identity primary key,
  post_id      bigint not null references public.meet_posts(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  message      text not null check (char_length(btrim(message)) between 1 and 300),
  status       text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (post_id, applicant_id)
);
alter table public.meet_requests enable row level security;

-- 그 신청의 글쓴이인지 / 두 당사자 중 하나인지
create or replace function public.meet_post_author(p_post bigint) returns uuid
language sql stable security definer set search_path = public as $$
  select author_id from public.meet_posts where id = p_post;
$$;
revoke all on function public.meet_post_author(bigint) from public, anon;
grant execute on function public.meet_post_author(bigint) to authenticated;

drop policy if exists "meet_requests: 당사자만 보기" on public.meet_requests;
drop policy if exists "meet_requests: 신청" on public.meet_requests;
drop policy if exists "meet_requests: 상태 바꾸기" on public.meet_requests;
create policy "meet_requests: 당사자만 보기" on public.meet_requests for select to authenticated
  using (auth.uid() = applicant_id or auth.uid() = public.meet_post_author(post_id));
create policy "meet_requests: 신청" on public.meet_requests for insert to authenticated
  with check (
    auth.uid() = applicant_id and status = 'pending' and public.is_member(auth.uid())
    and exists (select 1 from public.meet_posts p where p.id = post_id and p.status = 'open' and p.hidden = false
                and p.kickoff_at > now() and p.author_id <> auth.uid() and not public.meet_blocked(p.author_id, auth.uid()))
  );
create policy "meet_requests: 상태 바꾸기" on public.meet_requests for update to authenticated
  using (auth.uid() = applicant_id or auth.uid() = public.meet_post_author(post_id))
  with check (auth.uid() = applicant_id or auth.uid() = public.meet_post_author(post_id));
grant select, insert on public.meet_requests to authenticated;
grant update (status) on public.meet_requests to authenticated;

-- 누가 어떤 상태로 바꿀 수 있는지: 글쓴이는 수락·거절, 신청자는 취소만
create or replace function public.meet_requests_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid := public.meet_post_author(new.post_id);
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.meet_requests where applicant_id = new.applicant_id and created_at > now() - interval '1 hour') >= 10 then
      raise exception '신청은 한 시간에 10번까지 할 수 있어요.';
    end if;
    return new;
  end if;
  if new.status = old.status then return new; end if;
  if auth.uid() = author and old.status = 'pending' and new.status in ('accepted','rejected') then null;
  elsif auth.uid() = new.applicant_id and old.status in ('pending','accepted') and new.status = 'cancelled' then null;
  else raise exception '이 신청의 상태를 바꿀 수 없어요.';
  end if;
  if new.status = 'accepted' and public.meet_blocked(author, new.applicant_id) then raise exception '차단한(된) 회원의 신청은 수락할 수 없어요.'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists meet_requests_guard on public.meet_requests;
create trigger meet_requests_guard before insert or update on public.meet_requests for each row execute function public.meet_requests_guard();

-- 4) 1:1 채팅: 수락된 신청의 두 사람만. 차단되면 더 못 보냄
create table if not exists public.meet_messages (
  id          bigint generated always as identity primary key,
  request_id  bigint not null references public.meet_requests(id) on delete cascade,
  sender_id   uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists meet_messages_req_idx on public.meet_messages (request_id, created_at);
alter table public.meet_messages enable row level security;

create or replace function public.meet_chat_member(p_req bigint, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.meet_requests r join public.meet_posts p on p.id = r.post_id
     where r.id = p_req and r.status = 'accepted' and (r.applicant_id = uid or p.author_id = uid)
  );
$$;
revoke all on function public.meet_chat_member(bigint, uuid) from public, anon;
grant execute on function public.meet_chat_member(bigint, uuid) to authenticated;

drop policy if exists "meet_messages: 두 사람만 보기" on public.meet_messages;
drop policy if exists "meet_messages: 두 사람만 쓰기" on public.meet_messages;
create policy "meet_messages: 두 사람만 보기" on public.meet_messages for select to authenticated
  using (public.meet_chat_member(request_id, auth.uid()));
create policy "meet_messages: 두 사람만 쓰기" on public.meet_messages for insert to authenticated
  with check (auth.uid() = sender_id and public.meet_chat_member(request_id, auth.uid()));
grant select, insert on public.meet_messages to authenticated;

create or replace function public.meet_messages_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  select r.applicant_id, p.author_id into a, b from public.meet_requests r join public.meet_posts p on p.id = r.post_id where r.id = new.request_id;
  if public.meet_blocked(a, b) then raise exception '차단된 대화에는 메시지를 보낼 수 없어요.'; end if;
  if (select count(*) from public.meet_messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception '메시지를 너무 빨리 보내고 있어요. 잠시 후 다시 보내 주세요.';
  end if;
  return new;
end $$;
drop trigger if exists meet_messages_guard on public.meet_messages;
create trigger meet_messages_guard before insert on public.meet_messages for each row execute function public.meet_messages_guard();

-- 실시간 전송(Supabase Realtime): 새 메시지·신청 상태 변화를 WebSocket 으로 받는다. RLS 가 그대로 적용된다.
do $$ begin
  begin alter publication supabase_realtime add table public.meet_messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.meet_requests; exception when duplicate_object then null; end;
end $$;

-- 5) 후기: 수락된 신청의 두 사람이 경기 시작 이후 서로 한 번씩(1~5점)
create table if not exists public.meet_reviews (
  id          bigint generated always as identity primary key,
  request_id  bigint not null references public.meet_requests(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (comment is null or char_length(comment) <= 200),
  created_at  timestamptz not null default now(),
  unique (request_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);
alter table public.meet_reviews enable row level security;
drop policy if exists "meet_reviews: 누구나 보기" on public.meet_reviews;
drop policy if exists "meet_reviews: 쓰기" on public.meet_reviews;
create policy "meet_reviews: 누구나 보기" on public.meet_reviews for select using (true);
create policy "meet_reviews: 쓰기" on public.meet_reviews for insert to authenticated
  with check (
    auth.uid() = reviewer_id and public.meet_chat_member(request_id, auth.uid()) and public.meet_chat_member(request_id, reviewee_id)
    and exists (select 1 from public.meet_requests r join public.meet_posts p on p.id = r.post_id where r.id = request_id and p.kickoff_at < now())
  );
grant select on public.meet_reviews to anon, authenticated;
grant insert on public.meet_reviews to authenticated;

-- 신뢰도: 받은 후기 수·평균, 함께한 직관(수락 후 경기가 지난 신청) 수
create or replace function public.meet_trust(uid uuid)
returns table (reviews bigint, avg_rating numeric, meets bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.meet_reviews where reviewee_id = uid),
    (select round(avg(rating)::numeric, 1) from public.meet_reviews where reviewee_id = uid),
    (select count(*) from public.meet_requests r join public.meet_posts p on p.id = r.post_id
      where r.status = 'accepted' and p.kickoff_at < now() and (r.applicant_id = uid or p.author_id = uid));
$$;
revoke all on function public.meet_trust(uuid) from public;
grant execute on function public.meet_trust(uuid) to anon, authenticated;

-- 6) 신고: 넣기만 가능(내용은 관리자만 대시보드에서). 서로 다른 3명이 신고한 글은 자동 숨김
create table if not exists public.meet_reports (
  id           bigint generated always as identity primary key,
  reporter_id  uuid not null references auth.users(id) on delete cascade,
  target_user  uuid references auth.users(id) on delete cascade,
  post_id      bigint references public.meet_posts(id) on delete cascade,
  message_id   bigint references public.meet_messages(id) on delete set null,
  reason       text not null check (reason in ('scalping','fraud','abuse','spam','other')),
  detail       text check (detail is null or char_length(detail) <= 300),
  created_at   timestamptz not null default now(),
  unique (reporter_id, post_id, message_id)
);
alter table public.meet_reports enable row level security;
drop policy if exists "meet_reports: 신고하기" on public.meet_reports;
create policy "meet_reports: 신고하기" on public.meet_reports for insert to authenticated
  with check (auth.uid() = reporter_id and (target_user is null or target_user <> auth.uid()));
grant insert on public.meet_reports to authenticated;

create or replace function public.meet_reports_autohide() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.post_id is not null and (select count(distinct reporter_id) from public.meet_reports where post_id = new.post_id) >= 3 then
    update public.meet_posts set hidden = true where id = new.post_id;
  end if;
  return new;
end $$;
drop trigger if exists meet_reports_autohide on public.meet_reports;
create trigger meet_reports_autohide after insert on public.meet_reports for each row execute function public.meet_reports_autohide();

-- 내부용 함수는 사이트에서 직접 부르지 못하게
revoke all on function public.meet_posts_limit() from public, anon, authenticated;
revoke all on function public.meet_requests_guard() from public, anon, authenticated;
revoke all on function public.meet_messages_guard() from public, anon, authenticated;
revoke all on function public.meet_reports_autohide() from public, anon, authenticated;

-- 7) 관리자 화면(대시보드 전용, 사이트에서 접근 불가): 신고 목록
--    보는 법: SQL Editor 에서  select * from admin.meet_reports_view;
--    처리: 문제 글 숨기기  update public.meet_posts set hidden = true where id = <글 번호>;
create schema if not exists admin;
create or replace view admin.meet_reports_view as
select r.created_at as 신고일, r.reason as 사유, r.detail as 내용,
       r.post_id as 글번호, p.title as 글제목, p.hidden as 숨김,
       (select nickname from public.profiles where id = r.target_user) as 신고대상,
       (select nickname from public.profiles where id = r.reporter_id) as 신고자,
       m.body as 신고된메시지
from public.meet_reports r
left join public.meet_posts p on p.id = r.post_id
left join public.meet_messages m on m.id = r.message_id
order by r.created_at desc;
revoke all on admin.meet_reports_view from public, anon, authenticated;
