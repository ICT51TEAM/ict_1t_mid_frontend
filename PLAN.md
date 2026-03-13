# Musinsa ↔ Backend 100% 연결 플랜

## 현황 분석

### 백엔드 실제 구현 API
| 기능 | 엔드포인트 |
|------|-----------|
| 인증 | `/api/auth/*` |
| 유저 | `/api/users/*` |
| 달개(배지) | `/api/badges/*` |
| 친구 | `/api/friends/*` |
| 알림 | `/api/notifications/*` |
| FSS | `/api/fss/*` |
| **앨범(스냅) 피드** | `GET /api/albums/feed` |
| **앨범 생성** | `POST /api/albums` (JSON) |
| **앨범 상세** | `GET /api/albums/{albumId}` |
| **사진 업로드** | `POST /api/photos/upload` (multipart) |
| **QnA** | `/api/qna/*` |
| (스텁, 미구현) | `POST /api/posts` — 비어있음 |

### 문제점 요약
| 파일 | 문제 |
|------|------|
| `api/apiClient.js` | 환경 감지 없이 localhost 하드코딩, 401 처리 미흡 |
| `api/snapService.js` | `GET /posts` (빈 스텁) 호출 → `GET /albums/feed` 로 변경 필요 |
| `api/postService.js` | `GET/PUT/DELETE /posts/*` (빈 스텁) 호출 → albums 엔드포인트로 변경 |
| `api/badgeService.js` | `giveBadge()` 메서드 없음 (SnapDetailPage에서 호출) |
| `pages/write/CreatePhotoAlbumPage.jsx` | `postService.createPost(FormData)` 단일 호출 → 2단계 흐름으로 변경 |
| `pages/settings/QnaPage.jsx` | 하드코딩 더미 데이터, 백엔드 미연결 |
| `albumService.js` | 파일 없음 (생성 필요) |
| `photoService.js` | 파일 없음 (생성 필요) |
| `qnaService.js` | 파일 없음 (생성 필요) |

---

## 수정 계획 (순서대로 실행)

### STEP 1: `api/apiClient.js` 개선
- 환경 감지 함수 추가 (localhost:5173 → localhost:8080/api, Android → 10.0.2.2:8080/api)
- `withCredentials: true` 추가
- 401 처리: 토큰 제거 + 로그인 페이지 리다이렉트

### STEP 2: `api/albumService.js` 신규 생성
- `createAlbum(payload)` → `POST /api/albums` (JSON body: CreateAlbumRequest)
- `getAlbumDetail(albumId)` → `GET /api/albums/{albumId}`
- (frontend/src/api/albumService.js와 동일한 구조)

### STEP 3: `api/photoService.js` 신규 생성
- `uploadPhotos({ files, userId })` → `POST /api/photos/upload` (multipart)
- (frontend/src/api/photoService.js와 동일한 구조)

### STEP 4: `api/qnaService.js` 신규 생성
- `getQnas(page, pageSize)` → `GET /api/qna?page=...&size=...&sort=createdAt,desc`
- `createQna(data)` → `POST /api/qna`
- `updateQna(id, data)` → `PUT /api/qna/{id}`
- `deleteQna(id)` → `DELETE /api/qna/{id}`
- (frontend/src/api/qnaService.js와 동일한 구조)

### STEP 5: `api/snapService.js` 엔드포인트 변경
- `fetchSnaps` → `GET /api/albums/feed` (type=photo, friendsOnly, tag)
- `fetchSnapDetail(id)` → `GET /api/albums/{id}`
- 응답 매핑: AlbumFeedItemResponse 구조에 맞게 조정

### STEP 6: `api/postService.js` 엔드포인트 변경
- `getPost(id)` → `GET /api/albums/{id}` (albumService.getAlbumDetail 내부 사용)
- `toggleLike(id)` 추가 (백엔드 미구현이므로 graceful no-op)
- `deletePost(id)` — 백엔드 미구현이므로 미지원 알림 처리

### STEP 7: `api/badgeService.js` 메서드 추가
- `giveBadge(albumId, emoji)` 추가 — 백엔드 미구현, graceful no-op + 안내 메시지

### STEP 8: `pages/write/CreatePhotoAlbumPage.jsx` 핵심 수정
**2단계 흐름으로 변경 (frontend/src/pages/write/CreatePhotoAlbumPage.jsx 참고)**
1. `photoService.uploadPhotos({ files, userId })` → photoIds 획득
2. `albumService.createAlbum({ userId, title, bodyText: content, recordDate, visibility: VISIBILITY_MAP[visibility], layoutType, photoIds, slotIndexes, tags })` → albumId 획득
3. 성공 시 `/snap/${albumId}` 로 navigate

레이아웃 apiValue 매핑:
- layout 1 → `'single'`
- layout 2 → `'horizontal-two'`
- layout 3 → `'vertical-two'`
- layout 4 → `'grid'`

visibility 매핑:
- `'private'` → `'PRIVATE'`
- `'friends'` → `'FRIENDS'`
- `'public'` → `'PUBLIC'`

### STEP 9: `pages/settings/QnaPage.jsx` 백엔드 연결
- `useEffect`로 초기 QnA 목록 로드: `qnaService.getQnas(page)`
- 글 작성: `qnaService.createQna({ title, content })` → 목록 갱신
- 글 삭제 (선택): `qnaService.deleteQna(id)`
- 로딩/에러 상태 처리

---

## 변경 파일 목록

| # | 파일 | 작업 |
|---|------|------|
| 1 | `src/api/apiClient.js` | 수정 |
| 2 | `src/api/albumService.js` | 신규 생성 |
| 3 | `src/api/photoService.js` | 신규 생성 |
| 4 | `src/api/qnaService.js` | 신규 생성 |
| 5 | `src/api/snapService.js` | 수정 |
| 6 | `src/api/postService.js` | 수정 |
| 7 | `src/api/badgeService.js` | 수정 (giveBadge 추가) |
| 8 | `src/pages/write/CreatePhotoAlbumPage.jsx` | 수정 |
| 9 | `src/pages/settings/QnaPage.jsx` | 수정 |

---

## 변경하지 않는 파일
- `authService.js`, `friendService.js`, `fssService.js`, `notificationService.js`, `userService.js` — 이미 올바른 엔드포인트 사용 중
- `TodayPage.jsx`, `FollowingPage.jsx` — 백엔드 연결 불필요한 UI 전용 페이지
- `EditPostPage.jsx` — 백엔드에 앨범 수정(PUT) 엔드포인트가 없어 현재 그대로 유지
