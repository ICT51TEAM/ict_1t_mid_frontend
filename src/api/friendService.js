/**
 * @file friendService.js
 * @description 친구(글벗) 관계 관리 및 사용자 검색 API를 담당하는 서비스 파일
 *
 * ─────────────────────────────────────────────────────────
 * '글벗(Friend)'이란?
 *   이 앱에서 친구 관계를 맺은 사용자를 '글벗'이라고 부른다.
 *   친구 관계는 양방향이며, 요청-수락 과정을 거쳐야 성립된다.
 *   친구가 된 사용자의 앨범은 FRIENDS 공개 범위로 볼 수 있고,
 *   달개 랭킹에서도 친구들 랭킹으로 필터링할 수 있다.
 *
 * ─────────────────────────────────────────────────────────
 * [친구 관계 상태 흐름]
 *   1. 검색: searchUsers(query) → 사용자 찾기
 *   2. 요청: sendRequest(targetUserId) → 친구 요청 전송 (PENDING 상태)
 *   3. 수락: acceptRequest(friendshipId) → 친구 관계 성립 (ACCEPTED 상태)
 *      거절: rejectRequest(friendshipId) → 요청 거절 (관계 삭제)
 *   4. 삭제: removeFriend(friendId) → 친구 관계 해제
 *
 * ─────────────────────────────────────────────────────────
 * [호출되는 백엔드 엔드포인트 목록]
 *   GET    /api/friends                        → 내 친구 목록 조회
 *   GET    /api/friends/pending                → 받은 친구 요청 목록 조회
 *   POST   /api/friends/request                → 친구 요청 전송
 *   POST   /api/friends/{friendshipId}/accept  → 친구 요청 수락
 *   POST   /api/friends/{friendshipId}/reject  → 친구 요청 거절
 *   DELETE /api/friends/{friendId}             → 친구 삭제
 *   GET    /api/friends/search?q={query}       → 사용자 이름으로 검색
 *   GET    /api/friends/pending/sent           → 내가 보낸 친구 요청 목록 조회 (신규)
 * ─────────────────────────────────────────────────────────
 * [요청/응답 데이터 형태]
 *
 *   listFriends() 응답:
 *   [
 *     {
 *       friendshipId  : number,   // 친구 관계 고유 ID (수락/거절/삭제 시 사용)
 *       friendId      : number,   // 친구 사용자 ID
 *       username      : string,   // 친구 이름
 *       profileImageUrl: string,  // 프로필 이미지 URL
 *       totalBadges   : number    // 친구의 총 달개 수
 *     }
 *   ]
 *
 *   listPendingRequests() 응답:
 *   [
 *     {
 *       friendshipId  : number,   // 요청 ID (수락/거절 시 이 ID 사용)
 *       requesterId   : number,   // 요청 보낸 사용자 ID
 *       requesterName : string,   // 요청 보낸 사용자 이름
 *       requesterProfileImageUrl: string,
 *       createdAt     : string    // 요청 시각
 *     }
 *   ]
 *
 *   sendRequest() 요청 body:
 *   { targetUserId: number }     // 친구 요청을 보낼 대상의 ID
 *
 *   sendRequest() 응답:
 *   { message: string, friendshipId: number }
 *
 *   acceptRequest() / rejectRequest() 응답:
 *   { message: string }
 *
 *   removeFriend() 응답:
 *   { message: string }
 *
 *   searchUsers() 파라미터: q (쿼리 문자열)
 *   searchUsers() 응답:
 *   [
 *     {
 *       userId          : number,
 *       username        : string,
 *       profileImageUrl : string,
 *       isFriend        : boolean,  // 이미 친구인지 여부
 *       isPending       : boolean   // 요청 중인지 여부
 *     }
 *   ]
 *
 * ─────────────────────────────────────────────────────────
 * [URL 파라미터 구분]
 *   - friendshipId : 친구 관계 테이블의 PK. 요청 수락/거절 시 사용
 *   - friendId     : 친구 사용자의 ID. 친구 삭제 시 사용
 *   - targetUserId : 친구 요청을 보낼 대상의 userId. 요청 전송 시 body에 포함
 *
 * ─────────────────────────────────────────────────────────
 * [에러 처리]
 *   이 서비스는 try-catch를 사용하지 않아 에러가 호출부로 전파된다.
 *   호출하는 컴포넌트에서 try-catch로 에러를 처리해야 한다.
 *   예외적으로 이미 친구인 사용자에게 요청을 보내면 409 Conflict가 발생한다.
 *
 * ─────────────────────────────────────────────────────────
 * [관련 파일]
 *   - src/api/apiClient.js                   : axios 인스턴스
 *   - src/pages/friends/FriendsPage.jsx      : listFriends(), listPendingRequests() 사용
 *   - src/pages/friends/AddFriendPage.jsx    : searchUsers(), sendRequest() 사용
 *   - src/pages/friends/FriendProfilePage.jsx: removeFriend() 사용
 */
import apiClient from './apiClient';

/**
 * friendService 객체
 *
 * 친구(글벗) 관련 모든 API를 묶어 named export한다.
 * 사용: import { friendService } from './friendService';
 */
