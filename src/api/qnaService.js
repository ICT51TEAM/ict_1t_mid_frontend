/**
 * @file qnaService.js
 * @description Q&A 게시판 CRUD(목록 조회, 생성, 수정, 삭제) API를 담당하는 서비스 파일
 *
 * ─────────────────────────────────────────────────────────
 * Q&A(질문과 답변) 게시판이란?
 *   앱 사용자가 운영자 또는 다른 사용자에게 질문을 남기고
 *   답변을 받을 수 있는 게시판 기능이다.
 *   각 글은 제목(title)과 내용(content)으로 구성되며,
 *   생성 시각 기준 내림차순으로 정렬되어 표시된다.
 *
 * ─────────────────────────────────────────────────────────
 * [호출되는 백엔드 엔드포인트 목록]
 *   GET    /api/qna?page=0&size=10&sort=createdAt,desc  → Q&A 목록 조회 (페이징)
 *   POST   /api/qna                                      → Q&A 글 생성
 *   PUT    /api/qna/{id}                                 → Q&A 글 수정
 *   DELETE /api/qna/{id}                                 → Q&A 글 삭제
 *
 * ─────────────────────────────────────────────────────────
 * [페이징 파라미터 주의사항]
 *   프론트엔드는 page를 1부터 시작하는 1-indexed 방식으로 사용하지만,
 *   Spring Data JPA의 Pageable은 0-indexed (0부터 시작)를 사용한다.
 *   따라서 getQnas() 내부에서 page - 1 변환을 수행한다:
 *   예: 프론트 page=1 → 백엔드 page=0 (1페이지)
 *       프론트 page=2 → 백엔드 page=1 (2페이지)
 *
 * ─────────────────────────────────────────────────────────
 * [목록 조회 URL 예시]
 *   GET /api/qna?page=0&size=10&sort=createdAt,desc
 *   → 1페이지, 페이지당 10개, 최신순 정렬
 *   GET /api/qna?page=1&size=5&sort=createdAt,desc
 *   → 2페이지, 페이지당 5개, 최신순 정렬
 *
 * ─────────────────────────────────────────────────────────
 * [요청 데이터 형태]
 *   createQna, updateQna 요청 body:
 *   {
 *     title   : string,   // Q&A 글 제목
 *     content : string    // Q&A 글 내용
 *   }
 *
 * ─────────────────────────────────────────────────────────
 * [응답 데이터 형태]
 *
 *   getQnas() 응답 (Spring Page<QnaDto>):
 *   {
 *     content          : [             // 현재 페이지 글 목록
 *       {
 *         id        : number,           // Q&A 글 고유 ID
 *         title     : string,           // 제목
 *         content   : string,           // 내용
 *         authorId  : number,           // 작성자 사용자 ID
 *         authorName: string,           // 작성자 이름
 *         createdAt : string,           // 생성 시각 (ISO 8601)
 *         updatedAt : string            // 수정 시각 (ISO 8601)
 *       }
 *     ],
 *     totalPages       : number,        // 전체 페이지 수
 *     totalElements    : number,        // 전체 글 수
 *     size             : number,        // 페이지당 항목 수
 *     number           : number,        // 현재 페이지 번호 (0-indexed)
 *     first            : boolean,       // 첫 페이지 여부
 *     last             : boolean        // 마지막 페이지 여부
 *   }
 *
 *   createQna() / updateQna() 응답:
 *   {
 *     id        : number,   // 생성/수정된 글의 ID
 *     title     : string,
 *     content   : string,
 *     authorId  : number,
 *     authorName: string,
 *     createdAt : string,
 *     updatedAt : string
 *   }
 *
 *   deleteQna() 응답:
 *   { message: string } 또는 빈 응답 (204 No Content)
 *
 * ─────────────────────────────────────────────────────────
 * [에러 처리]
 *   getQnas(): try-catch로 에러를 잡아 console.error 출력 후 re-throw
 *   createQna(), updateQna(), deleteQna(): try-catch 없이 에러를 호출부로 전파
 *
 * ─────────────────────────────────────────────────────────
 * [관련 파일]
 *   - src/api/apiClient.js          : axios 인스턴스
 *   - src/context/QnaContext.jsx    : Q&A 상태 관리 컨텍스트
 *   - src/pages/qna/QnaPage.jsx     : getQnas(), createQna() 사용
 *   - src/pages/qna/QnaEditPage.jsx : updateQna(), deleteQna() 사용
 */
import apiClient from './apiClient';

/**
 * qnaService 객체
 *
 * Q&A 게시판 관련 모든 API를 묶어 named export한다.
 * 사용: import { qnaService } from './qnaService';
 */
