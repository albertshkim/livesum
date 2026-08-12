# 익명 답변 보드 (Anon Board)

주관식 질문 하나에 대해 무기명으로 답변을 받고, 그 답변들을 실시간으로 보여주는
아주 단순한 정적 웹 페이지 세트입니다. GitHub Pages에 그대로 올려서 쓸 수 있습니다.

## 프로젝트1, 2 식으로 프로젝트 별로 분리 
별도로 프로젝트 별로 분리해서 관리하는 기능 (Backup001)

## 구성 파일

| 파일 | 역할 |
|---|---|
| `index.html` / `ask.js` | 참가자가 질문을 보고 답변을 제출하는 화면 |
| `board.html` / `board.js` | 답변이 들어오는 즉시 표시되는 실시간 집계 보드 (발표 화면 등에 띄워두는 용도) |
| `admin.html` / `admin.js` | 질문 등록/변경, 답변 초기화 (암호 없이 바로 사용, 링크를 아는 사람만 접근한다고 가정) |
| `project.js` | URL의 `?project=이름` 값을 읽어 어느 프로젝트의 데이터를 쓸지 결정하는 공용 스크립트 |
| `migrate.html` | 프로젝트 네임스페이스 도입 전 데이터를 `projects/project1`로 옮기는 1회용 도구 |
| `firebase-config.js` ⚠️비공개 | 본인의 Firebase 프로젝트 키가 담긴 실제 설정 파일. **git에 올리지 않습니다** |
| `firebase-config.example.js` | 위 파일의 값 없는 템플릿. 이건 git에 올려도 안전합니다 |
| `auth-config.js` ⚠️비공개 | 실제 접속 비밀번호가 담긴 파일. **git에 올리지 않습니다** |
| `auth-config.example.js` | 위 파일의 값 없는 템플릿. 이건 git에 올려도 안전합니다 |
| `auth.js` | 세 화면(질문/보드/관리자) 공통 비밀번호 게이트 로직 (값은 auth-config.js에서 읽어옴) |
| `question-format.js` | 질문 문장의 줄바꿈·들여쓰기·불릿(`*`, `-`)·볼드(`**`)를 화면에 표시할 때 쓰는 공용 서식 변환기 |
| `style.css` | 공용 디자인 |
| `.gitignore` | `firebase-config.js`, `auth-config.js`가 실수로도 커밋되지 않도록 막는 설정 |
| `.github/workflows/deploy.yml` | GitHub Secrets 값으로 두 비공개 설정 파일을 자동 생성해 GitHub Pages에 배포하는 워크플로우 |

## 여러 프로젝트(세션) 독립적으로 운영하기

이 사이트는 URL에 붙는 `?project=이름` 파라미터로 완전히 분리된 데이터 공간을
씁니다. 예를 들어:

- `admin.html?project=project1` / `index.html?project=project1` / `board.html?project=project1`
  → "project1"의 질문·답변·저장된 결과
- `admin.html?project=project2` / `index.html?project=project2` / `board.html?project=project2`
  → "project2"의 질문·답변·저장된 결과 (project1과 전혀 섞이지 않음)

파라미터를 안 붙이면 자동으로 `project1`로 취급되어, 기존에 만들어둔 링크도
그대로 작동합니다.

**새 프로젝트를 시작하려면** 코드를 고칠 필요 없이, `admin.html?project=project2`
같은 주소로 접속해서 질문을 새로 등록하면 됩니다. 관리자 화면 상단의
**"프로젝트 전환"** 입력창에 이름을 넣고 이동해도 됩니다. 참가자·보드 링크는
그 프로젝트 이름을 붙여서 공유하면 됩니다 (예: `index.html?project=project2`,
`board.html?project=project2`).

> 프로젝트 이름은 영문/숫자/하이픈(-)/언더스코어(_)만 허용됩니다. 한글이나
> 특수문자를 입력하면 자동으로 제거되니, `sales-2026`, `team_a` 처럼 영문으로
> 짓는 걸 추천합니다.

