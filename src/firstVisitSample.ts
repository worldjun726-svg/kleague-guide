import type {Team} from './types';

// 첫 직관 꿀팁 게시판의 샘플 데이터.
// 화면이 어떻게 보일지 확인하는 용도라, 특정 구장의 역·출구·좌석 이름처럼 사실처럼 보이는 정보는 넣지 않았다.
// 실제 팬 글이 쌓이면 이 파일은 지우거나 비워도 된다.
export const TIP_TOPICS={traffic:'교통',seat:'좌석',food:'먹거리',cheer:'응원',etc:'기타',question:'질문'} as const;
export type TipTopic=keyof typeof TIP_TOPICS;
export interface SampleTip {id:string;topic:TipTopic;body:string;nickname:string;likes:number}

const TEMPLATES:{topic:TipTopic;body:(t:Team)=>string;nick:(t:Team)=>string;likes:number}[]=[
 {topic:'traffic',body:t=>`경기 끝나고 대중교통이 한꺼번에 몰려요. 급하지 않으면 10~15분 정도 자리에서 여운을 즐기다 나가면 훨씬 편해요. (${t.short} 홈경기 기준 예시)`,nick:t=>`${t.short} 3년차`,likes:24},
 {topic:'seat',body:t=>`처음이면 응원석 바로 옆 구역을 추천해요. 서서 노래하는 부담은 없는데 ${t.short} 응원 소리는 제대로 들려요.`,nick:t=>`${t.region} 직관러`,likes:31},
 {topic:'food',body:()=>'경기장 매점은 하프타임에 줄이 길어요. 킥오프 전에 미리 사 두는 걸 추천합니다.',nick:()=>'하프타임 전문가',likes:17},
 {topic:'cheer',body:t=>`응원가 몰라도 괜찮아요. 골 들어가면 옆 사람이랑 하이파이브만 해도 ${t.short} 팬 다 된 거예요.`,nick:t=>`${t.short} 서포터`,likes:42},
 {topic:'question',body:t=>`다음 주에 처음 가 보려고 하는데 ${t.short} 유니폼 없이 가도 어색하지 않을까요?`,nick:()=>'K리그 입문 1일차',likes:5},
 {topic:'etc',body:()=>'↳ 전혀요! 팀 색 옷 하나면 충분하고, 경기장에서 머플러 하나 사면 바로 분위기 납니다.',nick:t=>`${t.short} 5년차`,likes:12},
];

export const sampleTips=(team:Team):SampleTip[]=>TEMPLATES.map((x,i)=>({id:team.id+'-'+i,topic:x.topic,body:x.body(team),nickname:'예시 · '+x.nick(team),likes:x.likes}));
