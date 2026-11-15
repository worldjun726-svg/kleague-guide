import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
const data=JSON.parse(readFileSync('public/data/current-season.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('https://www.kleague.com/**',r=>r.abort());
 await page.goto('http://127.0.0.1:5173/#/team/seoul');await page.getByRole('button',{name:'선수 기록',exact:true}).click();
 let checked=0;
 for(const team of data.teams){
  await page.getByRole('combobox',{name:'팀 선택',exact:true}).selectOption(team.id);
  await page.waitForFunction(id=>location.hash==='#/team/'+id,team.id);
  for(const [metric,label] of [['goals','득점'],['assists','도움'],['appearances','출전']]){
   await page.getByRole('button',{name:label+' TOP 5',exact:true}).click();
   const table=page.locator('.top-five-table');assert.equal(await table.locator('tbody tr').count(),5,team.id+' '+metric);
   assert.match(await table.locator('caption').innerText(),new RegExp(team.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
   const values=await table.locator('tbody tr td:last-child').allTextContents();
   const expected=[...data.teamLeaders.teams[team.id][metric]].sort((a,b)=>b.value-a.value).slice(0,5).map(p=>p.value);
   assert.deepEqual(values.map(v=>parseInt(v)),expected,team.id+' '+metric);
   assert.ok((await page.locator('.team-top-five .record-source').innerText()).includes('FootyStats'));checked++;
  }
 }
 assert.equal(checked,87);mkdirSync('test-results',{recursive:true});
 await page.getByRole('combobox',{name:'팀 선택',exact:true}).selectOption('seongnam');await page.getByRole('button',{name:'득점 TOP 5',exact:true}).click();await page.screenshot({path:'test-results/top-five-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 for(const id of ['seongnam','daegu','gimhae','seoul']){await page.getByRole('combobox',{name:'팀 선택',exact:true}).selectOption(id);await page.getByRole('button',{name:'득점 TOP 5',exact:true}).click();assert.equal(await page.locator('.top-five-table tbody tr').count(),5);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' overflow')}
 await page.screenshot({path:'test-results/top-five-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS: all 29 clubs × 3 categories = 87 TOP 5 tables; 5 real rows each, source, order, club switching, mobile and no JS errors.');
}finally{await browser.close()}
