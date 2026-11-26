// K LEAGUE GUIDE 로고(src/BrandMark.tsx 와 같은 매치데이 티켓)로 파비콘·앱 아이콘 PNG 를 만든다.
// 실행: node scripts/make-brand-icons.mjs  → public/media/brand/ 의 favicon-64.png, app-icon-192.png, app-icon-512.png
// 글꼴(Barlow Condensed)은 Google Fonts 에서 불러오므로 인터넷 연결이 필요하다. 브라우저는 설치된 Chrome 을 쓴다.
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'media', 'brand');
const F = "font-family=\"'Barlow Condensed',sans-serif\"";
const INK = '#1b1d21', Y = '#ffd21f';

// 앱 아이콘용: 세로로 조금 키운 티켓(GUIDE 를 크게), 살짝 기울임
const app = `<svg viewBox="0 0 300 220" xmlns="http://www.w3.org/2000/svg">
 <defs><mask id="m"><rect width="300" height="220" fill="#fff"/><circle cx="222" cy="10" r="16" fill="#000"/><circle cx="222" cy="210" r="16" fill="#000"/><circle cx="10" cy="110" r="15" fill="#000"/><circle cx="290" cy="110" r="15" fill="#000"/></mask></defs>
 <rect x="10" y="10" width="280" height="200" rx="16" fill="${Y}" mask="url(#m)"/>
 <path d="M222 38 V182" stroke="${INK}" stroke-width="4" stroke-dasharray="8 8"/>
 <text x="36" y="66" ${F} font-weight="800" font-size="24" letter-spacing="4" fill="${INK}">K LEAGUE</text>
 <text x="30" y="148" ${F} font-weight="900" font-style="italic" font-size="80" fill="${INK}">GUIDE</text>
 <text x="34" y="184" ${F} font-weight="700" font-size="15" letter-spacing="3" fill="${INK}" opacity=".7">ADMIT ONE FAN</text>
 <text transform="translate(248 110) rotate(-90)" text-anchor="middle" ${F} font-weight="800" font-size="18" letter-spacing="3" fill="${INK}">MATCH DAY</text>
 <text transform="translate(272 110) rotate(-90)" text-anchor="middle" ${F} font-weight="700" font-size="14" letter-spacing="2" fill="${INK}" opacity=".7">No. 2026</text></svg>`;
// 파비콘용: 티켓 + KG (src/BrandMark.tsx 의 compact 와 같은 모양)
const compact = `<svg viewBox="0 0 128 96" xmlns="http://www.w3.org/2000/svg">
 <defs><mask id="m"><rect width="128" height="96" fill="#fff"/><circle cx="2" cy="48" r="11" fill="#000"/><circle cx="126" cy="48" r="11" fill="#000"/><circle cx="96" cy="4" r="7" fill="#000"/><circle cx="96" cy="92" r="7" fill="#000"/></mask></defs>
 <rect x="2" y="4" width="124" height="88" rx="11" fill="${Y}" mask="url(#m)"/>
 <path d="M96 18 V78" stroke="${INK}" stroke-width="4" stroke-dasharray="6 6" stroke-linecap="round"/>
 <text x="50" y="69" text-anchor="middle" ${F} font-weight="900" font-style="italic" font-size="56" fill="${INK}">KG</text></svg>`;

const page = (svg, size, bg, w, rot) => `<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;1,900&display=block">
<style>html,body{margin:0;background:${bg}}div{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center}svg{width:${w}px;height:auto;transform:rotate(${rot}deg)}</style>
</head><body><div>${svg}</div></body></html>`;

const jobs = [
  {file: 'app-icon-512.png', size: 512, svg: app, bg: INK, w: 440, rot: -8},
  {file: 'app-icon-192.png', size: 192, svg: app, bg: INK, w: 166, rot: -8},
  {file: 'favicon-64.png', size: 64, svg: compact, bg: 'transparent', w: 64, rot: 0},
];

const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  for (const j of jobs) {
    const p = await browser.newPage({viewport: {width: j.size, height: j.size}});
    await p.setContent(page(j.svg, j.size, j.bg, j.w, j.rot), {waitUntil: 'networkidle'});
    await p.evaluate(() => document.fonts.ready);
    const ok = await p.evaluate(() => document.fonts.check("900 italic 20px 'Barlow Condensed'"));
    if (!ok) throw new Error('Barlow Condensed 글꼴을 불러오지 못했습니다(인터넷 연결 확인).');
    await p.locator('div').screenshot({path: path.join(OUT, j.file), omitBackground: j.bg === 'transparent'});
    await p.close();
    console.log('만듦:', j.file);
  }
} finally { await browser.close(); }
