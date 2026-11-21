// K리그 공식 홈페이지 영상(하이라이트) 목록을 구단별로 받아 public/data/highlights.json 으로 저장한다.
// 화면(홈 MY CLUB)에서는 MY 팀 하이라이트 썸네일을 보여 주고, 누르면 유튜브 영상으로 이동한다.
// 실패하면 기존 파일을 그대로 두고 종료 코드 1로 끝난다(배포 작업은 continue-on-error 로 계속된다).
import {readFileSync, writeFileSync} from 'node:fs';

const BASE = 'https://www.kleague.com';
const OUT = 'public/data/highlights.json';
const PER_CLUB = 4;
const clubs = Object.fromEntries([...readFileSync('src/logos.ts', 'utf8').matchAll(/(\w+):'(K\d+)'/g)].map(m => [m[1], m[2]]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

async function list(code) {
  const r = await fetch(`${BASE}/video_list.do?category=highlight&club=${code}&page=1`, {headers: {'Accept-Language': 'ko-KR,ko;q=0.9', 'User-Agent': 'kleague-guide (GitHub Pages fan site)'}, signal: AbortSignal.timeout(20000)});
  if (!r.ok) throw Error(`${code}: HTTP ${r.status}`);
  const html = await r.text(), items = [];
  for (const m of html.matchAll(/<a href="\/video_view\.do\?seq=(\d+)[^"]*">([\s\S]*?)<\/a>/g)) {
    const body = m[2], title = /<strong class="name">([\s\S]*?)<\/strong>/.exec(body)?.[1];
    if (!title) continue;
    const thumb = /<img src="([^"]+)"/.exec(body)?.[1] ?? null;
    const yt = thumb && /i\.ytimg\.com\/vi\/([\w-]{6,})\//.exec(thumb)?.[1];
    const date = /<span>(\d{4}\.\d{2}\.\d{2})<\/span>/.exec(body)?.[1] ?? null;
    items.push({seq: Number(m[1]), title: clean(title), date: date && date.replaceAll('.', '-'), thumb: yt ? `https://i.ytimg.com/vi/${yt}/mqdefault.jpg` : thumb,
      url: yt ? `https://www.youtube.com/watch?v=${yt}` : `${BASE}/video_view.do?seq=${m[1]}&category=highlight`});
    if (items.length >= PER_CLUB) break;
  }
  return items;
}

const teams = {};
for (const [team, code] of Object.entries(clubs)) {
  teams[team] = await list(code);
  await sleep(350); // 공식 서버에 부담을 주지 않도록 천천히
}
const total = Object.values(teams).reduce((s, l) => s + l.length, 0);
if (total < 20) throw Error('하이라이트가 너무 적습니다: ' + total);
writeFileSync(OUT, JSON.stringify({retrievedAt: new Date().toISOString(), source: BASE + '/video_list.do?category=highlight', teams}) + '\n');
console.log(`하이라이트 저장: ${Object.keys(teams).length}개 구단 · ${total}개 → ${OUT}`);
