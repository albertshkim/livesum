// ------------------------------------------------------------
// 공용 비밀번호 게이트
// index.html / board.html / admin.html 세 화면 모두 이 스크립트로 보호됩니다.
//
// 실제 비밀번호 값은 이 파일이 아니라 auth-config.js 의 SITE_PASSWORD
// 전역 변수에서 가져옵니다. 이 파일(auth.js)은 로직만 담고 있어서
// 깃허브에 공개해도 안전하고, auth-config.js만 git에 올리지 않으면 됩니다.
// 자세한 설정 방법은 README.md 를 참고하세요.
//
// 주의: 브라우저 코드에 값이 로드되는 방식 자체는 그대로라, 배포된
// 사이트에서는 개발자도구로 확인 가능합니다. "완전한 보안"이 아니라
// 아무나 못 들어오게 막는 가벼운 문, + 저장소 공유 시 값이 안 보이게
// 하는 용도입니다.
// ------------------------------------------------------------
(function () {
  const STORAGE_KEY = 'anonBoardAuthed';

  function unlock() {
    const gate = document.getElementById('authGate');
    if (gate) gate.remove();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof SITE_PASSWORD === 'undefined') {
      const errorEl = document.getElementById('authError');
      if (errorEl) {
        errorEl.textContent = 'auth-config.js가 없습니다. README.md를 참고해 설정해주세요.';
      }
      return;
    }

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
