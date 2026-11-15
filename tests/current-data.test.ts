import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCurrent,orderRows} from '../src/currentData.ts';
import {recommendations} from '../src/data.ts';
const data=JSON.parse(readFileSync('public/data/current-season.json','utf8'));
test('current snapshot has 12+17 teams and 31+30 source player records',()=>{
 const d=validateCurrent(data);assert.equal(d.season,2026);
 for(const [l,n] of [[1,12],[2,17]]){assert.equal(d.teams.filter(t=>t.league===l).length,n);assert.equal(d.players.filter(p=>p.league===l).length,l===1?31:30)}
 assert.equal(d.teams.find(t=>t.id==='bucheon')?.league,1);assert.equal(d.teams.find(t=>t.id==='suwonfc')?.league,2);
});
test('all source table ranks agree with points/goals/goal difference within groups',()=>{for(const l of [1,2])assert.deepEqual(orderRows(data.standings.filter(r=>r.league===l)).map(r=>r.rank),Array.from({length:l===1?12:17},(_,i)=>i+1))});
test('tie rules prioritize goals before goal difference; final groups remain separate',()=>{
 const base=data.standings[0];const rows=[{...base,rank:3,group:'B',points:90},{...base,rank:1,group:'A',points:50,gf:40,gd:30},{...base,rank:2,group:'A',points:50,gf:41,gd:0}];assert.deepEqual(orderRows(rows).map(r=>r.rank),[2,1,3]);
});
test('bad totals, duplicates and unknown player clubs are rejected',()=>{
 for(const change of [d=>d.standings[0].points++,d=>d.players.push(d.players[0]),d=>d.players[0].teamId='unknown',d=>d.players[0].shots=-1]){const d=structuredClone(data);change(d);assert.throws(()=>validateCurrent(d))}
});
test('current recommendations use real aggregate stats and retain score order',()=>{
 const fixture=JSON.parse(readFileSync('public/data/sample-data.json','utf8'));const d={...fixture,teams:data.teams,matches:[],seasonStats:data.standings};const r=recommendations(d,{region:'capital',style:'open',character:'underdog'});
 assert.equal(r.length,29);assert.ok(r.every((v,i)=>!i||r[i-1].score>=v.score));const s=r.find(v=>v.team.id==='seoul');assert.equal(s?.values[3],94/35);assert.equal(s?.values[4],20/35*100);
});
