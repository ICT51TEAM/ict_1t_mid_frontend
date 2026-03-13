/**
 * @file postService.js
 * @description 스냅(앨범) 피드 조회, 상세 조회, 생성, 수정, 삭제 및 좋아요 API를 담당하는 서비스 파일
 *
 * ─────────────────────────────────────────────────────────
 * 이 파일의 역할:
 *   앱의 핵심 콘텐츠인 스냅(Snap, 앨범)과 관련된 CRUD 작업 및
 *   피드 조회 API를 제공한다.
 *   백엔드의 앨범(Albums) API와 매핑되며, 일부 기능(수정, 삭제, 좋아요)은
 *   백엔드가 아직 구현되지 않아 graceful 에러 처리(항상 throw)를 한다.
 *
 * ─────────────────────────────────────────────────────────
 * [호출되는 백엔드 엔드포인트 및 구현 상태]
 *   GET  /api/albums/feed           → 피드 목록 조회          [구현됨]
 *   GET  /api/albums/{id}           → 스냅 상세 조회           [구현됨]
 *   POST /api/albums                → 스냅(앨범) 생성          [구현됨, 하지만 직접 사용 시 주의]
 *   PUT  /api/albums/{id}           → 스냅 수정               [미구현 - 항상 Error throw]
 *   DELETE /api/albums/{id}         → 스냅 삭제               [미구현 - 항상 Error throw]
 *   (좋아요 토글 엔드포인트)         → 좋아요 처리              [미구현 - console.warn만 출력]
 *
 * ─────────────────────────────────────────────────────────
 * [피드 목록 조회 파라미터 (getPosts)]
 *   {
 *     type        : string,   // 콘텐츠 유형 필터 (예: 'photo')
 *     visibility  : string,   // 공개 범위 필터 (예: 'FRIENDS' | 'PRIVATE' | 'MINE')
 *     tag         : string,   // 해시태그 필터 (선택)
 *     page        : number,   // 페이지 번호 (Spring Pageable 기준, 0부터 시작)
 *     size        : number    // 페이지당 항목 수
 *   }
 *
 *   응답 (List<AlbumFeedItemResponse>):
 *   [
 *     {
 *       albumId         : number,   // 앨범 ID
 *       userId          : number,   // 작성자 ID
 *       username        : string,   // 작성자 이름
 *       profileImageUrl : string,   // 작성자 프로필 이미지
 *       title           : string,   // 앨범 제목
 *       thumbUrl        : string,   // 대표 썸네일 URL (첫 번째 사진)
 *       recordDate      : string,   // 기록 날짜
 *       tags            : string[], // 해시태그 목록
 *       badgeCount      : number,   // 받은 달개 수
 *       createdAt       : string    // 생성 시각
 *     }
 *   ]
 *
 * ─────────────────────────────────────────────────────────
 * [스냅 상세 조회 응답 (getPost → AlbumDetailResponse)]
 *   {
 *     albumId     : number,
 *     userId      : number,
 *     username    : string,
 *     title       : string,
 *     bodyText    : string,
 *     recordDate  : string,
 *     layoutType  : string,
 *     visibility  : string,
 *     photos      : [{ photoId, photoUrl, thumbUrl, slotIndex }],
 *     tags        : string[],
 *     createdAt   : string
 *   }
 *
 * ─────────────────────────────────────────────────────────
 * [스냅 생성 (createPost) 주의사항]
 *   createPost()는 postData를 직접 /api/albums에 POST하는 래퍼 함수이다.
 *   실제 앨범 생성 시에는 CreatePhotoAlbumPage.jsx에서
 *   photoService.uploadPhotos() → albumService.createAlbum() 순서로 직접 호출하므로,
 *   이 createPost() 함수는 하위 호환성 유지 목적으로만 남아있다.
 *   새로운 기능에서는 albumService.createAlbum()을 직접 사용할 것을 권장한다.
 *
 * ─────────────────────────────────────────────────────────
 * [미구현 기능 처리 방식]
 *   updatePost(id, _postData):
 *     → throw new Error('스냅 수정 기능은 아직 지원되지 않습니다.')
 *     → 파라미터에 _ prefix를 붙여 미사용 파라미터임을 명시
 *
 *   deletePost(id):
 *     → throw new Error('스냅 삭제 기능은 아직 지원되지 않습니다.')
 *
 *   toggleLike(id):
 *     → console.warn 출력 후 반환 (에러 throw 없음, UI 응답성 유지)
 *
 * ─────────────────────────────────────────────────────────
 * [관련 파일]
 *   - src/api/apiClient.js                    : axios 인스턴스
 *   - src/api/albumService.js                 : 앨범 생성/상세 조회 (더 구체적인 서비스)
 *   - src/api/snapService.js                  : 피드 조회 전용 서비스 (React Query와 함께 사용)
 *   - src/pages/feed/FeedPage.jsx             : getPosts() 사용
 *   - src/pages/feed/PostDetailPage.jsx       : getPost() 사용
 *   - src/pages/write/CreatePhotoAlbumPage.jsx: createPost() 대신 albumService 직접 사용
 */
