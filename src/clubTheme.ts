// 선호 구단 색으로 첫 화면 배경을 칠할 때 쓰는 도우미.
// 구단 색은 사이트 데이터(current-season.json의 teams[].color)를 그대로 쓴다.
const DARK_INK = '#1b1d21';

function luminance(hex: string) {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// 배경색 위에서 더 선명한 글자색(흰색 또는 거의 검정)을 고른다. WCAG 대비 비율 기준.
export function inkOn(hex: string): {ink: string; dark: boolean; ratio: number} {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return {ink: DARK_INK, dark: false, ratio: 0};
  const L = luminance(hex), white = contrast(1, L), dark = contrast(luminance(DARK_INK), L);
  return white >= dark ? {ink: '#ffffff', dark: true, ratio: white} : {ink: DARK_INK, dark: false, ratio: dark};
}

// 두 색을 t(0~1) 비율로 섞는다. mix(구단색, '#ffffff', 0.72) → 구단색 28% + 흰색 72% 의 파스텔 톤
export function mix(hex: string, other: string, t: number) {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(hex), p(other)];
  return '#' + a.map((v, i) => Math.round(v * (1 - t) + b[i] * t).toString(16).padStart(2, '0')).join('');
}
// 선호 구단 배경 팔레트(유니폼 줄무늬): 구단 메인컬러 그대로 + 위→아래 음영.
// 글자가 흰색인 구단은 아래로 갈수록 어둡게, 글자가 검정인 밝은 구단은 아래로 갈수록 밝게 해서 대비가 줄지 않게 한다.
export function clubPalette(hex: string) {
  const on = inkOn(hex);
  const end = on.dark ? mix(hex, '#000000', 0.32) : mix(hex, '#ffffff', 0.2);
  return {main: hex, end, ink: on.ink, dark: on.dark, ratio: on.ratio};
}
