/**
 * @file notificationService.js
 * @description 앱 내 알림(Notification) 조회, 읽음 처리, 삭제 API를 담당하는 서비스 파일
 *
 * ─────────────────────────────────────────────────────────
 * 알림(Notification)이란?
 *   사용자에게 발생한 다양한 이벤트(친구 요청, 달개 수신, 앨범 반응 등)를
 *   시스템이 자동으로 생성하여 알려주는 메시지이다.
 *   TopNav의 알림 아이콘에 읽지 않은 개수(badge)를 표시하고,
 *   NotificationsPage에서 전체 목록을 확인/관리할 수 있다.
 *
 * ─────────────────────────────────────────────────────────
 * [호출되는 백엔드 엔드포인트 목록]
 *   GET    /api/notifications           → 전체 알림 목록 조회
 *   GET    /api/notifications/unread    → 읽지 않은 알림 개수 조회
 *   PUT    /api/notifications/{id}/read → 특정 알림 읽음 처리
 *   PUT    /api/notifications/read-all  → 모든 알림 일괄 읽음 처리
 *   DELETE /api/notifications/{id}      → 특정 알림 삭제
 *   DELETE /api/notifications           → 모든 알림 일괄 삭제
 *
 * ─────────────────────────────────────────────────────────
 * [응답 데이터 형태]
 *
 *   getAll() 응답 (NotificationDto 배열):
 *   [
 *     {
 *       id          : number,   // 알림 고유 ID
 *       type        : string,   // 알림 유형 ('FRIEND_REQUEST' | 'BADGE_RECEIVED' | 'ALBUM_REACTION' 등)
 *       message     : string,   // 알림 메시지 본문
 *       isRead      : boolean,  // 읽음 여부 (false = 읽지 않음)
 *       createdAt   : string,   // 알림 생성 시각 (ISO 8601)
 *       senderId    : number,   // 알림을 발생시킨 사용자 ID (optional)
 *       senderName  : string,   // 알림을 발생시킨 사용자 이름 (optional)
 *       referenceId : number    // 관련 리소스 ID (albumId, friendshipId 등) (optional)
 *     }
 *   ]
 *
 *   getUnreadCount() 응답:
 *   { count: number }            // 읽지 않은 알림 개수
 *   → TopNav의 알림 배지 숫자로 사용
 *
 *   markAsRead(id) 응답:
 *   { message: string }          // 예: "알림을 읽음 처리했습니다."
 *
 *   markAllRead() 응답:
 *   { message: string }          // 예: "모든 알림을 읽음 처리했습니다."
 *
 *   delete(id) 응답:
 *   { message: string } 또는 비어 있음 (204 No Content)
 *
 *   deleteAll() 응답:
 *   { message: string } 또는 비어 있음 (204 No Content)
 *
 * ─────────────────────────────────────────────────────────
 * [알림 유형(type) 목록 - 예시]
 *   'FRIEND_REQUEST'  : 친구 요청을 받음
 *   'FRIEND_ACCEPT'   : 친구 요청이 수락됨
 *   'BADGE_RECEIVED'  : 달개를 받음
 *   'ALBUM_REACTION'  : 앨범에 반응이 달림
 *   백엔드 NotificationType enum 값과 일치
 *
 * ─────────────────────────────────────────────────────────
 * [에러 처리]
 *   이 서비스는 try-catch를 사용하지 않아 에러가 호출부로 전파된다.
 *   호출하는 컴포넌트에서 try-catch로 에러를 처리해야 한다.
 *   알림 기능은 앱의 핵심 기능이 아니므로, 컴포넌트 레벨에서
 *   에러 발생 시 빈 목록이나 카운트 0을 보여주는 처리를 권장한다.
 *
 * ─────────────────────────────────────────────────────────
 * [관련 파일]
 *   - src/api/apiClient.js                      : axios 인스턴스
 *   - src/components/TopNav.jsx                 : getUnreadCount() 주기적으로 폴링
 *   - src/pages/notifications/NotificationsPage.jsx: getAll(), markAsRead(), delete() 사용
 */
import apiClient from './apiClient';

/**
 * notificationService 객체
 *
 * 알림 관련 모든 API를 묶어 named export한다.
 * 사용: import { notificationService } from './notificationService';
 */
