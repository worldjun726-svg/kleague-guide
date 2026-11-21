import {useEffect,useState} from 'react';
import type {Team} from './types';
import {withBase} from './base';

// K리그 공식 홈페이지 구단·리그 소식 (scripts/fetch-news.mjs 가 매일 받아 public/data/news.json 에 저장).
export interface NewsItem {seq:number;category:'club'|'league';title:string;date:string|null;thumb:string|null;url:string}
export interface NewsData {retrievedAt:string;source:string;items:NewsItem[]}

let cache:Promise<NewsData>|null=null;
export function useNews(){
 const [data,setData]=useState<NewsData|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let alive=true;cache??=fetch(withBase('/data/news.json')).then(r=>{if(!r.ok)throw Error();return r.json()}).catch(e=>{cache=null;throw e});cache.then(d=>alive&&setData(d)).catch(()=>alive&&setError(true));return()=>{alive=false}},[]);
 return {data,error};
}

// 기사 제목에 구단 이름이 들어 있는지로 고른다. 예: "[인천] …", "[보도자료]_인천유나이티드, …"
const ALIASES:Record<string,string[]>={
 seoul:['FC서울'],seoule:['서울이랜드','[서울E]'],suwon:['수원삼성','[수원]'],suwonfc:['수원FC'],daejeon:['대전하나시티즌','대전하나'],
 gimcheon:['김천상무'],jeju:['제주SK','제주유나이티드'],ulsan:['울산HD'],jeonbuk:['전북현대'],pohang:['포항스틸러스'],incheon:['인천유나이티드'],
 gangwon:['강원FC'],gwangju:['광주FC'],anyang:['FC안양'],bucheon:['부천FC'],daegu:['대구FC'],busan:['부산아이파크'],jeonnam:['전남드래곤즈'],
 gyeongnam:['경남FC'],seongnam:['성남FC'],asan:['충남아산'],cheongju:['충북청주'],cheonan:['천안시티'],gimpo:['김포FC'],ansan:['안산그리너스'],
 hwaseong:['화성FC'],paju:['파주프런티어','파주프론티어'],gimhae:['김해FC'],yongin:['용인FC'],
};
const squash=(s:string)=>s.replace(/\s+/g,'');
export function newsFor(team:Team,items:NewsItem[],limit=6){
 const keys=[`[${team.short}]`,squash(team.name),...(ALIASES[team.id]??[])].map(squash);
 return items.filter(it=>{const t=squash(it.title);return keys.some(k=>t.includes(k))}).slice(0,limit);
}
