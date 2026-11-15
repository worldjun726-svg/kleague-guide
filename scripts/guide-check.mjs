import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // External assets are not part of this navigation/layout check.
 await page.route('https://www.kleague.com/**',route=>route.abort());
 const current=()=>page.locator('main > div:not([hidden])');
 await page.goto('http://127.0.0.1:5173/#/finder');
 await page.getByLabel('사는 지역').waitFor();
 const nav=page.getByRole('navigation',{name:'주 메뉴'});
 assert.equal(await nav.getByRole('link').count(),6);
 assert.equal(await nav.getByRole('link',{name:'경기',exact:true}).isVisible(),true);
 await page.getByLabel('사는 지역').selectOption('capital');
 await page.getByRole('button',{name:/골이 많은 경기/}).click();
 await page.getByRole('button',{name:/언더독/}).click();
 await page.getByRole('button',{name:'나와 맞는 팀 추천받기'}).click();
 await page.locator('.recommendation').first().waitFor();
 assert.equal(await page.locator('.remaining-grid').isVisible(),false);
 await page.getByRole('button',{name:'이 팀의 경기 고르기'}).first().click();
 await page.waitForURL('**/#/big/seoule');
 await page.waitForFunction(()=>document.querySelector('[aria-label="빅매치 관심 팀"]').value==='seoule');
 assert.ok(await current().getByRole('status').isVisible());
 assert.equal(await current().locator('.big-card').count(),1);
 await current().getByRole('button',{name:'서울E 승강 조건'}).click();
 await page.waitForURL('**/#/center/seoule/30');
 await page.waitForFunction(()=>document.querySelector('[aria-label="승강 센터 팀"]').value==='seoule');
 assert.equal(await current().locator('.magic-card').count(),1);
 assert.equal(await page.getByLabel('승강 기준 라운드').inputValue(),'30');
 await current().getByRole('link',{name:/서울E의 경기 고르기/}).click();
 await page.waitForURL('**/#/big/seoule/31');
 await page.goto('http://127.0.0.1:5173/#/big/anyang/32');
 await page.waitForFunction(()=>document.querySelector('[aria-label="빅매치 라운드"]').value==='32');
 await current().locator('.big-card').first().waitFor();
 const index=await current().locator('.big-index').allTextContents();
 await current().getByRole('switch').click();
 assert.equal(await current().locator('.actual').count(),1);
 assert.deepEqual(await current().locator('.big-index').allTextContents(),index);
 await current().getByRole('button',{name:'안양 승강 조건'}).click();
 await page.waitForFunction(()=>document.querySelector('[aria-label="승강 기준 라운드"]').value==='31');
 assert.equal(await page.getByLabel('승강 센터 팀').inputValue(),'anyang');
 await page.goto('http://127.0.0.1:5173/#/team/seoule');
 await current().getByRole('heading',{level:1,name:'서울 이랜드'}).waitFor();
 assert.equal(await current().locator('.metric').count(),6);
 mkdirSync('test-results',{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  for(const route of ['finder','big/anyang/32','center/anyang/31']){
   await page.goto('http://127.0.0.1:5173/#/'+route);
   await current().locator('.guide-hero').waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width+' '+route);
   await page.screenshot({path:`test-results/guide-${route.split('/')[0]}-${width}.png`,fullPage:true});
  }
  await nav.getByRole('link',{name:'경기',exact:true}).click();
  await current().getByRole('heading',{name:'전체 경기 기록'}).waitFor();
  assert.equal(await page.locator('.records-menu').count(),0);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: 6 direct menus; progressive details; K2 recommendation → match → promotion; round handoff; K2 profile; reveal; desktop/mobile layouts; direct navigation.');
}finally{await browser.close();}
