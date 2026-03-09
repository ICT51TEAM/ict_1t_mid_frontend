/**
 * @file snapService.js
 * @description 메인 피드의 스냅(앨범) 목록 조회 및 상세 조회 API를 담당하는 서비스 파일
 *
 * ─────────────────────────────────────────────────────────
 * 이 파일의 역할:
 *   postService.js와 다르게, 이 파일은 React Query의 useInfiniteQuery와
 *   함께 사용하기 위해 설계된 독립 함수 형태로 API를 제공한다.
 *   무한 스크롤(infinite scroll) 피드를 위한 클라이언트 사이드 페이징 로직이
 *   내장되어 있다.
 *
 * ─────────────────────────────────────────────────────────
 * [postService.js와의 차이점]
 *   postService.js:
 *     - 객체(export const postService = {...}) 형태로 export
 *     - 서버 사이드 페이징 파라미터를 그대로 전달
 *     - 여러 페이지를 위한 특별한 처리 없음
 *
 *   snapService.js (이 파일):
 *     - 독립 함수(export const fetchSnaps = ...) 형태로 export
 *     - React Query의 useInfiniteQuery가 pageParam을 전달하는 방식에 맞춤
 *     - 백엔드가 전체 목록 배열을 반환하면 클라이언트에서 페이지 단위로 잘라서 반환
 *     - hasNextPage 필드를 계산하여 무한 스크롤 종료 조건 제공
 *
 * ─────────────────────────────────────────────────────────
 * [호출되는 백엔드 엔드포인트]
 *   GET /api/albums/feed                         → 피드 목록 (배열 반환)
 *     쿼리 파라미터:
 *       type        : 'photo'              (항상 'photo'로 고정)
 *       friendsOnly : boolean              (filter === 'following' 이면 true)
 *       tag         : string | undefined   (빈 문자열이면 undefined로 설정하여 파라미터 생략)
 *
 *   GET /api/albums/{albumId}                    → 앨범 상세 조회
 *
 * ─────────────────────────────────────────────────────────
 * [피드 목록 응답 데이터 형태]
 *   백엔드 응답 (List<AlbumFeedItemResponse>):
 *   [
 *     {
 *       albumId         : number,   // 앨범 ID
 *       userId          : number,   // 작성자 ID
 *       username        : string,   // 작성자 이름
 *       profileImageUrl : string,   // 작성자 프로필 이미지 URL
 *       title           : string,   // 앨범 제목
 *       thumbUrl        : string,   // 대표 썸네일 이미지 URL
 *       recordDate      : string,   // 기록 날짜 (YYYY-MM-DD)
 *       tags            : string[], // 해시태그 목록
 *       badgeCount      : number,   // 받은 달개 수
 *       createdAt       : string    // 생성 시각 (ISO 8601)
 *     },
 *     ...
 *   ]
 *
 * ─────────────────────────────────────────────────────────
 * [클라이언트 사이드 페이징 로직 상세]
 *   백엔드가 서버 페이징 없이 전체 배열을 반환하므로
 *   프론트엔드에서 무한 스크롤을 위해 직접 페이징을 수행한다.
 *
 *   pageSize = 20 (한 번에 보여줄 스냅 수)
 *
 *   1페이지 (pageParam=1): items.slice(0,  20) → 0~19번째 아이템
 *   2페이지 (pageParam=2): items.slice(20, 40) → 20~39번째 아이템
 *   ...
 *
 *   hasNextPage 계산:
 *     start + pageSize < items.length
 *     → 현재 페이지 시작 인덱스 + 페이지 크기가 전체 길이보다 작으면 다음 페이지 존재
 *     예: 전체 45개, 1페이지: 0+20=20 < 45 → true (다음 페이지 있음)
 *         2페이지: 20+20=40 < 45 → true (다음 페이지 있음)
 *         3페이지: 40+20=60 < 45 → false (마지막 페이지)
 *
 * ─────────────────────────────────────────────────────────
 * [앨범 상세 응답 데이터 형태]
 *   백엔드 AlbumDetailResponse:
 *   {
 *     albumId     : number,
 *     userId      : number,
 *     username    : string,
 *     title       : string,
 *     bodyText    : string,
 *     recordDate  : string,
 *     layoutType  : string,
 *     photos      : [{ photoId, photoUrl, thumbUrl, slotIndex }],
 *     tags        : string[],
 *     createdAt   : string
 *   }
 *
 * ─────────────────────────────────────────────────────────
 * [에러 처리]
 *   fetchSnaps(): try-catch로 에러 시 { data: [], nextPage: undefined, hasNextPage: false } 반환
 *                 → React Query의 무한 스크롤이 조용히 종료됨
 *   fetchSnapDetail(): try-catch 없이 에러를 호출부로 전파
 *                      → React Query가 에러 상태(isError)로 처리
 *
 * ─────────────────────────────────────────────────────────
 * [관련 파일]
 *   - src/api/apiClient.js           : axios 인스턴스
 *   - src/pages/feed/FeedPage.jsx    : useInfiniteQuery + fetchSnaps() 사용
 *   - src/pages/feed/PostDetailPage.jsx: fetchSnapDetail() 사용
 */
