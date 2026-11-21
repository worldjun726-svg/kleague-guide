// K리그 공식 홈페이지의 '구단'·'리그' 소식 목록(최신 순)을 받아 public/data/news.json 으로 저장한다.
// 화면에서는 MY 팀 이름이 들어간 기사만 골라 보여 주고, 누르면 공식 기사로 이동한다.
// 실패하면 기존 파일을 그대로 두고 종료 코드 1로 끝난다(배포 작업은 continue-on-error 로 계속된다).
import {writeFileSync} from 'node:fs';

const BASE = 'https://www.kleague.com';
const OUT = 'public/data/news.json';
const PAGES = {club: 8, league: 4}; // 한 페이지 12개 → 구단 약 96개, 리그 약 48개
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 이미지 주소에 한글·공백이 섞여 있어 안전하게 인코딩한다.
const safeUrl = u => { try { return encodeURI(decodeURI(u)); } catch { return encodeURI(u); } };
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

async function page(category, n) {
  const r = await fetch(`${BASE}/news_list.do?category=${category}&page=${n}`, {headers: {'Accept-Language': 'ko-KR,ko;q=0.9', 'User-Agent': 'kleague-guide (GitHub Pages fan site)'}, signal: AbortSignal.timeout(15000)});
  if (!r.ok) throw Error(`${category} ${n}: HTTP ${r.status}`);
  const html = await r.text(), items = [];
  for (const m of html.matchAll(/<a href="\/news_view\.do\?seq=(\d+)[^"]*">([\s\S]*?)<\/a>/g)) {
    const body = m[2];
    const title = /<strong class="name">([\s\S]*?)<\/strong>/.exec(body)?.[1];
    if (!title) continue;
    const date = /<span>(\d{4}\.\d{2}\.\d{2})<\/span>/.exec(body)?.[1] ?? null;
    let thumb = /<img src="([^"]+)"/.exec(body)?.[1] ?? null;
    if (thumb && thumb.includes('no_thumbnail')) thumb = null;
    if (thumb && thumb.startsWith('/')) thumb = BASE + thumb;
    items.push({seq: Number(m[1]), category, title: decode(title), date: date && date.replaceAll('.', '-'), thumb: thumb && safeUrl(thumb), url: `${BASE}/news_view.do?seq=${m[1]}&category=${category}`});
  }
  return items;
}

const all = new Map();
for (const [category, n] of Object.entries(PAGES)) {
  for (let i = 1; i <= n; i++) {
    const items = await page(category, i);
    if (!items.length) break;
    for (const it of items) if (!all.has(it.seq)) all.set(it.seq, it);
    await sleep(400); // 공식 서버에 부담을 주지 않도록 천천히
  }
}
const items = [...all.values()].sort((a, b) => b.seq - a.seq);
if (items.length < 20) throw Error('기사가 너무 적습니다: ' + items.length);
writeFileSync(OUT, JSON.stringify({retrievedAt: new Date().toISOString(), source: BASE + '/news_list.do', items}) + '\n');
console.log(`뉴스 저장: ${items.length}개 → ${OUT}`);
