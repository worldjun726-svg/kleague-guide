-- K LEAGUE GUIDE · 회원가입 개편 (이메일·비밀번호, 카카오·구글, 닉네임 중복 확인, 약관 동의)
-- Supabase 대시보드 → SQL Editor → New query 에 이 파일 내용을 통째로 붙여 넣고 Run 을 누르세요.
-- 여러 번 실행해도 안전하도록 작성했습니다.

-- 1) 회원 프로필: 닉네임(중복 불가)과 약관 동의 시각
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  nickname          text check (nickname is null or char_length(btrim(nickname)) between 2 and 20),
  terms_agreed_at   timestamptz,
  privacy_agreed_at timestamptz,
  marketing         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- 대소문자·앞뒤 공백을 무시하고 같은 닉네임은 하나만
create unique index if not exists profiles_nickname_key on public.profiles (lower(btrim(nickname)));

alter table public.profiles enable row level security;
drop policy if exists "profiles: 내 것 보기" on public.profiles;
drop policy if exists "profiles: 내 것 수정" on public.profiles;
drop policy if exists "profiles: 내 것 만들기" on public.profiles;
create policy "profiles: 내 것 보기" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles: 내 것 수정" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: 내 것 만들기" on public.profiles for insert to authenticated with check (auth.uid() = id);
grant select, insert, update on public.profiles to authenticated;

-- 2) 닉네임 사용 가능 여부 (가입 전에도 확인할 수 있게 anon 허용, 다른 사람 정보는 돌려주지 않음)
create or replace function public.nickname_available(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select char_length(btrim(name)) between 2 and 20
     and not exists (
       select 1 from public.profiles
        where lower(btrim(nickname)) = lower(btrim(name))
          and id is distinct from auth.uid()
     );
$$;
grant execute on function public.nickname_available(text) to anon, authenticated;

-- 3) 가입하면 프로필을 자동으로 만든다.
--    이메일 가입: 가입 화면에서 보낸 닉네임·동의 시각을 저장(닉네임이 겹치면 가입 자체가 실패한다).
--    카카오·구글 가입: 닉네임은 비워 두고, 첫 로그인 때 '가입 마무리' 화면에서 받는다.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_email boolean := coalesce(new.raw_app_meta_data->>'provider', 'email') = 'email';
begin
  insert into public.profiles (id, nickname, terms_agreed_at, privacy_agreed_at, marketing)
  values (
    new.id,
    case when is_email then nullif(btrim(new.raw_user_meta_data->>'nickname'), '') end,
    case when is_email then (new.raw_user_meta_data->>'terms_agreed_at')::timestamptz end,
    case when is_email then (new.raw_user_meta_data->>'privacy_agreed_at')::timestamptz end,
    case when is_email then coalesce((new.raw_user_meta_data->>'marketing')::boolean, false) else false end
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 4) 이미 가입한 회원(예전 이메일 링크 방식)의 프로필도 만들어 둔다.
--    닉네임이 겹치는 경우는 건너뛰고(ON CONFLICT), 그 회원은 첫 로그인 때 '가입 마무리'에서 새로 정한다.
insert into public.profiles (id, nickname)
select id, nullif(btrim(raw_user_meta_data->>'nickname'), '') from auth.users
on conflict do nothing;
