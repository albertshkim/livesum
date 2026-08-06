// ------------------------------------------------------------
// index.html (질문/제출 화면) 동작 로직
// ------------------------------------------------------------

const questionEl = document.getElementById('questionText');
const inputEl = document.getElementById('answerInput');
const submitBtn = document.getElementById('submitBtn');
const statusEl = document.getElementById('statusMsg');
const charCountEl = document.getElementById('charCount');
const setupBanner = document.getElementById('setupBanner');

let dbReady = false;
let db = null;

// firebase-config.js 값이 채워졌는지 확인
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

// 질문 텍스트 실시간 반영 (관리자가 admin.html에서 바꾸면 여기도 즉시 갱신)
if (dbReady) {
  db.ref('session/question').on('value', (snap) => {
    const q = snap.val();
    questionEl.textContent = q && q.trim() ? q : '아직 등록된 질문이 없습니다. (admin.html에서 설정)';
  });
} else {
  questionEl.textContent = '연결 대기 중…';
}

// 글자수 표시
inputEl.addEventListener('input', () => {
  charCountEl.textContent = inputEl.value.length;
});

// 제출
submitBtn.addEventListener('click', submitAnswer);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    submitAnswer();
  }
});

function submitAnswer() {
  const text = inputEl.value.trim();

  if (!dbReady) {
    showStatus('Firebase 설정이 완료되지 않아 제출할 수 없습니다.', true);
    return;
  }
  if (!text) {
    showStatus('답변 내용을 입력해주세요.', true);
    return;
  }

  submitBtn.disabled = true;
  showStatus('제출 중…', false);

  db.ref('session/answers').push({
    text: text,
    ts: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    inputEl.value = '';
    charCountEl.textContent = '0';
    showStatus('제출되었습니다. 감사합니다 ✓', false);
    submitBtn.disabled = false;
  }).catch((err) => {
    console.error(err);
    showStatus('제출 중 오류가 발생했습니다: ' + err.message, true);
    submitBtn.disabled = false;
  });
}

function showStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.className = 'status-msg' + (isError ? ' error' : '');
}
