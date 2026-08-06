// ------------------------------------------------------------
// board.html (실시간 집계 화면) 동작 로직
// ------------------------------------------------------------

const questionEl = document.getElementById('questionText');
const gridEl = document.getElementById('boardGrid');
const countEl = document.getElementById('answerCount');
const setupBanner = document.getElementById('setupBanner');

let dbReady = false;
let db = null;
let count = 0;
let lastCard = null;

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
  // 질문 텍스트 실시간 반영
  db.ref('session/question').on('value', (snap) => {
    const q = snap.val();
    questionEl.textContent = q && q.trim() ? q : '아직 등록된 질문이 없습니다.';
  });

  // 답변이 새로 들어올 때마다 (기존 데이터 포함) 카드로 렌더링
  db.ref('session/answers').on('child_added', (snap) => {
    const val = snap.val();
    if (!val || !val.text) return;

    if (count === 0) {
      gridEl.innerHTML = ''; // "아직 답변 없음" 문구 제거
    }
    count += 1;
    countEl.textContent = count;

    const card = document.createElement('div');
    card.className = 'card newest';
    card.innerHTML =
      escapeHtml(val.text) +
      '<span class="ts">' + formatTime(val.ts) + '</span>';

    if (lastCard) lastCard.classList.remove('newest');
    gridEl.prepend(card);
    lastCard = card;
  });

  // 답변이 삭제된 경우(관리자가 초기화) 카운트 반영
  db.ref('session/answers').on('child_removed', () => {
    count = Math.max(0, count - 1);
    countEl.textContent = count;
  });
} else {
  questionEl.textContent = '연결 대기 중…';
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
