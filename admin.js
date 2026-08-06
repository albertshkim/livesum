// ------------------------------------------------------------
// admin.html 동작 로직
//
// 데이터 구조:
//   questions/{번호}          -> { text, updatedAt }
//   session/activeQuestionNumber -> 현재 참가자 화면에 노출 중인 질문 번호
//   answers/{번호}/{pushId}   -> { text, ts }   (질문별로 영구 저장)
//
// ※ 이 관리자 화면은 암호 없이 동작합니다. admin.html 링크는
//   참가자에게 공유하지 말고, 진행자만 알고 있는 별도 링크로 관리하세요.
// ------------------------------------------------------------

const bulkInput = document.getElementById('bulkQuestionInput');
const parsedPreview = document.getElementById('parsedPreview');
const registerBtn = document.getElementById('registerBtn');
const questionListEl = document.getElementById('questionList');
const resetBtn = document.getElementById('resetBtn');
const resetAllBtn = document.getElementById('resetAllBtn');
const statusEl1 = document.getElementById('statusMsg1');
const statusEl2 = document.getElementById('statusMsg2');
const statusEl3 = document.getElementById('statusMsg3');
const statusEl4 = document.getElementById('statusMsg4');
const setupBanner = document.getElementById('setupBanner');

let dbReady = false;
let db = null;
let activeNumber = null;
let questionsCache = {};

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

function showStatus(el, msg, isError) {
  el.textContent = msg;
  el.className = 'status-msg' + (isError ? ' error' : '');
}

// ------------------------------------------------------------
// 1) 일괄 질문 입력 파싱: "1. 질문내용" 형식의 줄을 새 질문 시작으로 인식
//    다음 번호 줄이 나오기 전까지 이어지는 줄은 같은 질문에 이어붙임
// ------------------------------------------------------------
function parseBulkQuestions(raw) {
  const lines = raw.split('\n');
  const result = {}; // { "1": "직업은 무엇인가요?", ... }
  let currentNum = null;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    const m = line.match(/^(\d+)\.\s*(.*)$/);
    if (m) {
      currentNum = m[1];
      result[currentNum] = m[2].trim();
    } else if (currentNum !== null) {
      result[currentNum] = (result[currentNum] + ' ' + line).trim();
    }
  });

  return result;
}

function updatePreview() {
  const parsed = parseBulkQuestions(bulkInput.value);
  const count = Object.keys(parsed).length;
  parsedPreview.textContent = '입력한 질문 ' + count + '개 인식됨';
}
bulkInput.addEventListener('input', updatePreview);

registerBtn.addEventListener('click', () => {
  if (!dbReady) {
    showStatus(statusEl1, 'Firebase 설정이 완료되지 않았습니다.', true);
    return;
  }
  const parsed = parseBulkQuestions(bulkInput.value);
  const numbers = Object.keys(parsed);

  if (numbers.length === 0) {
    showStatus(statusEl1, '"1. 질문내용" 형식으로 입력해주세요.', true);
    return;
  }
  const emptyOnes = numbers.filter((n) => !parsed[n]);
  if (emptyOnes.length > 0) {
    showStatus(statusEl1, numbers.filter((n) => !parsed[n]).join(', ') + '번 질문 내용이 비어있습니다.', true);
    return;
  }

  const updates = {};
  numbers.forEach((num) => {
    updates['questions/' + num + '/text'] = parsed[num];
    updates['questions/' + num + '/updatedAt'] = firebase.database.ServerValue.TIMESTAMP;
  });

  db.ref().update(updates).then(() => {
    showStatus(statusEl1, numbers.length + '개 질문이 등록되었습니다 ✓ (번호: ' + numbers.join(', ') + ')', false);
    bulkInput.value = '';
    updatePreview();
  }).catch((err) => {
    showStatus(statusEl1, '오류: ' + err.message, true);
  });
});

// ------------------------------------------------------------
// 2) 등록된 질문 목록 실시간 표시
// ------------------------------------------------------------
if (dbReady) {
  db.ref('session/activeQuestionNumber').on('value', (snap) => {
    activeNumber = snap.val();
    renderQuestionList();
  });

  db.ref('questions').on('value', (snap) => {
    questionsCache = snap.val() || {};
    renderQuestionList();
  });
}

