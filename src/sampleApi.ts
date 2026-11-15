import {validateData} from './data.ts';
import type {Dataset} from './types';

// JSON-backed read-only data source. Replace this boundary when a real API is ready.
export const SAMPLE_DATA_URL='/data/sample-data.json';
export async function loadSampleDataset(signal?:AbortSignal):Promise<Dataset>{
 const response=await fetch(SAMPLE_DATA_URL,{signal});
 if(!response.ok)throw new Error('샘플 데이터를 불러오지 못했습니다. 다시 시도해 주세요.');
 const dataset=validateData(await response.json());
 if(dataset.meta.mode!=='demo')throw new Error('샘플 데이터의 모드가 올바르지 않습니다.');
 return dataset;
}