export const notificationService = {

    /* ═══ 실제 API 호출 (백엔드 연결 모드) ═══ */

    /**
     * [1] 전체 알림 목록 조회
     *
     * 현재 로그인한 사용자의 모든 알림을 최신순으로 조회한다.
     * 읽은 알림과 읽지 않은 알림이 모두 포함된다.
     * 목록을 받아 isRead 값에 따라 UI에서 읽음/미읽음 상태를 시각적으로 구분한다.
     *
     * @returns {Promise<Array>} 알림 목록 배열 (최신순 정렬)
     *   [
     *     {
     *       id          : number,   // 알림 고유 ID
     *       type        : string,   // 알림 유형
     *       message     : string,   // 알림 메시지 내용
     *       isRead      : boolean,  // true=읽음, false=미읽음
     *       createdAt   : string,   // 생성 시각 (ISO 8601)
     *       senderId    : number,   // 발신자 ID (optional)
     *       senderName  : string,   // 발신자 이름 (optional)
     *       referenceId : number    // 관련 리소스 ID (optional)
     *     }
     *   ]
     *   알림 없으면 빈 배열([]) 반환
     *
     * HTTP: GET /api/notifications
     * 인증 필요: 예
     * 성공: 200 OK
     */
    getAll: async () => {
        // TODO: GET /notifications 를 호출하고 response.data를 반환하세요.
        // 힌트: apiClient.get('/notifications') → response.data
        const response = await apiClient.get('/notifications');
        console.log('[notifications] 응답:', response.data?.length, '개');
        return response.data;
    },

    /**
     * [2] 읽지 않은 알림 개수 조회
     *
     * 현재 읽지 않은(isRead=false) 알림의 개수만을 조회한다.
     * TopNav의 알림 아이콘에 표시하는 빨간 배지(badge) 숫자로 사용되며,
     * 주기적으로 폴링(polling)하거나 페이지 포커스 시 호출한다.
     *
     * @returns {Promise<Object>} 미읽음 개수 객체
     *   { count: number }
     *   예: { count: 3 } → 아이콘에 '3' 표시
     *   예: { count: 0 } → 배지 숨김
     *
     * HTTP: GET /api/notifications/unread
     * 인증 필요: 예
     * 성공: 200 OK
     */
    getUnreadCount: async () => {
        // TODO: GET /notifications/unread 를 호출하고 response.data를 반환하세요.
        // 힌트: apiClient.get('/notifications/unread') → response.data  (결과: { count: n })
        const response = await apiClient.get('/notifications/unread');
        console.log('[unreadCount] 응답:', response.data);
        return response.data;
    },

    /**
     * [3] 특정 알림 읽음 처리
     *
     * 사용자가 특정 알림을 클릭하거나 확인했을 때 해당 알림의
     * isRead 상태를 true로 변경한다.
     * 읽음 처리 후 getUnreadCount()를 다시 호출하여 배지 숫자를 갱신해야 한다.
     *
     * @param {number|string} id - 읽음 처리할 알림의 고유 ID
     *   (getAll() 응답의 id 필드 값)
     *
     * @returns {Promise<Object>} 처리 결과
     *   예: { message: "알림을 읽음 처리했습니다." }
     *
     * HTTP: PUT /api/notifications/{id}/read
     * 요청 body: 없음
     * 인증 필요: 예
     * 성공: 200 OK
     * 실패: 404 Not Found (해당 ID의 알림 없음)
     */
    markAsRead: async (id) => {
        // TODO: PUT /notifications/{id}/read 를 호출하고 response.data를 반환하세요.
        // 힌트: apiClient.put(`/notifications/${id}/read`) → response.data
        const response = await apiClient.put(`/notifications/${id}/read`); //알림자체의 id번호
        console.log('[markAsRead] id:', id);
        return response.data;
    },

    /**
     * [4] 모든 알림 일괄 읽음 처리
     *
     * 현재 로그인한 사용자의 읽지 않은 모든 알림을 한 번에 읽음 처리한다.
     * "모두 읽음" 버튼을 클릭했을 때 호출한다.
     * 처리 후 getUnreadCount()는 0을 반환해야 한다.
     *
     * @returns {Promise<Object>} 처리 결과
     *   예: { message: "모든 알림을 읽음 처리했습니다." }
     *
     * HTTP: PUT /api/notifications/read-all
     * 요청 body: 없음
     * 인증 필요: 예
     * 성공: 200 OK
     */
    markAllRead: async () => {
        // TODO: PUT /notifications/read-all 를 호출하고 response.data를 반환하세요.
        // 힌트: apiClient.put('/notifications/read-all') → response.data
        const response = await apiClient.put('/notifications/read-all');
        console.log('[markAllRead] 완료');
        return response.data;
    },

    /**
     * [5] 특정 알림 삭제
     *
     * 특정 알림을 완전히 삭제한다 (읽음 처리가 아닌 DB에서 제거).
     * 사용자가 알림 항목의 삭제 버튼을 눌렀을 때 호출한다.
     *
     * @param {number|string} id - 삭제할 알림의 고유 ID
     *   (getAll() 응답의 id 필드 값)
     *
     * @returns {Promise<Object>} 삭제 결과
     *   예: { message: "알림이 삭제되었습니다." } 또는 빈 응답(204)
     *
     * HTTP: DELETE /api/notifications/{id}
     * 요청 body: 없음
     * 인증 필요: 예
     * 성공: 200 OK 또는 204 No Content
     * 실패: 403 Forbidden (본인 알림이 아닌 경우), 404 Not Found
     */
    delete: async (id) => {
        // TODO: DELETE /notifications/{id} 를 호출하고 response.data를 반환하세요.
        // 힌트: apiClient.delete(`/notifications/${id}`) → response.data
        const response = await apiClient.delete(`/notifications/${id}`);
        console.log('[notification] 삭제 id:', id);
        return response.data;
    },

    /**
     * [6] 모든 알림 일괄 삭제
     *
     * 현재 로그인한 사용자의 모든 알림을 한 번에 삭제한다.
     * "전체 삭제" 버튼을 클릭했을 때 호출한다.
     * 삭제 후 getAll()은 빈 배열을, getUnreadCount()는 0을 반환해야 한다.
     *
     * @returns {Promise<Object>} 삭제 결과
     *   예: { message: "모든 알림이 삭제되었습니다." } 또는 빈 응답(204)
     *
     * HTTP: DELETE /api/notifications
     * 요청 body: 없음
     * 인증 필요: 예
     * 성공: 200 OK 또는 204 No Content
     */
    deleteAll: async () => {
        // TODO: DELETE /notifications 를 호출하고 response.data를 반환하세요.
        // 힌트: apiClient.delete('/notifications') → response.data
        const response = await apiClient.delete('/notifications');
        console.log('[notification] 전체 삭제 완료');
        return response.data;
    }
};
