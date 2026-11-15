# 로그인·응원 글·경기 예측·응원팀 저장 켜기 (Supabase)

연결 정보를 넣기 전에도 사이트는 정상 동작합니다. 로그인 버튼을 누르면 "준비 중" 안내가 나올 뿐입니다.
아래 순서대로 한 번만 설정하면 기능이 켜집니다. 무료 요금제로 충분합니다.

## 1. Supabase 프로젝트 만들기
1. https://supabase.com 에서 GitHub 계정으로 가입합니다.
2. **New project** → 이름 `kleague-guide`, 지역은 **Northeast Asia (Seoul)**, 데이터베이스 비밀번호는 아무 곳에도 쓰지 않을 강한 값으로 정합니다.

## 2. 테이블과 보안 규칙 만들기
1. 왼쪽 **SQL Editor** → **New query**
2. 프로젝트의 `supabase/schema.sql` 내용을 통째로 붙여 넣고 **Run**
3. 왼쪽 **Table Editor**에 `favorites`, `predictions`, `comments` 세 표가 보이면 성공입니다.

## 3. 로그인 링크가 돌아올 주소 등록
**Authentication → URL Configuration**
- **Site URL**: `https://worldjun726-svg.github.io/kleague-guide/`
- **Redirect URLs**에 아래 세 줄을 추가
  - `https://worldjun726-svg.github.io/kleague-guide/`
  - `http://127.0.0.1:4173/`
  - `http://127.0.0.1:5173/`

## 4. 사이트에 연결 정보 넣기
**Project Settings → API**에서 두 값을 복사해 `src/supabaseConfig.ts`에 붙여 넣습니다.
```ts
export const SUPABASE_URL = 'https://xxxx.supabase.co';      // Project URL
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';            // anon public 키
```
- anon public 키는 공개용이라 GitHub에 올라가도 됩니다. 데이터는 2단계의 보안 규칙이 지킵니다.
- **service_role 키는 절대 넣지 마세요.** 모든 보안 규칙을 무시하는 관리자 키입니다.

## 5. 반영
```
npm install
npm run build:bundle
git add .
git commit -m "Supabase 로그인 연결"
git push
```

## 운영 메모
- 문제 글 숨기기: **Table Editor → comments**에서 해당 줄의 `hidden`을 `true`로 바꿉니다.
- 무료 요금제의 기본 메일 발송은 시간당 몇 통으로 제한됩니다. 사용자가 늘면 **Authentication → Emails**에서 SMTP(예: Resend)를 연결하세요.
- 예측 마감은 경기 데이터의 킥오프 시각으로 판단합니다. 실제 경기 데이터 출처를 연결하면 경기 일정도 DB에 넣어 서버에서 마감을 확인하도록 바꾸는 것이 안전합니다.
