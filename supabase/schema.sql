-- K리그 관전 가이드 · Supabase 테이블과 보안 규칙
-- Supabase 대시보드 → SQL Editor → New query 에 이 파일 내용을 통째로 붙여 넣고 Run 을 누르세요.
-- 여러 번 실행해도 안전하도록 작성했습니다.

-- 1) 응원팀·관심 선수
create table if not exists public.favorites (
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('team','player')),
  item_id    text not null check (char_length(item_id) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);
alter table public.favorites enable row level security;
drop policy if exists "favorites: 내 것만 보기" on public.favorites;
drop policy if exists "favorites: 내 것만 추가" on public.favorites;
drop policy if exists "favorites: 내 것만 삭제" on public.favorites;
create policy "favorites: 내 것만 보기" on public.favorites for select to authenticated using (auth.uid() = user_id);
create policy "favorites: 내 것만 추가" on public.favorites for insert to authenticated with check (auth.uid() = user_id);
create policy "favorites: 내 것만 삭제" on public.favorites for delete to authenticated using (auth.uid() = user_id);

-- 2) 경기 예측 (0 홈 승, 1 무승부, 2 원정 승) · 한 경기에 한 사람 한 표, 경기 시작 전까지만 저장·변경
create table if not exists public.predictions (
  user_id    uuid not null references auth.users(id) on delete cascade,
  match_id   text not null check (char_length(match_id) between 1 and 80),
  pick       smallint not null check (pick between 0 and 2),
  kickoff_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);
alter table public.predictions enable row level security;
drop policy if exists "predictions: 누구나 집계 보기" on public.predictions;
drop policy if exists "predictions: 시작 전 내 예측 추가" on public.predictions;
drop policy if exists "predictions: 시작 전 내 예측 변경" on public.predictions;
create policy "predictions: 누구나 집계 보기" on public.predictions for select using (true);
create policy "predictions: 시작 전 내 예측 추가" on public.predictions for insert to authenticated
  with check (auth.uid() = user_id and kickoff_at > now());
create policy "predictions: 시작 전 내 예측 변경" on public.predictions for update to authenticated
  using (auth.uid() = user_id and kickoff_at > now())
  with check (auth.uid() = user_id and kickoff_at > now());

-- 3) 응원 글 · 누구나 읽기, 로그인한 사람만 쓰기, 내 글만 지우기
create table if not exists public.comments (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  nickname   text not null check (char_length(nickname) between 1 and 20),
  target     text not null check (char_length(target) between 3 and 90),
  body       text not null check (char_length(btrim(body)) between 1 and 300),
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_target_idx on public.comments (target, created_at desc);
alter table public.comments enable row level security;
drop policy if exists "comments: 숨기지 않은 글 보기" on public.comments;
drop policy if exists "comments: 로그인하면 쓰기" on public.comments;
drop policy if exists "comments: 내 글만 삭제" on public.comments;
create policy "comments: 숨기지 않은 글 보기" on public.comments for select using (hidden = false);
create policy "comments: 로그인하면 쓰기" on public.comments for insert to authenticated
  with check (auth.uid() = user_id and hidden = false);
create policy "comments: 내 글만 삭제" on public.comments for delete to authenticated using (auth.uid() = user_id);

-- 도배 방지: 한 사람이 1분에 5개를 넘게 쓰지 못하게 한다.
create or replace function public.comments_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.comments where user_id = new.user_id and created_at > now() - interval '1 minute') >= 5 then
    raise exception '잠시 후 다시 써 주세요.';
  end if;
  return new;
end $$;
drop trigger if exists comments_rate_limit on public.comments;
create trigger comments_rate_limit before insert on public.comments for each row execute function public.comments_rate_limit();

-- 문제 글 숨기기(관리자): Table Editor 에서 해당 글의 hidden 을 true 로 바꾸면 사이트에서 사라집니다.
