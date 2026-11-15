import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://www.kleague.com/**',r=>r.abort());
 await page.goto('http://127.0.0.1:5173/#/matches');await page.getByRole('heading',{name:'이번 시즌, 숫자로 읽다.'}).waitFor();
 assert.equal(await page.locator('.record-table tbody tr').count(),12);assert.match(await page.locator('.record-table tbody tr').first().innerText(),/FC 서울|FC서울/);
 await page.getByRole('button',{name:'K리그 2',exact:true}).click();assert.equal(await page.locator('.record-table tbody tr').count(),17);
 const text=await page.locator('.record-table tbody').innerText();assert.ok(text.indexOf('천안')<text.indexOf('용인'));assert.ok(text.indexOf('부산')<text.indexOf('화성'));
 mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/current-standings.png',fullPage:true});
 await page.getByRole('textbox',{name:'순위표 팀 검색'}).fill('없는팀');assert.match(await page.locator('main').innerText(),/검색한 팀이 없습니다/);
 await page.goto('http://127.0.0.1:5173/#/team/seoul');await page.getByRole('button',{name:'팀 기록',exact:true}).waitFor();assert.equal(await page.locator('.record-metrics article').count(),4);
 await page.getByRole('button',{name:'선수 기록',exact:true}).click();assert.equal(await page.locator('.top-five-table tbody tr').count(),5);
 await page.goto('http://127.0.0.1:5173/#/players');await page.getByRole('textbox',{name:'선수 검색'}).waitFor();assert.equal(await page.locator('.record-table tbody tr').count(),31);
 await page.getByRole('combobox',{name:'선수 기록 정렬'}).selectOption('assists');assert.match(await page.locator('.record-table tbody tr').first().innerText(),/이동경/);
 await page.getByRole('textbox',{name:'선수 검색'}).fill('이동경');assert.equal(await page.locator('.record-table tbody tr').count(),1);await page.getByRole('link',{name:'이동경',exact:true}).click();await page.getByRole('heading',{name:'이동경',exact:true,level:1}).waitFor();assert.equal(await page.locator('.record-metrics article').count(),13);await page.reload();await page.getByRole('heading',{name:'이동경',exact:true,level:1}).waitFor();
 await page.screenshot({path:'test-results/current-player.png',fullPage:true});
 await page.goto('http://127.0.0.1:5173/#/finder');await page.locator('#region').selectOption('capital');await page.getByRole('button',{name:/골이 많은 경기/}).click();await page.getByRole('button',{name:/언더독/}).click();await page.getByRole('button',{name:/나와 맞는 팀 추천받기/}).click();assert.equal(await page.locator('.recommendation').count(),3);assert.match(await page.locator('.recommendation').first().innerText(),/경기당 양 팀 합계/);await page.reload();await page.locator('.recommendation').first().waitFor();assert.equal(await page.locator('#region').inputValue(),'capital');
 await page.goto('http://127.0.0.1:5173/#/center');await page.getByRole('button',{name:'2025 예시 기능 체험하기'}).click();await page.locator('.cover-3').waitFor();assert.match(await page.locator('.demo-banner').innerText(),/2025/);await page.reload();await page.getByRole('button',{name:'2025 예시 기능 체험하기'}).waitFor();assert.equal(await page.locator('.cover-3').count(),0);
 await page.setViewportSize({width:390,height:844});for(const path of ['matches','players','team/seoul','player/2026-1-4']){await page.goto('http://127.0.0.1:5173/#/'+path);await page.locator('main h1').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path+' mobile overflow');await page.screenshot({path:'test-results/current-'+path.replaceAll('/','-')+'-mobile.png',fullPage:true})}
 await page.goto('http://127.0.0.1:5173/');await page.locator('#landing-title').waitFor();assert.equal(await page.locator('.landing-club-list a').count(),29);assert.ok(await page.locator('.landing-video').getAttribute('src'));
 let fail=true;await page.route('**/data/current-season.json',r=>fail?r.fulfill({status:500,body:'error'}):r.continue());await page.reload();await page.getByRole('alert').waitFor();fail=false;await page.getByRole('button',{name:'다시 불러오기'}).click();await page.locator('#landing-title').waitFor();assert.deepEqual(errors,[]);
 console.log('PASS: 29 team standings, tie order, team/player filters, 13 player stats, current finder, persistence, sample isolation, mobile layout, landing video, retry.');
}finally{await browser.close()}


