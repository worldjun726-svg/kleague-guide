# K리그 관전 가이드

2025시즌을 돌아보며 팀 추천, 중요한 경기, 승강 조건을 살펴보는 한국어 웹앱입니다.

## 현재 상태

- 7개 화면 및 모바일 레이아웃 구현.
- 첫 화면은 라운드 경기. 답변·화면 선택은 메모리에만 유지하며 새로고침 시 초기화.
- **제공된 실제 JSON·파이썬 계산 코드·디자인 캡처가 없어 합성 예시 데이터로 구현했습니다. 실제 2025시즌 기록이 아닙니다.**
- 12개 K1 팀·14개 K2 팀, 합성 경기 228 + 273개. 예시 포아송 모형의 조건부 확률 포함.
- 정밀 매직넘버·다른 경기의 필요 결과·실제 PO 결과는 미제공 상태입니다. 자료가 없으면 그 이유를 표시하며, 확정 가능한 경우만 보수적으로 판정합니다.
- 실제 자료 기반 제품으로 완료하려면 DATA_CONTRACT.md의 연결·검증 작업이 필요합니다.
- 공개 배포는 하지 않았습니다.

## 지금 만들어 둔 화면 보기

이 작업 폴더에는 빌드된 dist가 있습니다. Python이 설치된 환경에서:

```powershell
cd C:\Python_test\kleague-guide
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

브라우저에서 http://127.0.0.1:4173 을 여세요. 서버 종료는 Ctrl+C입니다.
index.html을 파일 탐색기에서 직접 열면 JSON을 읽지 못하므로 HTTP 서버로 실행해야 합니다.

## 일반 개발 환경

Node.js 22.18 이상과 npm이 필요합니다.

```powershell
npm install
npm run dev
npm test
npm run build
```

개발 주소는 터미널에 표시됩니다. 정식 설치 후 기본 build 명령은 TypeScript 타입 검사와 Vite 빌드를 모두 수행합니다.

### 이번 환경의 도구 제한

npm 다운로드가 EACCES 접근 제한으로 실패했습니다. 따라서 이 환경에 이미 설치된 IDE 패키지를 읽기 전용으로 연결해 번들 및 브라우저 검사를 수행했습니다. 연결은 node_modules 내부의 로컬 환경 설정으로, 소스에 포함되지 않습니다.

이 로컬 React 패키지는 Preact 호환 구현이며 Vite는 7.3.0입니다. 일반 npm 설치로 얻는 package.json의 React 19·Vite 6 환경과 다릅니다. 정식 의존성 설치·전체 React 타입 검사·정식 React 브라우저 재검증은 아직 완료되지 않았습니다. package-lock.json도 생성되지 않았습니다.

- 의존성 없는 계산 검사: `npm test`
- 사용 가능한 로컬 도구의 구문 검사: `npm run check:syntax`
- 로컬 도구 번들 생성: `npm run build:bundle`
- 일반 Playwright 검사: `npm run test:browser`
- 로컬 브라우저 검사: 위 HTTP 서버 실행 후 `npm run test:browser:smoke`

브라우저 검사는 설치된 Chrome을 사용합니다. IDE에 포함된 Playwright CLI는 일부 파일이 없어 직접 브라우저 API를 사용하는 smoke 검사로 검증합니다.

## 데이터

`public/data/season-2025.json`을 fetch로 읽고 `src/data.ts`에서 검증·계산합니다.
`src/types.ts`와 DATA_CONTRACT.md에 구조가 있습니다.

합성 데이터 재생성:

```powershell
python scripts/generate_demo.py
```

이 명령은 해당 JSON을 덮어씁니다. 실제 파일을 연결한 이후에는 실행하지 마세요.
난수 시드는 고정되어 재현 가능합니다. 예측은 해당 기준 시점 이전의 합성 결과만 사용합니다.
합성 스케줄·팀명·확률은 공식 자료가 아니며 수치의 정확성을 주장하지 않습니다.

## 구조

- src: 화면·공통 컴포넌트·데이터 연결·계산
- public/data: 배포되는 JSON
- scripts: 합성 데이터 생성, 구문 검사, 브라우저 smoke 검사
- tests: 계산 검사와 Playwright 시나리오
- PRD.md / ACCEPTANCE.md: 요구사항과 브라우저 확인 기준

로그인, DB, 실시간 API, 사용자 선택 영구 저장, 외부 폰트 호출은 없습니다.
