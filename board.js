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
const saveResultBtn = document.getElementById('saveResultBtn');
const savedListEl = document.getElementById('savedList');
const savedCountLabel = document.getElementById('savedCountLabel');
const viewCloudBtn = document.getElementById('viewCloudBtn');
const viewCardBtn = document.getElementById('viewCardBtn');
const wordcloudWrap = document.getElementById('wordcloudWrap');
const wordcloudCanvas = document.getElementById('wordcloudCanvas');
const cloudEmptyState = document.getElementById('cloudEmptyState');
const nounFreqWrap = document.getElementById('nounFreqWrap');
const nounFreqListEl = document.getElementById('nounFreqList');
const excludedWordsWrap = document.getElementById('excludedWordsWrap');
const excludedWordsListEl = document.getElementById('excludedWordsList');
const restoreAllExcludedBtn = document.getElementById('restoreAllExcludedBtn');
const originalWrap = document.getElementById('originalWrap');
const originalListEl = document.getElementById('originalList');
const originalCountLabel = document.getElementById('originalCountLabel');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
const showAllOriginalsBtn = document.getElementById('showAllOriginalsBtn');
const replayBanner = document.getElementById('replayBanner');
const replayBannerText = document.getElementById('replayBannerText');
const exitReplayBtn = document.getElementById('exitReplayBtn');
const questionRecapNumberEl = document.getElementById('questionRecapNumber');
const questionRecapTextEl = document.getElementById('questionRecapText');

let dbReady = false;
let db = null;
let activeNumber = null; // 현재 화면에 표시 중인 질문 번호 (실시간 모드에서는 라이브 번호, 재생 모드에서는 저장된 스냅샷의 번호)
let liveActiveNumber = null; // Firebase가 실제로 지정한 라이브 질문 번호 (재생 모드 종료 시 이 번호로 복귀)
let isReplaying = false; // 저장된 결과를 재생(미리보기) 중인지 여부
let questionRef = null;
let answersRef = null;
let count = 0;
let lastCard = null;
let answerTexts = []; // 복사/워드클라우드용으로 답변 원문을 순서대로 보관
let answerEntries = []; // [{id, text}] - 카드 삭제 시 실제 Firebase 답변 id를 찾기 위한 배열 (answerTexts와 항상 같은 순서로 유지)
let currentQuestionText = ''; // "결과 저장" 시 서식(줄바꿈 등)을 유지하기 위한 원본 질문 텍스트
let currentView = 'cloud'; // 'cloud' | 'card'
let redrawTimer = null;
let latestNounList = [];
let selectedWords = new Set(); // 명사 빈도표에서 클릭으로 선택한 단어들 (OR 조건)
let excludedWords = new Set(); // 명사 빈도표(상위 15개)에서 제외 처리한 단어들
let showAllOriginals = false; // "모든 원문 보기" 토글 상태

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
  saveResultBtn.disabled = true;
}

if (dbReady) {
  db.ref(projectPath('session/activeQuestionNumber')).on('value', (snap) => {
    liveActiveNumber = snap.val();
    if (!isReplaying) {
      activeNumber = liveActiveNumber;
      switchToQuestion(activeNumber);
    }
  });

  // 관리자가 설정한 질문 글자 크기를 실시간 반영
  db.ref(projectPath('session/questionFontSize')).on('value', (snap) => {
    const px = snap.val();
    questionEl.style.fontSize = px ? px + 'px' : '';
  });

  // 저장된 결과 목록 (질문+답변 스냅샷) 실시간 구독
  db.ref(projectPath('savedResults')).on('value', (snap) => {
    renderSavedList(snap.val() || {});
  });
} else {
  questionEl.textContent = '연결 대기 중…';
}

