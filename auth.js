// ------------------------------------------------------------
// 공용 비밀번호 게이트
// index.html / board.html / admin.html 세 화면 모두 이 스크립트로 보호됩니다.
//
// 주의: 브라우저 코드에 비밀번호가 그대로 노출되므로 "진짜 보안"은 아닙니다.
// 아무나 못 들어오게 막는 가벼운 문 정도로 생각해주세요.
// 비밀번호를 바꾸려면 아래 SITE_PASSWORD 값만 수정하면 됩니다.
// ------------------------------------------------------------
(function () {
  const SITE_PASSWORD = 'albert1';
  const STORAGE_KEY = 'anonBoardAuthed';

  function unlock() {
    const gate = document.getElementById('authGate');
    if (gate) gate.remove();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (sessionStorage.getItem(STORAGE_KEY) === 'yes') {
      unlock();
      return;
    }

    const form = document.getElementById('authForm');
    const input = document.getElementById('authPasswordInput');
    const errorEl = document.getElementById('authError');
    if (!form || !input) return;

    input.focus();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value === SITE_PASSWORD) {
        sessionStorage.setItem(STORAGE_KEY, 'yes');
        unlock();
      } else {
        errorEl.textContent = '비밀번호가 올바르지 않습니다.';
        input.value = '';
        input.focus();
      }
    });
  });
})();