## 비밀값을 저장소에 올리지 않고 배포하기

`firebase-config.js`와 `auth-config.js` 두 파일에는 Firebase 키와 접속 비밀번호가
그대로 들어있습니다. 이 저장소를 공개(public)로 올려서 코드를 공유하고 싶지만
이 값들은 남들에게 보이지 않길 원하실 텐데, 이 프로젝트는 아래와 같은 구조로
그걸 해결합니다.

- 두 파일은 `.gitignore`에 등록되어 있어서, `git add .`를 해도 **자동으로 제외**됩니다.
- 대신 값이 비어있는 템플릿(`firebase-config.example.js`, `auth-config.example.js`)만
  저장소에 올라갑니다. 즉 저장소를 공개해도 실제 키·비밀번호는 보이지 않습니다.
- 실제 배포는 `.github/workflows/deploy.yml`(GitHub Actions)이 담당합니다. 저장소의
  **Secrets**(비공개 저장 공간)에 값을 등록해두면, `main` 브랜치에 푸시할 때마다
  Actions가 그 값으로 두 파일을 자동으로 만들어서 GitHub Pages에 배포합니다.
  저장소 자체(소스 코드)에는 값이 없지만, 배포된 사이트는 정상 작동합니다.

> ⚠️ 참고: 이렇게 해도 **배포된 사이트 자체**는 브라우저가 값을 읽어야 동작하므로,
> 사이트에 접속해서 개발자도구(F12)로 보면 값이 보입니다. 이 구조가 막아주는 건
> "깃허브 저장소(소스 코드)를 공유했을 때 남들이 코드만 보고 내 키·비밀번호를
> 가져가는 것"이지, 배포된 사이트 자체의 완전한 보안은 아닙니다. Firebase 값은
> Firebase 자체 문서에서도 "완전한 비밀"로 취급하지 않는 값이라 큰 위험은
> 아니지만, 원치 않으실 수 있어 이렇게 분리해두었습니다.

## 접속 비밀번호

세 화면(`index.html`, `board.html`, `admin.html`) 모두 접속 시 비밀번호를 먼저
물어봅니다. **`admin.html`은 다른 두 화면과 별도의 비밀번호**를 씁니다.

- `SITE_PASSWORD` → `index.html`(참가자 화면), `board.html`(집계 보드) 공용
- `ADMIN_PASSWORD` → `admin.html`(관리자 화면) 전용

로컬에서 테스트할 땐 `auth-config.example.js`를 복사해서 `auth-config.js`로
저장하고, 그 안의 두 값을 각각 원하는 비밀번호로 바꾸면 됩니다. 실제 배포 시
사용할 값은 GitHub 저장소 Secrets에 `SITE_PASSWORD`, `ADMIN_PASSWORD`라는
이름으로 각각 등록해두세요 (아래 5번 참고). 한 번 맞으면 브라우저를 닫기
전까지(세션 동안)는 다시 묻지 않으며, 참가자 화면 비밀번호를 맞췄다고 해서
관리자 화면까지 자동으로 풀리지는 않습니다 (반대도 마찬가지).

> ⚠️ 브라우저 코드로 값이 전달되는 방식 자체는 그대로라, 배포된 사이트에서는
> 개발자도구로 우회할 수 있는 수준입니다. 아무나 못 들어오게 막는 가벼운 문
> 정도로 생각해주세요. 아주 민감한 용도라면 Firebase Authentication 등을
> 추가로 붙이는 것을 권장합니다.

## 왜 Firebase가 필요한가요?

GitHub Pages는 정적 파일만 제공하는 호스팅이라 브라우저에서 곧바로 파일에 "쓰기"를
할 수 없습니다. 그래서 답변이 들어오는 즉시(실시간) 여러 사람 화면에 반영되게 하려면
아주 가벼운 실시간 데이터베이스가 하나 필요한데, **Firebase Realtime Database**의
무료 요금제(Spark)로 충분합니다. 카드 등록이나 비용이 들지 않습니다.