export const qnaService = {
  /**
   * [1] Q&A 목록 조회 (페이지네이션 지원)
   *
   * Q&A 게시판의 글 목록을 페이지 단위로 조회한다.
   * 최신 글이 먼저 표시되도록 createdAt 기준 내림차순으로 정렬한다.
   *
   * [페이지 번호 변환]
   *   - 프론트엔드에서 page는 1-indexed (1 = 1페이지, 2 = 2페이지)
   *   - Spring Pageable은 0-indexed 이므로 page - 1 변환 필요
   *   - URL에 직접 쿼리스트링으로 삽입하여 전송 (template literal 사용)
   *
   * @param {number} page     - 조회할 페이지 번호 (1부터 시작, 기본값: 1)
   *                            내부적으로 page-1로 변환하여 백엔드에 전달
   * @param {number} pageSize - 페이지당 표시할 글의 수 (기본값: 10)
   *
   * @returns {Promise<Object>} Spring Page 응답 객체
   *   {
   *     content       : Array,    // 현재 페이지 글 목록 [{ id, title, content, authorId, authorName, createdAt, updatedAt }]
   *     totalPages    : number,   // 전체 페이지 수
   *     totalElements : number,   // 전체 글 수
   *     size          : number,   // 페이지당 항목 수
   *     number        : number,   // 현재 페이지 번호 (0-indexed)
   *     first         : boolean,  // 첫 페이지 여부
   *     last          : boolean   // 마지막 페이지 여부
   *   }
   *
   * HTTP: GET /api/qna?page={page-1}&size={pageSize}&sort=createdAt,desc
   * 인증 필요: 예
   * 성공: 200 OK
   * 실패: 에러를 console.error로 출력한 뒤 re-throw
   */
  // [1] QnA 목록 조회 (페이징, page는 1부터 시작)
  getQnas: async (page = 1, pageSize = 10) => {
    try {
      const response = await apiClient.get(
        `/qna?page=${page - 1}&size=${pageSize}&sort=createdAt,desc`
      );
      return response.data;
    } catch (error) {
      console.error('QnA 목록 조회 실패', error);
      throw error;
    }
  },

  /**
   * [2] Q&A 글 생성
   *
   * 새로운 Q&A 글을 작성한다.
   * 현재 로그인한 사용자가 자동으로 작성자로 설정된다(백엔드에서 JWT로 처리).
   *
   * @param {Object} data          - Q&A 글 내용 객체
   * @param {string} data.title    - 글 제목 (필수)
   * @param {string} data.content  - 글 내용 (필수)
   *
   * @returns {Promise<Object>} 생성된 Q&A 글 데이터
   *   { id, title, content, authorId, authorName, createdAt, updatedAt }
   *
   * HTTP: POST /api/qna
   * 요청 body: { title: string, content: string }
   * Content-Type: application/json
   * 인증 필요: 예
   * 성공: 201 Created 또는 200 OK
   * 실패: 400 Bad Request (title/content 누락), 401 Unauthorized
   */
  // [2] QnA 생성 — { title, content }
  createQna: async (data) => {
    const response = await apiClient.post('/qna', data);
    return response.data;
  },

  /**
   * [3] Q&A 글 수정
   *
   * 기존 Q&A 글의 제목과 내용을 수정한다.
   * 백엔드에서 JWT를 통해 작성자 본인인지 확인하며,
   * 본인이 아닌 경우 403 Forbidden 에러가 발생한다.
   *
   * @param {number|string} id     - 수정할 Q&A 글의 고유 ID (URL 경로 파라미터)
   * @param {Object}        data   - 수정할 내용 객체
   * @param {string}        data.title    - 수정할 제목 (선택, 포함 시 업데이트)
   * @param {string}        data.content  - 수정할 내용 (선택, 포함 시 업데이트)
   *
   * @returns {Promise<Object>} 수정된 Q&A 글 데이터
   *   { id, title, content, authorId, authorName, createdAt, updatedAt }
   *
   * HTTP: PUT /api/qna/{id}
   * 요청 body: { title: string, content: string }
   * Content-Type: application/json
   * 인증 필요: 예 (작성자 본인만 수정 가능)
   * 성공: 200 OK
   * 실패: 403 Forbidden (작성자 아닌 경우), 404 Not Found (글 없음)
   */
  // [3] QnA 수정 — { title, content }
  updateQna: async (id, data) => {
    // TODO: PUT /qna/{id} 를 호출하고 response.data를 반환하세요.
    // 힌트: apiClient.put(`/qna/${id}`, data) → response.data
  },

  /**
   * [4] Q&A 글 삭제
   *
   * 특정 Q&A 글을 완전히 삭제한다.
   * 백엔드에서 JWT를 통해 작성자 본인 또는 관리자인지 확인한다.
   *
   * @param {number|string} id - 삭제할 Q&A 글의 고유 ID
   *
   * @returns {Promise<Object>} 삭제 결과
   *   예: { message: "글이 삭제되었습니다." } 또는 빈 응답(204)
   *
   * HTTP: DELETE /api/qna/{id}
   * 요청 body: 없음
   * 인증 필요: 예 (작성자 본인 또는 관리자만 삭제 가능)
   * 성공: 200 OK 또는 204 No Content
   * 실패: 403 Forbidden (권한 없음), 404 Not Found (글 없음)
   */
  // [4] QnA 삭제
  deleteQna: async (id) => {
    // TODO: DELETE /qna/{id} 를 호출하고 response.data를 반환하세요.
    // 힌트: apiClient.delete(`/qna/${id}`) → response.data
  },
};