import apiClient from './apiClient';
import { albumService } from './albumService';

/**
 * postService 객체
 *
 * 스냅(앨범) 관련 CRUD 및 피드 API를 묶어 named export한다.
 * 사용: import { postService } from './postService';
 */
export const postService = {

    /**
     * [1] 피드 목록 조회
     *
     * 메인 피드에 표시할 앨범 목록을 조회한다.
     * 전체 공개 앨범 또는 친구 공개 앨범을 필터링하거나
     * 특정 태그로 검색할 수 있다.
     *
     * @param {Object}  params              - 쿼리 파라미터 객체 (선택, 없으면 undefined)
     * @param {string}  params.type         - 콘텐츠 유형 필터 (예: 'photo')
     * @param {string}  params.visibility   - 공개 범위 필터 ('FRIENDS' | 'PRIVATE' | 'MINE')
     * @param {string}  params.tag          - 해시태그 필터 (예: '봄')
     * @param {number}  params.page         - 페이지 번호 (0부터 시작)
     * @param {number}  params.size         - 페이지당 항목 수
     *
     * @returns {Promise<Array>} 앨범 피드 아이템 배열
     *   [{ albumId, userId, username, profileImageUrl, title, thumbUrl, recordDate, tags, badgeCount, createdAt }]
     *
     * HTTP: GET /api/albums/feed?type=photo&visibility=MINE&tag=봄&page=0&size=20
     * 인증 필요: 예
     * 성공: 200 OK
     */
    getPosts: async (params) => {
        console.log('[postService.getPosts] 호출');
        console.log('[postService.getPosts] params =', params);

        // TODO: GET /albums/feed 를 호출하고 response.data를 반환하세요.
        const response = await apiClient.get('/albums/feed', { params });
        console.log('[postService.getPosts] response =', response);
        console.log('[postService.getPosts] response.data =', response.data);

        return response.data;
        // 힌트: params 객체가 URL 쿼리 파라미터로 자동 변환됩니다.
        //       apiClient.get('/albums/feed', { params }) → response.data
    },

    /**
     * [2] 스냅(앨범) 상세 조회
     *
     * 특정 앨범 ID로 해당 앨범의 상세 정보를 조회한다.
     * 앨범에 포함된 모든 사진, 태그, 본문, 작성자 정보가 반환된다.
     * albumService.getAlbumDetail()과 동일한 엔드포인트를 호출한다.
     *
     * 현재는 postService가 직접 /albums/{id}를 호출하지 않고,
     * albumService.getAlbumDetail(id)를 재사용하여 상세 조회 책임을
     * albumService로 일원화한다.
     *
     * @param {number|string} id - 조회할 앨범의 고유 ID
     *
     * @returns {Promise<Object>} 앨범 상세 데이터 (AlbumDetailResponse)
     *   {
     *     albumId     : number,
     *     userId      : number,
     *     username    : string,
     *     title       : string,
     *     bodyText    : string,
     *     recordDate  : string,
     *     layoutType  : string,
     *     visibility  : string,
     *     photos      : [{ photoId, photoUrl, thumbUrl, slotIndex }],
     *     tags        : string[],
     *     createdAt   : string
     *   }
     *
     * HTTP: 내부적으로 albumService.getAlbumDetail(id) 호출
     * 인증 필요: 예
     * 성공: 200 OK
     * 실패: 404 Not Found (앨범 없음), 403 Forbidden (접근 권한 없음)
     */
    // [2] 스냅(앨범) 상세 조회 → albumService.getAlbumDetail(id) 재사용
    getPost: async (id) => {
        console.log('[postService.getPost] 호출');
        console.log('[postService.getPost] id =', id);

        // TODO: albumService.getAlbumDetail(id)를 호출하고 결과를 반환하세요.
        const data = await albumService.getAlbumDetail(id);
        console.log('[postService.getPost] albumService.getAlbumDetail 결과 =', data);

        return data;
        // 힌트: const data = await albumService.getAlbumDetail(id); return data;
    },

    /**
     * [3] 스냅(앨범) 생성 (하위 호환성 유지용)
     *
     * postData를 /api/albums 엔드포인트에 직접 POST하는 래퍼 함수이다.
     * 실제 앨범 생성 시에는 사진 업로드 단계가 선행되어야 하므로
     * CreatePhotoAlbumPage.jsx에서는 이 함수 대신
     * photoService.uploadPhotos() + albumService.createAlbum()을 직접 호출한다.
     * 이 함수는 구버전 코드와의 호환성을 위해 남겨둔다.
     *
     * @param {Object} postData - 앨범 생성에 필요한 데이터 객체
     *   albumService.createAlbum()의 payload 참조:
     *   { userId, title, bodyText, recordDate, visibility, layoutType, photoIds, slotIndexes, tags }
     *
     * @returns {Promise<Object>} 생성된 앨범 정보
     *   예: { albumId: number, message: string }
     *
     * HTTP: POST /api/albums
     * Content-Type: application/json
     * 인증 필요: 예
     * 성공: 201 Created 또는 200 OK
     */
    // [3] 스냅 생성 — CreatePhotoAlbumPage에서는 photoService + albumService 직접 사용
    //     이 메서드는 호환성 유지용으로 남겨둠
    createPost: async (postData) => {
        console.log('[postService.createPost] 호출');
        console.log('[postService.createPost] postData =', postData);

        // TODO: POST /albums 를 호출하고 response.data를 반환하세요
        const response = await apiClient.post('/albums', postData);
        console.log('[postService.createPost] response =', response);
        console.log('[postService.createPost] response.data =', response.data);

        return response.data;
        // 힌트: apiClient.post('/albums', postData) → response.data
    },
    /**
 * [4] 스냅(앨범) 수정 — 현재 백엔드 미구현
 *
 * 기존 앨범의 내용(제목, 본문, 태그 등)을 수정하는 기능이지만,
 * 백엔드 앨범 수정 엔드포인트(PUT /api/albums/{id})가 아직 구현되지 않았다.
 * 이 함수를 호출하면 항상 Error를 throw한다.
 * 호출하는 컴포넌트는 반드시 try-catch로 에러를 처리해야 한다.
 *
 * @param {number|string} id       - 수정할 앨범의 ID (미사용, _ prefix)
 * @param {Object}        _postData - 수정할 데이터 객체 (미사용, _ prefix)
 *
 * @returns {never} 항상 Error를 throw
 * @throws {Error} '스냅 수정 기능은 아직 지원되지 않습니다.'
 *
 * HTTP: 미구현 (PUT /api/albums/{id} 엔드포인트 없음)
 */
    // [4] 스냅 수정 — 백엔드 앨범 수정 엔드포인트 미구현
    updatePost: async (id, _postData) => {
        console.log('[postService.updatePost] 호출');
        console.log('[postService.updatePost] id =', id);
        console.log('[postService.updatePost] _postData =', _postData);

        const response = await apiClient.put(`/albums/${id}`, postData);
        console.log('[postService.updatePost] response =', response);
        console.log('[postService.updatePost] response.data =', response.data);

        return response.data;
    },

    /**
     * [5] 스냅(앨범) 삭제 — 현재 백엔드 미구현
     *
     * 특정 앨범을 삭제하는 기능이지만,
     * 백엔드 앨범 삭제 엔드포인트(DELETE /api/albums/{id})가 아직 구현되지 않았다.
     * 이 함수를 호출하면 항상 Error를 throw한다.
     *
     * @param {number|string} id - 삭제할 앨범의 ID (미사용, _ prefix)
     *
     * @returns {never} 항상 Error를 throw
     * @throws {Error} '스냅 삭제 기능은 아직 지원되지 않습니다.'
     *
     * HTTP: 미구현 (DELETE /api/albums/{id} 엔드포인트 없음)
     */
    // [5] 스냅 삭제 — 백엔드 앨범 삭제 엔드포인트 미구현
    deletePost: async (id) => {
        console.log('[postService.deletePost] 호출');
        console.log('[postService.deletePost] id =', id);

        const response = await apiClient.delete(`/albums/${id}`);
        console.log('[postService.deletePost] response =', response);
        console.log('[postService.deletePost] response.data =', response.data);

        return response.data;
    },

    /**
     * [6] 좋아요 토글 — 현재 백엔드 미구현
     *
     * 특정 앨범에 좋아요를 추가하거나 취소하는 토글 기능이지만,
     * 백엔드에 해당 엔드포인트가 아직 구현되지 않았다.
     * updatePost/deletePost와 달리 Error를 throw하지 않고
     * console.warn만 출력한 후 조용히 반환한다.
     * → UI 응답성을 유지하면서 미구현 상태를 알린다.
     *
     * @param {number|string} id - 좋아요를 토글할 앨범의 ID (미사용, _ prefix)
     *
     * @returns {Promise<void>} undefined (에러 없이 반환)
     *
     * HTTP: 미구현 (POST /api/albums/{id}/like 등의 엔드포인트 없음)
     */
    // [6] 좋아요 토글 — 백엔드 미구현
    toggleLike: async (id) => {
        console.log('[postService.toggleLike] 호출');
        console.log('[postService.toggleLike] id =', id);

        // TODO: 미구현 상태를 개발자에게 알리되 에러는 throw하지 마세요.
        console.warn('toggleLike: 백엔드 미구현 기능입니다.');
        // 힌트: console.warn('toggleLike: 백엔드 미구현 기능입니다.') 출력 후 그냥 반환
    },
};
