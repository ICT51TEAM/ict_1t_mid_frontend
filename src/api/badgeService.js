/**
 * @file badgeService.js
 * @description 달개(배지) 통계, 랭킹, 유형 조회 및 달개 전달 API를 담당하는 서비스 파일
 *
 * ─────────────────────────────────────────────────────────
 * '달개(Dalgae)'란?
 *   이 앱의 핵심 소셜 기능으로, 다른 사용자의 앨범에 감정을 표현하는 배지이다.
 *   좋아요(❤️), 슬퍼요(😢), 화나요(😠), 응원해요(💪) 등 이모지 형태로 표현된다.
 *   달개를 많이 받을수록 사용자의 레벨이 올라간다 (5개당 1레벨).
 *
 * ─────────────────────────────────────────────────────────
 * [호출되는 백엔드 엔드포인트 목록]
 *   GET  /api/badges/stats            → 내 달개 통계 조회
 *   GET  /api/badges/stats/{userId}   → 특정 사용자 달개 통계 조회
 *   GET  /api/badges/ranking/global   → 전체 사용자 달개 랭킹
 *   GET  /api/badges/ranking/friends  → 친구들 달개 랭킹
 *   GET  /api/badges/types            → 전체 달개 유형 카탈로그
 *   GET  /api/albums/latest-friend    → 최근 친구 스토리 요약 조회
 *   (달개 전달 기능은 백엔드 미구현으로 항상 에러 throw)
 *
 * ─────────────────────────────────────────────────────────
 * [백엔드 → 프론트엔드 데이터 변환 (필드 매핑)]
 *
 *   백엔드 BadgeStatsDto:
 *   {
 *     totalCount  : number,          // 총 달개 수
 *     typeCounts  : [                // 유형별 집계 배열
 *       {
 *         typeName : string,         // 달개 유형 이름
 *         emoji    : string,         // 이모지
 *         count    : number          // 해당 유형 달개 수
 *       }
 *     ]
 *   }
 *
 *   프론트엔드 변환 후 형태:
 *   {
 *     totalBadges  : number,         // totalCount → totalBadges 로 rename
 *     recentBadges : [               // typeCounts → recentBadges 로 rename 및 변환
 *       {
 *         id       : number,         // 배열 인덱스 + 1 (임시 ID)
 *         name     : string,         // typeName → name 으로 rename
 *         emoji    : string,         // 그대로 유지
 *         count    : number          // 그대로 유지
 *       }
 *     ],
 *     level        : number,         // Math.floor(totalBadges / 5) + 1 로 계산
 *     typeCounts   : array           // 원본 데이터도 함께 보존
 *   }
 *
 *   백엔드 BadgeTypeDto:
 *   {
 *     id          : number,
 *     name        : string,
 *     emoji       : string,
 *     sortOrder   : number,
 *     description : string
 *   }
 *
 *   프론트엔드 변환 후 형태:
 *   {
 *     id          : number,
 *     category    : 'BADGE',         // 하드코딩된 고정 값
 *     title       : string,          // name → title 로 rename
 *     description : string,
 *     emoji       : string,
 *     imageUrl    : string           // '/badges/banana_first_drop.png' 폴백 이미지
 *   }
 *
 * ─────────────────────────────────────────────────────────
 * [랭킹 API 파라미터]
 *   getGlobalRanking / getFriendsRanking의 params 객체:
 *   {
 *     page  : number,  // 페이지 번호 (0부터 시작, Spring Pageable 기준)
 *     size  : number   // 페이지당 항목 수
 *   }
 *
 *   랭킹 응답 (Page<BadgeRankingItemDto>):
 *   {
 *     content      : [{ userId, username, profileImageUrl, totalBadges, rank }],
 *     totalPages   : number,
 *     totalElements: number,
 *     ...           // Spring Page 기타 필드
 *   }
 *
 * ─────────────────────────────────────────────────────────
 * [에러 처리 전략 - Graceful Fallback]
 *   이 서비스의 대부분 함수는 try-catch를 사용하여 에러가 발생해도
 *   앱이 중단되지 않도록 빈 기본값을 반환한다.
 *   단, giveBadge()는 백엔드 미구현이므로 항상 Error를 throw한다.
 *
 *   함수별 폴백 반환값:
 *   - getMyStats()       : { level: 1, totalBadges: 0, recentBadges: [], typeCounts: [] }
 *   - getUserStats()     : { totalBadges: 0, recentBadges: [], level: 1, typeCounts: [] }
 *   - getGlobalRanking() : { content: [], totalPages: 0 }
 *   - getFriendsRanking(): { content: [], totalPages: 0 }
 *   - getAllTypes()       : 하드코딩된 더미 달개 유형 4개 배열
 *   - getLatestFriendStory(): null
 *
 * ─────────────────────────────────────────────────────────
 * [레벨 계산 공식]
 *   level = Math.floor(totalBadges / 5) + 1
 *   예: 달개 0개 → 1레벨, 5개 → 2레벨, 10개 → 3레벨
 *   (백엔드에 레벨 필드가 없으므로 프론트엔드에서 계산)
 *
 * ─────────────────────────────────────────────────────────
 * [관련 파일]
 *   - src/api/apiClient.js               : axios 인스턴스
 *   - src/pages/badges/BadgesPage.jsx    : getMyStats(), getAllTypes() 사용
 *   - src/pages/badges/BadgeRankingPage.jsx : getGlobalRanking(), getFriendsRanking() 사용
 *   - src/pages/friends/FriendProfilePage.jsx : getUserStats() 사용
 */
