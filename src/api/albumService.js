/**
 * @file albumService.js asdasd
 * @description 앨범(스냅) 생성 및 상세 조회 API를 담당하는 서비스 파일
 *
 * ─────────────────────────────────────────────────────────
 * 이 파일의 역할:
 *   사용자가 사진을 업로드한 뒤 앨범을 생성하거나,
 *   특정 앨범의 상세 정보를 조회하는 API를 제공한다.
 *   앨범은 이 앱에서 '스냅(Snap)'이라고도 불리며,
 *   복수의 사진, 제목, 본문, 태그, 레이아웃 유형 등을 포함한다.
 *
 * ─────────────────────────────────────────────────────────
 * [호출되는 백엔드 엔드포인트 목록]
 *   POST /api/albums          → 앨범 생성 (CreateAlbumRequest 본문 전송)
 *   GET  /api/albums/{id}     → 앨범 상세 조회 (AlbumDetailResponse 반환)
 *
 * ─────────────────────────────────────────────────────────
 * [요청 데이터 형태 - createAlbum의 payload]
 *   {
 *     userId      : number,        // 앨범을 생성하는 사용자의 ID
 *     title       : string,        // 앨범 제목
 *     bodyText    : string,        // 앨범 본문(설명글)
 *     recordDate  : string,        // 기록 날짜 (ISO 8601 형식, 예: "2024-03-03")
 *     visibility  : string,        // 공개 범위: 'PUBLIC' | 'FRIENDS' | 'PRIVATE'
 *     layoutType  : string,        // 사진 레이아웃 종류: 'GRID' | 'COLLAGE' 등
 *     photoIds    : number[],      // 이미 업로드된 사진들의 ID 배열 (photoService로 업로드)
 *     slotIndexes : number[],      // 각 사진이 배치될 레이아웃 슬롯 인덱스 배열
 *     tags        : string[]       // 해시태그 문자열 배열 (예: ["봄", "여행"])
 *   }
 *
 * ─────────────────────────────────────────────────────────
 * [응답 데이터 형태]
 *   createAlbum 응답 (백엔드 AlbumCreateResponse):
 *   {
 *     albumId     : number,        // 생성된 앨범의 고유 ID
 *     message     : string         // 성공 메시지
 *   }
 *
 *   getAlbumDetail 응답 (백엔드 AlbumDetailResponse):
 *   {
 *     albumId     : number,        // 앨범 ID
 *     userId      : number,        // 앨범 작성자 ID
 *     username    : string,        // 앨범 작성자 이름
 *     title       : string,        // 앨범 제목
 *     bodyText    : string,        // 앨범 본문
 *     recordDate  : string,        // 기록 날짜
 *     layoutType  : string,        // 레이아웃 유형
 *     visibility  : string,        // 공개 범위
 *     photos      : [              // 포함된 사진 목록
 *       {
 *         photoId   : number,      // 사진 ID
 *         photoUrl  : string,      // 원본 사진 URL
 *         thumbUrl  : string,      // 썸네일 URL
 *         slotIndex : number       // 레이아웃 슬롯 위치
 *       }
 *     ],
 *     tags        : string[],      // 해시태그 목록
 *     createdAt   : string         // 생성 일시 (ISO 8601)
 *   }
 *
 * ─────────────────────────────────────────────────────────
 * [앨범 생성 전체 흐름]
 *   1. photoService.uploadPhotos() 로 사진 파일들을 S3에 업로드하여 photoId 배열 획득
 *   2. albumService.createAlbum() 에 photoId 배열과 나머지 메타데이터를 전달
 *   3. 백엔드에서 앨범 레코드 생성 및 사진-앨범 연결
 *   → CreatePhotoAlbumPage.jsx에서 이 흐름을 직접 구현함
 *
 * ─────────────────────────────────────────────────────────
 * [관련 파일]
 *   - src/api/apiClient.js                      : axios 인스턴스
 *   - src/api/photoService.js                   : 사진 업로드 (앨범 생성 전 선행 단계)
 *   - src/api/postService.js                    : getPost()에서도 같은 /albums/{id} 사용
 *   - src/pages/write/CreatePhotoAlbumPage.jsx  : 앨범 생성 UI
 *   - src/pages/feed/AlbumDetailPage.jsx        : 앨범 상세 조회 UI
 */
