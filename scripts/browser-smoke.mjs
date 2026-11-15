import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const scope=()=>page.locator('main > div:not([hidden])');
try{
 await page.goto('http://127.0.0.1:4173');
 await scope().locator('.match-card').first().waitFor();
 await page.screenshot({path:'test-results/desktop-home.png',fullPage:true});
 await scope().locator('.match-card').first().click();await page.getByRole('heading',{name:'스코어 너머, 경기의 이야기'}).waitFor();
 await page.getByRole('navigation').getByRole('link',{name:'나의 팀 찾기'}).click();
 await page.getByRole('button',{name:'나와 맞는 팀 추천받기'}).click();await page.getByRole('alert').waitFor();
 await page.getByLabel('사는 지역').selectOption('any');await page.getByRole('button',{name:'골 넣는 즐거움'}).click();await page.getByRole('button',{name:'자주 이기는 팀'}).click();await page.getByRole('button',{name:'나와 맞는 팀 추천받기'}).click();await page.locator('.recommendation').first().waitFor();
 assert.equal(await page.locator('.recommendation').count(),3);assert.equal(await page.locator('.remaining-grid button').count(),9);
 await page.screenshot({path:'test-results/finder-results.png',fullPage:true});
 await page.getByRole('button',{name:'이 팀 더 알아보기'}).first().click();await scope().locator('.metric').first().waitFor();
 await page.getByRole('navigation').getByRole('link',{name:'나의 팀 찾기'}).click();assert.equal(await page.getByLabel('사는 지역').inputValue(),'any');
 await page.reload();await page.getByLabel('사는 지역').waitFor();assert.equal(await page.getByLabel('사는 지역').inputValue(),'');
 await page.getByRole('navigation').getByRole('link',{name:'빅매치',exact:true}).click();
 await scope().locator('.big-card').first().getByRole('button',{name:'홈 승',exact:true}).click();await scope().getByRole('switch').click();assert.equal(await scope().locator('.actual').count(),3);
 await scope().getByRole('switch').click();assert.equal(await scope().locator('.actual').count(),0);
 await scope().getByRole('switch').click();await scope().getByRole('button',{name:'32R',exact:true}).click();assert.equal(await scope().getByRole('switch').getAttribute('aria-checked'),'false');
 await page.setViewportSize({width:360,height:800});
 for(const name of ['경기','나의 팀 찾기','빅매치','팀','파이널 시뮬레이터','승강 센터']){
  await page.getByRole('navigation').getByRole('link',{name,exact:true}).click();await scope().getByRole('heading',{level:1}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'mobile overflow: '+name);
 }
 await page.getByRole('navigation').getByRole('link',{name:'경기',exact:true}).click();await page.screenshot({path:'test-results/mobile-home.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Browser smoke passed: all screens, finder, reveal, reload and 360px layout');
}finally{await browser.close();}