function switchToQuestion(num) {
  // 재생 모드 배너가 떠있다면 숨깁니다 (실시간 화면으로 돌아왔으므로)
  isReplaying = false;
  replayBanner.style.display = 'none';

  // 이전 질문/답변 구독 해제
  if (questionRef) { questionRef.off(); questionRef = null; }
  if (answersRef) { answersRef.off(); answersRef = null; }

  // 화면 초기화
  count = 0;
  lastCard = null;
  answerTexts = [];
  answerEntries = [];
  selectedWords.clear();
  excludedWords.clear();
  showAllOriginals = false;
  countEl.textContent = '0';
  gridEl.innerHTML = '<div class="empty-state">아직 도착한 답변이 없습니다.</div>';
  scheduleCloudRedraw();

  if (!num) {
    questionLabelEl.textContent = '대기 중';
    questionNumberEl.textContent = '–';
    currentQuestionText = '';
    questionEl.textContent = '아직 진행 중인 질문이 없습니다.';
    updateQuestionRecap(null, '');
    return;
  }

  questionLabelEl.textContent = '실시간 집계 중';
  questionNumberEl.textContent = num;

  questionRef = db.ref(projectPath('questions/' + num + '/text'));
  questionRef.on('value', (snap) => {
    const q = snap.val();
    currentQuestionText = q && q.trim() ? q : '(질문 내용 없음)';
    questionEl.innerHTML = renderQuestionMarkup(currentQuestionText);
    updateQuestionRecap(num, currentQuestionText);
  });

  answersRef = db.ref(projectPath('answers/' + num));
  answersRef.on('child_added', (snap) => {
    const val = snap.val();
    if (!val || !val.text) return;
    const answerId = snap.key;

    if (count === 0) {
      gridEl.innerHTML = '';
    }
    count += 1;
    countEl.textContent = count;
    answerTexts.push(val.text);
    answerEntries.push({ id: answerId, text: val.text });

    const card = document.createElement('div');
    card.className = 'card newest';
    card.dataset.answerId = answerId;
    card.innerHTML =
      '<button class="card-delete-btn" type="button" title="이 답변 삭제">✕</button>' +
      escapeHtml(val.text) +
      '<span class="ts">' + formatTime(val.ts) + '</span>';
    card.querySelector('.card-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAnswer(num, answerId);
    });

    if (lastCard) lastCard.classList.remove('newest');
    gridEl.prepend(card);
    lastCard = card;

    scheduleCloudRedraw();
  });

  answersRef.on('child_removed', (snap) => {
    const answerId = snap.key;

    // 화면에 있는 해당 카드 제거
    const cardEl = gridEl.querySelector('.card[data-answer-id="' + cssEscape(answerId) + '"]');
    if (cardEl) cardEl.remove();
    if (lastCard === cardEl) lastCard = gridEl.querySelector('.card');

    // 배열에서도 같은 항목 제거 (워드클라우드/명사 빈도표/원문 보기 등에 반영되도록)
    const idx = answerEntries.findIndex((e) => e.id === answerId);
    if (idx !== -1) {
      answerEntries.splice(idx, 1);
      answerTexts.splice(idx, 1);
    }

    count = Math.max(0, count - 1);
    countEl.textContent = count;

    if (count === 0) {
      gridEl.innerHTML = '<div class="empty-state">아직 도착한 답변이 없습니다.</div>';
    }

    scheduleCloudRedraw();
  });
}

function deleteAnswer(num, answerId) {
  if (!confirm('이 답변을 삭제할까요? 되돌릴 수 없습니다.')) return;
  db.ref(projectPath('answers/' + num + '/' + answerId)).remove().catch((err) => {
    showCopyStatus('답변 삭제 실패: ' + err.message, true);
  });
}

// CSS.escape 폴리필 (구형 브라우저 대비 아주 단순한 버전)
function cssEscape(str) {
  return String(str).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
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
  const showCloud = view === 'cloud';
  wordcloudWrap.style.display = showCloud ? 'block' : 'none';
  nounFreqWrap.style.display = showCloud ? 'block' : 'none';
  originalWrap.style.display = showCloud ? 'block' : 'none';
  gridEl.style.display = showCloud ? 'none' : 'grid';
  if (showCloud) redrawWordCloud();
}
// 초기 화면 상태(워드클라우드 보기)는 board.html의 기본 마크업과 이미 일치하므로
// 여기서 setView를 즉시 호출하지 않습니다. (파일 아래쪽에 정의된 상수들이
// 아직 초기화되기 전이라 즉시 호출하면 오류가 나서, 최초 렌더링은
// switchToQuestion() -> scheduleCloudRedraw()의 비동기 호출에 맡깁니다.)

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

