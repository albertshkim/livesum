// ------------------------------------------------------------
// board.html (실시간 집계 화면) 동작 로직
//
// session/activeQuestionNumber 가 바뀌면 해당 번호의 질문/답변으로
// 자동 전환됩니다. 질문·답변은 answers/{번호} 아래에 영구 저장되어
// 있으므로 새로고침해도, 질문을 바꿨다가 다시 돌아와도 유지됩니다.
//
// 답변은 카드형 목록 또는 워드클라우드로 전환해서 볼 수 있습니다.
// ------------------------------------------------------------

const questionEl = document.getElementById('questionText');
const questionNumberEl = document.getElementById('questionNumber');
const questionLabelEl = document.getElementById('questionLabel');
const gridEl = document.getElementById('boardGrid');
const countEl = document.getElementById('answerCount');
const setupBanner = document.getElementById('setupBanner');
const copyAllBtn = document.getElementById('copyAllBtn');
const copyStatusEl = document.getElementById('copyStatus');
const viewCloudBtn = document.getElementById('viewCloudBtn');
const viewCardBtn = document.getElementById('viewCardBtn');
const wordcloudWrap = document.getElementById('wordcloudWrap');
const wordcloudCanvas = document.getElementById('wordcloudCanvas');
const cloudEmptyState = document.getElementById('cloudEmptyState');

let dbReady = false;
let db = null;
let activeNumber = null;
let questionRef = null;
let answersRef = null;
let count = 0;
let lastCard = null;
let answerTexts = []; // 복사/워드클라우드용으로 답변 원문을 순서대로 보관
let currentView = 'cloud'; // 'cloud' | 'card'
let redrawTimer = null;

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
  copyAllBtn.disabled = true;
}

if (dbReady) {
  db.ref('session/activeQuestionNumber').on('value', (snap) => {
    activeNumber = snap.val();
    switchToQuestion(activeNumber);
  });

  // 관리자가 설정한 질문 글자 크기를 실시간 반영
  db.ref('session/questionFontSize').on('value', (snap) => {
    const px = snap.val();
    questionEl.style.fontSize = px ? px + 'px' : '';
  });
} else {
  questionEl.textContent = '연결 대기 중…';
}

function switchToQuestion(num) {
  // 이전 질문/답변 구독 해제
  if (questionRef) { questionRef.off(); questionRef = null; }
  if (answersRef) { answersRef.off(); answersRef = null; }

  // 화면 초기화
  count = 0;
  lastCard = null;
  answerTexts = [];
  countEl.textContent = '0';
  gridEl.innerHTML = '<div class="empty-state">아직 도착한 답변이 없습니다.</div>';
  scheduleCloudRedraw();

  if (!num) {
    questionLabelEl.textContent = '대기 중';
    questionNumberEl.textContent = '–';
    questionEl.textContent = '아직 진행 중인 질문이 없습니다.';
    return;
  }

  questionLabelEl.textContent = '실시간 집계 중';
  questionNumberEl.textContent = num;

  questionRef = db.ref('questions/' + num + '/text');
  questionRef.on('value', (snap) => {
    const q = snap.val();
    questionEl.textContent = q && q.trim() ? q : '(질문 내용 없음)';
  });

  answersRef = db.ref('answers/' + num);
  answersRef.on('child_added', (snap) => {
    const val = snap.val();
    if (!val || !val.text) return;

    if (count === 0) {
      gridEl.innerHTML = '';
    }
    count += 1;
    countEl.textContent = count;
    answerTexts.push(val.text);

    const card = document.createElement('div');
    card.className = 'card newest';
    card.innerHTML =
      escapeHtml(val.text) +
      '<span class="ts">' + formatTime(val.ts) + '</span>';

    if (lastCard) lastCard.classList.remove('newest');
    gridEl.prepend(card);
    lastCard = card;

    scheduleCloudRedraw();
  });

  answersRef.on('child_removed', () => {
    count = Math.max(0, count - 1);
    countEl.textContent = count;
  });
}

// ------------------------------------------------------------
// 보기 전환 (워드클라우드 / 카드형)
// ------------------------------------------------------------
viewCloudBtn.addEventListener('click', () => setView('cloud'));
viewCardBtn.addEventListener('click', () => setView('card'));

function setView(view) {
  currentView = view;
  viewCloudBtn.classList.toggle('active', view === 'cloud');
  viewCardBtn.classList.toggle('active', view === 'card');
  wordcloudWrap.style.display = view === 'cloud' ? 'block' : 'none';
  gridEl.style.display = view === 'card' ? 'grid' : 'none';
  if (view === 'cloud') redrawWordCloud();
}
setView('cloud');

