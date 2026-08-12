// ------------------------------------------------------------
// 실제 비밀번호가 들어있는 파일입니다.
// 이 파일은 .gitignore에 등록되어 있어 깃허브에 올라가지 않습니다.
// (내 컴퓨터/개인 보관용으로만 갖고 있고, 깃허브에는 커밋하지 마세요.)
//
// 배포는 GitHub Actions가 저장소의 Secrets 값으로 이 파일을 자동
// 생성해서 처리하므로, 아래 값을 GitHub 저장소 Settings → Secrets and
// variables → Actions 에도 각각 SITE_PASSWORD, ADMIN_PASSWORD 라는
// 이름으로 등록해두세요.
// ------------------------------------------------------------

// index.html(참가자 화면), board.html(집계 보드)에서 쓰는 비밀번호
const SITE_PASSWORD = 'Kantar123';

// admin.html(관리자 화면) 전용 비밀번호 - 위와 다르게 설정하세요
const ADMIN_PASSWORD = 'Admin-Kantar456';
