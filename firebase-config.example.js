// ------------------------------------------------------------
// firebase-config.js 의 템플릿(예시) 파일입니다. 이 파일은 깃허브에
// 올려도 안전합니다 (실제 값이 들어있지 않으니까요).
//
// 처음 이 프로젝트를 받은 사람은:
//   1) 이 파일을 복사해서 firebase-config.js 라는 이름으로 저장하고
//   2) 본인의 Firebase 프로젝트 값으로 아래 항목을 채우면
//      로컬에서 바로 테스트할 수 있습니다.
// 실제 배포(GitHub Pages)는 GitHub Actions가 저장소 Secrets에서 값을
// 가져와 firebase-config.js를 자동으로 만들어주므로 별도 커밋이
// 필요 없습니다.
// ------------------------------------------------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
