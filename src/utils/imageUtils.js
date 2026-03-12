/**
 * @file imageUtils.js
 * @description 이미지 URL 처리와 기본 이미지 플레이스홀더를 제공하는 유틸리티 모듈.
 *
 * [제공하는 것]
 *   1. DEFAULT_AVATAR:     사용자 프로필 이미지가 없을 때 사용할 기본 아바타 (SVG data URI)
 *   2. DEFAULT_POST_IMAGE: 게시글 이미지가 없거나 로드 실패 시 사용할 플레이스홀더 (SVG data URI)
 *   3. getImageUrl(url):   백엔드에서 받은 이미지 경로를 브라우저에서 사용 가능한 절대 URL로 변환
 *
 * [SVG data URI 방식의 장점]
 *   - 외부 서버 요청 없이 브라우저 메모리에서 바로 렌더링 (네트워크 요청 0건)
 *   - 항상 동일한 이미지 보장 (CDN 장애, 404 오류 없음)
 *   - encodeURIComponent()로 SVG 문자열을 URI 안전한 형식으로 인코딩
 */

/**
 * DEFAULT_AVATAR: 프로필 이미지가 없을 때 표시할 기본 아바타 SVG.
 *
 * SVG 구성:
 *   - 100×100 뷰박스
 *   - 배경: 100×100 연한 회색 사각형 (fill="#e5e5e5")
 *   - 머리: cx=50 cy=37 r=19 원 (fill="#a3b0c1", 회청색)
 *   - 몸통: cx=50 cy=84 타원 (rx=30 ry=20, fill="#a3b0c1")
 *           화면 하단에 반쯤 잘린 어깨/몸통 실루엣 표현
 *
 * 사용 위치:
 *   - ProfilePage: user.profileImageUrl이 없거나 이미지 로드 실패 시
 *   - 기타 사용자 프로필 이미지가 필요한 곳에서 img.onError 폴백으로 사용
 *
 * 형식: "data:image/svg+xml,{URI인코딩된 SVG}" 문자열
 *   → <img src={DEFAULT_AVATAR} /> 형태로 직접 사용 가능
 */
// 프로필 이미지가 없을 때 표시할 기본 아바타 (회색 사람 모양 SVG)
export const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e5e5e5"/><circle cx="50" cy="37" r="19" fill="#a3b0c1"/><ellipse cx="50" cy="84" rx="30" ry="20" fill="#a3b0c1"/></svg>'
)}`;

/**
 * DEFAULT_POST_IMAGE: 게시글 이미지가 없거나 로드 실패 시 표시할 플레이스홀더 SVG.
 *
 * SVG 구성 (300×400 뷰박스, portrait 비율):
 *   - 배경: 300×400 연한 회색 사각형 (fill="#f3f3f3")
 *   - 이미지 프레임: x=110 y=160 w=80 h=60 둥근 사각형 (rx=4, fill="#ccd3db")
 *   - 태양/원: cx=130 cy=175 r=7 (fill="#e5e5e5", 프레임 내 밝은 원)
 *   - 산 모양 폴리곤: (fill="#dde2e8", 풍경 이미지 느낌)
 *                     좌표: 110,220 → 150,185 → 180,205 → 200,190 → 200,220
 *
 * 사용 위치:
 *   - ProfilePage: post.imageUrl이 없거나 이미지 로드 실패 시 (onError 폴백)
 *   - SnapCard:    snap.imageUrl이 없거나 로드 실패 시 (onError 폴백)
 *   - getImageUrl() 반환값이 null일 때 || DEFAULT_POST_IMAGE 폴백으로 사용
 *
 * 형식: "data:image/svg+xml,{URI인코딩된 SVG}" 문자열
 */
// 게시글 이미지가 없거나 로드 실패 시 표시할 회색 플레이스홀더
export const DEFAULT_POST_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#f3f3f3"/><rect x="110" y="160" width="80" height="60" rx="4" fill="#ccd3db"/><circle cx="130" cy="175" r="7" fill="#e5e5e5"/><polygon points="110,220 150,185 180,205 200,190 200,220" fill="#dde2e8"/></svg>'
)}`;

/**
 * getImageUrl: 백엔드에서 받은 이미지 경로를 브라우저에서 사용 가능한 URL로 정규화.
 *
 * @param {string|null|undefined} url - 정규화할 이미지 경로
 * @returns {string|null} 정규화된 URL, 또는 url이 falsy이면 null
 *
 * [변환 규칙]
 *   1. url이 null, undefined, 빈 문자열 등 falsy → null 반환
 *      호출부에서 || DEFAULT_POST_IMAGE 또는 || DEFAULT_AVATAR 폴백 처리 가능
 *
 *   2. 'http://' 또는 'https://'로 시작하는 경우 → 그대로 반환
 *      예: 'https://example.com/uploads/img.jpg' → 변경 없음
 *
 *   3. '/'로 시작하는 경우 → 그대로 반환 (이미 절대 경로)
 *      예: '/uploads/profile/img.jpg' → 변경 없음
 *
 *   4. 'data:'로 시작하는 경우 → 그대로 반환 (data URI, DEFAULT_AVATAR 등)
 *      예: 'data:image/svg+xml,...' → 변경 없음
 *
 *   5. 그 외 상대 경로 → '/' 를 앞에 붙여 절대 경로로 변환
 *      예: 'uploads/posts/img.jpg' → '/uploads/posts/img.jpg'
 *      이렇게 하면 Vite 개발 서버의 프록시 설정이 '/uploads' 경로를 백엔드로 포워딩할 수 있음.
 *
 * [사용 예시]
 *   getImageUrl('uploads/profile.jpg')    → '/uploads/profile.jpg'
 *   getImageUrl('/uploads/profile.jpg')   → '/uploads/profile.jpg'
 *   getImageUrl('https://cdn.com/img.jpg') → 'https://cdn.com/img.jpg'
 *   getImageUrl(null)                     → null
 *   getImageUrl(undefined)               → null
 *   getImageUrl('')                      → null
 */
/**
 * 백엔드에서 받은 이미지 경로를 절대 경로로 정규화합니다.
 * "uploads/..." → "/uploads/..." (Vite 프록시가 처리)
 * 이미 http:// 또는 /로 시작하면 그대로 반환합니다.
 */
export const getImageUrl = (url) => {
  // TODO: url이 falsy면 null 반환
  // TODO: 'http', '/', 'data:' 로 시작하면 url 그대로 반환
  // TODO: 그 외 상대경로는 '/' + url 로 절대경로 변환 후 반환
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return url;
  if (url.startsWith('data:')) return url;
  const result = '/' + url;
  console.log('[getImageUrl] 상대경로 변환:', url, '→', result);
  return result;
};
