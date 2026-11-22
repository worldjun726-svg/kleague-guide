-- K LEAGUE GUIDE · 개인정보 보안 강화 (2026-11-22)
-- schema.sql, auth-upgrade.sql 을 실행한 뒤에 실행하세요.
-- Supabase 대시보드 → SQL Editor → New query 에 이 파일 내용을 통째로 붙여 넣고 Run.
-- 여러 번 실행해도 안전하도록 작성했습니다.

-- 1) 응원 글 작성자 이름은 서버가 정한다.
--    예전에는 브라우저가 보낸 이름을 그대로 저장해서, 다른 사람 닉네임으로 글을 쓰거나
--    닉네임이 없는 회원의 이메일 앞부분이 작성자 이름으로 공개될 수 있었다.
--    이제 가입 마무리(닉네임·약관 동의)를 한 회원만 글을 쓸 수 있고, 이름은 프로필 닉네임으로 채운다.
create or replace function public.comments_fill_nickname() returns trigger
language plpgsql security definer set search_path = public as $$
declare n text;
begin
  select nickname into n from public.profiles
   where id = new.user_id and nickname is not null and terms_agreed_at is not null;
  if n is null then
    raise exception '가입 마무리(닉네임·약관 동의)를 먼저 해 주세요.';
  end if;
  new.nickname := n;
  return new;
end $$;
drop trigger if exists comments_fill_nickname on public.comments;
create trigger comments_fill_nickname before insert on public.comments
  for each row execute function public.comments_fill_nickname();

-- 이미 올라간 글의 작성자 이름 정리: 프로필 닉네임으로 맞추고, 닉네임이 없으면 '팬'으로 가린다.
update public.comments c set nickname = p.nickname
  from public.profiles p
 where p.id = c.user_id and p.nickname is not null and c.nickname is distinct from p.nickname;
update public.comments c set nickname = '팬'
 where not exists (select 1 from public.profiles p where p.id = c.user_id and p.nickname is not null);

-- 닉네임을 바꾸면 내가 쓴 글의 작성자 이름도 함께 바뀐다.
create or replace function public.profiles_sync_comment_nickname() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.nickname is not null and new.nickname is distinct from old.nickname then
    update public.comments set nickname = new.nickname where user_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists profiles_sync_comment_nickname on public.profiles;
create trigger profiles_sync_comment_nickname after update of nickname on public.profiles
  for each row execute function public.profiles_sync_comment_nickname();

-- 2) 경기 예측: 누가 무엇을 골랐는지는 본인만 보고, 다른 사람에게는 집계 숫자만 보여 준다.
--    예전에는 로그인하지 않은 사람도 모든 회원의 회원 ID·예측 기록을 내려받을 수 있었다.
drop policy if exists "predictions: 누구나 집계 보기" on public.predictions;
drop policy if exists "predictions: 내 예측 보기" on public.predictions;
create policy "predictions: 내 예측 보기" on public.predictions for select to authenticated
  using (auth.uid() = user_id);
revoke select on public.predictions from anon;
grant select on public.predictions to authenticated;

create or replace function public.prediction_counts(p_match_id text)
returns table (pick smallint, votes bigint)
language sql stable security definer set search_path = public as $$
  select pr.pick, count(*) from public.predictions pr where pr.match_id = p_match_id group by pr.pick;
$$;
revoke all on function public.prediction_counts(text) from public;
grant execute on function public.prediction_counts(text) to anon, authenticated;

-- 3) 회원 탈퇴: 본인 계정만 지울 수 있다.
--    계정을 지우면 profiles·favorites·predictions·comments 가 함께 지워진다(on delete cascade).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception '로그인이 필요합니다.'; end if;
  delete from auth.users where id = uid;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 4) 내부용 함수는 사이트(Data API)에서 직접 부르지 못하게 막는다. 트리거는 그대로 동작한다.
revoke all on function public.comments_rate_limit() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.comments_fill_nickname() from public, anon, authenticated;
revoke all on function public.profiles_sync_comment_nickname() from public, anon, authenticated;

-- 5) 회원 명단(관리자 전용)
--    admin 스키마는 사이트(Data API)에 공개되지 않으므로, Supabase 대시보드에 로그인한 관리자만 볼 수 있다.
--    보는 법: SQL Editor 에서  select * from admin.members;
--    또는 Table Editor 왼쪽 위 schema 를 admin 으로 바꾼 뒤 members.
--    주의: Project Settings → Data API → Exposed schemas 에 admin 을 절대 추가하지 말 것.
create schema if not exists admin;
revoke all on schema admin from public, anon, authenticated;
create or replace view admin.members as
select
  u.created_at                                         as 가입일,
  coalesce(u.raw_app_meta_data->>'provider', 'email')  as 가입방식,
  u.email                                              as 이메일,
  p.nickname                                           as 닉네임,
  u.raw_user_meta_data->>'club'                        as my팀,
  p.terms_agreed_at is not null                        as 약관동의,
  p.marketing                                          as 마케팅동의,
  u.email_confirmed_at is not null                     as 이메일인증,
  u.last_sign_in_at                                    as 마지막로그인,
  u.id                                                 as 회원id
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc;
revoke all on admin.members from public, anon, authenticated;