import apiClient from './apiClient';

/**
 * badgeService 객체
 *
 * 달개(배지) 관련 모든 API를 묶어 named export한다.
 * 사용: import { badgeService } from './badgeService';
 */
export const badgeService = {

    /* ═══ 실제 API 호출 (백엔드 연결 모드) ═══ */

    /**
     * [1] 내 달개 통계 조회
     *
     * 현재 로그인한 사용자의 달개 수령 통계를 조회하고,
     * 백엔드 형식에서 프론트엔드 형식으로 데이터를 변환하여 반환한다.
     *
     * 데이터 변환 과정:
     *   1. totalCount 필드를 totalBadges로 rename
     *      (백엔드가 totalBadges로 줄 수도 있으므로 ?? 연산자로 양쪽 모두 대응)
     *   2. typeCounts 배열을 recentBadges 배열로 변환
     *      - 각 항목의 typeName 필드를 name으로 rename
     *      - 임시 id를 배열 인덱스 + 1로 부여
     *      - emoji 없으면 '🏅' 기본값 사용
     *   3. 총 달개 수를 기반으로 레벨을 계산 (5개당 1레벨)
     *
     * @returns {Promise<Object>} 변환된 달개 통계 데이터
     *   {
     *     totalBadges  : number,   // 총 달개 수 (0 이상)
     *     recentBadges : Array,    // 유형별 달개 목록
     *                              // [{ id, name, emoji, count }]
     *     level        : number,   // 계산된 레벨 (1 이상)
     *     typeCounts   : Array     // 원본 typeCounts 배열
     *   }
     *
     * 에러 시: console.warn 출력 후 기본값 { level: 1, totalBadges: 0, recentBadges: [], typeCounts: [] } 반환
     *
     * HTTP: GET /api/badges/stats
     * 인증 필요: 예
     */
    getMyStats: async () => {
        // TODO: GET /badges/stats 를 호출하고, 백엔드 형식을 프론트엔드 형식으로 변환하여 반환하세요.
        // 힌트:
        //   try {
        //     response = await apiClient.get('/badges/stats')
        //     const data = response.data || {}
        //     badgesCount = data.totalCount ?? data.totalBadges ?? 0
        //     calculatedLevel = Math.floor(badgesCount / 5) + 1
        //     recentBadges = (data.typeCounts || []).map((tc, idx) => ({
        //       id: idx + 1, name: tc.typeName || tc.name || '달개', emoji: tc.emoji || '🏅', count: tc.count || 0
        //     }))
        //     return { totalBadges: badgesCount, recentBadges, level: calculatedLevel, typeCounts: data.typeCounts || [] }
        //   } catch(error) {
        //     console.warn(...); return { level: 1, totalBadges: 0, recentBadges: [], typeCounts: [] }
        //   }
        try {
            const response = await apiClient.get('/badges/stats');
            const data = response.data || {}; //앞이 falsy한 값이면 {}를 쓰겠다
            const badgesCount = data.totalCount || data.totalBadges || 0;
            const calculatedLevel = Math.floor(badgesCount / 5) + 1;
            const recentBadges = (data.typeCounts || []).map((tc, idx) => ({
                //typeCounts 는 백엔드에서 받아오는 배지유형별 집계 배열
                //tc는 typeCounts의 각 항목
                //tc는 { typeName, count } 형식의 객체
                //map을통해서 recentBadges 배열을 생성
                id: idx + 1,
                name: tc.typeName || tc.name || '달개',
                emoji: tc.emoji || '🏅',
                count: tc.count || 0
            }));
            console.log('[뱃지 getMyStats] 응답:', { badgesCount, calculatedLevel, recentBadges });
            return { totalBadges: badgesCount, recentBadges, level: calculatedLevel, typeCounts: data.typeCounts || [] };
            //객체반환이고 recentBadges는 단축프로퍼티
        } catch (error) {
            console.warn('[뱃지 getMyStats] 실패, 기본값 반환:', error);
            return { level: 1, totalBadges: 0, recentBadges: [], typeCounts: [] };
        }
    },

    /**
     * [2] 특정 사용자의 달개 통계 조회
     *
     * 다른 사용자의 프로필 페이지에서 해당 사용자의 달개 수령 통계를 조회한다.
     * getMyStats()와 동일한 데이터 변환 로직을 사용하지만,
     * URL 경로에 userId를 포함하여 특정 사용자를 지정한다.
     *
     * @param {number|string} userId - 통계를 조회할 대상 사용자의 ID
     *
     * @returns {Promise<Object>} 변환된 달개 통계 데이터
     *   {
     *     totalBadges  : number,   // 해당 사용자의 총 달개 수
     *     recentBadges : Array,    // 유형별 달개 목록 [{ id, name, emoji, count }]
     *     level        : number,   // 계산된 레벨
     *     typeCounts   : Array     // 원본 typeCounts 배열
     *   }
     *
     * 에러 시: console.warn 출력 후 기본값 반환 (앱 중단 방지)
     *
     * HTTP: GET /api/badges/stats/{userId}
     * 인증 필요: 예
     */
    getUserStats: async (userId) => {
        // TODO: GET /badges/stats/{userId} 를 호출하고, 백엔드 형식을 프론트엔드 형식으로 변환하여 반환하세요.
        // 힌트:
        //   try {
        //     response = await apiClient.get(`/badges/stats/${userId}`)
        //     const data = response.data || {}
        //     badgesCount = data.totalCount ?? 0
        //     recentBadges = (data.typeCounts || []).map((tc, idx) => ({
        //       id: idx + 1, name: tc.typeName || '달개', emoji: tc.emoji || '🏅', count: tc.count || 0
        //     }))
        //     return { totalBadges: badgesCount, recentBadges, level: Math.floor(badgesCount/5)+1, typeCounts: data.typeCounts||[] }
        //   } catch(error) { console.warn(...); return { totalBadges: 0, recentBadges: [], level: 1, typeCounts: [] } }
        try {
            const response = await apiClient.get(`/badges/stats/${userId}`);
            const data = response.data || {};
            const badgesCount = data.totalCount || data.totalBadges || 0;
            const calculatedLevel = Math.floor(badgesCount / 5) + 1;
            const recentBadges = (data.typeCounts || []).map((tc, idx) => ({
                id: idx + 1,
                name: tc.typeName || tc.name || '달개',
                emoji: tc.emoji || '🏅',
                count: tc.count || 0
            }));
            console.log('[뱃지 getUserStats]', userId, ':', { badgesCount, calculatedLevel });
            return { totalBadges: badgesCount, recentBadges, level: calculatedLevel, typeCounts: data.typeCounts || [] };
        } catch (error) {
            console.warn('[뱃지 getUserStats] 실패:', error);
            return { level: 1, totalBadges: 0, recentBadges: [], typeCounts: [] };
        }
    },

    /**
     * [3] 글로벌(전체 사용자) 달개 랭킹 조회
     *
     * 앱 전체 사용자 중 달개를 가장 많이 받은 순서로 랭킹을 조회한다.
     * Spring Data JPA의 Pageable을 사용하므로 페이지 번호(0부터 시작)와
     * 페이지 크기를 파라미터로 전달한다.
     *
     * @param {Object} params       - 페이징 파라미터 객체 (선택, 없으면 undefined)
     * @param {number} params.page  - 페이지 번호 (0부터 시작, 예: 0 = 1페이지)
     * @param {number} params.size  - 페이지당 표시할 항목 수 (예: 10)
     *
     * @returns {Promise<Object>} 페이징된 랭킹 응답
     *   {
     *     content       : [{ userId, username, profileImageUrl, totalBadges, rank }],
     *     totalPages    : number,
     *     totalElements : number,
     *     ... // Spring Page 추가 필드
     *   }
     *
     * 에러 시: { content: [], totalPages: 0 } 반환
     *
     * HTTP: GET /api/badges/ranking/global?page=0&size=10
     * 인증 필요: 예
     */
    getGlobalRanking: async (params) => {
        // TODO: GET /badges/ranking/global 를 호출하고 response.data를 반환하세요.
        // 힌트:
        //   try {
        //     response = await apiClient.get('/badges/ranking/global', { params })
        //     return response.data
        //   } catch(error) { console.warn(...); return { content: [], totalPages: 0 } }
        try {
            const response = await apiClient.get('/badges/ranking/global', { params }); //params는 페이지번호,크기
            console.log('[뱃지 globalRanking] 응답:', response.data?.content?.length, '명');
            return response.data;
        } catch (error) {
            console.warn('[뱃지 globalRanking] 실패:', error);
            return { content: [], totalPages: 0 };
        }
    },

    /**
     * [4] 친구들 달개 랭킹 조회
     *
     * 현재 로그인한 사용자의 친구 목록 내에서 달개를 많이 받은 순서로 랭킹을 조회한다.
     * 글로벌 랭킹과 동일한 파라미터 형식과 응답 형식을 사용하며,
     * 엔드포인트만 다르다.
     *
     * @param {Object} params       - 페이징 파라미터 객체 (선택)
     * @param {number} params.page  - 페이지 번호 (0부터 시작)
     * @param {number} params.size  - 페이지당 항목 수
     *
     * @returns {Promise<Object>} 페이징된 친구 랭킹 응답
     *   {
     *     content       : [{ userId, username, profileImageUrl, totalBadges, rank }],
     *     totalPages    : number,
     *     totalElements : number
     *   }
     *
     * 에러 시: { content: [], totalPages: 0 } 반환
     *
     * HTTP: GET /api/badges/ranking/friends?page=0&size=10
     * 인증 필요: 예
     */
    getFriendsRanking: async (params) => {
        // TODO: GET /badges/ranking/friends 를 호출하고 response.data를 반환하세요.
        // 힌트:
        //   try {
        //     response = await apiClient.get('/badges/ranking/friends', { params })
        //     return response.data
        //   } catch(error) { console.warn(...); return { content: [], totalPages: 0 } }
        try {
            const response = await apiClient.get('/badges/ranking/friends', { params }); //params는 페이지번호,크기
            console.log('[friendsRanking] 응답:', response.data?.content?.length, '명');
            return response.data;
        } catch (error) {
            console.warn('[friendsRanking] 실패:', error);
            return { content: [], totalPages: 0 };
        }
    },

    /**
     * [5] 서버 제공 전체 달개 유형 카탈로그 조회
     *
     * 백엔드에 정의된 모든 달개 유형(이모지 종류)을 조회하고
     * 프론트엔드 표시에 적합한 형태로 변환하여 반환한다.
     *
     * 데이터 변환 과정:
     *   백엔드 BadgeTypeDto의 name 필드 → title로 rename
     *   category 필드를 'BADGE'로 고정 (백엔드에 해당 필드 없음)
     *   imageUrl 필드를 '/badges/banana_first_drop.png'로 고정 (폴백 이미지)
     *
     * @returns {Promise<Array>} 변환된 달개 유형 배열
     *   [
     *     {
     *       id          : number,
     *       category    : 'BADGE',    // 고정값
     *       title       : string,     // 달개 유형 이름 (예: "좋아요")
     *       description : string,     // 달개 설명
     *       emoji       : string,     // 이모지 (예: "❤️")
     *       imageUrl    : string      // 달개 이미지 URL (현재 고정값)
     *     }
     *   ]
     *
     * 에러 시: 하드코딩된 더미 달개 유형 4개 배열 반환
     *   [좋아요(❤️), 슬퍼요(😢), 화나요(😠), 응원해요(💪)]
     *
     * HTTP: GET /api/badges/types
     * 인증 필요: 예
     */
    getAllTypes: async () => {
        // TODO: GET /badges/types 를 호출하고, 백엔드 형식을 프론트엔드 형식으로 변환하여 반환하세요.
        // 힌트:
        //   try {
        //     response = await apiClient.get('/badges/types')
        //     return response.data.map(type => ({
        //       id: type.id, category: 'BADGE', title: type.name || '달개',
        //       description: type.description || '', emoji: type.emoji || '🏅',
        //       imageUrl: '/badges/banana_first_drop.png'
        //     }))
        //   } catch(error) {
        //     console.warn(...)
        //     return [ 4개의 더미 달개 유형 배열: 좋아요❤️, 슬퍼요😢, 화나요😠, 응원해요💪 ]
        //   }
        try {
            const response = await apiClient.get('/badges/types');
            const mapped = response.data.map(type => ({
                id: type.id,
                category: 'BADGE',
                title: type.name || '달개',
                description: type.description || '',
                emoji: type.emoji || '🏅'
            }));
            console.log('[badgeTypes] 응답:', mapped.length, '개');
            return mapped;
        } catch (error) {
            console.warn('[badgeTypes] 실패:', error);
            return [];
        }
    },

    /**
     * [6] 최근 친구 스토리 요약 조회
     *
     * 홈 피드 등에서 친구의 최신 앨범 활동 요약을 가져올 때 사용한다.
     * 이 API는 badges 서비스 파일에 있지만, 실제로는 albums 엔드포인트를 호출한다.
     * (달개 페이지의 상단 스토리 섹션에서 사용)
     *
     * @returns {Promise<Object|null>} 최근 친구 스토리 요약 데이터 또는 null
     *   예: { userId, username, albumId, title, thumbUrl, createdAt }
     *   에러 시: null 반환 (UI에서 null 체크 필요)
     *
     * HTTP: GET /api/albums/latest-friend
     * 인증 필요: 예
     */
    // getLatestFriendStory: async () => { // 이거 불필요한 코드 같음
    //     // TODO: GET /albums/latest-friend 를 호출하고 response.data를 반환하세요.
    //     // 힌트: albums 엔드포인트를 호출합니다 (badges가 아님에 주의).
    //     //   try { response = await apiClient.get('/albums/latest-friend'); return response.data }
    //     //   catch(error) { console.warn(...); return null }

    getGlobalStats: async () => {
        try {
            const response = await apiClient.get('/badges/stats/global');
            const data = response.data || {};
            const badgesCount = data.totalCount || data.totalBadges || 0;
            const recentBadges = (data.typeCounts || []).map((tc, idx) => ({
                id: idx + 1,
                name: tc.typeName || tc.name || '달개',
                emoji: tc.emoji || '🏅',
                count: tc.count || 0
            }));
            return { totalBadges: badgesCount, recentBadges, typeCounts: data.typeCounts || [] };
        } catch (error) {
            console.warn('[뱃지 getGlobalStats] 실패:', error);
            return { totalBadges: 0, recentBadges: [], typeCounts: [] };
        }
    },

    toggleAlbumDalgae: async (albumId, badgeTypeId) => {
        const response = await apiClient.post(
            `/badges/albums/${albumId}/toggle`,
            null,
            { params: { badgeTypeId } } // 전달할 데이터가 하나라 바디대신 쿼리스트링으로
        );
        console.log('[toggleDalgae] albumId:', albumId, '/ badgeTypeId:', badgeTypeId, '/ 응답:', response.data);
        return response.data;
    },

    getAlbumDalgae: async (albumId) => {
        const response = await apiClient.get(`/badges/albums/${albumId}`);
        console.log('[getAlbumDalgae] albumId:', albumId, '/ 응답:', response.data);
        return response.data;
    }
};