## 1. Firebase 프로젝트 만들기 (5분)

1. https://console.firebase.google.com 접속 → **프로젝트 추가**
2. 프로젝트 이름 입력 후 생성 (Google 애널리틱스는 꺼도 됩니다)
3. 왼쪽 메뉴 **빌드 → Realtime Database → 데이터베이스 만들기**
   - 위치는 아무거나 선택 (한국과 가까운 리전 추천)
   - 시작 모드는 **테스트 모드**로 시작 (아래 4번에서 규칙을 다시 설정합니다)
4. 왼쪽 메뉴 **프로젝트 설정(톱니바퀴) → 일반** 로 이동
5. "내 앱" 에서 **웹 앱(</>) 추가** 클릭 → 앱 닉네임 아무거나 입력 → 등록
6. 화면에 나오는 `firebaseConfig` 객체를 통째로 복사

## 2. 이 프로젝트에 설정 붙여넣기 (로컬 테스트용)

`firebase-config.example.js` 파일을 복사해서 `firebase-config.js`라는 이름으로
저장한 뒤, 복사한 값으로 채우세요:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",   // Realtime Database 만들 때 생성된 URL
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

`firebase-config.js`는 `.gitignore`에 등록되어 있어서 커밋해도 자동으로
제외되니, 실수로 올라갈까 걱정하지 않아도 됩니다. **실제 배포용 값은 5번의
GitHub Secrets에 별도로 등록**합니다.

> ⚠️ `admin.html`은 암호 없이 누구나 질문 등록/삭제/전체 초기화를 할 수 있습니다.
> 이 파일의 링크(`.../admin.html`)는 참가자에게 공유하지 말고 진행자만 알고 있도록
> 하세요. 지속적으로 운영하는 서비스라면 Firebase Authentication 등을 추가로 붙여
> 접근을 제한하는 것을 권장합니다.

## 3. 데이터베이스 구조

모든 데이터는 `projects/{프로젝트 이름}/` 아래에 프로젝트별로 완전히
분리되어 저장됩니다.

```
projects/
  project1/
    questions/
      1/  { text: "직업은 무엇인가요?", updatedAt: ... }
      2/  { text: "연령대는 어떻게 되나요?", updatedAt: ... }

    session/
      activeQuestionNumber: 1        # 지금 참가자 화면에 표시 중인 질문 번호

    answers/
      1/
        -Nabc123/ { text: "...", ts: ... }
        -Nabc124/ { text: "...", ts: ... }
      2/
        -Nabc125/ { text: "...", ts: ... }

    savedResults/
      -Nxyz001/ {
        questionNumber: 1,
        questionText: "직업은 무엇인가요?",
        answers: ["개발자", "디자이너", ...],
        answerCount: 12,
        savedAt: ...
      }

  project2/
    questions/ ...
    session/ ...
    answers/ ...
    savedResults/ ...
```

질문마다 답변이 `projects/{프로젝트}/answers/{번호}` 아래에 별도로 영구 저장되므로,
관리자가 진행 질문을 바꿔도 이전 질문에 쌓인 답변은 그대로 남아있습니다. 나중에
같은 번호를 다시 선택하면 이전 답변이 그대로 다시 보입니다.

`savedResults`는 이것과 별개로, `board.html`에서 **"결과 저장"** 버튼을 눌렀을 때만
그 순간의 질문·답변 스냅샷이 통째로 저장되는 아카이브입니다. 예를 들어 전체 초기화를
하기 전에 결과를 기록으로 남겨두고 싶을 때 사용하면 됩니다.

## 4. 데이터베이스 보안 규칙 설정 (중요)

