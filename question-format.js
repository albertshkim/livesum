// ------------------------------------------------------------
// 질문 문장을 표시할 때 공통으로 쓰는 아주 가벼운 서식 변환기.
// admin.html / index.html / board.html 세 화면에서 모두 이 스크립트를
// 불러와 window.renderQuestionMarkup(text) 로 사용합니다.
//
// 지원하는 서식 (완전한 마크다운은 아니고, 설문 문항 작성에 자주 쓰이는
// 최소한의 서식만 지원합니다):
//   - 줄바꿈을 그대로 유지
//   - 줄 앞의 공백(들여쓰기)을 그대로 유지
//   - "* " 또는 "- "로 시작하는 줄은 불릿 목록(•)으로 표시
//   - **텍스트** 로 감싼 부분은 굵게(볼드) 표시
// ------------------------------------------------------------
(function (global) {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 이미 escapeHtml을 거친 문자열에 대해서만 **볼드** 표시를 <strong>으로 변환합니다.
  // (먼저 이스케이프한 뒤에 처리하므로 <, >, & 등이 섞여 있어도 안전합니다.)
  function applyBold(escapedText) {
    return escapedText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function formatInline(text) {
    return applyBold(escapeHtml(text));
  }

  // 줄 앞의 공백(들여쓰기)은 일반 스페이스로 두면 브라우저가 한 칸으로
  // 뭉개버리므로, 눈에 보이는 공백(&nbsp;)으로 바꿔서 들여쓰기를 유지합니다.
  function indentAwareFormat(line) {
    const m = line.match(/^(\s+)/);
    if (!m) return formatInline(line);
    const indent = m[1].replace(/\t/g, '    '); // 탭은 스페이스 4칸으로 통일
    return '\u00A0'.repeat(indent.length) + formatInline(line.slice(m[1].length));
  }

  function renderQuestionMarkup(text) {
    if (!text) return '';
    const lines = String(text).split('\n');
    let html = '';
    let inList = false;

    lines.forEach((rawLine) => {
      const bulletMatch = rawLine.match(/^\s*[*\-]\s+(.*)$/);

      if (bulletMatch) {
        if (!inList) { html += '<ul class="q-bullet-list">'; inList = true; }
        html += '<li>' + formatInline(bulletMatch[1]) + '</li>';
        return;
      }

      if (inList) { html += '</ul>'; inList = false; }

      if (rawLine.trim() === '') {
        html += '<div class="q-blank-line"></div>';
      } else {
        html += '<div class="q-line">' + indentAwareFormat(rawLine) + '</div>';
      }
    });

    if (inList) html += '</ul>';
    return html;
  }

  global.renderQuestionMarkup = renderQuestionMarkup;
})(window);
