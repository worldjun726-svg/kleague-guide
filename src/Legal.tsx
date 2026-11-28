import {Heading} from './components';

// 이용약관 · 개인정보 수집·이용 안내 (초안)
// 실제 서비스 운영 전에 운영자 정보와 문구를 검토해 확정해야 한다.
const DRAFT = <p className="legal-draft">초안입니다. 운영자 정보와 세부 내용은 서비스 운영 전에 확정됩니다.</p>;

export function TermsPage(){
 return <article className="legal">
  <Heading eyebrow="K LEAGUE GUIDE / TERMS" title="이용약관" description="K LEAGUE GUIDE(이하 '사이트')를 이용할 때 지켜야 할 기본 약속입니다."/>
  {DRAFT}
  <section className="panel"><h2>1. 목적</h2><p>이 약관은 사이트가 제공하는 K리그 일정·기록·커뮤니티 기능을 이용하는 조건과 절차를 정합니다.</p></section>
  <section className="panel"><h2>2. 회원가입과 계정</h2><ul>
   <li>회원은 이메일·비밀번호 또는 카카오·Google 계정으로 가입할 수 있습니다.</li>
   <li>닉네임은 다른 회원과 겹칠 수 없으며, 타인을 사칭하거나 불쾌감을 주는 닉네임은 제한될 수 있습니다.</li>
   <li>계정과 비밀번호 관리 책임은 회원에게 있습니다.</li>
  </ul></section>
  <section className="panel"><h2>3. 게시물</h2><ul>
   <li>회원이 남긴 응원 글·꿀팁의 책임은 작성한 회원에게 있습니다.</li>
   <li>욕설·비방·광고·개인정보 노출 등 다른 이용자에게 피해를 주는 글은 예고 없이 숨겨질 수 있습니다.</li>
  </ul></section>
  <section className="panel"><h2>4. 정보의 정확성</h2><p>경기 일정·결과·기록은 K리그 공식 홈페이지 등 공개 자료를 바탕으로 하며, 실시간이 아니거나 오류가 있을 수 있습니다. 예매·일정 확정은 반드시 공식 채널에서 확인해 주세요. 매직넘버·확률 같은 계산값은 참고용입니다.</p></section>
  <section className="panel"><h2>5. 탈퇴</h2><p>회원은 언제든 내 페이지 → 내 정보 → 회원 탈퇴에서 직접 탈퇴할 수 있으며, 탈퇴하면 계정 정보, 닉네임, 저장한 응원팀·선수, 경기 예측, 작성한 응원 글이 바로 삭제됩니다.</p></section>
 </article>;
}

export function PrivacyPage(){
 return <article className="legal">
  <Heading eyebrow="K LEAGUE GUIDE / PRIVACY" title="개인정보 수집·이용 안내" description="회원가입과 서비스 제공에 필요한 최소한의 정보만 받습니다."/>
  {DRAFT}
  <section className="panel"><h2>수집하는 항목</h2><table className="legal-table"><thead><tr><th>구분</th><th>항목</th><th>목적</th></tr></thead><tbody>
   <tr><td>필수</td><td>이메일, 비밀번호(암호화 저장), 닉네임</td><td>회원 식별, 로그인, 응원 글 작성자 표시</td></tr>
   <tr><td>카카오 로그인 시</td><td>카카오 회원번호, 닉네임, 프로필 사진(동의한 경우), 이메일(동의한 경우)</td><td>간편 로그인, 회원 식별</td></tr>
   <tr><td>Google 로그인 시</td><td>Google 계정 고유 식별자, 이메일, 이름, 프로필 사진</td><td>간편 로그인, 회원 식별</td></tr>
   <tr><td>선택</td><td>MY 팀(선호 구단), 소식 메일 수신 여부</td><td>맞춤 화면 제공, 경기·이벤트 소식 안내</td></tr>
   <tr><td>직관 동행·양도 이용 시</td><td>모집 글(경기·좌석 구역·정가·양도 가격), 신청 내용, 1:1 대화 메시지, 후기·별점, 신고·차단 기록</td><td>동행·양도 연결, 이용자 간 대화, 신뢰도 표시, 부정 거래·괴롭힘 방지</td></tr>
  </tbody></table></section>
  <section className="panel"><h2>보관 기간</h2><p>회원 탈퇴 시 지체 없이 파기합니다(동행·양도 글, 신청, 대화, 후기, 신고·차단 기록 포함). 1:1 대화는 대화한 두 사람과, 신고된 경우 신고 처리를 위해 운영자만 볼 수 있습니다. 다만 관련 법령에 따라 보관해야 하는 정보는 정해진 기간 동안 보관합니다.</p></section>
  <section className="panel"><h2>처리 위탁</h2><p>회원 정보는 Supabase(인증·데이터베이스)에 저장되며, 사이트는 GitHub Pages로 제공됩니다.</p></section>
  <section className="panel"><h2>동의를 거부할 권리</h2><p>필수 항목에 동의하지 않으면 회원가입을 할 수 없지만, 일정·기록 등 로그인이 필요 없는 기능은 그대로 이용할 수 있습니다. 선택 항목은 동의하지 않아도 가입할 수 있습니다.</p></section>
 </article>;
}
