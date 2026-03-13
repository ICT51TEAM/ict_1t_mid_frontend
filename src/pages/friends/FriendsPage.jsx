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
import { UserMinus, Search, Users, ShieldCheck, Mail } from 'lucide-react';
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
    const [receivedRequests, setReceivedRequests] = useState([]); // 받은 요청
    const [sentRequests, setSentRequests] = useState([]);         // 보낸 요청
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
    const fetchAllData = async () => {
        try {
            const [friendsData, receiveData, sentData] = await Promise.all([
                friendService.listFriends(),
                friendService.listPendingRequests(),
                friendService.listSentPendingRequests()
            ]);
            setFriends(friendsData || []);
            setReceivedRequests(receiveData || []);
            setSentRequests(sentData || []);
        }
        catch (error) {
            console.error('데이터 로딩 실패:', error);
        }
    }

    useEffect(() => {
        // TODO: friendService.listFriends()와 friendService.listPendingRequests() 병렬 호출
        // 힌트: Promise.all([...]) 또는 순차 await로 두 API를 호출하고
        //       각 결과를 setFriends(), setPending()에 저장하세요.
        //       에러 발생 시 console.error로 출력합니다.
        // friendService.listFriends()와 friendService.listPendingRequests() 병렬 호출
        const fetchFriendsData = async () => {
            try {
                const [friendsData, receiveData, sentData] = await Promise.all([
                    friendService.listFriends(),
                    friendService.listPendingRequests(),
                    friendService.listSentPendingRequests()
                ]);
                setFriends(friendsData || []);
                setReceivedRequests(receiveData || []);
                setSentRequests(sentData || []);
            }
            catch (error) {
                console.error('데이터 로딩 실패:', error);
            }
        }
    })

    useEffect(() => {
        fetchAllData(); // 페이지가 열리자마자 이 함수를 실행해라!
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
        // 300ms 디바운스 적용 후 friendService.searchUsers(searchQuery) 호출
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await friendService.searchUsers(trimmed);
                setSearchResults(results || []);
            } catch (error) {
                console.error('검색 실패:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer); // cleanup
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
        // [1] showConfirm으로 다이얼로그 띄우기
        showConfirm({
            message: '정말로 이 글벗을 삭제하시겠습니까?',
            onConfirm: async () => {
                try {
                    // [2] 확인 시 friendService.removeFriend(friendshipId) 호출
                    await friendService.removeFriend(friendshipId);

                    // [3] 성공 시 setFriends()로 해당 항목 제거
                    setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId));

                    // [4] showAlert 알림
                    showAlert('글벗이 삭제되었습니다.', '완료', 'success');
                } catch (error) {
                    console.error('삭제 오류:', error);
                    showAlert('삭제에 실패했습니다.', '오류', 'alert');
                }
            }
        });
    };

    // [함수] 보낸 요청 취소 (기존 removeFriend API 재사용)
    const handleCancelSentRequest = async (friendshipId) => {
        showConfirm({
            message: '보낸 요청을 취소하시겠습니까?',
            onConfirm: async () => {
                try {
                    await friendService.removeFriend(friendshipId);
                    setSentRequests(prev => prev.filter(req => req.friendshipId !== friendshipId));
                    showAlert('요청이 취소되었습니다.', '완료', 'success');
                } catch (error) {
                    showAlert('취소 중 오류가 발생했습니다.', '오류', 'alert');
                }
            }
        });
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
        try {
            // [1] friendService.acceptRequest 호출
            await friendService.acceptRequest(friendshipId);

            // [2] receivedRequests 에서 사용자 찾기
            const acceptedUser = receivedRequests.find(req => req.friendshipId === friendshipId);

            if (acceptedUser) {
                // [3] setFriends로 배열에 추가
                setFriends(prev => [...prev, acceptedUser]);
            }
            // [4] setReceivedRequests 으로 목록에서 제거
            setReceivedRequests(prev => prev.filter(req => req.friendshipId !== friendshipId));

            // [5] 성공 알림 표시
            showAlert(`${acceptedUser?.username || '사용자'}님과 글벗이 되었습니다!`, '완료', 'success');
        } catch (error) {
            console.error('요청 수락 오류:', error);
            showAlert('요청 승인 중 오류가 발생했습니다.', '오류', 'alert');
        }
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
        showConfirm({
            message: '받은 요청을 거절하시겠습니까?',
            onConfirm: async () => {
                try {
                    // [1] friendService.rejectRequest 호출
                    await friendService.rejectRequest(friendshipId);

                    // [2] 성공 시 setReceivedRequests 으로 목록에서 즉시 제거
                    setReceivedRequests(prev => prev.filter(req => req.friendshipId !== friendshipId));
                } catch (error) {
                    console.error('요청 거절 중 오류 발생:', error);
                }
            }
        });
    };

    return (
        <ResponsiveLayout showTabs={true}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5]">

                {/* 헤더 섹션 */}
                <div className="px-6 py-10 flex flex-col items-center border-b border-[#f3f3f3] dark:border-[#292e35] bg-[#fafafa] dark:bg-[#1c1f24]">
                    <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl transform -rotate-3 hover:rotate-0 transition-all">
                        <Users size={32} />
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">나의 글벗들</h2>
                    <p className="text-[14px] text-[#a3b0c1] font-bold tracking-widest uppercase">나의 스토리를 공유할 글벗들을 찾아보세요</p>
                </div>

                {/* 검색 바 */}
                <div className="px-4 py-6 flex flex-col gap-3 sticky top-[110px] bg-white dark:bg-[#1c1f24] z-10 border-b border-[#f3f3f3] dark:border-[#292e35]">
                    <div className="flex gap-3">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ccd3db] group-hover:text-black transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="글벗 찾기"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-[#f3f3f3] dark:bg-[#292e35] rounded-[8px] text-[13px] font-black italic tracking-widest outline-none focus:ring-1 focus:ring-black transition-all"
                            />
                        </div>

                        {/* UserPlus 버튼: /add-friend 페이지 이동 */}
                        {/* {/* <button                ------------------depricated--------------------
                            onClick={() => navigate('/add-friend')}
                            className="w-12 h-12 bg-black text-white rounded-[8px] flex items-center justify-center hover:scale-105 transition-all shadow-md"
                        >
                            <UserPlus size={22} />
                        </button> */}
                    </div> 

                    {/* 실시간 검색 결과 드롭다운
                        조건: searchQuery 비지 않음 AND searchResults.length > 0
                        각 항목: 프로필 이미지 + 유저명 + #ID → 클릭 시 프로필 페이지 이동 */}

                    {searchQuery && searchResults.length > 0 && (
                        <div className="bg-white dark:bg-[#1c1f24] border border-[#f3f3f3] dark:border-[#292e35] rounded-xl shadow-2xl mt-1 overflow-hidden">
                            {searchResults.map(user => (
                                <div key={user.userId} onClick={() => navigate(`/friend/${user.userId}`)} className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer">
                                    <img src={getImageUrl(user.profileImageUrl) || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover" />
                                    <div className="flex flex-col">
                                        <span className="font-bold">{user.username}</span>
                                        <span className="text-[11px] text-[#7b8b9e]">#{user.userId}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 탭 메뉴 */}
                <div className="flex px-4 bg-white dark:bg-[#1c1f24] sticky top-[154px] z-10 border-b border-[#f3f3f3] dark:border-[#292e35]">
                    {[
                        { id: 'LIST', label: '모든 글벗들', count: friends.length },
                        { id: '받은 요청', label: '글벗 요청 현황', count: receivedRequests.length + sentRequests.length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 text-[12px] font-black tracking-[1px] relative transition-colors ${activeTab === tab.id ? 'text-black' : 'text-[#ccd3db]'}`}
                        >
                            {tab.label} <span className="ml-1 opacity-50">[{tab.count}]</span>
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black" />}
                        </button>
                    ))}
                </div>

                {/* 콘텐츠 영역 */}
                <div className="flex flex-col flex-1">
                    {activeTab === 'LIST' ? (
                        /* --- 내 친구 목록 --- */
                        friends.length > 0 ? (
                            friends.map(friend => (
                                <div key={friend.friendshipId} className="flex items-center justify-between px-6 py-5 group hover:bg-[#fafafa] cursor-pointer" onClick={() => navigate(`/friend/${friend.userId}`)}>
                                    <div className="flex items-center gap-5">
                                        <div className="relative">
                                            <img src={getImageUrl(friend.profileImageUrl) || DEFAULT_AVATAR} className="w-14 h-14 rounded-2xl object-cover" />
                                            {friend.isCertified && (
                                                <div className="absolute -bottom-1 -right-1 bg-black text-[#e5e5e5] rounded-full p-1 border-2 border-white">
                                                    <ShieldCheck size={10} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black italic text-[16px] tracking-tighter uppercase">{friend.username}</span>
                                            <span className="text-[13px] text-[#7b8b9e] font-bold">#{friend.userId}</span>
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friend.friendshipId); }} className="w-10 h-10 text-[#ccd3db] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <UserMinus size={18} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center py-32 opacity-20"><Users size={64} className="mb-4" /><p>Empty Crew</p></div>
                        )
                    ) : (
                        /* --- 요청 관리 (RECEIVED & SENT) --- */
                        <div className="flex flex-col divide-y divide-[#f3f3f3]">
                            {/* 1. 받은 요청 섹션 */}
                            <div className="bg-[#fafafa] dark:bg-[#1c1f24] px-6 py-3">
                                <span className="text-[11px] font-black text-[#a3b0c1] uppercase tracking-widest">받은 요청 ({receivedRequests.length})</span>
                            </div>
                            {receivedRequests.length > 0 ? (
                                receivedRequests.map(req => (
                                    <div key={req.friendshipId} className="flex items-center justify-between px-6 py-6 bg-white dark:bg-[#101215]">
                                        <div className="flex items-center gap-5 cursor-pointer" onClick={() => navigate(`/friend/${req.userId}`)}>
                                            <img src={getImageUrl(req.profileImageUrl) || DEFAULT_AVATAR} className="w-12 h-12 rounded-2xl object-cover" />
                                            <div className="flex flex-col">
                                                <span className="font-black italic text-[15px] tracking-tighter uppercase">{req.username}</span>
                                                <span className="text-[11px] text-[#a3b0c1]">Incoming Request</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleAcceptRequest(req.friendshipId)} className="h-9 px-4 bg-black text-white text-[11px] font-black rounded">수락</button>
                                            <button onClick={() => handleDeclineRequest(req.friendshipId)} className="h-9 px-4 border border-[#e5e5e5] text-[11px] font-black rounded">거절</button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center text-[#ccd3db] text-[12px] italic">받은 요청이 없어요...</div>
                            )}

                            {/* 2. 보낸 요청 섹션 */}
                            <div className="bg-[#fafafa] dark:bg-[#1c1f24] px-6 py-3 border-t">
                                <span className="text-[11px] font-black text-[#a3b0c1] uppercase tracking-widest">보낸 요청 ({sentRequests.length})</span>
                            </div>
                            {sentRequests.length > 0 ? (
                                sentRequests.map(req => (
                                    <div key={req.friendshipId} className="flex items-center justify-between px-6 py-6 bg-white dark:bg-[#101215]">
                                        <div className="flex items-center gap-5 cursor-pointer" onClick={() => navigate(`/friend/${req.userId}`)}>
                                            <img src={getImageUrl(req.profileImageUrl) || DEFAULT_AVATAR} className="w-12 h-12 rounded-2xl object-cover opacity-60" />
                                            <div className="flex flex-col">
                                                <span className="font-black italic text-[15px] tracking-tighter uppercase text-[#a3b0c1]">{req.username}</span>
                                                <span className="text-[11px] text-[#ccd3db]">Waiting for approval...</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleCancelSentRequest(req.friendshipId)} className="h-9 px-4 border border-red-100 text-red-400 text-[11px] font-black rounded hover:bg-red-50 transition-colors">CANCEL</button>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center text-[#ccd3db] text-[12px] italic">No sent requests</div>
                            )}
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-10 text-center bg-[#fafafa] dark:bg-[#1c1f24]">
                    <p className="text-[11px] font-bold text-[#ccd3db] tracking-[2px] uppercase">SNAP 스타일의 새로운 글벗 문화</p>
                </div>
            </div>
        </ResponsiveLayout>
    );
}

