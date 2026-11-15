# 2026 공식 표 저장본

2026-11-14에 웹 도구로 확인한 공식 공개 페이지의 순위/수치 행만 보관한다. 기사나 선수 설명을 복제한 파일이 아니다.

- teams.txt 첫 12행: https://www.kleague.com/club/club.do?teamId=K35 (표 기준 2026-11-13)
- 나머지 17행: https://www.kleague.com/club/club.do?teamId=K02 (표 기준 2026-11-14)
- players1.txt: https://www.kleague.com/record/player.do (2026-11-14)
- players2.txt: https://www.kleague.com/record/player.do?leagueId=2 (2026-11-13)

선수 표는 공개된 득점 순위 30행씩만 포함한다. 전체 등록 선수 데이터가 아니다. 임의로 누락 선수를 추가하지 않는다. 변환은 저장소 루트에서 `node scripts/import-current.mjs`. 재실행만으로 최신 데이터가 되지 않는다.