import apiClient from './apiClient';

/**
 * fetchSnaps - 무한 스크롤 피드를 위한 스냅 목록 조회 함수
 *
 * React Query의 useInfiniteQuery와 함께 사용하도록 설계되었다.
 * useInfiniteQuery는 getNextPageParam 함수가 반환한 값을
 * 다음 호출의 pageParam으로 전달한다.
 *
 * React Query 사용 예시:
 *   useInfiniteQuery({
 *     queryKey: ['snaps', filter, tag],
 *     queryFn: ({ pageParam = 1 }) => fetchSnaps({ pageParam, filter, tag }),
 *     getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined
 *   })
 *
 * @param {Object}        param             - 파라미터 구조 분해 객체
 * @param {number}        param.pageParam   - 현재 페이지 번호 (1부터 시작, 기본값: 1)
 *                                            React Query가 이전 응답의 nextPage 값을 전달
 * @param {string}        param.filter      - 피드 필터 모드
 *                                            'all'       : 전체 공개 앨범 조회
 *                                            'following' : 친구(팔로잉) 앨범만 조회
 * @param {string}        param.tag         - 해시태그 필터 (선택)
 *                                            빈 문자열('')이면 파라미터를 생략하여 모든 태그 조회
 *
 * @returns {Promise<Object>} React Query 무한 스크롤 규격의 응답 객체
 *   {
 *     data        : Array,            // 현재 페이지의 스냅 아이템 배열 (최대 pageSize개)
 *                                     // [{ albumId, userId, username, thumbUrl, title, ... }]
 *     nextPage    : number,           // 다음 페이지 번호 (pageParam + 1)
 *     hasNextPage : boolean           // 다음 페이지 존재 여부
 *                                     // true  → React Query가 fetchNextPage() 허용
 *                                     // false → 무한 스크롤 종료
 *   }
 *
 * 에러 시: { data: [], nextPage: undefined, hasNextPage: false } 반환
 *   → 에러 발생 시 빈 데이터와 함께 스크롤을 종료 처리
 *
 * HTTP: GET /api/albums/feed?type=photo&friendsOnly=false&tag=...
 * 인증 필요: 예
 */
/**
 * [백엔드 엔드포인트]
 * - GET /api/albums/feed?type=photo&friendsOnly=false&tag=...  → 피드 목록 (List<AlbumFeedItemResponse>)
 * - GET /api/albums/{albumId}                                  → 상세 조회 (AlbumDetailResponse)
 */
