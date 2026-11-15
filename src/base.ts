// public/ 폴더 파일 경로 앞에 붙는 기본 주소. 로컬 서버와 GitHub Pages(/kleague-guide/) 양쪽에서 같은 빌드가 동작하게 한다.
export const BASE_URL: string = import.meta.env?.BASE_URL ?? '/';
export const withBase = (path: string) => (path.startsWith('/') ? BASE_URL + path.slice(1) : path);
