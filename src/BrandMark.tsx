// K LEAGUE GUIDE 로고: 매치데이 티켓 — "경기장에 가 보자"(직관으로 팬을 늘리는 사이트 목적).
// full    : K LEAGUE · GUIDE · 절취선 · MATCH DAY / No. 2026 — 앱 아이콘·큰 화면용
// compact : 티켓 + KG — 헤더·파비콘처럼 작은 크기용
// 글자는 사이트가 불러오는 Barlow Condensed 를 쓴다(index.html). 아이콘 PNG 는 scripts/make-brand-icons.mjs 로 만든다.
import {useId} from 'react';

const FONT = "'Barlow Condensed','Arial Narrow',sans-serif";
const INK = '#1b1d21', YELLOW = '#ffd21f';

export default function BrandMark({variant = 'compact', className, title}: {variant?: 'full' | 'compact'; className?: string; title?: string}) {
  const id = useId().replace(/:/g, '');
  const a11y = title ? {role: 'img', 'aria-label': title} : {'aria-hidden': true as const};
  if (variant === 'compact') return <svg className={className} viewBox="0 0 128 96" {...a11y}>
    <defs><mask id={'tk' + id}><rect width="128" height="96" fill="#fff"/><circle cx="2" cy="48" r="11" fill="#000"/><circle cx="126" cy="48" r="11" fill="#000"/><circle cx="96" cy="4" r="7" fill="#000"/><circle cx="96" cy="92" r="7" fill="#000"/></mask></defs>
    <rect x="2" y="4" width="124" height="88" rx="11" fill={YELLOW} mask={`url(#tk${id})`}/>
    <path d="M96 18 V78" stroke={INK} strokeWidth="4" strokeDasharray="6 6" strokeLinecap="round"/>
    <text x="50" y="69" textAnchor="middle" fontFamily={FONT} fontWeight="900" fontStyle="italic" fontSize="56" fill={INK}>KG</text>
  </svg>;
  return <svg className={className} viewBox="0 0 380 140" {...a11y}>
    <defs><mask id={'tk' + id}><rect width="380" height="140" fill="#fff"/><circle cx="276" cy="10" r="14" fill="#000"/><circle cx="276" cy="130" r="14" fill="#000"/><circle cx="10" cy="70" r="12" fill="#000"/><circle cx="370" cy="70" r="12" fill="#000"/></mask></defs>
    <rect x="10" y="10" width="360" height="120" rx="10" fill={YELLOW} mask={`url(#tk${id})`}/>
    <path d="M276 30 V110" stroke={INK} strokeWidth="3" strokeDasharray="6 6"/>
    <text x="40" y="52" fontFamily={FONT} fontWeight="800" fontSize="20" letterSpacing="4" fill={INK}>K LEAGUE</text>
    <text x="38" y="106" fontFamily={FONT} fontWeight="900" fontStyle="italic" fontSize="62" fill={INK}>GUIDE</text>
    <text transform="translate(306 70) rotate(-90)" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="15" letterSpacing="3" fill={INK}>MATCH DAY</text>
    <text transform="translate(334 70) rotate(-90)" textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize="13" letterSpacing="2" fill={INK} opacity=".7">No. 2026</text>
  </svg>;
}
