// ------------------------------------------------------------
// Firebase 프로젝트 설정을 여기에 붙여넣으세요.
// Firebase 콘솔 > 프로젝트 설정 > 일반 > 내 앱 > SDK 설정 및 구성
// 에서 복사할 수 있습니다. (무료 Spark 요금제로 충분합니다)
//
// 자세한 설정 방법은 README.md 를 참고하세요.
// ------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBvuY2KWvmJ7Ug0Ec8g9k_Df0mvK5oXnSk",
  authDomain: "albert-livesum.firebaseapp.com",
  databaseURL: "https://albert-livesum-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "albert-livesum",
  storageBucket: "albert-livesum.firebasestorage.app",
  messagingSenderId: "754653995069",
  appId: "1:754653995069:web:0b1a9c841d4505d1f08a54"
};

// 관리자 화면(admin.html)에서 질문을 바꿀 때 사용하는 간단한 암호.
// 브라우저 코드에 그대로 노출되므로 "진짜 보안"은 아니고,
// 아무나 지우거나 질문을 바꾸지 못하게 막는 최소한의 장치입니다.
const ADMIN_PASSCODE = "albertkkk";
