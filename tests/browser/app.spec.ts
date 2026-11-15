import {test,expect} from 'playwright/test';
const scope=(page:any)=>page.locator('main > div:not([hidden])');
test('all screens, browser errors, and desktop screenshot',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 await expect(scope(page).locator('.match-card').first()).toBeVisible();
 await page.screenshot({path:'test-results/desktop-home.png',fullPage:true});
 await scope(page).locator('.match-card').first().click();
 await expect(page.getByRole('heading',{name:'스코어 너머, 경기의 이야기'})).toBeVisible();
 for(const name of ['빅매치','팀','파이널 시뮬레이터','승강 센터','나의 팀 찾기','경기']){
  await page.getByRole('navigation').getByRole('link',{name,exact:true}).click();
  await expect(scope(page).getByRole('heading',{level:1})).toBeVisible();
 }expect(errors).toEqual([]);
});
test('finder validation, recommendation, navigation and reload',async({page})=>{
 await page.goto('/#/finder');
 await page.getByRole('button',{name:'나와 맞는 팀 추천받기'}).click();await expect(page.getByRole('alert')).toContainText('세 질문');
 await page.getByLabel('사는 지역').selectOption('any');
 await page.getByRole('button',{name:'골 넣는 즐거움'}).click();await page.getByRole('button',{name:'자주 이기는 팀'}).click();
 await page.getByRole('button',{name:'나와 맞는 팀 추천받기'}).click();
 await expect(page.locator('.recommendation')).toHaveCount(3);await expect(page.locator('.remaining-grid button')).toHaveCount(9);
 await page.getByRole('button',{name:'이 팀 더 알아보기'}).first().click();await expect(scope(page).locator('.metric')).toHaveCount(6);
 await page.getByRole('navigation').getByRole('link',{name:'나의 팀 찾기'}).click();await expect(page.getByLabel('사는 지역')).toHaveValue('any');
 await page.reload();await expect(page.getByLabel('사는 지역')).toHaveValue('');await expect(page.locator('#recommendations')).toHaveCount(0);
});
test('reveal and round changes preserve the correct state',async({page})=>{
 await page.goto('/#/big');const root=scope(page),card=root.locator('.big-card').first();
 await card.getByRole('button',{name:'홈 승',exact:true}).click();const toggle=root.getByRole('switch');
 await toggle.click();await expect(root.locator('.actual')).toHaveCount(3);
 await toggle.click();await expect(root.locator('.actual')).toHaveCount(0);
 await expect(card.getByRole('button',{name:'홈 승',exact:true})).toHaveAttribute('aria-pressed','true');
 await toggle.click();await root.getByRole('button',{name:'32R',exact:true}).click();await expect(toggle).toHaveAttribute('aria-checked','false');
});
test('simulation reset and honest missing magic numbers',async({page})=>{
 await page.goto('/#/final');let root=scope(page);await root.getByRole('button',{name:'홈 승',exact:true}).click();
 await expect(root.locator('.notice')).toContainText('가정 중');await root.getByRole('button',{name:'초기화',exact:true}).click();await expect(root.locator('.notice')).toContainText('기본 전망');
 await page.getByRole('navigation').getByRole('link',{name:'승강 센터'}).click();root=scope(page);await expect(root).toContainText('정밀 매직넘버 자료가 없습니다');
 await root.getByRole('switch').click();await expect(root.locator('.actual')).toBeVisible();
 await root.getByLabel('승강 기준 라운드').selectOption('38');await expect(root.getByRole('switch')).toHaveAttribute('aria-checked','false');await expect(root).toContainText('정규시즌이 종료되었습니다');
});
test('mobile all screens have no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.goto('/');
 for(const name of ['경기','나의 팀 찾기','빅매치','팀','파이널 시뮬레이터','승강 센터']){
 await page.getByRole('navigation').getByRole('link',{name,exact:true}).click();
 await expect(scope(page).getByRole('heading',{level:1})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name).toBe(true);
 }await page.getByRole('navigation').getByRole('link',{name:'경기',exact:true}).click();await page.screenshot({path:'test-results/mobile-home.png',fullPage:true});
});
test('load error retry and missing route',async({page})=>{
 await page.route('**/data/sample-data.json',route=>route.fulfill({status:500,body:'error'}));await page.goto('/');await expect(page.getByRole('alert')).toBeVisible();
 await page.unroute('**/data/sample-data.json');await page.getByRole('button',{name:'다시 불러오기'}).click();await expect(scope(page).getByRole('heading',{level:1})).toBeVisible();
 await page.goto('/#/unknown');await expect(page.getByRole('button',{name:'경기 홈으로 돌아가기'})).toBeVisible();
});
