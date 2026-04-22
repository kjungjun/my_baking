# 🍰 베이킹 홈페이지

동영상 / 레시피 / 베이킹도구를 주제별로 올리고, 방문자가 각 항목마다 댓글을 남길 수 있는 정적 홈페이지입니다.

- **프론트엔드**: 순수 HTML / CSS / JavaScript (프레임워크 없음)
- **데이터베이스 & 로그인**: Firebase (Firestore + Auth)
- **배포**: Vercel (GitHub 연동)

## 📁 파일 구조

```
.
├── index.html         # 🎬 동영상 페이지
├── recipes.html       # 📖 레시피 페이지
├── tools.html         # 🍴 베이킹도구 페이지
├── admin.html         # 관리자 페이지 (3개 탭)
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js  # Firebase 설정
│   ├── common.js           # 공통 유틸 + 댓글 위젯
│   ├── videos.js           # 동영상 페이지
│   ├── recipes.js          # 레시피 페이지
│   ├── tools.js            # 베이킹도구 페이지
│   └── admin.js            # 관리자 페이지
├── vercel.json
├── .gitignore
└── README.md
```

## 🗄️ Firestore 데이터 구조

```
videos/{id}
  title, url, videoId, createdAt
  └─ comments/{id}     (서브컬렉션)
       name, content, createdAt

recipes/{id}
  title, videoUrl, videoId, content, createdAt
  └─ comments/{id}

tools/{id}
  title, videoUrl, videoId, content, createdAt
  └─ comments/{id}
```

---

## 🔐 Firestore 보안 규칙

Firestore → **규칙** 탭에 아래 내용을 붙여넣고 **게시** 하세요.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isValidComment() {
      return request.resource.data.name is string
        && request.resource.data.name.size() > 0
        && request.resource.data.name.size() <= 20
        && request.resource.data.content is string
        && request.resource.data.content.size() > 0
        && request.resource.data.content.size() <= 500;
    }

    // 동영상
    match /videos/{id} {
      allow read: if true;
      allow write: if request.auth != null;
      match /comments/{cid} {
        allow read: if true;
        allow create: if isValidComment();
        allow update, delete: if request.auth != null;
      }
    }

    // 레시피
    match /recipes/{id} {
      allow read: if true;
      allow write: if request.auth != null;
      match /comments/{cid} {
        allow read: if true;
        allow create: if isValidComment();
        allow update, delete: if request.auth != null;
      }
    }

    // 베이킹도구
    match /tools/{id} {
      allow read: if true;
      allow write: if request.auth != null;
      match /comments/{cid} {
        allow read: if true;
        allow create: if isValidComment();
        allow update, delete: if request.auth != null;
      }
    }
  }
}
```

---

## 🚀 빠른 시작

1. Firebase 프로젝트 만들기 → 웹 앱 등록 → `firebaseConfig` 값을 `js/firebase-config.js` 에 붙여넣기
2. Firestore Database 만들기 (서울 리전 추천) → 위 **보안 규칙** 붙여넣고 게시
3. Authentication → 이메일/비밀번호 사용 설정 → 관리자 사용자 추가
4. 로컬에서 테스트 (`python -m http.server 3000` 또는 VSCode Live Server)
5. GitHub에 푸시 → Vercel 에 연결 → 배포
6. Vercel 도메인을 Firebase Auth 승인 도메인에 추가

---

## 🧪 사용법

### 일반 방문자
- `/` (동영상) / `/recipes.html` / `/tools.html` 각 페이지 탐색
- 각 항목 아래 댓글 폼에서 이름 + 내용으로 댓글 작성

### 관리자
1. `/admin.html` 접속
2. Firebase에 등록한 이메일/비밀번호로 로그인
3. 상단 탭으로 **동영상 / 레시피 / 베이킹도구** 전환
4. 각 탭에서:
   - 동영상: 제목 + YouTube URL → 등록
   - 레시피: 제목 + YouTube URL(선택) + 본문 → 등록
   - 베이킹도구: 제목 + YouTube URL(선택) + 설명 → 등록
5. 각 목록의 "삭제" 버튼으로 제거

### 지원하는 YouTube URL 형식
- `https://youtu.be/XXXX`
- `https://www.youtube.com/watch?v=XXXX`
- `https://www.youtube.com/shorts/XXXX`
- `https://www.youtube.com/embed/XXXX`

---

## 🔧 커스터마이즈

| 뭘 바꾸고 싶다 | 어디서 |
|---|---|
| 사이트 이름 | 각 `.html`의 `<h1 class="site-title">`, `<title>` |
| 탭 이름/순서 | 각 `.html`의 `<nav class="tabs">` 영역 |
| 주요 색상 (주황 `#c96a4a`) | `css/style.css` 일괄 변경 |
| 댓글 글자수 제한 | `js/common.js` + Firestore 규칙 양쪽 |
| 정렬 순서 | 각 페이지 JS의 `.orderBy("createdAt", "desc")` |

---

## ❓ 문제 해결

**댓글이나 항목 작성 시 `PERMISSION_DENIED`**
→ Firestore 규칙이 반영되지 않았거나, 관리자 작업인데 로그인 안 된 상태.
  규칙 탭에서 "게시" 버튼 눌렀는지 확인.

**관리자로 삭제했는데 댓글은 삭제 안 됨**
→ Firestore는 상위 문서를 지워도 **서브컬렉션(댓글)은 자동 삭제되지 않습니다.**
  댓글 데이터가 계속 DB에 남지만 화면에는 안 뜨니 실사용에는 문제 없습니다.
  완전히 정리하려면 Firebase 콘솔에서 직접 삭제하거나 Cloud Functions 필요.

**배포된 사이트에서 로그인 실패 `auth/unauthorized-domain`**
→ Firebase Auth → Settings → "승인된 도메인"에 Vercel 도메인 추가.

**화면이 하얀색 + 콘솔에 `firebase is not defined`**
→ `js/firebase-config.js` 값이 비었거나 스크립트 순서 문제.
  순서: `firebase-app-compat.js` → `firebase-firestore-compat.js` → `firebase-config.js` → `common.js` → 페이지별 JS