Firebase 콘솔 → Realtime Database → **규칙** 탭에서 아래처럼 설정하세요.
누구나 답변을 "추가"는 할 수 있지만, 기존 답변을 수정/삭제하지는 못하게 막는 규칙입니다.
`$projectId` 와일드카드 덕분에 어떤 프로젝트 이름을 쓰든 규칙을 다시 등록할
필요가 없습니다.

```json
{
  "rules": {
    "projects": {
      "$projectId": {
        "questions": {
          ".read": true,
          ".write": true
        },
        "session": {
          ".read": true,
          ".write": true
        },
        "answers": {
          ".read": true,
          ".write": true,
          "$qnum": {
            "$answerId": {
              ".write": "!data.exists()"
            }
          }
        },
        "savedResults": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

> 기존에 루트(`questions`, `session`, `answers`, `savedResults`)에 규칙을
> 두셨다면, 위 내용으로 **전체 교체**하세요. 루트 경로는 더 이상 쓰지 않습니다.


> 참고: `admin.html`에는 암호 확인이 없으므로, 이 링크를 아는 사람은 누구나
> 질문을 등록·삭제하거나 답변을 초기화할 수 있습니다. 참가자에게는 `index.html`
> 링크만 공유하고, `admin.html`은 진행자만 열어보세요.

## 4-1. (기존에 이미 쓰고 계셨다면) 데이터 마이그레이션 — 딱 한 번만

프로젝트 네임스페이스 구조가 없던 예전 버전을 이미 쓰고 계셨다면, 루트에
`questions`, `session`, `answers`, `savedResults`가 남아있을 거예요. 이번 구조로
바꾸면 사이트는 기본적으로 `projects/project1/...`를 읽으므로, 예전 데이터를
그대로 옮겨줘야 안 보이던 게 다시 보입니다.

1. 4번의 새 보안 규칙을 먼저 Publish 해두세요 (마이그레이션에도 필요합니다).
2. `migrate.html`을 배포된 사이트에서 열고 (예: `https://<사용자명>.github.io/<저장소명>/migrate.html`)
   **"마이그레이션 실행"** 버튼을 누르세요.
3. 완료 메시지가 뜨면 `admin.html?project=project1`에서 예전 질문·답변이 그대로
   보이는지 확인하세요.
4. 확인이 끝나면 `migrate.html`은 다시 쓸 일이 없으니, 저장소에서 지워도 됩니다
   (안 지워도 동작에는 문제없습니다).

이미 새로 시작하는 경우(예전 데이터가 없는 경우)라면 이 단계는 건너뛰어도 됩니다.

## 5. GitHub Pages로 배포하기 (GitHub Actions + Secrets 방식)

무료 개인 계정에서 GitHub Pages는 **공개(public) 저장소**에서만 동작합니다.
그래서 저장소 자체를 비공개로 돌리는 대신, 비밀값만 저장소 밖의 안전한
공간(Secrets)에 보관하고 배포 시점에 자동으로 끼워 넣는 방식을 씁니다.

**5-1. 저장소에 코드 올리기**

`firebase-config.js`와 `auth-config.js`(실제 값이 든 두 파일)는 `.gitignore`
덕분에 자동으로 제외됩니다. 나머지 파일을 그대로 GitHub 저장소에 push하세요.
(저장소는 public이어도 괜찮습니다 — 두 비공개 파일이 안 올라가니까요.)

**5-2. 저장소에 Secrets 등록하기**

저장소 페이지 → **Settings → Secrets and variables → Actions** →
**New repository secret** 을 눌러서 아래 9개를 하나씩 등록하세요.
(이름은 정확히 아래와 똑같이, 값은 본인의 Firebase 프로젝트 값과 원하는
비밀번호로)

