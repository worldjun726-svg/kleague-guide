// Source: https://www.kleague.com/club/club.do?teamId=<code>
// Official site's current emblems; these URLs are not a frozen 2025 archive.
export const clubCodes: Record<string,string> = {
 jeonbuk:'K05',ulsan:'K01',seoul:'K09',pohang:'K03',gimcheon:'K35',
 daejeon:'K10',gwangju:'K22',gangwon:'K21',anyang:'K27',suwonfc:'K29',
 jeju:'K04',daegu:'K17',incheon:'K18',suwon:'K02',busan:'K06',
 seongnam:'K08',bucheon:'K26',jeonnam:'K07',seoule:'K31',asan:'K34',
 cheongju:'K37',cheonan:'K38',gimpo:'K36',ansan:'K32',gyeongnam:'K20',hwaseong:'K39',
 paju:'K40',gimhae:'K41',yongin:'K42',
};
export function teamLogo(id:string){
 const code=clubCodes[id];
 return code?`https://www.kleague.com/assets/images/emblem/emblem_${code}.png`:undefined;
}
