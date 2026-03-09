/**
 * @file photoService.js
 * @description 사진 파일 업로드 API를 담당하는 서비스 파일
 *
 * ─────────────────────────────────────────────────────────
 * 이 파일의 역할:
 *   사용자가 앨범 생성 시 첨부하는 사진 파일들을 백엔드 서버를 통해
 *   클라우드 스토리지(S3 또는 서버 로컬)에 업로드한다.
 *   업로드 성공 시 각 사진의 photoId, 원본 URL, 썸네일 URL이 반환되며,
 *   이 정보는 이후 albumService.createAlbum() 호출 시 photoIds로 사용된다.
 *
 * ─────────────────────────────────────────────────────────
 * [앨범 생성 전체 흐름에서 photoService의 위치]
 *   [1단계] photoService.uploadPhotos()
 *           → 사진 파일(File 객체) → 서버 업로드 → photoId 배열 획득
 *   [2단계] albumService.createAlbum()
 *           → photoId 배열 + 앨범 메타데이터 → 앨범 레코드 생성
 *
 * ─────────────────────────────────────────────────────────
 * [호출되는 백엔드 엔드포인트]
 *   POST /api/photos/upload
 *     - Content-Type: multipart/form-data
 *     - 요청: FormData (files[] + userId)
 *     - 응답: { photos: [{ photoId, photoUrl, thumbUrl }] }
 *
 * ─────────────────────────────────────────────────────────
 * [요청 데이터 형태]
 *   multipart/form-data 형식으로 전송:
 *   ┌─ FormData ──────────────────────────────────────────┐
 *   │  files  : File (첫 번째 이미지 파일)                 │
 *   │  files  : File (두 번째 이미지 파일)                 │
 *   │  ...    : (여러 파일을 동일한 key 'files'로 append)   │
 *   │  userId : string (숫자를 문자열로 변환하여 전송)      │
 *   └─────────────────────────────────────────────────────┘
 *   → 백엔드 Spring 컨트롤러: @RequestParam("files") MultipartFile[]
 *   → 백엔드 Spring 컨트롤러: @RequestParam("userId") Long userId
 *   → userId를 String으로 변환하는 이유: FormData.append()는 숫자를 자동으로
 *     문자열로 변환하지 않으므로 명시적으로 String(userId) 처리
 *
 * ─────────────────────────────────────────────────────────
 * [응답 데이터 형태]
 *   백엔드 PhotoUploadResponse:
 *   {
 *     photos: [
 *       {
 *         photoId  : number,   // 업로드된 사진의 DB 고유 ID
 *         photoUrl : string,   // 원본 이미지 접근 URL (S3 등)
 *         thumbUrl : string    // 리사이즈된 썸네일 이미지 URL
 *       },
 *       ...
 *     ]
 *   }
 *   → photos 배열에서 photoId를 추출하여 albumService.createAlbum()의
 *     photoIds 파라미터로 전달한다
 *
 * ─────────────────────────────────────────────────────────
 * [Content-Type 주의사항]
 *   apiClient의 기본 Content-Type은 'application/json'이나,
 *   uploadPhotos() 호출 시 개별 요청 옵션에서
 *   { 'Content-Type': 'multipart/form-data' } 로 오버라이드한다.
 *   이렇게 하면 Axios가 자동으로 multipart boundary를 설정해준다.
 *
 * ─────────────────────────────────────────────────────────
 * [에러 처리]
 *   try-catch를 사용하지 않아 에러가 호출부로 전파된다.
 *   호출하는 컴포넌트(CreatePhotoAlbumPage 등)에서 try-catch로 처리해야 한다.
 *   주요 실패 케이스:
 *   - 413 Payload Too Large: 파일 크기 초과
 *   - 415 Unsupported Media Type: 허용되지 않는 파일 형식
 *   - 400 Bad Request: userId 누락 또는 files 없음
 *
 * ─────────────────────────────────────────────────────────
 * [관련 파일]
 *   - src/api/apiClient.js                       : axios 인스턴스
 *   - src/api/albumService.js                    : 업로드 후 앨범 생성에 photoId 사용
 *   - src/pages/write/CreatePhotoAlbumPage.jsx   : uploadPhotos() → createAlbum() 순서로 호출
 */
import apiClient from './apiClient';

/**
 * photoService 객체
 *
 * 사진 업로드 API를 묶어 named export한다.
 * 사용: import { photoService } from './photoService';
 */
export const photoService = {
  /**
   * [1] 사진 파일 업로드
   *
   * 사용자가 선택한 사진 파일들을 서버에 업로드하고,
   * 각 사진에 대한 고유 ID와 접근 URL을 반환받는다.
   * 여러 파일을 한 번에 업로드할 수 있으며(배열로 전달),
   * FormData를 사용하여 multipart/form-data 형식으로 전송한다.
   *
   * @param {Object}   param            - 업로드 파라미터를 담은 구조 분해 객체
   * @param {File[]}   param.files      - 업로드할 이미지 파일 객체 배열
   *                                      예: [File { name: 'photo1.jpg', size: 1024000 }]
   *                                      File 객체는 input[type=file]이나 카메라에서 획득
   * @param {number}   param.userId     - 업로드를 수행하는 사용자의 ID
   *                                      백엔드에서 파일 소유자 기록 및 권한 확인에 사용
   *
   * @returns {Promise<Object>} 업로드 결과 데이터
   *   {
   *     photos: [
   *       {
   *         photoId  : number,   // 사진 DB ID (앨범 생성 시 photoIds로 사용)
   *         photoUrl : string,   // 원본 이미지 URL (앨범 상세에서 표시)
   *         thumbUrl : string    // 썸네일 URL (피드 목록에서 표시)
   *       }
   *     ]
   *   }
   *
   * HTTP: POST /api/photos/upload
   * Content-Type: multipart/form-data (FormData 자동 처리)
   * 인증 필요: 예 (Authorization: Bearer <token>)
   * 성공: 200 OK 또는 201 Created
   * 실패:
   *   - 400 Bad Request  : files 없음 또는 userId 누락
   *   - 401 Unauthorized : 미인증 사용자
   *   - 413 Payload Too Large : 파일 크기 초과
   *   - 415 Unsupported Media Type : 이미지 외 파일 형식
   */
  // { files: File[], userId: number }
  uploadPhotos: async ({ files, userId }) => {
    // TODO: FormData를 구성한 뒤 POST /photos/upload 를 호출하고 data를 반환하세요.
    // 힌트:
    //   1. const formData = new FormData()
    const formData = new FormData();
    //   2. files.forEach(file => formData.append('files', file))  // 같은 키 'files'로 여러 번 append
    files.forEach((file) => formData.append('files', file));
    //   3. formData.append('userId', String(userId))              // 숫자를 문자열로 변환
    formData.append('userId', String(userId));
    //   4. const { data } = await apiClient.post('/photos/upload', formData, {
    //        headers: { 'Content-Type': 'multipart/form-data' }   // Content-Type 오버라이드
    //      })
    const { data } = await apiClient.post('/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    //   5. return data
     return data;
  },
};
