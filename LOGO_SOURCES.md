# 구단 엠블럼 출처

앱의 29개 팀과 K리그 공식 구단 코드를 `src/logos.ts`에서 연결한다.
공식 구단 페이지: https://www.kleague.com/club/club.do?teamId=K05 (전북 예시)
이미지 주소: https://www.kleague.com/assets/images/emblem/emblem_K05.png

공식 페이지에서 팀 이름과 구단 코드를 확인했다. 공식 사이트의 현재 이미지 주소를 직접 불러오며, 2025시즌 당시 이미지로 고정된 아카이브는 아니다. 네트워크 제한으로 로컬 다운로드는 하지 못했다.
추천 카드, 경기 목록, 팀 상세, 순위표의 공통 Tile 컴포넌트에 적용한다. 이미지 비율을 유지하며 로딩 실패 시 해당 팀 약칭을 표시한다.
# 2026 추가 구단

공식 클럽 페이지의 로고 링크를 2026-11-14 확인하여 추가했다.
- 파주: https://www.kleague.com/club/club.do?teamId=K40 → emblem_K40.png
- 김해: https://www.kleague.com/club/club.do?teamId=K41 → emblem_K41.png
- 용인: https://www.kleague.com/club/club.do?teamId=K42 → emblem_K42.png