function renderQuestionList() {
  const numbers = Object.keys(questionsCache).sort((a, b) => Number(a) - Number(b));

  if (numbers.length === 0) {
    questionListEl.innerHTML = '<div class="empty-state-small">아직 등록된 질문이 없습니다. 위에서 먼저 등록해주세요.</div>';
    return;
  }

  questionListEl.innerHTML = '';
  numbers.forEach((num) => {
    const q = questionsCache[num];
    const isActive = String(activeNumber) === String(num);

    const row = document.createElement('div');
    row.className = 'question-item' + (isActive ? ' active' : '');

    const numBadge = document.createElement('div');
    numBadge.className = 'q-number';
    numBadge.textContent = num;

    const text = document.createElement('div');
    text.className = 'q-text';
    text.textContent = (q && q.text) || '(내용 없음)';

    const actions = document.createElement('div');
    actions.className = 'q-actions';

    if (isActive) {
      const label = document.createElement('span');
      label.className = 'btn-small active-label';
      label.textContent = '● 진행 중';
      actions.appendChild(label);
    } else {
      const useBtn = document.createElement('button');
      useBtn.className = 'btn-small';
      useBtn.textContent = '이 질문 사용';
      useBtn.addEventListener('click', () => activateQuestion(num));
      actions.appendChild(useBtn);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-small danger';
    delBtn.textContent = '삭제';
    delBtn.addEventListener('click', () => deleteQuestion(num));
    actions.appendChild(delBtn);

    row.appendChild(numBadge);
    row.appendChild(text);
    row.appendChild(actions);
    questionListEl.appendChild(row);
  });
}

function activateQuestion(num) {
  db.ref('session/activeQuestionNumber').set(num).then(() => {
    showStatus(statusEl2, num + '번 질문이 참가자 화면에 표시됩니다 ✓', false);
  }).catch((err) => {
    showStatus(statusEl2, '오류: ' + err.message, true);
  });
}

function deleteQuestion(num) {
  if (!confirm(num + '번 질문을 삭제할까요? (해당 질문에 쌓인 답변은 유지됩니다)')) return;

  db.ref('questions/' + num).remove().then(() => {
    if (String(activeNumber) === String(num)) {
      db.ref('session/activeQuestionNumber').remove();
    }
    showStatus(statusEl2, num + '번 질문이 삭제되었습니다.', false);
  }).catch((err) => {
    showStatus(statusEl2, '오류: ' + err.message, true);
  });
}

// ------------------------------------------------------------
// 3) 현재 질문 답변 초기화
// ------------------------------------------------------------
resetBtn.addEventListener('click', () => {
  if (!dbReady) {
    showStatus(statusEl3, 'Firebase 설정이 완료되지 않았습니다.', true);
    return;
  }
  if (!activeNumber) {
    showStatus(statusEl3, '현재 진행 중인 질문이 없습니다.', true);
    return;
  }
  if (!confirm(activeNumber + '번 질문의 답변을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;

  db.ref('answers/' + activeNumber).remove().then(() => {
    showStatus(statusEl3, activeNumber + '번 질문의 답변이 초기화되었습니다 ✓', false);
  }).catch((err) => {
    showStatus(statusEl3, '오류: ' + err.message, true);
  });
});

// ------------------------------------------------------------
// 4) 전체 초기화: 등록된 모든 질문 + 모든 답변 + 현재 진행 질문 정보 삭제
// ------------------------------------------------------------
resetAllBtn.addEventListener('click', () => {
  if (!dbReady) {
    showStatus(statusEl4, 'Firebase 설정이 완료되지 않았습니다.', true);
    return;
  }
  if (!confirm('정말로 모든 질문과 모든 답변을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) {
    return;
  }
  const typed = prompt('마지막 확인입니다. 계속하려면 아래 칸에 "전체삭제" 라고 입력해주세요.');
  if (typed !== '전체삭제') {
    showStatus(statusEl4, '입력값이 일치하지 않아 취소되었습니다.', true);
    return;
  }

  db.ref().update({
    questions: null,
    answers: null,
    session: null
  }).then(() => {
    bulkInput.value = '';
    updatePreview();
    showStatus(statusEl4, '모든 질문과 답변이 초기화되었습니다 ✓', false);
  }).catch((err) => {
    showStatus(statusEl4, '오류: ' + err.message, true);
  });
});
