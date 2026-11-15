import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSampleDataset,SAMPLE_DATA_URL} from '../src/sampleApi.ts';
const fixture=JSON.parse(readFileSync(new URL('../public/data/sample-data.json',import.meta.url),'utf8'));

test('sample loader reads the local JSON contract and forwards cancellation',async(t)=>{
 const controller=new AbortController();
 t.mock.method(globalThis,'fetch',async(url:unknown,options:RequestInit)=>{
  assert.equal(url,SAMPLE_DATA_URL);assert.equal(options.signal,controller.signal);
  return Response.json(fixture);
 });
 const data=await loadSampleDataset(controller.signal);
 assert.equal(data.meta.mode,'demo');assert.equal(data.teams.length,26);assert.equal(data.matches.length,501);
});
test('HTTP failure remains an error rather than empty results',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('failure',{status:500}));
 await assert.rejects(loadSampleDataset(),/샘플 데이터/);
});
test('malformed data and a non-sample mode are rejected',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({teams:[]}));
 await assert.rejects(loadSampleDataset());
 t.mock.restoreAll();
 t.mock.method(globalThis,'fetch',async()=>Response.json({...fixture,meta:{...fixture.meta,mode:'verified'}}));
 await assert.rejects(loadSampleDataset(),/모드/);
});
test('aborting a data request preserves AbortError',async(t)=>{
 const controller=new AbortController();controller.abort();
 t.mock.method(globalThis,'fetch',async(_url:unknown,options:RequestInit)=>{options.signal?.throwIfAborted();return Response.json(fixture)});
 await assert.rejects(loadSampleDataset(controller.signal),{name:'AbortError'});
});
