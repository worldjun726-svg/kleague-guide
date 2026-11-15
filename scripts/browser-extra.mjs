import {chromium} from 'playwright';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage();const scope=()=>p.locator('main > div:not([hidden])');const url='http://127.0.0.1:4173';
try{
 await p.route('**/data/sample-data.json',r=>r.fulfill({status:500,body:'error'}));await p.goto(url+'/#/matches');await p.getByRole('alert').waitFor();
 await p.unroute('**/data/sample-data.json');await p.getByRole('button',{name:'다시 불러오기'}).click();await scope().locator('.match-card').first().waitFor();
 await scope().getByRole('button',{name:'K리그 2',exact:true}).click();assert.equal(await scope().locator('.match-card').count(),7);await scope().locator('.match-card').first().click();await p.getByRole('heading',{name:'스코어 너머, 경기의 이야기'}).waitFor();assert.equal(await p.locator('.detail-team button:disabled').count(),2);
 await p.goto(url+'/#/final');await scope().getByRole('button',{name:'홈 승',exact:true}).click();assert.match(await scope().locator('.notice').innerText(),/가정 중/);await scope().getByRole('button',{name:'초기화',exact:true}).click();assert.match(await scope().locator('.notice').innerText(),/기본 전망/);
 await p.goto(url+'/#/center');await scope().getByRole('switch').click();await scope().locator('.actual').waitFor();await scope().getByLabel('승강 기준 라운드').selectOption('38');assert.equal(await scope().getByRole('switch').getAttribute('aria-checked'),'false');assert.match(await scope().innerText(),/정규시즌이 종료/);
 const d=JSON.parse(readFileSync('public/data/sample-data.json','utf8'));d.matches.forEach(m=>m.probabilities=null);d.relegation={'1-30':{jeonbuk:{goals:{'11':{label:'자력 가능',number:12,reason:'브라우저 테스트용 조건'}},nextRound:[{conditions:['테스트 조건: 관련 경기 무승부']},{conditions:[]},{conditions:[]}],actual:'테스트용 실제 결과'}}};
 await p.route('**/data/sample-data.json',r=>r.fulfill({json:d}));await p.goto(url+'/#/center');await p.reload();await scope().getByRole('heading',{level:1}).waitFor();assert.match(await scope().innerText(),/자력 가능/);assert.match(await scope().innerText(),/테스트 조건: 관련 경기 무승부/);
 await p.goto(url+'/#/matches');await scope().locator('.match-card').first().waitFor();assert.match(await scope().locator('.match-card').first().innerText(),/확률 자료 없음/);
 await p.goto(url+'/#/match/missing');await p.getByText('경기를 찾을 수 없습니다.',{exact:false}).waitFor();await p.goto(url+'/#/unknown');await p.getByRole('button',{name:'경기 홈으로 돌아가기'}).waitFor();
 console.log('Extra browser checks passed: retry, K2, reset, season end, precomputed conditions, missing probability and routes');
}finally{await b.close();}