| Secret 이름 | 값 |
|---|---|
| `FIREBASE_API_KEY` | firebase-config.js의 `apiKey` |
| `FIREBASE_AUTH_DOMAIN` | firebase-config.js의 `authDomain` |
| `FIREBASE_DATABASE_URL` | firebase-config.js의 `databaseURL` |
| `FIREBASE_PROJECT_ID` | firebase-config.js의 `projectId` |
| `FIREBASE_STORAGE_BUCKET` | firebase-config.js의 `storageBucket` |
| `FIREBASE_MESSAGING_SENDER_ID` | firebase-config.js의 `messagingSenderId` |
| `FIREBASE_APP_ID` | firebase-config.js의 `appId` |
| `SITE_PASSWORD` | 참가자 화면·집계 보드 접속 비밀번호 |
| `ADMIN_PASSWORD` | 관리자 화면(admin.html) 전용 비밀번호 (위와 다르게) |

**5-3. Pages 소스를 GitHub Actions로 설정**

저장소 **Settings → Pages** 이동 → **Source**를 **GitHub Actions**로 선택합니다.
(기존처럼 "Deploy from a branch"가 아닙니다 — 이 부분이 이전 안내와 달라진 점입니다.)

**5-4. 배포 확인**

`main` 브랜치에 커밋을 push하면 저장소 상단 **Actions** 탭에서 워크플로우가
자동 실행됩니다. 초록색 체크가 뜨면 배포 완료이고, `https://<사용자명>.github.io/<저장소명>/`
로 접속하면 정상 작동하는 사이트를 볼 수 있습니다.

설정을 바꾸고 싶을 때(예: 비밀번호 변경)도 코드를 고칠 필요 없이, Secrets
값만 바꾸고 **Actions 탭 → 워크플로우 → Run workflow**로 재배포하면 됩니다.

## 6. 사용 방법

1. `admin.html` 접속 (암호 없이 바로 사용 가능). 여러 프로젝트를 운영한다면
   `admin.html?project=project2`처럼 이름을 붙여 접속하세요 (자세한 내용은
   위 "여러 프로젝트 독립적으로 운영하기" 참고).
2. **질문 일괄 등록** 칸에 아래처럼 번호를 붙여 여러 질문을 한 번에 붙여넣고 "일괄 등록" 클릭
   ```
   1. 직업은 무엇인가요?
   2. 연령대는 어떻게 되나요?
   3. 오늘 세션에서 가장 기억에 남는 점은?
   ```
   같은 번호로 다시 등록하면 그 질문의 내용만 새 내용으로 교체됩니다.

   다음 번호가 나오기 전까지 줄바꿈해서 이어 쓰면 **줄바꿈·들여쓰기가 그대로 유지**되고,
   `* ` 또는 `- `로 시작하는 줄은 **불릿 목록**으로, `**텍스트**`로 감싼 부분은
   **볼드**로 표시됩니다. 예를 들어:
   ```
   5. **중요**: 최근 회사 생활을 돌아보며 느낀 점을 자유롭게 적어주세요.
     * **회사 생활**이나 커리어 성장에 대한 생각
     * 현재 업무를 하면서 느끼는 보람이나 고민
   6. 다음 질문...
   ```
   이렇게 등록하면 5번 질문은 참가자 화면·집계 보드에서 첫 줄은 문장으로(일부 볼드 포함),
   그 아래 두 줄은 불릿 점(•)이 붙은 목록으로 표시됩니다. (완전한 마크다운
   문법은 아니고, 줄바꿈·들여쓰기·`*`/`-` 불릿·`**볼드**`만 지원하는 가벼운 서식입니다.)
3. 등록된 질문 목록에서 지금 진행할 질문의 **"이 질문 사용"**을 클릭하면
   참가자 화면(`index.html`)과 집계 보드(`board.html`)에 즉시 반영됩니다.
4. 참가자들에게 `index.html` 링크(또는 QR코드) 공유
5. 발표 화면 등 큰 스크린에는 `board.html`을 띄워두면 답변이 실시간으로 쌓입니다.
   답변은 질문 번호별로 영구 저장되므로, 질문을 바꿨다가 다시 그 번호로 돌아오면
   이전 답변이 그대로 다시 보입니다.
