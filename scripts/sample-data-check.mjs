import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 await page.route('https://www.kleague.com/**',r=>r.abort());
 await page.route('**/data/sample-data.json',r=>r.fulfill({status:500,body:'error'}));
 await page.goto('http://127.0.0.1:5173');
 await page.getByRole('alert').waitFor();
 assert.match(await page.getByRole('alert').innerText(),/샘플 데이터/);
 await page.unroute('**/data/sample-data.json');
 await page.getByRole('button',{name:'다시 불러오기'}).click();
 await page.locator('.landing-cta').waitFor();
 await page.locator('.landing-cta').click();
 await page.getByLabel('사는 지역').waitFor();
 assert.match(await page.locator('.demo-banner').innerText(),/SAMPLE EDITION/);
 const data=JSON.parse(readFileSync('public/data/sample-data.json','utf8'));
 data.teams.find(t=>t.id==='seoule').name='JSON 연결 확인 팀';
 await page.route('**/data/sample-data.json',r=>r.fulfill({json:data}));
 await page.goto('http://127.0.0.1:5173/#/team/seoule');await page.reload();
 await page.getByRole('heading',{level:1,name:'JSON 연결 확인 팀'}).waitFor();
 console.log('PASS: JSON request error/retry, sample label, team data loaded from JSON.');
}finally{await browser.close();}