// ------------------------------------------------------------
// 답변 텍스트 -> 단어 빈도 -> 워드클라우드 렌더링
// ------------------------------------------------------------

// 워드클라우드에서 노이즈가 되기 쉬운 흔한 조사/접속어(단독으로 등장했을 때만 제거)
const STOPWORDS = new Set([
  '그리고', '그러나', '하지만', '그래서', '그런데', '그냥', '정말', '진짜',
  '너무', '아주', '매우', '조금', '약간', '그냥요', '음', '어', '네', '예',
  '있습니다', '없습니다', '있어요', '없어요', '합니다', '해요', '것', '거',
  '수', '더', '좀', '이런', '저런', '그런', '이거', '저거', '그거'
]);

function tokenize(text) {
  return text
    .replace(/[.,!?~^;:()\[\]{}"'“”‘’·…\-_/\\|<>@#$%^&*+=]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function buildFrequencyList(texts) {
  const freq = {};
  texts.forEach((text) => {
    tokenize(text).forEach((word) => {
      freq[word] = (freq[word] || 0) + 1;
    });
  });
  return Object.keys(freq)
    .map((word) => [word, freq[word]])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100); // 상단 100개 단어만 표시 (가독성)
}

const CLOUD_COLORS = ['#ffb84d', '#4dd0e1', '#f2f0e9', '#ff9b6b', '#8fd694'];

function scheduleCloudRedraw() {
  if (redrawTimer) clearTimeout(redrawTimer);
  redrawTimer = setTimeout(redrawWordCloud, 250);
}

function redrawWordCloud() {
  if (currentView !== 'cloud') return;

  const list = buildFrequencyList(answerTexts);

  if (list.length === 0) {
    cloudEmptyState.style.display = 'block';
    const ctx = wordcloudCanvas.getContext('2d');
    ctx.clearRect(0, 0, wordcloudCanvas.width, wordcloudCanvas.height);
    return;
  }
  cloudEmptyState.style.display = 'none';

  // 캔버스 실제 픽셀 크기를 컨테이너 크기에 맞춤 (고해상도 대응)
  const rect = wordcloudWrap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  wordcloudCanvas.width = Math.floor(rect.width * dpr);
  wordcloudCanvas.height = Math.floor(rect.height * dpr);

  if (typeof WordCloud !== 'function' || !WordCloud.isSupported) {
    cloudEmptyState.textContent = '이 브라우저에서는 워드클라우드를 표시할 수 없습니다.';
    cloudEmptyState.style.display = 'block';
    return;
  }

  const maxFreq = list[0][1];
  const minDim = Math.min(rect.width, rect.height);

  WordCloud(wordcloudCanvas, {
    list: list,
    backgroundColor: 'transparent',
    color: function () {
      return CLOUD_COLORS[Math.floor(Math.random() * CLOUD_COLORS.length)];
    },
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    weightFactor: function (size) {
      // 가장 많이 나온 단어가 대략 화면 짧은 변의 1/5 크기가 되도록 스케일링
      return ((size / maxFreq) * (minDim / 5) + 10) * dpr;
    },
    rotateRatio: 0.25,
    rotationSteps: 2,
    gridSize: Math.round((8 * (rect.width * dpr)) / 1024),
    shuffle: true,
    drawOutOfBound: false,
    shrinkToFit: true
  });
}

window.addEventListener('resize', scheduleCloudRedraw);

// ------------------------------------------------------------
// 답변 전체 복사 (워드클라우드 등 외부 도구에 붙여넣기용)
// ------------------------------------------------------------
copyAllBtn.addEventListener('click', () => {
  if (answerTexts.length === 0) {
    showCopyStatus('복사할 답변이 없습니다.', true);
    return;
  }
  const joined = answerTexts.join('\n');

  const done = () => showCopyStatus(answerTexts.length + '개 답변이 복사되었습니다 ✓', false);
  const fail = (err) => showCopyStatus('복사에 실패했습니다: ' + err, true);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(joined).then(done).catch((err) => fallbackCopy(joined, done, fail));
  } else {
    fallbackCopy(joined, done, fail);
  }
});

function fallbackCopy(text, done, fail) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    done();
  } catch (e) {
    fail(e.message || e);
  }
}

function showCopyStatus(msg, isError) {
  copyStatusEl.textContent = msg;
  copyStatusEl.className = 'status-msg' + (isError ? ' error' : '');
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
