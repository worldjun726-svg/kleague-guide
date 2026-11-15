import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
mkdirSync('test-results',{recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 // Exercise the existing text fallback when external club logos are unavailable.
 await page.route('https://www.kleague.com/**',route=>route.abort());
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await page.locator('#landing-title').waitFor();
 assert.match(await page.locator('#landing-title').innerText(),/새로운 시선/);
 await page.waitForFunction(()=>document.querySelector('.landing-video')?.readyState>=2);
 await page.getByRole('button',{name:'배경 영상 일시정지',exact:true}).click();
 assert.equal(await page.locator('.landing-video').evaluate(v=>v.paused),true);
 await page.locator('.landing-video').evaluate(v=>{v.currentTime=1});
 await page.waitForFunction(()=>!document.querySelector('.landing-video').seeking);
 for(const width of [1440,1024,768,390,360]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'landing overflow '+width);
  if([1440,390].includes(width))await page.screenshot({path:`test-results/editorial-${width}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'가이드 살펴보기'}).click();
 assert.equal(await page.locator('.landing-intro').evaluate(e=>document.activeElement===e),true);
 await page.locator('.landing-cta').click();
 await page.getByLabel('사는 지역').waitFor();
 await page.getByLabel('사는 지역').selectOption('any');
 await page.getByRole('button',{name:'골 넣는 즐거움'}).click();
 await page.getByRole('button',{name:'자주 이기는 팀'}).click();
 await page.getByRole('button',{name:'나와 맞는 팀 추천받기'}).click();
 await page.locator('.recommendation').first().waitFor();
 assert.equal(await page.locator('.recommendation').count(),3);
 for(const width of [1440,360]){
  await page.setViewportSize({width,height:900});
  for(const route of ['matches','team','players','finder','big','final','center']){
   await page.goto('http://127.0.0.1:4173/#/'+route,{waitUntil:'domcontentloaded'});
   await page.locator(`main[data-core="${route}"]`).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} overflow ${width}`);
   if(width===1440&&['matches','finder'].includes(route))await page.screenshot({path:`test-results/editorial-${route}.png`,fullPage:true});
  }
 }
 await page.locator('.brand').click();
 await page.locator('.landing-secondary').click();
 await page.waitForURL('**/#/matches');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await page.locator('.landing-video').waitFor({state:'attached'});
 assert.ok(await page.locator('.landing-video').evaluate(v=>v.paused&&!v.autoplay));
 await page.getByRole('button',{name:'배경 영상 재생',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('.landing-video').paused);
 await page.locator('.landing-club-list a').first().click();
 await page.locator('main[data-core="team"]').waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: five responsive sizes, seven routes at desktop/mobile, finder recommendations, CTA and club navigation, video controls, reduced motion, no browser errors.');
} finally { await browser.close(); }
