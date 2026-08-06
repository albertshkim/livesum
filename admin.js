// ------------------------------------------------------------
// admin.html 동작 로직
// ------------------------------------------------------------

const passcodeInput = document.getElementById('passcodeInput');
const questionInput = document.getElementById('questionInput');
const currentQ = document.getElementById('currentQ');
const setQuestionBtn = document.getElementById('setQuestionBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl1 = document.getElementById('statusMsg1');
const statusEl2 = document.getElementById('statusMsg2');
const setupBanner = document.getElementById('setupBanner');

let dbReady = false;
let db = null;

if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    dbReady = true;
  } catch (e) {
    console.error(e);
  }
} else {
  setupBanner.innerHTML =
    '<div class="setup-banner">⚠️ 아직 Firebase 설정이 되지 않았습니다. ' +
    '<code>firebase-config.js</code> 파일을 열어 본인의 Firebase 프로젝트 값으로 채워주세요. ' +
    '(README.md 참고)</div>';
}

if (dbReady) {
  db.ref('session/question').on('value', (snap) => {
    currentQ.textContent = '현재 질문: ' + (snap.val() || '(없음)');
  });
}

function checkPasscode() {
  const entered = passcodeInput.value.trim();
  if (entered !== ADMIN_PASSCODE) {
    return false;
  }
  return true;
}

setQuestionBtn.addEventListener('click', () => {
  if (!dbReady) {
    showStatus(statusEl1, 'Firebase 설정이 완료되지 않았습니다.', true);
    return;
  }
  if (!checkPasscode()) {
    showStatus(statusEl1, '암호가 올바르지 않습니다.', true);
    return;
  }
  const text = questionInput.value.trim();
  if (!text) {
    showStatus(statusEl1, '질문 내용을 입력해주세요.', true);
    return;
  }

  db.ref('session/question').set(text).then(() => {
    showStatus(statusEl1, '질문이 등록되었습니다 ✓', false);
    questionInput.value = '';
  }).catch((err) => {
    showStatus(statusEl1, '오류: ' + err.message, true);
  });
});

resetBtn.addEventListener('click', () => {
  if (!dbReady) {
    showStatus(statusEl2, 'Firebase 설정이 완료되지 않았습니다.', true);
    return;
  }
  if (!checkPasscode()) {
    showStatus(statusEl2, '암호가 올바르지 않습니다.', true);
    return;
  }
  if (!confirm('모든 답변을 정말 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) {
    return;
  }

  db.ref('session/answers').remove().then(() => {
    showStatus(statusEl2, '모든 답변이 초기화되었습니다 ✓', false);
  }).catch((err) => {
    showStatus(statusEl2, '오류: ' + err.message, true);
  });
});

function showStatus(el, msg, isError) {
  el.textContent = msg;
  el.className = 'status-msg' + (isError ? ' error' : '');
}
