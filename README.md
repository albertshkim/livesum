# 익명 답변 보드 (Anon Board)

주관식 질문 하나에 대해 무기명으로 답변을 받고, 그 답변들을 실시간으로 보여주는
아주 단순한 정적 웹 페이지 세트입니다. GitHub Pages에 그대로 올려서 쓸 수 있습니다.

## 구성 파일

| 파일 | 역할 |
|---|---|
| `index.html` / `ask.js` | 참가자가 질문을 보고 답변을 제출하는 화면 |
| `board.html` / `board.js` | 답변이 들어오는 즉시 표시되는 실시간 집계 보드 (발표 화면 등에 띄워두는 용도) |
| `admin.html` / `admin.js` | 질문 등록/변경, 답변 전체 초기화 (간단한 암호로만 보호) |
| `firebase-config.js` | 본인의 Firebase 프로젝트 키를 채워 넣는 설정 파일 |
| `style.css` | 공용 디자인 |

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

## 2. 이 프로젝트에 설정 붙여넣기

`firebase-config.js` 파일을 열어 복사한 값으로 교체하세요:

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

const ADMIN_PASSCODE = "원하는-암호로-변경";
```

## 3. 데이터베이스 보안 규칙 설정 (중요)

Firebase 콘솔 → Realtime Database → **규칙** 탭에서 아래처럼 설정하세요.
누구나 답변을 "추가"는 할 수 있지만, 기존 답변을 수정/삭제하지는 못하게 막는 규칙입니다.

```json
{
  "rules": {
    "session": {
      "question": {
        ".read": true,
        ".write": true
      },
      "answers": {
        ".read": true,
        ".write": true,
        "$answerId": {
          ".write": "!data.exists()"
        }
      }
    }
  }
}
```

> 참고: `admin.html`의 암호는 브라우저 코드에 그대로 노출되므로 완전한 보안 장치는
> 아닙니다. 사내 워크숍/수업처럼 캐주얼한 용도에 적합하고, 정말 민감한 용도라면
> Firebase Authentication을 추가로 붙이는 것을 권장합니다.

## 4. GitHub Pages로 배포하기

1. 이 폴더 전체를 GitHub 저장소에 push
2. 저장소 **Settings → Pages** 이동
3. Source를 **Deploy from a branch**로 설정, 브랜치는 `main` (또는 사용 중인 브랜치), 폴더는 `/ (root)`
4. 몇 분 후 `https://<사용자명>.github.io/<저장소명>/` 로 접속 가능

## 5. 사용 방법

1. `admin.html` 접속 → 암호 입력 → 질문 등록
2. 참가자들에게 `index.html` 링크(또는 QR코드) 공유
3. 발표 화면 등 큰 스크린에는 `board.html`을 띄워두면 답변이 실시간으로 쌓입니다
4. 세션이 끝나면 `admin.html`에서 "모든 답변 초기화"로 다음 세션 준비

## 커스터마이징 팁

- 답변 최대 글자수: `index.html`의 `maxlength="500"` 값을 변경
- 카드 디자인/색상: `style.css` 상단의 `:root` 변수만 바꿔도 전체 톤이 바뀝니다
- 답변 목록을 JSON으로 내보내고 싶다면 Firebase 콘솔 → Realtime Database →
  우측 상단 점 3개(⋮) → **JSON 내보내기**로 언제든 다운로드할 수 있습니다
