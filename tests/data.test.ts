import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareRows,standings,percentile,recommendations,sortedBigMatches,validateData,certifiedStatus} from '../src/data.ts';
import type {Dataset} from '../src/types.ts';
const data=validateData(JSON.parse(readFileSync(new URL('../public/data/sample-data.json',import.meta.url),'utf8')));
test('synthetic label and complete league counts',()=>{
 assert.equal(data.meta.mode,'demo');assert.equal(data.matches.filter(m=>m.league===1).length,228);assert.equal(data.matches.filter(m=>m.league===2).length,273);
 for(const l of [1,2] as const){const rows=standings(data,l,99);assert.equal(rows.length,l===1?12:14);assert.ok(rows.every(r=>r.played===(l===1?38:39)));assert.equal(rows.reduce((s,r)=>s+r.gf,0),rows.reduce((s,r)=>s+r.ga,0))}
});
test('ranking prioritizes points then goals scored then goal difference',()=>{
 const a={points:30,gf:40,gd:0},b={points:30,gf:35,gd:20};assert.ok(compareRows(a,b)<0);
 assert.ok(compareRows({points:31,gf:1,gd:-20},a)<0);
 assert.ok(compareRows({points:30,gf:40,gd:1},a)<0);
});
test('future scores cannot change past standings',()=>{
 const modified=structuredClone(data);modified.matches.filter(m=>m.round>30).forEach(m=>m.score=[99,0]);
 assert.deepEqual(standings(modified,1,30),standings(data,1,30));
});
test('split A/B membership is preserved after round 33',()=>{
 const a=standings(data,1,33).slice(0,6).map(r=>r.team.id).sort();
 for(let rd=34;rd<=38;rd++)assert.deepEqual(standings(data,1,rd).slice(0,6).map(r=>r.team.id).sort(),a);
});
test('percentile gives ties identical credit and handles identical records',()=>{
 assert.equal(percentile([1,2,3],1),0);assert.equal(percentile([1,2,3],3),100);assert.equal(percentile([2,2,2],2),50);
 assert.equal(percentile([1,2,2,3],2),50);assert.equal(percentile([1,2,3],1,true),100);
});
test('regional recommendation uses 40/30/30 with all league teams',()=>{
 const rec=recommendations(data,{region:'서울',style:'attack',character:'strong'});
 assert.equal(rec.length,26);assert.equal(new Set(rec.map(r=>r.team.id)).size,26);
 for(const r of rec){assert.equal(r.region,r.team.region==='서울'?40:0);assert.ok(r.style<=30&&r.character<=30);assert.ok(Math.abs(r.score-r.region-r.style-r.character)<.0001)}
 assert.ok(rec.every((r,i)=>!i||rec[i-1].score>=r.score));
});
test('region indifferent uses 50/50 and no regional points',()=>{
 for(const r of recommendations(data,{region:'any',style:'defense',character:'underdog'})){assert.equal(r.region,0);assert.ok(r.style<=50&&r.character<=50);assert.ok(r.score>=0&&r.score<=100)}
});
test('recommendation ties sort by Korean team name',()=>{
 const empty={...data,matches:[]};const rec=recommendations(empty,{region:'any',style:'attack',character:'strong'});
 assert.deepEqual(rec.map(r=>r.team.name),rec.map(r=>r.team.name).sort((a,b)=>a.localeCompare(b,'ko')));
});
test('big matches sorted using full precision index',()=>{
 for(const rd of [31,32,33,36,37]){const ms=sortedBigMatches(data,rd);assert.equal(ms.length,6);assert.ok(ms.every((m,i)=>!i||data.forecasts[rd].games[ms[i-1].id].index>=data.forecasts[rd].games[m.id].index))}
});
test('late-round forecasts cannot change Final A membership',()=>{
 for(const rd of [36,37]){const f=data.forecasts[rd];for(const g of Object.values(f.games))for(const o of g.outcomes)for(const [id,p] of Object.entries(o))assert.equal(p.finalA,f.baseline[id].finalA)}
});
test('all forecast values are bounded, scenario choices total 3',()=>{
 for(const f of Object.values(data.forecasts)){for(const g of Object.values(f.games)){assert.equal(g.outcomes.length,3);assert.ok(g.index>=0&&g.index<=100)}}
});
test('validator rejects duplicates, impossible scores and invalid probabilities',()=>{
 const dup=structuredClone(data);dup.matches.push(dup.matches[0]);assert.throws(()=>validateData(dup));
 const score=structuredClone(data);score.matches[0].score=[-1,2];assert.throws(()=>validateData(score));
 const prob=structuredClone(data);prob.matches[0].probabilities=[80,80,0];assert.throws(()=>validateData(prob));
 assert.throws(()=>validateData({}));
});
test('absent probability is not zero',()=>{
 const d=structuredClone(data);d.matches[0].probabilities=null;assert.equal(validateData(d).matches[0].probabilities,null);
});
test('100% simulation estimate does not create a magic-number guarantee',()=>{
 const d=structuredClone(data);for(const f of Object.values(d.forecasts))for(const p of Object.values(f.baseline))p.danger=0;
 assert.deepEqual(certifiedStatus(d,1,10,d.teams[0].id,9),certifiedStatus(data,1,10,data.teams[0].id,9));
});
test('finished season and final-A membership give explicit certified states',()=>{
 const winner=standings(data,2,39)[0];assert.equal(certifiedStatus(data,2,39,winner.team.id,1).number,0);
 const a=standings(data,1,33)[0];assert.equal(certifiedStatus(data,1,33,a.team.id,9).label,'확정');
});
test('early season form never invents five matches',()=>{
 assert.ok(standings(data,1,1).every(r=>r.form.length===1));
});

test('capital region includes Seoul Gyeonggi Incheon and incomplete answers yield no results',()=>{
 const rec=recommendations(data,{region:'capital',style:'open',character:'underdog'});
 for(const r of rec) assert.equal(r.region,['서울','경기','인천'].includes(r.team.region)?40:0);
 assert.equal(recommendations(data,{region:'capital',style:'',character:'underdog'}).length,0);
 assert.equal(new Set(rec.map(r=>r.team.league)).size,2);
});