6. `board.html` 상단의 **"워드클라우드" / "카드형"** 버튼으로 보기 방식을 바꿀 수
   있습니다. 워드클라우드는 답변에 자주 등장하는 단어일수록 크게 표시되며,
   새 답변이 들어올 때마다 자동으로 다시 그려집니다.
   (공백 기준으로 단어를 나누는 간단한 방식이라, 조사가 붙은 한국어 단어는
   완벽히 분리되지 않을 수 있습니다.)
   워드클라우드 바로 아래에는 **명사 기준 단어 빈도 (상위 15개)** 표가 함께
   표시됩니다. 완전한 형태소 분석기 대신 흔한 조사(은/는/이/가/을/를 등)를
   단어 끝에서 제거하는 간단한 규칙으로 명사를 추정하는 방식이라, 100% 정확한
   품사 분석은 아니지만 대략적인 핵심 키워드 파악에는 유용합니다.
7. 명사 빈도표에서 **단어를 클릭**하면 그 아래 "원문 보기" 영역에 해당 단어가
   포함된 답변 원문이 나타납니다. 여러 단어를 동시에 클릭하면 그 중
   **하나라도 포함된** 답변이 모두 표시됩니다 (OR 조건). "선택 초기화"로
   선택을 지우거나, "모든 원문 보기"로 필터 없이 전체 답변을 볼 수 있습니다.
8. `board.html` 우측 상단의 **"결과 저장"** 버튼을 누르면 지금 시점의 질문과
   모든 답변이 하나의 기록으로 저장됩니다. 저장된 기록은 그 아래
   **"저장된 결과 목록"**에 최신순으로 쌓이며, 각 항목마다 ▶(재생), 📋(클립보드 복사),
   🗑️(삭제) 아이콘이 있습니다.
   - **▶ 재생**: 그 시점의 질문·답변을 지금 화면(워드클라우드, 명사 빈도표, 카드형 등)에
     그대로 불러와서 다시 살펴볼 수 있습니다. 실시간 데이터는 전혀 건드리지 않는
     "미리보기"이며, 화면 상단에 뜨는 **"실시간으로 돌아가기"** 버튼을 누르면 언제든
     원래 라이브 화면으로 복귀합니다.
   - **📋 복사**: 그 기록의 질문+답변 전체를 클립보드로 복사합니다.
   - **🗑️ 삭제**: 필요 없는 기록만 개별 삭제합니다.
7. 워드클라우드 등 외부 도구에 붙여넣고 싶다면 `board.html`의
   **"답변 전체 복사"** 버튼을 누르면 지금 화면에 보이는 답변 전체가
   줄바꿈으로 구분되어 클립보드에 복사됩니다.
8. 특정 질문의 답변만 지우고 싶다면 `admin.html` 맨 아래
   **"현재 질문의 답변 초기화"**를 사용하세요. (다른 질문의 답변은 영향받지 않습니다)
9. `admin.html`의 **"질문 글자 크기"** 슬라이더로 참가자 화면과 집계 보드에 표시되는
   질문 문장의 크기를 실시간으로 조절할 수 있습니다. 프리셋 버튼(작게/보통/크게/아주 크게)을
   눌러도 되고, 슬라이더를 직접 움직여도 됩니다.

## 커스터마이징 팁

- 답변 최대 글자수: `index.html`의 `maxlength="500"` 값을 변경
- 카드 디자인/색상: `style.css` 상단의 `:root` 변수만 바꿔도 전체 톤이 바뀝니다
- 질문·답변 전체를 JSON으로 내보내고 싶다면 Firebase 콘솔 → Realtime Database →
  우측 상단 점 3개(⋮) → **JSON 내보내기**로 언제든 다운로드할 수 있습니다