export const fetchSnaps = async ({ pageParam = 1, filter = 'all', tag = '' }) => {
    // TODO: 클라이언트 사이드 페이징을 포함한 피드 목록 조회를 구현하세요.
    // 힌트:
    
    //   try {
    //     1. GET /albums/feed 호출: type='photo', friendsOnly=(filter==='following'), tag=(tag||undefined)
    try {
        const response = await apiClient.get('/albums/feed', {
            params: {
                type: 'photo',
                // filter가 'following'이면 친구 앨범만, 그 외에는 전체 공개 조회
                friendsOnly: filter === 'following',
                // tag가 빈 문자열이면 undefined로 설정하여 쿼리 파라미터 자체를 생략
                // (undefined 값은 Axios가 쿼리 파라미터에서 자동으로 제외함)
                tag: tag || undefined,
            }
        });
    //     2. const items = response.data || []
    const items = response.data || [];
    
    //     3. pageSize = 20, start = (pageParam - 1) * pageSize
    const pageSize = 20;
    const start = (pageParam - 1) * pageSize;
    //     4. const sliced = items.slice(start, start + pageSize)
    
    const sliced = items.slice(start, start + pageSize);
    //     5. return { data: sliced, nextPage: pageParam + 1, hasNextPage: start + pageSize < items.length }
   return {
            data: sliced,
            // 다음 번 useInfiniteQuery 호출 시 pageParam으로 전달될 값
            nextPage: pageParam + 1,
            // 현재 페이지 끝 인덱스(start + pageSize)가 전체 길이보다 작으면 다음 페이지 있음
            hasNextPage: start + pageSize < items.length,
        };
    } catch (error) {
     // 피드 로드 실패 시 앱을 중단시키지 않고 빈 결과를 반환한다
     // React Query가 hasNextPage=false를 보고 무한 스크롤을 종료한다
     console.warn('스냅 피드 로드 실패:', error);
     return { data: [], nextPage: undefined, hasNextPage: false };
    }
    
};

/**
 * fetchSnapDetail - 특정 스냅(앨범) 상세 정보 조회 함수
 *
 * 피드에서 스냅을 클릭했을 때 해당 스냅의 모든 상세 정보를 가져온다.
 * 포함된 모든 사진, 레이아웃 정보, 태그, 본문 등이 반환된다.
 *
 * @param {number|string} id - 조회할 앨범의 고유 ID
 *   피드 목록(fetchSnaps)의 응답 아이템에서 albumId 필드 값을 사용
 *
 * @returns {Promise<Object>} 앨범 상세 데이터 (AlbumDetailResponse)
 *   {
 *     albumId     : number,     // 앨범 ID
 *     userId      : number,     // 작성자 ID
 *     username    : string,     // 작성자 이름
 *     title       : string,     // 앨범 제목
 *     bodyText    : string,     // 앨범 본문 설명글
 *     recordDate  : string,     // 기록 날짜 (YYYY-MM-DD)
 *     layoutType  : string,     // 레이아웃 유형
 *     photos      : [           // 사진 목록
 *       {
 *         photoId   : number,
 *         photoUrl  : string,   // 원본 이미지 URL
 *         thumbUrl  : string,   // 썸네일 URL
 *         slotIndex : number    // 레이아웃 내 위치
 *       }
 *     ],
 *     tags        : string[],   // 해시태그 목록
 *     createdAt   : string      // 생성 시각 (ISO 8601)
 *   }
 *
 * HTTP: GET /api/albums/{id}
 * 인증 필요: 예
 * 성공: 200 OK
 * 실패: 404 Not Found (앨범 없음), 403 Forbidden (비공개 앨범 접근 불가)
 *       → 에러가 호출부로 전파됨
 */
// AlbumDetailResponse: { albumId, userId, username, title, bodyText, recordDate, layoutType, photos, tags }
export const fetchSnapDetail = async (id) => {
    // TODO: GET /albums/{id} 를 호출하고 response.data를 반환하세요.
    const response = await apiClient.get(`/albums/${id}`);
    // 힌트: apiClient.get(`/albums/${id}`) → response.data
    return response.data;
};
