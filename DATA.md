# SAMPLE DATA JSON

## 모든 팀 TOP 5 자료

`scripts/sources/team-top-five.json`은 FootyStats의 2026 구단별 공개 통계에서 수집한 29팀의 득점·도움·출전 각 상위8명이다. 원문 URL은 각 팀의 sourceUrl, 확인일은 checkedAt에 보존했다. 모든 원문에서 2026시즌 표기를 확인했다. 본문의 과거 설명문 대신 숫자 목록을 사용했다. 확인일은 모든 경기 데이터가 그날까지 반영되었다는 뜻이 아니다. 공식 기록과 제공자 갱신 시점이 다르므로 합산하거나 공식 기록으로 재표시하지 않는다.

`import-current.mjs`가 current-season.json의 teamLeaders로 포함한다. 로더는 모든29팀·3개항목에 최소5명의 이름과 유효한 수치가 없으면 실패시킨다. 팀 선수 탭은 이 자료를 사용하며 현재 화면에서 5명만 표시한다. 표시순은 수치 내림차순→원문순, 동률은 공동순위. 수치·이름을 임의로 만들어 빈 행을 채우지 않는다. 기존 공식 개별 선수 목록61명은 별도 검색 화면에서 유지한다.

TOP 5 보완: `scripts/sources/supplemental-players.json`에 공식 개별 선수 기록(문선민)을 추가해 총61명을 제공한다. 해당 출처: https://www.kleague.com/record/playerDetail.do?playerId=20170229 (2026시즌 행, 확인일 2026-11-14). 개별 자료에는 원문 링크와 확인일을 보존한다. 미수집 수치는 null로 저장하며 화면은 `—`, 정렬은 숫자 뒤로 처리한다. 팀별 선수 탭은 정렬 후 최대5명이며 미수집 인원을 임의로 채우지 않는다.

## 현재 데이터 연결 (2026-11-14 변경)

현재 백엔드·DB는 계속 로컬 JSON 파일을 사용한다. `public/data/current-season.json`이 2026 순위·팀·선수 기록, `sample-data.json`이 2025 예시 경기·예측과 영상 경로를 제공한다. 실제 기록과 합성 경기를 합산하지 않는다.

`App → loadCurrentSeason → validateCurrent → 현재 순위/팀/선수/추천`.
`App → loadSampleDataset → 명시적으로 연 2025 예시 기능`.

현재 JSON: season, retrievedAt, sources(기록별 원문·기준일), coverage, teams, standings, players. 조회는 fetch 한 번이며 외부 실시간 API 호출·DB 쓰기·로그인은 없다.

원문 표의 사실 데이터는 `scripts/sources/*.txt`에 보관한다. `node scripts/import-current.mjs`는 이 저장된 표를 다시 변환하며 인터넷에서 최신 자료를 받는 명령이 아니다. 갱신 시 해당 표와 기준일을 함께 교체하고 검증·빌드를 실행한다. 합성 생성 스크립트는 current-season.json을 덮어쓰지 않는다.

팀: 29팀 전체 순위, 시즌 누적 경기·승무패·승점·득실점·최근5경기·파이널그룹.
선수: 공식 공개 득점 순위 리그별30명, 총60개 시즌 기록. 선수 ID는 이번 스냅샷용이며 영구 공식 선수 ID가 아니다. 전체 선수 명단이나 이적 이력을 제공하지 않는다. 원문 영문명도 검색된다. 원문 소속과 기록 리그가 다른 경우 이를 자동 수정하지 않고 별도 표시한다.

공식 출처 및 기준일:
- K1 순위: https://www.kleague.com/club/club.do?teamId=K35 (2026-11-13)
- K2 순위: https://www.kleague.com/club/club.do?teamId=K02 (2026-11-14)
- K1 선수: https://www.kleague.com/record/player.do (2026-11-14)
- K2 선수: https://www.kleague.com/record/player.do?leagueId=2 (2026-11-13)

미수집: 현재 경기별 일정·결과, 선수 출전시간/포지션/패스/태클/선방/xG. 합성값이나 0으로 보충하지 않는다. 원문에서 제공하는 0만 실제 숫자로 표시한다. 누적 성적 기반 추천의 ‘골이 많은 경기’ 지표는 (득점+실점)/경기수다.

## 초기 샘플 데이터 설명 (예시 기능에 한함)

현재 백엔드와 DB 역할은 `public/data/sample-data.json` 한 파일이 담당한다. 별도 API 서버, DB 설치, 계정, API 키가 필요 없는 읽기 전용 샘플이다.

## 데이터 흐름
`App → src/sampleApi.ts → GET /data/sample-data.json → 형식 검증 → 각 화면`

나의 팀 찾기, 경기 목록, 팀 기록, 빅매치, 시뮬레이터, 승강 센터는 동일한 데이터를 사용한다. 답변은 브라우저 localStorage에 저장하며 JSON 파일에 쓰지 않는다. JSON을 수정한 뒤 개발 서버에서는 새로고침, 빌드된 미리보기에서는 다시 빌드 후 새로고침한다.

| 필드 | 내용 |
|---|---|
| meta | demo 모드, 시즌, 출처, 생성일, 모형 설명 |
| heroMedia | 인트로 배경 영상·포스터 경로. 현재 /media/hero.mp4 및 /media/hero-poster.jpg |
| teams | 26개 팀의 ID·이름·지역·색상·리그 |
| matches | 501개 합성 경기의 라운드·일시·팀·스코어·경기 전 확률 |
| forecasts | K1 31·32·33·36·37R의 예시 확률과 빅매치 지수 |
| relegation (선택) | 검증된 목표별 매직넘버와 다음 라운드 조건. 현재 파일에는 없음 |

실제 2025 기록이 아니므로 앱에 SAMPLE EDITION 표시를 유지한다. K2 확률과 정밀 매직넘버처럼 제공되지 않은 값은 빈 상태를 표시한다. 임의의 수치로 채우지 않는다.

구단 로고만 공식 사이트의 외부 이미지 주소를 사용한다. 로고를 못 읽어도 팀 약칭으로 앱을 사용할 수 있다.

영상 연결은 `public/media/README.md`를 참고한다. 사용자 제공 영상을 연결했으며 외부 사이트의 영상을 가져와 사용하지 않는다.

샘플 재생성: `python scripts/generate_demo.py` (같은 시드, 계산에 시간이 걸릴 수 있음).
데이터 검증: `node --experimental-strip-types --test tests/data.test.ts tests/sample-api.test.ts`.
실제 백엔드로 전환할 때는 `src/sampleApi.ts`의 데이터 공급 경계와 공급 데이터 형식을 교체한다.
