// ------------------------------------------------------------
// Firebase 프로젝트 설정을 여기에 붙여넣으세요.
// Firebase 콘솔 > 프로젝트 설정 > 일반 > 내 앱 > SDK 설정 및 구성
// 에서 복사할 수 있습니다. (무료 Spark 요금제로 충분합니다)
//
// 자세한 설정 방법은 README.md 를 참고하세요.
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

// 관리자 화면(admin.html)에서 질문을 바꿀 때 사용하는 간단한 암호.
// 브라우저 코드에 그대로 노출되므로 "진짜 보안"은 아니고,
// 아무나 지우거나 질문을 바꾸지 못하게 막는 최소한의 장치입니다.
const ADMIN_PASSCODE = "changeme";
