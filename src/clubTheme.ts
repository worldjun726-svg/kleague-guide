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
