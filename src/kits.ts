import {inkOn,mix} from './clubTheme';

// 2026 홈 유니폼 디자인 (선호 구단 배경용).
// K리그 공식 홈페이지 구단 페이지의 2026 선수 프로필 사진(필드 플레이어 여러 명)에서 읽은 무늬와 색이다.
// 색은 사진에서 읽은 근삿값이라 실제 유니폼과 조금 다를 수 있다.
// pattern: plain 단색 · stripes 굵은 세로 줄무늬 · pinstripe 가는 세로줄 · hoop 가로 띠 · center 가운데 세로 띠 · sash 사선 띠
export type KitPattern='plain'|'stripes'|'pinstripe'|'hoop'|'center'|'sash';
export interface Kit {pattern:KitPattern;base:string;second?:string;accent:string}
export const KITS:Record<string,Kit>={
 jeonbuk:{pattern:'plain',base:'#8fdc3c',accent:'#1f5a2e'},
 ulsan:{pattern:'plain',base:'#1d4fc4',accent:'#f6c400'},
 seoul:{pattern:'stripes',base:'#c8102e',second:'#1a1a1a',accent:'#c8a45a'},
 pohang:{pattern:'hoop',base:'#2a2e38',second:'#d9283a',accent:'#d9283a'},
 gimcheon:{pattern:'plain',base:'#e8472e',accent:'#1e3a6e'},
 daejeon:{pattern:'center',base:'#1f5a48',second:'#3fa79a',accent:'#c8283a'},
 gwangju:{pattern:'plain',base:'#f2a81d',accent:'#1e2a4a'},
 gangwon:{pattern:'plain',base:'#d9372a',accent:'#1a1a1a'},
 anyang:{pattern:'plain',base:'#5b3fc4',accent:'#c9a76a'},
 suwonfc:{pattern:'stripes',base:'#2340a8',second:'#d8343c',accent:'#ffffff'},
 jeju:{pattern:'plain',base:'#f39a1f',accent:'#1a1a1a'},
 daegu:{pattern:'plain',base:'#9cc6ea',accent:'#ffffff'},
 incheon:{pattern:'stripes',base:'#16181c',second:'#4fa8e0',accent:'#4fa8e0'},
 suwon:{pattern:'plain',base:'#1f4fc8',accent:'#ffffff'},
 busan:{pattern:'plain',base:'#c8282e',accent:'#1a1a1a'},
 seongnam:{pattern:'pinstripe',base:'#1d2026',second:'#ffffff',accent:'#ffffff'},
 bucheon:{pattern:'plain',base:'#d4202a',accent:'#1a1a1a'},
 jeonnam:{pattern:'plain',base:'#f4c82a',accent:'#1a1a1a'},
 seoule:{pattern:'plain',base:'#1f2b48',accent:'#ffffff'},
 asan:{pattern:'plain',base:'#1e2a5e',accent:'#f2c230'},
 cheongju:{pattern:'plain',base:'#1c2440',accent:'#d8343c'},
 cheonan:{pattern:'stripes',base:'#8ec5ea',second:'#1e2a44',accent:'#1e2a44'},
 gimpo:{pattern:'pinstripe',base:'#9fdc62',second:'#3d9a3a',accent:'#1f5a2e'},
 ansan:{pattern:'plain',base:'#1fa2c4',accent:'#1e2a5e'},
 gyeongnam:{pattern:'sash',base:'#d8282e',second:'#16181c',accent:'#c8a45a'},
 hwaseong:{pattern:'plain',base:'#f05a2c',accent:'#ffffff'},
 paju:{pattern:'pinstripe',base:'#2948d8',second:'#ffffff',accent:'#f29ac8'},
 gimhae:{pattern:'plain',base:'#b8262a',accent:'#1a1a1a'},
 yongin:{pattern:'center',base:'#9c2349',second:'#8fc3e8',accent:'#8fc3e8'},
};

// 유니폼 무늬를 배경 그림(CSS background)으로 만든다.
// 위쪽 빛 + 아래쪽 음영으로 입체감을 주고, 글자가 잘 보이도록 얇은 막(scrim)을 깐다.
export function kitBackground(k:Kit){
 const s=k.second??k.base;
 const layer:Record<KitPattern,string>={
  plain:`linear-gradient(${k.base},${k.base})`,
  stripes:`repeating-linear-gradient(90deg,${k.base} 0 88px,${s} 88px 176px)`,
  pinstripe:`repeating-linear-gradient(90deg,transparent 0 46px,${mix(s,k.base,0.45)} 46px 49px),linear-gradient(${k.base},${k.base})`,
  hoop:`linear-gradient(180deg,${k.base} 0 22%,${s} 22% 34%,${k.base} 34% 100%)`,
  // 가운데 띠는 글자 뒤를 지나가므로 바탕색 쪽으로 눌러 준다.
  center:(()=>{const c=mix(s,k.base,0.62),w=mix('#ffffff',k.base,0.62);return `linear-gradient(90deg,${k.base} 0 44%,${c} 44% 47%,${w} 47% 48%,${c} 48% 52%,${w} 52% 53%,${c} 53% 56%,${k.base} 56% 100%)`})(),
  sash:`linear-gradient(120deg,${k.base} 0 46%,${s} 46% 100%)`,
 };
 const tone=kitInk(k);
 const scrim=tone.dark?`rgba(0,0,0,${scrimAlpha(k)})`:`rgba(255,255,255,${k.pattern==='stripes'?0.4:0.12})`;
 return [
  `radial-gradient(1100px 700px at 50% -20%,rgba(255,255,255,${tone.dark?0.12:0.22}),transparent 65%)`,
  tone.dark?'linear-gradient(180deg,transparent 40%,rgba(0,0,0,.22) 100%)':'linear-gradient(180deg,transparent 40%,rgba(255,255,255,.18) 100%)',
  `linear-gradient(${scrim},${scrim})`,
  layer[k.pattern],
 ].join(',');
}
// 흰 글자일 때 깔 어두운 막의 진하기: 굵은 줄무늬는 밝은 쪽 색에서도 대비 4.5 이상이 되도록 올린다.
const lum=(h:string)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4).reduce((t,c,i)=>t+c*[0.2126,0.7152,0.0722][i],0);
function scrimAlpha(k:Kit){
 if(k.pattern!=='stripes')return 0.16;
 const lightest=[k.base,k.second!].sort((a,b)=>lum(b)-lum(a))[0];
 for(let a=0.42;a<0.8;a+=0.02){const top=mix(mix(lightest,'#000000',a),'#ffffff',0.12);if(1.05/(lum(top)+0.05)>=4.5)return +a.toFixed(2)}
 return 0.8;
}
// 배경 위 글자색
export function kitInk(k:Kit){
 // 굵은 줄무늬는 두 색이 번갈아 나오므로 흰 글자 + 어두운 막으로 고정한다.
 if(k.pattern==='stripes')return {ink:'#ffffff',dark:true,ratio:0};
 return inkOn(k.base);
}