export const friendService = {

    /* ═══ 실제 API 호출 (백엔드 연결 모드) ═══ */

    /**
     * [1] 내 친구(글벗) 목록 조회
     *
     * 현재 로그인한 사용자의 전체 친구 목록을 가져온다.
     * 이미 수락된(ACCEPTED 상태) 친구 관계만 반환된다.
     *
     * @returns {Promise<Array>} 친구 목록 배열
     *   [
     *     {
     *       friendshipId     : number,   // 친구 관계 PK
     *       friendId         : number,   // 친구의 사용자 ID
     *       username         : string,   // 친구의 닉네임
     *       profileImageUrl  : string,   // 친구의 프로필 이미지 URL
     *       totalBadges      : number    // 친구의 총 달개 수
     *     }
     *   ]
     *   친구가 없으면 빈 배열([]) 반환
     *
     * HTTP: GET /api/friends
     * 인증 필요: 예
     * 성공: 200 OK
     */
    listFriends: async () => {
        const response = await apiClient.get('/friends');
        return response.data;
    },

    /**
     * [2] 받은 친구 요청(대기 중) 목록 조회
     *
     * 다른 사용자로부터 받았지만 아직 수락 또는 거절하지 않은(PENDING 상태)
     * 친구 요청 목록을 조회한다.
     * 알림 페이지나 친구 페이지 상단에 표시하여 처리를 유도한다.
     *
     * @returns {Promise<Array>} 대기 중인 친구 요청 목록
     *   [
     *     {
     *       friendshipId             : number,  // 요청 ID (수락/거절 시 사용)
     *       requesterId              : number,  // 요청 보낸 사람의 ID
     *       requesterName            : string,  // 요청 보낸 사람의 이름
     *       requesterProfileImageUrl : string,  // 요청 보낸 사람의 프로필 이미지
     *       createdAt                : string   // 요청 시각 (ISO 8601)
     *     }
     *   ]
     *   대기 중인 요청 없으면 빈 배열([]) 반환
     *
     * HTTP: GET /api/friends/pending
     * 인증 필요: 예
     * 성공: 200 OK
     */
    listPendingRequests: async () => {
        const response = await apiClient.get('/friends/pending');
        return response.data;
    },

    /**
     * [추가] 내가 보낸 친구 요청(대기 중) 목록 조회
     *
     * 내가 다른 사용자에게 보냈지만, 상대방이 아직 수락 또는 거절하지 않은
     * (PENDING 상태) 친구 요청 목록을 조회한다.
     * 사용자가 자신이 보낸 요청을 확인하거나 취소하고 싶을 때 사용한다.
     *
     * @returns {Promise<Array>} 내가 보낸 친구 요청 목록
     * [
     * {
     * friendshipId     : number,  // 요청 ID (취소 시 이 ID 사용 가능)
     * userId           : number,  // 요청을 받은 상대방의 ID
     * username         : string,  // 요청을 받은 상대방의 이름
     * profileImageUrl  : string,  // 요청을 받은 상대방의 프로필 이미지
     * status           : string   // 현재 상태 ("PENDING")
     * }
     * ]
     *
     * HTTP: GET /api/friends/pending/sent
     * 인증 필요: 예
     * 성공: 200 OK
     */
    listSentPendingRequests: async () => {
        const response = await apiClient.get('/friends/pending/sent');
        return response.data;
    },


    /**
     * [3] 친구 요청 보내기
     *
     * 특정 사용자에게 친구 요청을 전송한다.
     * 요청을 받은 사용자는 listPendingRequests()로 이를 확인하고
     * acceptRequest() 또는 rejectRequest()로 처리할 수 있다.
     *
     * @param {number} targetUserId - 친구 요청을 보낼 대상 사용자의 ID
     *
     * @returns {Promise<Object>} 요청 결과
     *   예: { message: "친구 요청을 보냈습니다.", friendshipId: 88 }
     *
     * HTTP: POST /api/friends/request
     * 요청 body: { targetUserId: number }
     * 인증 필요: 예
     * 성공: 200 OK 또는 201 Created
     * 실패:
     *   - 409 Conflict: 이미 친구이거나 요청이 진행 중인 경우
     *   - 404 Not Found: targetUserId에 해당하는 사용자 없음
     *   - 400 Bad Request: 자기 자신에게 요청 시
     */
    sendRequest: async (targetUserId) => {
        console.log(`[친구 동작] 친구 요청 전송 시도 - 대상 targetUserId: ${targetUserId}`);
        const response = await apiClient.post('/friends/request', { targetUserId });
        console.log(`[친구 동작] 친구 요청 전송 완료 - 응답:`, response.data);
        return response.data;
    },

    /**
     * [4] 친구 요청 수락
     *
     * 특정 친구 요청을 수락하여 양방향 친구 관계를 성립시킨다.
     * friendshipId는 listPendingRequests()로 조회한 요청 목록에서 가져온다.
     * 수락 후에는 양측의 친구 목록에 서로가 추가된다.
     *
     * @param {number} friendshipId - 수락할 친구 요청의 고유 ID
     *   (listPendingRequests() 응답의 friendshipId 필드 값)
     *
     * @returns {Promise<Object>} 수락 결과
     *   예: { message: "친구 요청을 수락했습니다." }
     *
     * HTTP: POST /api/friends/{friendshipId}/accept
     * 요청 body: 없음
     * 인증 필요: 예
     * 성공: 200 OK
     * 실패:
     *   - 403 Forbidden: 요청 수신자가 아닌 사용자가 수락 시도
     *   - 404 Not Found: 해당 friendshipId 요청 없음
     */
    acceptRequest: async (friendshipId) => {
        console.log(`[친구 동작] 친구 요청 수락 시도 - friendshipId: ${friendshipId}`);
        const response = await apiClient.post(`/friends/${friendshipId}/accept`);
        console.log(`[친구 동작] 친구 요청 수락 완료 - 응답:`, response.data);
        return response.data;
    },

    /**
     * [5] 친구 요청 거절
     *
     * 특정 친구 요청을 거절하여 해당 요청 레코드를 삭제(또는 REJECTED 처리)한다.
     * 거절 후에는 상대방의 요청 목록에서도 해당 요청이 제거된다.
     *
     * @param {number} friendshipId - 거절할 친구 요청의 고유 ID
     *   (listPendingRequests() 응답의 friendshipId 필드 값)
     *
     * @returns {Promise<Object>} 거절 결과
     *   예: { message: "친구 요청을 거절했습니다." }
     *
     * HTTP: POST /api/friends/{friendshipId}/reject
     * 요청 body: 없음
     * 인증 필요: 예
     * 성공: 200 OK
     * 실패:
     *   - 403 Forbidden: 요청 수신자가 아닌 사용자가 거절 시도
     *   - 404 Not Found: 해당 friendshipId 요청 없음
     */
    rejectRequest: async (friendshipId) => {
        console.log(`[친구 동작] 친구 요청 거절 시도 - friendshipId: ${friendshipId}`);
        const response = await apiClient.post(`/friends/${friendshipId}/reject`);
        console.log(`[친구 동작] 친구 요청 거절 완료 - 응답:`, response.data);
        return response.data;
    },

    /**
     * [6] 친구(글벗) 삭제
     *
     * 현재 친구 관계인 특정 사용자와의 친구 관계를 해제한다.
     * 삭제 후에는 양측의 친구 목록에서 서로가 제거된다.
     * friendId는 listFriends()로 조회한 친구 목록에서 가져온다.
     *
     * @param {number} friendId - 친구 관계를 해제할 친구의 사용자 ID
     *   (listFriends() 응답의 friendId 필드 값)
     *   주의: friendshipId(관계 테이블 PK)가 아닌 friendId(사용자 ID)임에 유의
     *
     * @returns {Promise<Object>} 삭제 결과
     *   예: { message: "친구 관계가 해제되었습니다." }
     *
     * HTTP: DELETE /api/friends/{friendId}
     * 요청 body: 없음
     * 인증 필요: 예
     * 성공: 200 OK 또는 204 No Content
     * 실패:
     *   - 403 Forbidden: 본인의 친구가 아닌 경우
     *   - 404 Not Found: 해당 friendId와 친구 관계 없음
     */
    removeFriend: async (friendId) => {
        console.log(`[친구 동작] 친구 관계/요청 삭제(취소) 시도 - friendId(또는 friendshipId): ${friendId}`);
        const response = await apiClient.delete(`/friends/${friendId}`);
        console.log(`[친구 동작] 친구 관계/요청 삭제(취소) 완료 - 응답:`, response.data);
        return response.data;
    },

    /**
     * [7] 사용자 검색
     *
     * 이름(닉네임) 키워드로 사용자를 검색하여 친구 추가 후보를 찾는다.
     * 검색 결과에는 해당 사용자가 이미 친구인지, 요청 중인지 등의
     * 관계 상태 정보가 포함될 수 있다.
     *
     * @param {string} query - 검색할 사용자 이름(닉네임) 키워드
     *   URL 쿼리 파라미터 'q'로 전달됨: /api/friends/search?q={query}
     *   예: '홍길동' → GET /api/friends/search?q=홍길동
     *
     * @returns {Promise<Array>} 검색된 사용자 목록
     *   [
     *     {
     *       userId          : number,   // 사용자 ID
     *       username        : string,   // 닉네임
     *       profileImageUrl : string,   // 프로필 이미지 URL
     *       isFriend        : boolean,  // 이미 친구인지 여부
     *       isPending       : boolean   // 친구 요청이 진행 중인지 여부
     *     }
     *   ]
     *   결과 없으면 빈 배열([]) 반환
     *
     * HTTP: GET /api/friends/search?q={query}
     * 인증 필요: 예
     * 성공: 200 OK
     * 실패: 400 Bad Request (query 파라미터 없음)
     */
    searchUsers: async (query) => {
        const response = await apiClient.get('/friends/search', { params: { q: query } });
        return response.data;
    }
};
