import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/#/finder');
 const submit=page.getByRole('button',{name:'나와 맞는 팀 추천받기'});
 await submit.waitFor();assert.equal(await submit.isDisabled(),true);
 await page.getByLabel('사는 지역').selectOption({label:'수도권'});
 await page.getByRole('button',{name:/골이 많은 경기/}).click();
 await page.reload();await submit.waitFor();
 assert.equal(await page.getByLabel('사는 지역').inputValue(),'capital');assert.equal(await submit.isDisabled(),true);
 await page.getByRole('button',{name:/언더독/}).click();await submit.click();
 await page.locator('.recommendation').first().waitFor();
 assert.equal(await page.locator('.recommendation').count(),3);
 assert.equal(await page.locator('.remaining-grid button').count(),23);
 const results=await page.locator('.recommendation h3').allTextContents();
 await page.reload();await page.locator('.recommendation').first().waitFor();
 assert.deepEqual(await page.locator('.recommendation h3').allTextContents(),results);
 await page.getByRole('button',{name:/단단한 수비/}).click();assert.equal(await page.locator('.recommendation').count(),0);
 await page.getByRole('button',{name:'다시 시작'}).click();await page.reload();await submit.waitFor();assert.equal(await page.getByLabel('사는 지역').inputValue(),'');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);console.log('Finder browser checks passed. Demo top 3:',results.join(', '));
} finally {await browser.close();}
