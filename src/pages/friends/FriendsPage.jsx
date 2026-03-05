/**
 * @file FriendsPage.jsx
 * @route /friends
 *
 * @description
 * 글벗(친구) 관리 메인 페이지.
 * 내 글벗 목록(LIST 탭)과 받은 글벗 요청(PENDING 탭)을 탭으로 구분하여 표시한다.
 * 상단 검색창에 입력하면 300ms 디바운스 후 실시간으로 유저를 검색하고
 * 결과를 드롭다운으로 보여준다.
 * UserPlus 버튼을 누르면 /add-friend 페이지로 이동한다.
 *
 * @layout
 * ┌─────────────────────────────────────────┐
 * │  [Section Title]                        │
 * │    Users 아이콘 + "MY FRIENDS"          │
 * │    "Connect with your style crew"       │
 * ├─────────────────────────────────────────┤
 * │  [Search & Add Bar] (sticky)            │
 * │    [검색 입력창] [UserPlus 버튼]         │
 * │    [실시간 검색 결과 드롭다운]           │
 * ├─────────────────────────────────────────┤
 * │  [Tabs] (sticky)                        │
 * │    [ ALL FRIENDS [N] ]  [ REQUESTS [N] ]│
 * ├─────────────────────────────────────────┤
 * │  [Content]                              │
 * │    LIST 탭:                             │
 * │      글벗 목록 (프로필+이름+삭제 버튼)  │
 * │      빈 경우: "Empty Crew"              │
 * │    PENDING 탭:                          │
 * │      받은 요청 목록 (ACCEPT/DECLINE)    │
 * │      빈 경우: "No Inbox"               │
 * ├─────────────────────────────────────────┤
 * │  [Footer]                               │
 * │    "SNAP 스타일의 새로운 글벗 문화"     │
 * └─────────────────────────────────────────┘
 *
 * @state
 *   friends       - 나의 글벗(친구) 목록
 *                   [ { id, userId, username, profileImageUrl, profileImage,
 *                       friendshipId, isCertified } ]
 *   pending       - 받은 글벗 신청 목록 (아직 수락/거절 안 한 것)
 *                   [ { id, userId, username, profileImageUrl, profileImage,
 *                       friendshipId } ]
 *   activeTab     - 현재 활성 탭. 'LIST'(글벗 목록) 또는 'PENDING'(받은 요청)
 *   searchQuery   - 검색창 입력값 (변경될 때마다 디바운스 useEffect 실행)
 *   searchResults - 검색 API 결과 배열 (드롭다운에 표시)
 *   isSearching   - 검색 API 호출 중 여부
 *
 * @api
 *   friendService.listFriends()         → GET /api/friends
 *   friendService.listPendingRequests() → GET /api/friends/pending
 *   friendService.searchUsers(query)    → GET /api/friends/search?q={query}
 *   friendService.removeFriend(id)      → DELETE /api/friends/{friendshipId}
 *   friendService.acceptRequest(id)     → POST /api/friends/{friendshipId}/accept
 *   friendService.rejectRequest(id)     → POST /api/friends/{friendshipId}/reject
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { UserPlus, UserMinus, Search, Users, ShieldCheck, Mail } from 'lucide-react';
import { friendService } from '@/api/friendService';
import { useAlert } from '@/context/AlertContext';
import { DEFAULT_AVATAR, getImageUrl } from '@/utils/imageUtils';

export default function FriendsPage() {
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useAlert();

    /**
     * @state friends
     * 서버에서 받아온 내 글벗(친구) 목록.
     * LIST 탭에서 렌더링되며, 탭 레이블에 friends.length 가 표시된다.
     * 글벗 삭제(handleRemoveFriend) 후 로컬에서도 즉시 제거된다.
     * 글벗 요청 수락(handleAcceptRequest) 후 pending 에서 이쪽으로 이동된다.
     * 구조: Array<{
     *   id: string|number,
     *   userId: string|number,
     *   username: string,
     *   profileImageUrl: string,   // 서버 경로 (getImageUrl 로 변환)
     *   profileImage: string,      // 구버전 필드 (fallback 용)
     *   friendshipId: string|number, // 삭제 API에 사용하는 관계 ID
     *   isCertified: boolean         // true 이면 ShieldCheck 뱃지 표시
     * }>
     */
    const [friends, setFriends] = useState([]);

    /**
     * @state pending
     * 아직 처리하지 않은 글벗 신청 목록 (받은 요청).
     * PENDING 탭에서 렌더링되며, 탭 레이블에 pending.length 가 표시된다.
     * 수락(handleAcceptRequest) 후 해당 항목이 friends 로 이동된다.
     * 거절(handleDeclineRequest) 후 해당 항목이 로컬에서 제거된다.
     * 구조: friends 와 동일한 필드 구조
     */
    const [pending, setPending] = useState([]);

    /**
     * @state activeTab
     * 현재 선택된 탭.
     * 'LIST'    → ALL FRIENDS: 내 글벗 목록 표시
     * 'PENDING' → REQUESTS: 받은 글벗 요청 목록 표시
     */
    const [activeTab, setActiveTab] = useState('LIST');

    /**
     * @state searchQuery
     * 검색창의 현재 입력값.
     * onChange 마다 갱신되며, 디바운스 useEffect 의 트리거 역할을 한다.
     * 빈 문자열이 되면 searchResults 를 [] 로 초기화한다.
     */
    const [searchQuery, setSearchQuery] = useState('');

    /**
     * @state searchResults
     * GET /api/friends/search?q={searchQuery} 의 응답 배열.
     * 검색창에 입력값이 있을 때 드롭다운 목록으로 표시된다.
     * 각 항목 클릭 시 /friend/{user.id|user.userId} 로 이동한다.
     */
    const [searchResults, setSearchResults] = useState([]);

    /**
     * @state isSearching
     * 검색 API 호출 중 여부.
     * (현재 UI에서 직접 사용되지 않지만 향후 로딩 인디케이터 용도로 예약됨)
     */
    const [isSearching, setIsSearching] = useState(false);

    /**
     * @useEffect 1 - 글벗 목록 및 대기 요청 초기 로드
     * @trigger 컴포넌트 최초 마운트 시 1회 실행 (deps: [])
     *
     * 동작:
     *   1. friendService.listFriends()         → GET /api/friends
     *      응답을 setFriends 에 저장
     *   2. friendService.listPendingRequests() → GET /api/friends/pending
     *      응답을 setPending 에 저장
     *   두 호출은 순차(await) 실행됨
     * 에러 시 콘솔에 출력하고 상태는 빈 배열로 유지
     */
    useEffect(() => {
        // TODO: friendService.listFriends()와 friendService.listPendingRequests() 병렬 호출
        // 힌트: Promise.all([...]) 또는 순차 await로 두 API를 호출하고
        //       각 결과를 setFriends(), setPending()에 저장하세요.
        //       에러 발생 시 console.error로 출력합니다.
    }, []);

    /**
     * @useEffect 2 - 실시간 검색 (디바운스 300ms)
     * @trigger searchQuery 가 변경될 때마다 실행 (deps: [searchQuery])
     *
     * 동작:
     *   1. setTimeout 으로 300ms 지연 후 실행
     *      (빠르게 타이핑할 때 불필요한 API 호출 방지)
     *   2. searchQuery.trim() 이 비어있지 않으면:
     *      a. isSearching = true
     *      b. friendService.searchUsers(searchQuery) 호출
     *         → GET /api/friends/search?q={searchQuery}
     *      c. 결과를 setSearchResults 에 저장
     *      d. finally: isSearching = false
     *   3. searchQuery.trim() 이 비어있으면:
     *      setSearchResults([]) → 드롭다운 숨김
     *
     * cleanup:
     *   useEffect 의 return 함수에서 clearTimeout 실행
     *   → 다음 키 입력 전에 이전 타이머를 취소해 중복 API 호출 방지
     */
    useEffect(() => {
        // TODO: 300ms 디바운스 적용 후 friendService.searchUsers(searchQuery) 호출
        // 힌트: setTimeout으로 300ms 지연, searchQuery.trim()이 있으면
        //       friendService.searchUsers() 호출 후 setSearchResults()에 저장,
        //       비어있으면 setSearchResults([])로 초기화하세요.
        //       cleanup 함수에서 clearTimeout()을 호출해 타이머를 취소하세요.
    }, [searchQuery]);

    /**
     * @function handleRemoveFriend
     * @param {string|number} friendshipId - 삭제할 글벗 관계의 ID
     *
     * 확인 다이얼로그를 먼저 표시하고, 사용자가 확인하면:
     *   1. friendService.removeFriend(friendshipId) 호출
     *      → DELETE /api/friends/{friendshipId}
     *   2. 성공: friends 배열에서 해당 friendshipId 항목을 로컬에서도 제거
     *            "삭제되었습니다." 성공 알림 표시
     *   3. 실패: "삭제에 실패했습니다." 오류 알림 표시
     *
     * 글벗 목록에서 각 항목의 UserMinus 버튼에 연결됨.
     * 버튼 클릭 시 e.stopPropagation() 으로 부모(프로필 이동) 이벤트 차단.
     */
    const handleRemoveFriend = (friendshipId) => {
        // TODO: [1] showConfirm으로 글벗 삭제 확인 다이얼로그 표시
        // TODO: [2] 확인 시 friendService.removeFriend(friendshipId) 호출
        // TODO: [3] 성공 시 setFriends()로 해당 friendshipId 항목을 배열에서 제거
        // TODO: [4] showAlert으로 성공/실패 알림 표시
    };

    /**
     * @function handleAcceptRequest
     * @param {string|number} friendshipId - 수락할 글벗 요청의 관계 ID
     *
     * 동작:
     *   1. friendService.acceptRequest(friendshipId) 호출
     *      → POST /api/friends/{friendshipId}/accept
     *   2. 성공:
     *      a. pending 배열에서 해당 항목을 찾아 acceptedUser 에 저장
     *      b. friends 배열 끝에 acceptedUser 추가 (글벗 목록으로 이동)
     *      c. pending 배열에서 해당 항목 제거
     *      d. "{username}님과 글벗이 되었습니다!" 성공 알림 표시
     *   3. 실패: "요청 승인 중 오류가 발생했습니다." 알림 표시
     *
     * PENDING 탭의 각 요청 항목의 ACCEPT 버튼에 연결됨.
     */
    const handleAcceptRequest = async (friendshipId) => {
        // TODO: [1] friendService.acceptRequest(friendshipId) 호출
        // TODO: [2] pending 배열에서 해당 friendshipId 항목을 찾아 acceptedUser에 저장
        // TODO: [3] setFriends()로 friends 배열 끝에 acceptedUser 추가 (낙관적 UI 업데이트)
        // TODO: [4] setPending()으로 해당 항목을 pending 배열에서 제거
        // TODO: [5] showAlert으로 성공 알림 표시
    };

    /**
     * @function handleDeclineRequest
     * @param {string|number} friendshipId - 거절할 글벗 요청의 관계 ID
     *
     * 동작:
     *   1. friendService.rejectRequest(friendshipId) 호출
     *      → POST /api/friends/{friendshipId}/reject
     *   2. 성공: pending 배열에서 해당 항목을 로컬에서도 제거
     *   3. 실패: 콘솔에만 에러 출력 (사용자 알림 없음)
     *
     * PENDING 탭의 각 요청 항목의 DECLINE 버튼에 연결됨.
     */
    const handleDeclineRequest = async (friendshipId) => {
        // TODO: [1] friendService.rejectRequest(friendshipId) 호출
        // TODO: [2] 성공 시 setPending()으로 해당 항목을 목록에서 제거
        // 힌트: 실패 시 console.error만 출력합니다 (사용자 알림 없음)
    };

    return (
        // showTabs={true}: 하단 내비게이션 탭 표시
        <ResponsiveLayout showTabs={true}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5]">

                {/* ──────────────────────────────────────────────────────
                    Section Title (페이지 상단 히어로 영역)
                    - Users 아이콘 (검정 박스, -rotate-3 → hover 시 0)
                    - "MY FRIENDS" 대형 이탤릭 제목
                    - "Connect with your style crew" 서브텍스트
                ────────────────────────────────────────────────────── */}
                <div className="px-6 py-10 flex flex-col items-center border-b border-[#f3f3f3] dark:border-[#292e35] bg-[#fafafa] dark:bg-[#1c1f24]">
                    <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl transform -rotate-3 hover:rotate-0 transition-all">
                        <Users size={32} />
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">MY FRIENDS</h2>
                    <p className="text-[14px] text-[#a3b0c1] font-bold tracking-widest uppercase">Connect with your style crew</p>
                </div>

                {/* ──────────────────────────────────────────────────────
                    Search & Add Bar (sticky, top-[110px])
                    - 검색 입력창: searchQuery 상태와 연결
                      입력 시 onChange → setSearchQuery → 디바운스 useEffect 실행
                    - UserPlus 버튼: /add-friend 페이지로 이동
                    - 실시간 검색 결과 드롭다운:
                        searchQuery 가 있고 searchResults.length > 0 일 때만 표시
                        각 결과 클릭 → /friend/{user.id|user.userId} 로 이동
                        프로필 이미지: getImageUrl 로 변환, 실패 시 DEFAULT_AVATAR
                ────────────────────────────────────────────────────── */}
                <div className="px-4 py-6 flex flex-col gap-3 sticky top-[110px] bg-white dark:bg-[#1c1f24] z-10 border-b border-[#f3f3f3] dark:border-[#292e35]">
                    <div className="flex gap-3">
                        {/* 검색 입력창 (Search 아이콘 포함) */}
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ccd3db] group-hover:text-black transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="SEARCH FRIENDS"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-[#f3f3f3] dark:bg-[#292e35] text-black dark:text-[#e5e5e5] rounded-[8px] text-[13px] font-black italic tracking-widest placeholder:text-[#ccd3db] outline-none hover:bg-[#eef1f4] dark:hover:bg-[#424a54] focus:ring-1 focus:ring-black dark:focus:ring-[#e5e5e5] transition-all"
                            />
                        </div>
                        {/* UserPlus 버튼: /add-friend 페이지 이동 */}
                        <button
                            onClick={() => navigate('/add-friend')}
                            className="w-12 h-12 bg-black text-white rounded-[8px] flex items-center justify-center hover:scale-105 transition-all shadow-md"
                        >
                            <UserPlus size={22} />
                        </button>
                    </div>

                    {/* 실시간 검색 결과 드롭다운
                        조건: searchQuery 비지 않음 AND searchResults.length > 0
                        각 항목: 프로필 이미지 + 유저명 + #ID → 클릭 시 프로필 페이지 이동 */}
                    {searchQuery && searchResults.length > 0 && (
                        <div className="bg-white dark:bg-[#1c1f24] border border-[#f3f3f3] dark:border-[#292e35] rounded-xl shadow-2xl mt-1 overflow-hidden">
                            {searchResults.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => navigate(`/friend/${user.id || user.userId}`)}
                                    className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-[#292e35] border-b border-[#fafafa] dark:border-[#292e35] last:border-0 cursor-pointer"
                                >
                                    {/* 검색 결과 프로필 이미지 (실패 시 DEFAULT_AVATAR) */}
                                    <img
                                        src={getImageUrl(user.profileImageUrl || user.profileImage) || DEFAULT_AVATAR}
                                        className="w-10 h-10 rounded-full object-cover"
                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-bold">{user.username}</span>
                                        <span className="text-[11px] text-[#7b8b9e]">#{user.id || user.userId}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ──────────────────────────────────────────────────────
                    Tabs (sticky, top-[154px])
                    - ALL FRIENDS: friends.length 표시, 클릭 시 activeTab = 'LIST'
                    - REQUESTS   : pending.length 표시, 클릭 시 activeTab = 'PENDING'
                    - 활성 탭: 검정 텍스트 + 하단 2.5px 검정 밑줄
                    - 비활성 탭: 회색 텍스트 (#ccd3db)
                ────────────────────────────────────────────────────── */}
                <div className="flex px-4 bg-white dark:bg-[#1c1f24] sticky top-[154px] z-10 border-b border-[#f3f3f3] dark:border-[#292e35]">
                    {[
                        { id: 'LIST',    label: 'ALL FRIENDS', count: friends.length },
                        { id: 'PENDING', label: 'REQUESTS',    count: pending.length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 text-[12px] font-black tracking-[1px] relative transition-colors ${activeTab === tab.id ? 'text-black' : 'text-[#ccd3db] hover:text-[#a3b0c1]'}`}
                        >
                            {tab.label} <span className="ml-1 opacity-50">[{tab.count}]</span>
                            {/* 활성 탭 하단 인디케이터 */}
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black" />}
                        </button>
                    ))}
                </div>

                {/* ──────────────────────────────────────────────────────
                    Content 영역 (탭에 따라 분기)

                    [LIST 탭 - activeTab === 'LIST']
                    friends 배열을 순서대로 렌더링:
                      - 각 항목 클릭: /friend/{id|userId} 로 이동
                      - 프로필 이미지 (rounded-2xl, 실패 시 DEFAULT_AVATAR)
                      - isCertified 이면 ShieldCheck 뱃지 표시 (우측 하단)
                      - 유저명 (이탤릭 대문자) + #ID
                      - UserMinus 버튼: hover 시만 표시 (group-hover:opacity-100)
                        클릭: e.stopPropagation() + handleRemoveFriend(friendshipId)
                    friends 비어있으면: Users 아이콘 + "Empty Crew" 메시지

                    [PENDING 탭 - activeTab === 'PENDING']
                    pending 배열을 순서대로 렌더링:
                      - 각 항목 클릭: /friend/{id|userId} 로 이동
                      - 프로필 이미지 + 유저명 + #ID
                      - ACCEPT  버튼: handleAcceptRequest(friendshipId)
                      - DECLINE 버튼: handleDeclineRequest(friendshipId)
                    pending 비어있으면: Mail 아이콘 + "No Inbox" 메시지
                ────────────────────────────────────────────────────── */}
                <div className="flex flex-col flex-1 divide-y divide-[#f3f3f3]">
                    {activeTab === 'LIST' ? (
                        friends.length > 0 ? (
                            friends.map(friend => (
                                <div key={friend.id || friend.userId} className="flex items-center justify-between px-6 py-5 group hover:bg-[#fafafa] dark:hover:bg-[#292e35] transition-colors cursor-pointer" onClick={() => navigate(`/friend/${friend.id || friend.userId}`)}>
                                    <div className="flex items-center gap-5">
                                        {/* 프로필 이미지 + isCertified ShieldCheck 뱃지 */}
                                        <div className="relative">
                                            <img
                                                src={getImageUrl(friend.profileImageUrl || friend.profileImage) || DEFAULT_AVATAR}
                                                alt="p"
                                                className="w-14 h-14 rounded-2xl border border-[#f3f3f3] object-cover"
                                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                                            />
                                            {/* 인증 사용자(isCertified)에게만 표시하는 ShieldCheck 뱃지 */}
                                            {friend.isCertified && (
                                                <div className="absolute -bottom-1 -right-1 bg-black text-[#e5e5e5] rounded-full p-1 border-2 border-white dark:border-[#1c1f24]">
                                                    <ShieldCheck size={10} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black italic text-[16px] tracking-tighter uppercase">{friend.username}</span>
                                            <span className="text-[13px] text-[#7b8b9e] font-bold">#{friend.id || friend.userId}</span>
                                        </div>
                                    </div>
                                    {/* UserMinus 삭제 버튼: hover 시에만 보임 */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friend.friendshipId); }}
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-[#ccd3db] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <UserMinus size={18} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            /* 글벗이 없을 때 빈 상태 표시 */
                            <div className="flex-1 flex flex-col items-center justify-center py-32 opacity-20">
                                <Users size={64} className="mb-4" />
                                <p className="text-[14px] font-black italic tracking-widest uppercase">Empty Crew</p>
                            </div>
                        )
                    ) : (
                        pending.length > 0 ? (
                            pending.map(req => (
                                <div key={req.id || req.userId} className="flex items-center justify-between px-6 py-6 border-b border-[#f3f3f3] dark:border-[#292e35]">
                                    {/* 요청자 프로필 (클릭 시 프로필 페이지 이동) */}
                                    <div className="flex items-center gap-5 cursor-pointer" onClick={() => navigate(`/friend/${req.id || req.userId}`)}>
                                        <img
                                            src={getImageUrl(req.profileImageUrl || req.profileImage) || DEFAULT_AVATAR}
                                            alt="p"
                                            className="w-14 h-14 rounded-2xl border border-[#f3f3f3] object-cover"
                                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-black italic text-[16px] tracking-tighter uppercase">{req.username}</span>
                                            <span className="text-[11px] text-[#a3b0c1] font-bold">#{req.id || req.userId}</span>
                                        </div>
                                    </div>
                                    {/* 수락/거절 버튼 */}
                                    <div className="flex gap-2">
                                        {/* ACCEPT: handleAcceptRequest 호출 */}
                                        <button
                                            onClick={() => handleAcceptRequest(req.friendshipId)}
                                            className="h-10 px-5 bg-black text-white text-[12px] font-bold rounded hover:bg-gray-800 transition-all"
                                        >
                                            ACCEPT
                                        </button>
                                        {/* DECLINE: handleDeclineRequest 호출 */}
                                        <button
                                            onClick={() => handleDeclineRequest(req.friendshipId)}
                                            className="h-10 px-5 border border-[#e5e5e5] dark:border-[#292e35] text-[12px] font-bold rounded hover:bg-gray-50 dark:hover:bg-[#292e35] transition-all"
                                        >
                                            DECLINE
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            /* 받은 요청이 없을 때 빈 상태 표시 */
                            <div className="flex-1 flex flex-col items-center justify-center py-32 opacity-20">
                                <Mail size={64} className="mb-4" />
                                <p className="text-[14px] font-black italic tracking-widest uppercase">No Inbox</p>
                            </div>
                        )
                    )}
                </div>

                {/* ──────────────────────────────────────────────────────
                    Footer Guide
                    페이지 최하단의 서비스 슬로건 텍스트.
                    "SNAP 스타일의 새로운 글벗 문화"
                ────────────────────────────────────────────────────── */}
                <div className="p-10 text-center bg-[#fafafa] dark:bg-[#1c1f24]">
                    <p className="text-[11px] font-bold text-[#ccd3db] tracking-[2px] uppercase">SNAP 스타일의 새로운 글벗 문화</p>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
