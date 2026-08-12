// ------------------------------------------------------------
// index.html (질문/제출 화면) 동작 로직
//
// 관리자가 session/activeQuestionNumber 로 지정한 번호의 질문을
// 실시간으로 가져와 보여주고, 답변은 answers/{번호} 아래에 영구 저장합니다.
// ------------------------------------------------------------

const questionEl = document.getElementById('questionText');
const questionNumberEl = document.getElementById('questionNumber');
const inputEl = document.getElementById('answerInput');
const submitBtn = document.getElementById('submitBtn');
const statusEl = document.getElementById('statusMsg');
const charCountEl = document.getElementById('charCount');
const setupBanner = document.getElementById('setupBanner');

let dbReady = false;
let db = null;
let activeNumber = null;
let questionListener = null;

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
  // 관리자가 선택한 "현재 질문 번호"를 구독
  db.ref(projectPath('session/activeQuestionNumber')).on('value', (snap) => {
    activeNumber = snap.val();
    attachQuestionListener();
  });

  // 관리자가 설정한 질문 글자 크기를 실시간 반영
  db.ref(projectPath('session/questionFontSize')).on('value', (snap) => {
    const px = snap.val();
    questionEl.style.fontSize = px ? px + 'px' : '';
  });
} else {
  questionEl.textContent = '연결 대기 중…';
}

function attachQuestionListener() {
  if (questionListener) {
    questionListener.off();
    questionListener = null;
  }
  if (!activeNumber) {
    questionNumberEl.textContent = '–';
    questionEl.textContent = '아직 진행 중인 질문이 없습니다. 잠시만 기다려주세요.';
    return;
  }
  questionNumberEl.textContent = activeNumber;
  const ref = db.ref(projectPath('questions/' + activeNumber + '/text'));
  ref.on('value', (snap) => {
    const text = snap.val();
    questionEl.innerHTML = renderQuestionMarkup(text && text.trim() ? text : '질문을 불러오는 중…');
  });
  questionListener = ref;
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
  if (!activeNumber) {
    showStatus('현재 진행 중인 질문이 없습니다.', true);
    return;
  }
  if (!text) {
    showStatus('답변 내용을 입력해주세요.', true);
    return;
  }

  submitBtn.disabled = true;
  showStatus('제출 중…', false);

  db.ref(projectPath('answers/' + activeNumber)).push({
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
