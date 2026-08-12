// ------------------------------------------------------------
// 프로젝트(세션) 네임스페이스
//
// URL의 ?project=이름 파라미터로 어느 프로젝트의 데이터를 쓸지 결정합니다.
// 예) admin.html?project=project2  →  projects/project2/... 아래 데이터를 사용
// 파라미터가 없으면 기존 데이터와의 호환을 위해 'project1'을 기본값으로 씁니다.
//
// 사용법: db.ref(projectPath('questions/1/text'))
// ------------------------------------------------------------
(function (global) {
  const params = new URLSearchParams(window.location.search);
  let projectId = (params.get('project') || 'project1').trim();

  // Firebase 경로로 안전하게 쓰기 위해 영문/숫자/하이픈/언더스코어만 허용
  projectId = projectId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!projectId) projectId = 'project1';

  function projectPath(subPath) {
    return 'projects/' + projectId + (subPath ? '/' + subPath : '');
  }

  // 같은 프로젝트를 유지한 채 다른 페이지(index/board/admin)로 이동할 때 쓰는 헬퍼
  function projectUrl(page) {
    return page + '?project=' + encodeURIComponent(projectId);
  }

  global.PROJECT_ID = projectId;
  global.projectPath = projectPath;
  global.projectUrl = projectUrl;

  document.addEventListener('DOMContentLoaded', function () {
    // 현재 프로젝트 이름을 상단바에 표시
    const tag = document.getElementById('projectTag');
    if (tag) tag.textContent = projectId;

    // 다른 화면으로 이동하는 링크도 지금 프로젝트를 유지하도록 href를 다시 계산
    document.querySelectorAll('a[data-project-link]').forEach(function (a) {
      a.href = projectUrl(a.getAttribute('data-project-link'));
    });

    // admin.html에만 있는 "프로젝트 전환" 입력창/버튼
    const input = document.getElementById('projectSwitchInput');
    const btn = document.getElementById('projectSwitchBtn');
    if (input && btn) {
      input.placeholder = '현재: ' + projectId + ' (예: project2)';
      const go = function () {
        const target = input.value.trim();
        if (!target) return;
        window.location.href = 'admin.html?project=' + encodeURIComponent(target);
      };
      btn.addEventListener('click', go);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') go();
      });
    }
  });
})(window);