function splitWords(text) {
  return text
    .replace(/[.,!?~^;:()\[\]{}"'“”‘’·…\-_/\\|<>@#$%^&*+=]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function tokenize(text) {
  return splitWords(text).filter((w) => w.length > 1 && !STOPWORDS.has(w));
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

// ------------------------------------------------------------
// 명사 추정: 완전한 형태소 분석기 없이, 흔히 쓰이는 조사(은/는/이/가/을/를 등)를
// 단어 끝에서 제거하는 규칙 기반 방식입니다. 100% 정확하지는 않지만
// 실시간 워드클라우드 보조 지표로는 충분히 쓸만합니다.
// ------------------------------------------------------------

// 긴 조사부터 먼저 매칭되도록 길이 내림차순으로 정렬해서 사용
const JOSA_SUFFIXES = [
  '으로부터', '에게서는', '한테서는',
  '이라고는', '이라는건', '이었지만', '였지만은',
  '에게서', '한테서', '으로써', '이라며', '이라서', '이라도', '이라면', '이라고',
  '에서는', '으로는', '에게는', '한테는', '까지는', '부터는', '이지만', '지만도',
  '이라도', '이나마', '이든지', '든지는',
  '에서', '으로', '에게', '한테', '까지', '부터', '마다', '조차', '밖에', '마저',
  '이라', '라는', '라고', '이나', '이야', '이여', '지만', '든지',
  '들이', '들을', '들의', '들도', '들은', '들과', '들에',
  '이었', '였다', '한다', '했다', '되어', '되는', '하는', '이며', '이고',
  '와는', '과는', '에는', '로는',
  '은', '는', '이', '가', '을', '를', '에', '와', '과', '도', '만', '의', '로', '나', '랑', '며'
].sort((a, b) => b.length - a.length);

function stripJosa(word) {
  for (let i = 0; i < JOSA_SUFFIXES.length; i++) {
    const suf = JOSA_SUFFIXES[i];
    if (word.length - suf.length >= 2 && word.endsWith(suf)) {
      return word.slice(0, word.length - suf.length);
    }
  }
  return word;
}

function extractNouns(texts) {
  const freq = {};
  texts.forEach((text) => {
    splitWords(text).forEach((rawWord) => {
      const isKorean = /[가-힣]/.test(rawWord);
      const word = isKorean ? stripJosa(rawWord) : rawWord.toLowerCase();
      if (word.length < 2 || STOPWORDS.has(word)) return;
      freq[word] = (freq[word] || 0) + 1;
    });
  });
  return Object.keys(freq)
    .filter((word) => !excludedWords.has(word)) // 제외 처리한 단어는 순위 계산에서 아예 뺌 (다음 순위 단어가 그 자리를 채움)
    .map((word) => [word, freq[word]])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
}

function renderNounFreqTable(list) {
  latestNounList = list || [];

  if (latestNounList.length === 0) {
    nounFreqListEl.innerHTML = excludedWords.size > 0
      ? '<div class="empty-state-small">표시할 단어가 없습니다. (제외한 단어가 있다면 아래에서 복원해보세요)</div>'
      : '<div class="empty-state-small">아직 집계할 답변이 없습니다.</div>';
    renderExcludedWordsChips();
    return;
  }
  const maxCount = latestNounList[0][1];
  nounFreqListEl.innerHTML = '';
  latestNounList.forEach((pair, idx) => {
    const word = pair[0];
    const cnt = pair[1];
    const row = document.createElement('div');
    row.className = 'noun-freq-row' + (selectedWords.has(word) ? ' selected' : '');
    row.innerHTML =
      '<span class="noun-freq-rank">' + (idx + 1) + '</span>' +
      '<span class="noun-freq-word">' + escapeHtml(word) + '</span>' +
      '<span class="noun-freq-bar-wrap"><span class="noun-freq-bar" style="width:' +
        Math.round((cnt / maxCount) * 100) + '%"></span></span>' +
      '<span class="noun-freq-count">' + cnt + '</span>';

    const excludeBtn = document.createElement('button');
    excludeBtn.className = 'noun-freq-exclude-btn';
    excludeBtn.type = 'button';
    excludeBtn.title = '"' + word + '" 목록에서 제외';
    excludeBtn.textContent = '✕';
    excludeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      excludeWord(word);
    });
    row.appendChild(excludeBtn);

    row.addEventListener('click', () => toggleWordSelection(word));
    nounFreqListEl.appendChild(row);
  });

  renderExcludedWordsChips();
}

// ------------------------------------------------------------
// 명사 빈도표에서 특정 단어 제외 / 복원
// ------------------------------------------------------------
function excludeWord(word) {
  excludedWords.add(word);
  selectedWords.delete(word); // 제외하면 선택도 함께 해제
  renderNounFreqTable(extractNouns(answerTexts));
  renderOriginalTexts();
}

function restoreWord(word) {
  excludedWords.delete(word);
  renderNounFreqTable(extractNouns(answerTexts));
}

function renderExcludedWordsChips() {
  if (excludedWords.size === 0) {
    excludedWordsWrap.style.display = 'none';
    return;
  }
  excludedWordsWrap.style.display = 'flex';
  excludedWordsListEl.innerHTML = '';
  Array.from(excludedWords).forEach((word) => {
    const chip = document.createElement('button');
    chip.className = 'excluded-chip';
    chip.type = 'button';
    chip.title = '"' + word + '" 다시 포함시키기';
    chip.textContent = word + ' ↺';
    chip.addEventListener('click', () => restoreWord(word));
    excludedWordsListEl.appendChild(chip);
  });
}

restoreAllExcludedBtn.addEventListener('click', () => {
  excludedWords.clear();
  renderNounFreqTable(extractNouns(answerTexts));
});

// ------------------------------------------------------------
// 단어 선택(다중 · OR 조건) 및 원문 필터링
// ------------------------------------------------------------
function toggleWordSelection(word) {
  if (selectedWords.has(word)) {
    selectedWords.delete(word);
  } else {
    selectedWords.add(word);
    showAllOriginals = false; // 단어를 선택하면 "모든 원문 보기"는 해제
  }
  renderNounFreqTable(latestNounList);
  renderOriginalTexts();
}

clearSelectionBtn.addEventListener('click', () => {
  selectedWords.clear();
  showAllOriginals = false;
  renderNounFreqTable(latestNounList);
  renderOriginalTexts();
});

showAllOriginalsBtn.addEventListener('click', () => {
  showAllOriginals = !showAllOriginals;
  if (showAllOriginals) selectedWords.clear();
  renderNounFreqTable(latestNounList);
  renderOriginalTexts();
});

function renderOriginalTexts() {
  showAllOriginalsBtn.classList.toggle('active', showAllOriginals);

  let matched = null;

  if (showAllOriginals) {
    matched = answerTexts;
    originalCountLabel.textContent = '· 전체 ' + matched.length + '개';
  } else if (selectedWords.size > 0) {
    const words = Array.from(selectedWords);
    matched = answerTexts.filter((t) => words.some((w) => t.includes(w)));
    originalCountLabel.textContent =
      '· "' + words.join('", "') + '" 포함 (OR) ' + matched.length + '개';
  } else {
    originalCountLabel.textContent = '· 단어를 클릭해서 필터링하세요 (여러 개 선택 시 OR 조건)';
  }

  if (matched === null) {
    originalListEl.innerHTML = '<div class="empty-state-small">위에서 단어를 클릭하거나 "모든 원문 보기"를 눌러주세요.</div>';
    return;
  }
  if (matched.length === 0) {
    originalListEl.innerHTML = '<div class="empty-state-small">조건에 맞는 답변이 없습니다.</div>';
    return;
  }
  originalListEl.innerHTML = '';
  matched.forEach((text) => {
    const card = document.createElement('div');
    card.className = 'original-card';
    card.textContent = text;
    originalListEl.appendChild(card);
  });
}

const CLOUD_COLORS = ['#ffb84d', '#4dd0e1', '#f2f0e9', '#ff9b6b', '#8fd694'];

function scheduleCloudRedraw() {
  if (redrawTimer) clearTimeout(redrawTimer);
  redrawTimer = setTimeout(redrawWordCloud, 250);
}

function redrawWordCloud() {
  if (currentView !== 'cloud') return;

  renderNounFreqTable(extractNouns(answerTexts));
  renderOriginalTexts();

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

  const lines = [];
  if (currentQuestionText) {
    lines.push((activeNumber ? '[' + activeNumber + '번 질문] ' : '[질문] ') + currentQuestionText);
    lines.push('');
  }
  answerTexts.forEach((t) => lines.push(t));
  const joined = lines.join('\n');

  const done = () => showCopyStatus(answerTexts.length + '개 답변이 질문과 함께 복사되었습니다 ✓', false);
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

// ------------------------------------------------------------
// 현재 질문 + 현재까지의 답변을 하나의 스냅샷으로 저장
// (answers/{번호}는 계속 실시간으로 쌓이지만, 이 저장 목록은
//  "그 순간의 결과"를 별도로 보존해두는 용도입니다. 전체 초기화를
//  하기 전에 기록을 남기고 싶을 때 특히 유용합니다.)
// ------------------------------------------------------------
saveResultBtn.addEventListener('click', () => {
  if (!dbReady) {
    showCopyStatus('Firebase 설정이 완료되지 않았습니다.', true);
    return;
  }
  if (!activeNumber) {
    showCopyStatus('저장할 진행 중인 질문이 없습니다.', true);
    return;
  }
  if (answerTexts.length === 0) {
    showCopyStatus('저장할 답변이 아직 없습니다.', true);
    return;
  }

  db.ref(projectPath('savedResults')).push({
    questionNumber: activeNumber,
    questionText: currentQuestionText,
    answers: answerTexts.slice(),
    answerCount: answerTexts.length,
    savedAt: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    showCopyStatus('현재 결과가 저장되었습니다 ✓', false);
  }).catch((err) => {
    showCopyStatus('저장 실패: ' + err.message, true);
  });
});

function renderSavedList(dataObj) {
  const entries = Object.keys(dataObj).map((key) => {
    const v = dataObj[key] || {};
    return {
      id: key,
      questionNumber: v.questionNumber,
      questionText: v.questionText,
      answers: v.answers || [],
      answerCount: v.answerCount != null ? v.answerCount : (v.answers ? v.answers.length : 0),
      savedAt: v.savedAt
    };
  });

  entries.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

  savedCountLabel.textContent = entries.length + '개 저장됨';

  if (entries.length === 0) {
    savedListEl.innerHTML = '<div class="empty-state-small">아직 저장된 결과가 없습니다. 위의 "결과 저장" 버튼을 눌러보세요.</div>';
    return;
  }

  savedListEl.innerHTML = '';
  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'saved-item';

    const main = document.createElement('div');
    main.className = 'saved-item-main';

    const qDiv = document.createElement('div');
    qDiv.className = 'saved-item-question';
    qDiv.textContent = (entry.questionNumber ? entry.questionNumber + '번 · ' : '') + (entry.questionText || '(질문 없음)');

    const metaDiv = document.createElement('div');
    metaDiv.className = 'saved-item-meta';
    metaDiv.textContent = formatDateTime(entry.savedAt) + ' · 답변 ' + entry.answerCount + '개';

    main.appendChild(qDiv);
    main.appendChild(metaDiv);

    const actions = document.createElement('div');
    actions.className = 'saved-item-actions';

    const replayBtn = document.createElement('button');
    replayBtn.className = 'icon-btn play';
    replayBtn.title = '이 결과 재생 (현재 화면에 불러오기)';
    replayBtn.type = 'button';
    replayBtn.textContent = '\u25B6\uFE0E';
    replayBtn.addEventListener('click', () => enterReplay(entry));

    const copyBtn = document.createElement('button');
    copyBtn.className = 'icon-btn';
    copyBtn.title = '클립보드에 복사';
    copyBtn.type = 'button';
    copyBtn.textContent = '📋';
    copyBtn.addEventListener('click', () => copySavedEntry(entry));

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn danger';
    delBtn.title = '삭제';
    delBtn.type = 'button';
    delBtn.textContent = '🗑️';
    delBtn.addEventListener('click', () => deleteSavedEntry(entry.id));

    actions.appendChild(replayBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(delBtn);

    item.appendChild(main);
    item.appendChild(actions);
    savedListEl.appendChild(item);
  });
}

// ------------------------------------------------------------
// 저장된 결과 재생(미리보기): 실시간 Firebase 데이터를 건드리지 않고,
// 화면(질문·워드클라우드·명사 빈도표·원문 보기·카드형)만 그 시점 스냅샷으로
// 임시로 바꿔서 보여줍니다. "실시간으로 돌아가기"를 누르면 원래 라이브
// 상태로 복귀합니다.
// ------------------------------------------------------------
function enterReplay(entry) {
  // 라이브 구독을 잠시 멈춥니다 (재생 중엔 실시간 답변이 화면을 덮어쓰지 않도록)
  if (questionRef) { questionRef.off(); questionRef = null; }
  if (answersRef) { answersRef.off(); answersRef = null; }

  isReplaying = true;
  activeNumber = entry.questionNumber || null;
  currentQuestionText = entry.questionText || '';

  questionNumberEl.textContent = activeNumber || '–';
  questionEl.innerHTML = renderQuestionMarkup(currentQuestionText || '(질문 없음)');
  questionLabelEl.textContent = '저장된 결과 재생 중';
  updateQuestionRecap(activeNumber, currentQuestionText);

  answerTexts = (entry.answers || []).slice();
  answerEntries = []; // 재생(스냅샷) 카드는 실제 Firebase id가 없어 삭제 버튼을 붙이지 않음
  count = answerTexts.length;
  countEl.textContent = count;
  selectedWords.clear();
  excludedWords.clear();
  showAllOriginals = false;

  rebuildCardGrid();
  scheduleCloudRedraw();

  replayBannerText.textContent =
    '저장된 결과를 보고 있습니다' +
    (activeNumber ? ' (' + activeNumber + '번 · ' : ' (') +
    formatDateTime(entry.savedAt) + ')';
  replayBanner.style.display = 'flex';

  showCopyStatus('저장된 결과를 불러왔습니다.', false);
}

exitReplayBtn.addEventListener('click', () => {
  isReplaying = false;
  replayBanner.style.display = 'none';
  activeNumber = liveActiveNumber;
  switchToQuestion(liveActiveNumber);
});

// 실시간 모드에서는 answersRef의 child_added 이벤트가 카드를 하나씩 추가하지만,
// 재생 모드는 저장된 답변 배열을 한 번에 통째로 보여줘야 하므로 그리드를
// 처음부터 다시 그립니다.
function rebuildCardGrid() {
  if (answerTexts.length === 0) {
    gridEl.innerHTML = '<div class="empty-state">아직 도착한 답변이 없습니다.</div>';
    lastCard = null;
    return;
  }
  gridEl.innerHTML = '';
  // 실시간 모드와 동일하게 최신 답변이 위로 오도록 배열을 뒤집어서 렌더링
  const reversed = answerTexts.slice().reverse();
  reversed.forEach((text, idx) => {
    const card = document.createElement('div');
    card.className = 'card' + (idx === 0 ? ' newest' : '');
    card.innerHTML = escapeHtml(text) + '<span class="ts"></span>';
    gridEl.appendChild(card);
  });
  lastCard = gridEl.firstChild;
}

function copySavedEntry(entry) {
  const lines = [];
  lines.push((entry.questionNumber ? entry.questionNumber + '번 질문: ' : '질문: ') + (entry.questionText || ''));
  lines.push('');
  entry.answers.forEach((a) => lines.push(a));
  const text = lines.join('\n');

  const done = () => showCopyStatus('저장된 결과가 복사되었습니다 ✓', false);
  const fail = (err) => showCopyStatus('복사에 실패했습니다: ' + err, true);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done, fail));
  } else {
    fallbackCopy(text, done, fail);
  }
}

function deleteSavedEntry(id) {
  if (!confirm('이 저장 항목을 삭제할까요? 되돌릴 수 없습니다.')) return;
  db.ref(projectPath('savedResults/' + id)).remove().catch((err) => {
    showCopyStatus('삭제 실패: ' + err.message, true);
  });
}

function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

// 워드클라우드/카드형 영역 바로 위, 스크롤해도 화면에 붙어있는(sticky) 질문
// 요약 바를 갱신합니다. 질문이 많아 스크롤이 길어져도 지금 보고 있는 답변이
// 어느 질문에 대한 것인지 계속 확인할 수 있도록 하는 용도입니다.
function updateQuestionRecap(num, text) {
  questionRecapNumberEl.textContent = num || '–';
  const plain = (text || '질문을 불러오는 중…').replace(/\s+/g, ' ').trim();
  questionRecapTextEl.textContent = (num ? num + '번 · ' : '') + plain;
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