import apiClient from './apiClient';

/**
 * albumService 객체
 *
 * 앨범 생성 및 조회 API를 묶어 named export한다.
 * 사용: import { albumService } from './albumService';
 */
export const albumService = {
  /**
   * [1] 앨범 생성
   *
   * 이미 업로드된 사진 ID 목록과 앨범 메타데이터를 백엔드로 전송하여
   * 새로운 앨범(스냅) 레코드를 생성한다.
   * 이 함수 호출 전에 반드시 photoService.uploadPhotos()를 통해
   * 사진이 업로드되어 있어야 한다 (photoId가 필요하기 때문).
   *
   * @param {Object}   payload              - 앨범 생성에 필요한 전체 데이터 객체
   * @param {number}   payload.userId       - 앨범 작성자 ID (로그인한 사용자)
   * @param {string}   payload.title        - 앨범 제목 (최대 글자 수는 백엔드 검증)
   * @param {string}   payload.bodyText     - 앨범 본문 설명글
   * @param {string}   payload.recordDate   - 기록 날짜 (예: "2024-03-03", YYYY-MM-DD)
   * @param {string}   payload.visibility   - 공개 범위 ('PUBLIC' | 'FRIENDS' | 'PRIVATE')
   * @param {string}   payload.layoutType   - 레이아웃 유형 (예: 'GRID', 'COLLAGE')
   * @param {number[]} payload.photoIds     - 업로드된 사진의 ID 배열
   *                                          예: [101, 102, 103]
   * @param {number[]} payload.slotIndexes  - 각 사진의 슬롯 위치 배열 (photoIds와 순서 일치)
   *                                          예: [0, 1, 2] (0번 슬롯에 101번 사진, 1번 슬롯에 102번 사진...)
   * @param {string[]} payload.tags         - 해시태그 배열 (예: ["봄", "여행", "서울"])
   *
   * @returns {Promise<Object>} 생성된 앨범 정보
   *   예: { albumId: 55, message: "앨범이 생성되었습니다." }
   *
   * HTTP: POST /api/albums
   * Content-Type: application/json
   * 인증 필요: 예 (Authorization: Bearer <token>)
   * 성공: 201 Created 또는 200 OK
   * 실패: 400 (유효성 오류), 401 (미인증), 404 (photoId 없음)
   */
  // payload: { userId, title, bodyText, recordDate, visibility, layoutType, photoIds, slotIndexes, tags }
  createAlbum: async (payload) => {
    // TODO: POST /albums 를 호출하고 data를 반환하세요.
    const response = await apiClient.post('/albums', payload);
    const data=response.data;
    return data;
    // 힌트: const { data } = await apiClient.post('/albums', payload); return data;
  },

  /**
   * [2] 앨범 상세 조회
   *
   * 특정 앨범 ID로 해당 앨범의 모든 상세 정보를 가져온다.
   * 사진 목록, 태그, 작성자 정보, 레이아웃 등 앨범 렌더링에 필요한
   * 모든 데이터가 포함된다.
   *
   * @param {number|string} albumId - 조회할 앨범의 고유 ID
   *   URL 경로 파라미터로 사용되므로 숫자 또는 숫자형 문자열 모두 가능
   *
   * @returns {Promise<Object>} 앨범 상세 데이터 (AlbumDetailResponse)
   *   {
   *     albumId    : number,
   *     userId     : number,
   *     username   : string,
   *     title      : string,
   *     bodyText   : string,
   *     recordDate : string,
   *     layoutType : string,
   *     visibility : string,
   *     photos     : [{ photoId, photoUrl, thumbUrl, slotIndex }],
   *     tags       : string[],
   *     createdAt  : string
   *   }
   *
   * HTTP: GET /api/albums/{albumId}
   * 인증 필요: 예 (PRIVATE 앨범은 작성자 본인만 조회 가능)
   * 성공: 200 OK
   * 실패: 401 (미인증), 403 (접근 권한 없음), 404 (앨범 없음)
   */
  getAlbumDetail: async (albumId) => {
    // TODO: GET /albums/{albumId} 를 호출하고 data를 반환하세요.
    const response = await apiClient.get(`/albums/${albumId}`)
    return response.data;
    // 힌트: const { data } = await apiClient.get(`/albums/${albumId}`); return data;
  },
};
