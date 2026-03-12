/**
 * @file FriendProfilePage.jsx
 * @route /friend/:friendId
 *
 * @description
 * 특정 유저(글벗)의 프로필 페이지.
 * URL 파라미터 friendId 로 대상 유저를 식별하고,
 * 3개의 API 를 병렬로 호출하여 프로필 정보, 게시물 목록, 글벗 관계를 로드한다.
 * 로그인한 사용자가 해당 유저와의 글벗 관계를 맺거나 해제할 수 있다.
 *
 * @layout
 * ┌─────────────────────────────────────────┐
 * │  [Header] (sticky)                      │
 * │    ← 뒤로가기    {username}             │
 * ├─────────────────────────────────────────┤
 * │  [Profile Info]                         │
 * │    프로필 이미지 (rounded-[28px])        │
 * │    유저명 + #ID                         │
 * │    [글벗 요청/해제 버튼] [메시지(준비중)]│
 * │    [Stats: 게시물 / 글벗 / 달개]        │
 * │    [레벨 진행 바 (LV.N Progress)]       │
 * ├─────────────────────────────────────────┤
 * │  [Posts Tab] (Grid 아이콘)              │
 * ├─────────────────────────────────────────┤
 * │  [Posts Grid] (3열)                     │
 * │    로딩 중 → "Loading..." 애니메이션    │
 * │    게시물 있음 → 이미지 썸네일 그리드   │
 * │    게시물 없음 → "No Snap Yet"          │
 * └─────────────────────────────────────────┘
 *
 * @urlParams
 *   friendId {string} - URL에서 추출한 대상 유저의 ID
 *
 * @state
 *   user          - 대상 유저 프로필 객체. null 이면 로딩 중 또는 유저 없음
 *                   { id, username, profileImageUrl, totalBadges, friendCount }
 *   isLoading     - 프로필 API 완료 여부. true 이면 "Loading Profile..." 표시
 *   userPosts     - 대상 유저의 게시물 배열 (앨범 피드에서 authorId 필터링)
 *                   [ { id, imageUrl, authorId } ]
 *   postsLoading  - 게시물 API 완료 여부. true 이면 게시물 영역에 로딩 표시
 *   isRequesting  - 글벗 요청/해제 API 호출 중. true 이면 버튼에 Loader2 스피너
 *   requestStatus - 현재 글벗 관계 상태
 *                   'none'     → 관계 없음 (글벗 요청 버튼 표시)
 *                   'pending'  → 요청 전송 완료 대기 중 (비활성 버튼)
 *                   'accepted' → 이미 글벗 (글벗 해제 버튼 표시)
 *   friendshipId  - 현재 글벗 관계 ID. 해제(DELETE) API 에 사용
 *
 * @levelCalculation
 *   level    = Math.floor(totalBadges / 5) + 1
 *   progress = (totalBadges % 5) * 20  (%)
 *   예: 달개 7개 → LV.2, 진행도 40%
 *
 * @api (3개 병렬 호출, 마운트 시 동시 시작)
 *   [1] userService.getUserProfile(friendId)
 *       → GET /api/users/{friendId}
 *       성공: setUser(data)
 *       실패: 기본 객체로 setUser (id, username, profileImageUrl:null, totalBadges:0, friendCount:0)
 *       완료(성공/실패 모두): setIsLoading(false) → 페이지 UI 표시
 *
 *   [2] apiClient.get('/albums/feed', { params: { type: 'photo' } })
 *       → GET /api/albums/feed?type=photo
 *       응답 배열에서 authorId === friendId 인 항목만 필터링하여 setUserPosts
 *       완료: setPostsLoading(false)
 *
 *   [3] friendService.listFriends()
 *       → GET /api/friends
 *       목록에서 userId|id === friendId 인 항목 찾기
 *       찾으면: setRequestStatus('accepted'), setFriendshipId(matched.friendshipId)
 *       못 찾으면: setRequestStatus('none')
 *
 * @handleFriendAction
 *   requestStatus === 'accepted':
 *     → friendService.removeFriend(friendshipId) (DELETE /api/friends/{friendshipId})
 *     → setRequestStatus('none'), setFriendshipId(null)
 *     → "글벗 관계가 해제되었습니다." 알림
 *   requestStatus === 'none':
 *     → friendService.sendRequest(friendId) (POST /api/friends/request)
 *     → setRequestStatus('pending')
 *     → "글벗 요청을 보냈습니다." 알림
 *   requestStatus === 'pending': 버튼 자체가 disabled → 동작 없음
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, Grid, Loader2, Plus } from 'lucide-react';
import { userService } from '@/api/userService';
import { friendService } from '@/api/friendService';
import apiClient from '@/api/apiClient';
import { DEFAULT_AVATAR, DEFAULT_POST_IMAGE, getImageUrl } from '@/utils/imageUtils';
import { useAlert } from '@/context/AlertContext';

export default function FriendProfilePage() {
    // URL 파라미터에서 대상 유저 ID 추출
    const { friendId } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    /**
     * @state user
     * GET /api/users/{friendId} 응답 객체.
     * null 이면 아직 API 응답 대기 중(isLoading:true) 또는 유저 없음.
     * 구조: {
     *   id: string|number,
     *   username: string,
     *   profileImageUrl: string,  // 서버 경로 (getImageUrl 로 변환)
     *   totalBadges: number,      // 보유 달개 수 (레벨 계산 및 Stats 표시용)
     *   friendCount: number       // 글벗 수 (Stats 표시용)
     * }
     */
    const [user, setUser] = useState(null);

    /**
     * @state isLoading
     * 프로필 API([1]) 완료 여부.
     * true 이면 전체 페이지 대신 "Loading Profile..." 화면을 표시.
     * API [1] 의 finally 에서 false 로 전환됨.
     */
    const [isLoading, setIsLoading] = useState(true);

    /**
     * @state userPosts
     * 앨범 피드에서 authorId === friendId 로 필터링한 게시물 배열.
     * 게시물 그리드(3열)에서 썸네일로 표시됨.
     * 구조: Array<{
     *   id: string|number,
     *   imageUrl: string,   // 썸네일 이미지 URL (getImageUrl 로 변환)
     *   authorId: string|number
     * }>
     */
    const [userPosts, setUserPosts] = useState([]);

    /**
     * @state postsLoading
     * 게시물 API([2]) 완료 여부.
     * true 이면 게시물 영역에 "Loading..." 애니메이션 표시.
     * Stats의 게시물 수도 postsLoading 중에는 '-' 로 표시됨.
     */
    const [postsLoading, setPostsLoading] = useState(true);

    /**
     * @state isRequesting
     * handleFriendAction 의 API 호출 중 여부.
     * true 이면 글벗 버튼에 Loader2 스피너 표시 및 버튼 disabled.
     */
    const [isRequesting, setIsRequesting] = useState(false);

    /**
     * @state requestStatus
     * 로그인 유저와 friendId 유저 간의 글벗 관계 상태.
     * 'none'     → 관계 없음 → 검정 배경 "글벗 요청" 버튼
     * 'pending'  → 요청 전송 후 대기 → 회색 배경 "요청 대기중" 비활성 버튼
     * 'accepted' → 이미 글벗 → 흰색 배경 "글벗 해제" 버튼
     */
    const [requestStatus, setRequestStatus] = useState('none');

    /**
     * @state friendshipId
     * 현재 글벗 관계의 ID.
     * requestStatus === 'accepted' 일 때 DELETE API 에 사용.
     * 글벗 해제 후 null 로 초기화됨.
     */
    const [friendshipId, setFriendshipId] = useState(null);

    /**
     * @useEffect 3개 병렬 API 호출 (마운트 및 friendId 변경 시)
     * @trigger friendId 변경 시 (deps: [friendId])
     *          friendId 가 없으면 즉시 return
     *
     * 세 API 를 동시에 시작하고 각각 독립적으로 상태를 업데이트한다.
     *
     * [API 1] 프로필 로드: userService.getUserProfile(friendId)
     *   성공: setUser(data)
     *   실패: setUser({ id: friendId, username: `User ${friendId}`, profileImageUrl: null,
     *                   totalBadges: 0, friendCount: 0 }) (fallback 기본 객체)
     *   완료: setIsLoading(false) → 페이지 본문 표시
     *
     * [API 2] 게시물 로드: GET /api/albums/feed?type=photo
     *   전체 피드를 받아서 authorId === friendId 인 항목만 필터링
     *   성공: setUserPosts(filtered)
     *   실패: setUserPosts([])
     *   완료: setPostsLoading(false)
     *
     * [API 3] 글벗 상태 확인: friendService.listFriends()
     *   내 글벗 목록에서 userId|id === friendId 인 항목 탐색
     *   찾으면: setRequestStatus('accepted') + setFriendshipId(matched.friendshipId)
     *   못 찾으면: setRequestStatus('none')
     *   실패: 무시 (catch(() => {}))
     */
    useEffect(() => {
        if (!friendId) return;

        // TODO: Promise.allSettled([userService.getUserProfile(friendId), badgeService.getUserStats(friendId), friendService.listFriends()]) 3개 병렬 호출
        // 힌트: 3개의 API를 각각 독립적으로 호출합니다 (.then/.catch/.finally 체인 사용).
        //
        // [API 1] userService.getUserProfile(friendId)
        //   성공: setUser(data)
        //   실패: setUser({ id: friendId, username: `User ${friendId}`, profileImageUrl: null, totalBadges: 0, friendCount: 0 })
        //   완료: setIsLoading(false)
        //
        // [API 2] apiClient.get('/albums/feed', { params: { type: 'photo' } })
        //   성공: 응답 배열에서 authorId === friendId 인 항목만 필터링하여 setUserPosts()
        //   실패: setUserPosts([])
        //   완료: setPostsLoading(false)
        //
        // [API 3] friendService.listFriends()
        //   성공: 목록에서 userId|id === friendId 인 항목 탐색
        //         찾으면 setRequestStatus('accepted') + setFriendshipId(matched.friendshipId)
        //         못 찾으면 setRequestStatus('none')
        //   실패: 무시 (catch(() => {}))
        setIsLoading(true);
        setPostsLoading(true);
        // [API 1] userService.getUserProfile(friendId)
        userService.getUserProfile(friendId)
            .then(data => setUser(data))
            .catch(() => setUser({
                id: friendId,
                username: `User ${friendId}`,
                profileImageUrl: null,
                totalBadges: 0,
                friendCount: 0
            }))
            .finally(() => setIsLoading(false));
        // [API 2] apiClient.get('/albums/feed', ... )
        apiClient.get('/albums/feed', { params: { type: 'photo' } })
            .then(response => {
                const filtered = (response.data || []).filter(post => String(post.authorId) === String(friendId));
                setUserPosts(filtered);
            })
            .catch(() => setUserPosts([]))
            .finally(() => setPostsLoading(false));
        // [API 3] friendService.listFriends()
        friendService.listFriends()
            .then(friends => {
                const matched = (friends || []).find(f => String(f.userId || f.id) === String(friendId));
                if (matched) {
                    setRequestStatus('accepted');
                    setFriendshipId(matched.friendshipId);
                } else {
                    setRequestStatus('none');
                }
            })
            .catch(() => { });
    }, [friendId]);

    /**
     * @function handleFriendAction
     * 글벗 관계 버튼 클릭 핸들러. requestStatus 에 따라 동작이 달라진다.
     *
     * requestStatus === 'accepted' (현재 글벗):
     *   → friendService.removeFriend(friendshipId)
     *      DELETE /api/friends/{friendshipId}
     *   → 성공: setRequestStatus('none'), setFriendshipId(null)
     *           "글벗 관계가 해제되었습니다." 알림
     *
     * requestStatus === 'none' (관계 없음):
     *   → friendService.sendRequest(friendId)
     *      POST /api/friends/request (body: { targetUserId: friendId })
     *   → 성공: setRequestStatus('pending')
     *           "글벗 요청을 보냈습니다." 알림
     *
     * requestStatus === 'pending':
     *   → 버튼이 disabled 이므로 이 함수가 호출되지 않음
     *
     * isRequesting: API 호출 전 true, 완료(성공/실패) 후 false
     * 에러: "오류가 발생했습니다. 다시 시도해주세요." 알림
     */
    const handleFriendAction = async () => {
        // [1] setIsRequesting(true) 로 로딩 상태 시작
        setIsRequesting(true);
        try {
            // [2] 친구 해제 동작 (이미 친구인 경우)
            if (requestStatus === 'accepted') {
                await friendService.removeFriend(friendshipId);
                setRequestStatus('none');
                setFriendshipId(null);
                showAlert('글벗 관계가 해제되었습니다.', '해제 성공', 'success');
            }
            // [3] 친구 신청 동작 (아무 관계가 없는 경우)
            else if (requestStatus === 'none') {
                const response = await friendService.sendRequest(friendId);

                await friendService.sendRequest(friendId);
                // 성공 시 상태를 즉시 pending으로 변경하여 중복 클릭 방지
                setRequestStatus('pending');
                showAlert('글벗 요청을 보냈습니다.', '요청 성공', 'success');
            }
        } catch (error) {
            console.error('친구 요청 오류:', error);

            // [4] 서버에서 보낸 구체적인 에러 메시지 추출
            // java.lang.IllegalArgumentException 메시지가 error.response.data에 담겨 옵니다.
            const errorMessage = error.response?.data || '오류가 발생했습니다. 다시 시도해주세요.';
            const serverMessage = error.response?.data;
            // 만약 이미 요청된 상태라는 에러라면 화면 상태를 갱신해주는 것이 좋습니다.
            if (errorMessage.includes("이미 친구이거나 요청이 진행 중")) {
                showAlert(serverMessage || '이미 처리된 요청입니다.', '알림', 'info');
                if (serverMessage?.includes("이미")) {
                    setRequestStatus('pending');
                }
            } else {
                showAlert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.', '오류', 'alert');
            }
        } finally {
            // [5] 로딩 상태 종료
            setIsRequesting(false);
        }
    };

    // isLoading === true: 프로필 API 완료 전 → 전체 로딩 화면 표시
    if (isLoading) return (
        <ResponsiveLayout showTabs={false}>
            <div className="p-20 text-center font-bold animate-pulse text-gray-400 italic uppercase tracking-widest">
                Loading Profile...
            </div>
        </ResponsiveLayout>
    );

    // user === null: API 완료 후에도 유저 없음 → 오류 화면 표시
    if (!user) return (
        <ResponsiveLayout showTabs={false}>
            <div className="p-20 text-center">
                <p className="text-gray-500 font-bold mb-4">사용자를 찾을 수 없습니다.</p>
                <button onClick={() => navigate(-1)} className="px-6 py-2 bg-black text-white rounded-full font-bold text-sm">돌아가기</button>
            </div>
        </ResponsiveLayout>
    );

    return (
        // showTabs={false}: 하단 내비게이션 숨김 (서브 페이지)
        <ResponsiveLayout showTabs={false}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5]">

                {/* ──────────────────────────────────────────────────────
                    Header (sticky, top-0)
                    - 좌측: ArrowLeft 버튼 → navigate(-1)
                    - 가운데: {user.username} 표시
                    - 우측: 여백(중앙 정렬 유지)
                ────────────────────────────────────────────────────── */}
                <div className="flex items-center h-14 px-4 sticky top-0 bg-white dark:bg-[#1c1f24] z-10 border-b border-[#e5e5e5] dark:border-[#292e35]">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="flex-1 text-center font-bold text-[16px] mr-8">{user.username}</h1>
                </div>

                {/* ──────────────────────────────────────────────────────
                    Profile Info 영역
                    구성 요소:
                    [1] 프로필 이미지 (w-24 h-24 rounded-[28px], 실패 시 DEFAULT_AVATAR)
                    [2] 유저명 (18px bold) + #ID (회색 13px)
                    [3] 글벗 관계 버튼 + 메시지 버튼:
                         requestStatus에 따라 버튼 스타일/텍스트 3가지:
                           'none'     → 검정 배경 "글벗 요청"
                           'pending'  → 회색 배경 비활성 "요청 대기중"
                           'accepted' → 흰색 배경 "글벗 해제"
                         isRequesting === true → Loader2 스피너 표시
                         메시지 버튼은 현재 cursor-not-allowed (준비 중)
                    [4] Stats (게시물 / 글벗 / 달개):
                         게시물: postsLoading 중이면 '-', 완료 후 userPosts.length
                         글벗:   user.friendCount || 0
                         달개:   user.totalBadges || 0
                    [5] 레벨 진행 바:
                         level    = Math.floor(totalBadges / 5) + 1
                         progress = (totalBadges % 5) * 20 (%)
                         "LV.N Progress" 레이블 + "Next: LV.N+1" 우측 텍스트
                         진행 바 하단: "{totalBadges} / {(level)*5} Badges"
                ────────────────────────────────────────────────────── */}
                <div className="px-6 py-8 flex flex-col items-center">
                    {/* [1] 프로필 이미지 */}
                    <img
                        src={getImageUrl(user.profileImageUrl) || DEFAULT_AVATAR}
                        alt="p"
                        className="w-24 h-24 rounded-[28px] object-cover shadow-sm border border-[#f3f3f3] mb-4"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                    />
                    {/* [2] 유저명 + #ID */}
                    <h2 className="text-[18px] font-bold mb-1">{user.username}</h2>
                    <p className="text-[13px] text-[#7b8b9e] mb-6">#{user.id}</p>

                    {/* [3] 글벗 관계 버튼 + 메시지 버튼 */}
                    <div className="flex w-full gap-2 mb-8">
                        {/* 글벗 요청/해제 버튼
                            - 'pending'  → gray 배경, 비활성
                            - 'accepted' → 흰색 배경, "글벗 해제"
                            - 'none'     → 검정 배경, "글벗 요청"
                            isRequesting 중이면 Loader2 스피너 표시 */}
                        <button
                            onClick={handleFriendAction}
                            disabled={isRequesting || requestStatus === 'pending'}
                            className={`flex-1 h-10 rounded-[4px] font-bold text-[13px] flex items-center justify-center gap-1 transition-colors ${requestStatus === 'pending' ? 'bg-gray-200 text-gray-500 border border-gray-300' :
                                requestStatus === 'accepted' ? 'bg-white text-black border border-[#e5e5e5] hover:bg-gray-50' :
                                    'bg-black text-white hover:bg-gray-800'
                                }`}
                        >
                            {isRequesting ? <Loader2 className="animate-spin" size={16} /> : null}
                            {requestStatus === 'pending' ? '요청 대기중' : requestStatus === 'accepted' ? '글벗 해제' : '글벗 요청'}
                        </button>
                        {/* 메시지 버튼 (현재 미구현, cursor-not-allowed) */}
                        <button className="flex-1 h-10 border border-[#e5e5e5] dark:border-[#292e35] rounded-[4px] font-bold text-[13px] text-[#a3b0c1] cursor-not-allowed">
                            메시지(준비중)
                        </button>
                    </div>

                    {/* [4] Stats (게시물 / 글벗 / 달개) */}
                    <div className="flex w-full justify-around py-4 border-y border-[#f3f3f3] dark:border-[#292e35] mb-4">
                        {/* 게시물 수: postsLoading 중이면 '-' */}
                        <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-[14px]">{postsLoading ? '-' : userPosts.length}</span>
                            <span className="text-[11px] text-[#a3b0c1]">게시물</span>
                        </div>
                        {/* 글벗 수 */}
                        <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-[14px] font-mono">{user.friendCount || 0}</span>
                            <span className="text-[11px] text-[#a3b0c1]">글벗</span>
                        </div>
                        {/* 달개(배지) 수 */}
                        <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-[14px] font-mono">{user.totalBadges || 0}</span>
                            <span className="text-[11px] text-[#a3b0c1]">달개</span>
                        </div>
                    </div>

                    {/* [5] 레벨 진행 바
                        level    = Math.floor(totalBadges / 5) + 1
                        progress = (totalBadges % 5) * 20 (%)
                        예: 달개 7개 → LV.2, 진행도 40% */}
                    <div className="flex flex-col w-full py-4 px-2 bg-[#fafafa] dark:bg-[#1c1f24] rounded-[12px] border border-[#f3f3f3] dark:border-[#292e35]">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[14px]">🔥</span>
                                {/* LV.N Progress 레이블 */}
                                <span className="text-[11px] font-black italic tracking-widest text-black dark:text-[#e5e5e5] uppercase">LV.{Math.floor((user.totalBadges || 0) / 5) + 1} Progress</span>
                            </div>
                            {/* 다음 레벨 표시 */}
                            <span className="text-[10px] font-bold text-[#a3b0c1] uppercase">Next: LV.{Math.floor((user.totalBadges || 0) / 5) + 2}</span>
                        </div>
                        {/* 진행 바: 검정 채움 (width = (totalBadges % 5) * 20%) */}
                        <div className="w-full h-[6px] bg-[#e5e5e5] dark:bg-[#292e35] rounded-full overflow-hidden mb-1.5">
                            <div
                                className="h-full bg-black transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min(((user.totalBadges || 0) % 5) * 20, 100)}%` }}
                            ></div>
                        </div>
                        {/* 달개 수 텍스트: N / (level * 5) Badges */}
                        <div className="text-right px-1">
                            <span className="text-[9px] font-bold text-[#ccd3db] uppercase tracking-widest">
                                {user.totalBadges || 0} / {((Math.floor((user.totalBadges || 0) / 5) + 1) * 5)} Badges
                            </span>
                        </div>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────
                    Posts Tab 헤더 (Grid 아이콘만 표시)
                    현재 탭이 1개뿐이므로 항상 활성 상태 (border-b-2 고정)
                ────────────────────────────────────────────────────── */}
                <div className="flex border-b border-[#f3f3f3] dark:border-[#292e35]">
                    <div className="flex-1 py-3 flex justify-center text-black dark:text-[#e5e5e5] border-b-2 border-black dark:border-[#e5e5e5]">
                        <Grid size={20} />
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────
                    Posts Grid (3열 이미지 썸네일)
                    3가지 상태:
                    [1] postsLoading === true
                        → "Loading..." 텍스트 (animate-pulse)
                    [2] userPosts.length > 0 (게시물 있음)
                        → 3열 그리드로 이미지 썸네일 표시
                          클릭 시 /snap/{post.id} 로 이동
                          이미지 실패 시 DEFAULT_POST_IMAGE 표시
                          hover 시 이미지 scale-105
                    [3] userPosts.length === 0 (게시물 없음)
                        → Plus 아이콘(반투명) + "No Snap Yet" 텍스트
                ────────────────────────────────────────────────────── */}
                <div className="flex flex-wrap p-0.5">
                    {postsLoading ? (
                        /* 로딩 중 */
                        <div className="w-full py-20 flex items-center justify-center text-[#ccd3db] text-sm animate-pulse">
                            Loading...
                        </div>
                    ) : userPosts.length > 0 ? (
                        /* 게시물 썸네일 그리드 (3열, 3:4 비율) */
                        userPosts.map((post) => (
                            <div
                                key={post.id}
                                onClick={() => navigate(`/snap/${post.id}`)}
                                className="w-1/3 p-0.5 aspect-[3/4] relative group cursor-pointer overflow-hidden"
                            >
                                <img
                                    src={getImageUrl(post.imageUrl) || DEFAULT_POST_IMAGE}
                                    alt="post"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_POST_IMAGE; }}
                                />
                            </div>
                        ))
                    ) : (
                        /* 게시물 없음 */
                        <div className="w-full py-24 flex flex-col items-center justify-center text-[#ccd3db]">
                            <Plus size={40} className="mb-3 opacity-20" />
                            <p className="text-[12px] font-black italic tracking-widest uppercase opacity-40">No Snap Yet</p>
                        </div>
                    )}
                </div>
            </div>
        </ResponsiveLayout>
    );
}
