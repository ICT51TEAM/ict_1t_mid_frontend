/**
 * @file SnapDetailPage.jsx
 * @route /snap/:id
 *
 * @description
 * 무신사 앱의 스냅 상세 페이지.
 * URL 파라미터 :id로 특정 스냅의 상세 정보를 불러와 표시한다.
 *
 * @주요_기능
 * 1. 스냅 상세 데이터 패칭: fetchSnapDetail(id) → GET /api/albums/:id
 * 2. 사진 이미지 캐러셀 (여러 장의 사진을 좌/우 버튼으로 탐색)
 * 3. 작성자 판별: authUser.id === snap.userId 이면 편집/삭제 메뉴 표시
 *    비작성자: "Follow" 버튼 표시
 * 4. 달개(Badge) 시스템: 백엔드 달개 유형을 로드하여 토글 방식으로 부여/취소
 *    - 백엔드 API: POST /api/badges/albums/{albumId}/toggle?badgeTypeId=N
 *    - 내가 이미 남긴 달개는 강조 스타일(bg-black)로 표시
 *    - 클릭 시 토글: 부여 ↔ 취소
 * 5. 게시물 삭제: showConfirm으로 확인 후 DELETE API 호출 → '/' 이동
 *
 * @달개_시스템_흐름
 * [1] 컴포넌트 마운트 시 badgeService.getAllTypes()로 달개 유형 목록 로드
 *     → badgeTypes 상태에 저장 (DB의 BADGE_TYPES 테이블에서 가져온 유형들)
 * [2] 스냅 상세 데이터 로드 후 badgeService.getAlbumDalgae(id)로 달개 데이터 로드
 *     → badges: 해당 앨범의 달개 유형별 집계 [{emoji, name, count}]
 *     → myBadges: 내가 남긴 달개 이모지 목록 ["❤️", "😢", ...]
 * [3] 달개 버튼 클릭 시 handleGiveBadge(badgeTypeId) 호출
 *     → badgeService.toggleAlbumDalgae(albumId, badgeTypeId) API 호출
 *     → 응답으로 갱신된 badges/myBadges를 받아 상태 업데이트
 *     → UI에 즉시 반영 (토글된 달개의 강조 스타일 변경 + 카운트 업데이트)
 *
 * @데이터_변환 (rawSnap → snap)
 * 백엔드 rawSnap 구조를 프론트엔드에서 사용하기 편한 snap 구조로 변환:
 * - images 배열 생성:
 *   rawSnap.photos[] → slotIndex 기준 오름차순 정렬 → photoUrl 값만 추출한 배열
 * - user 객체 정규화:
 *   { id: userId, userId, username, profileImage: profileImageUrl, info: recordDate }
 * - description: rawSnap.bodyText
 * - badges: rawSnap.badges (달개 배열) → 이후 badgeService.getAlbumDalgae()로 갱신
 * - myBadges: 내가 이 앨범에 남긴 달개 이모지 목록 (배열)
 *
 * @state
 * - rawSnap      {object|null}  - 백엔드에서 받아온 원본 스냅 데이터
 * - isLoading    {boolean}      - API 요청 중 여부 (로딩 화면 표시용)
 * - error        {any}          - 패칭 오류 (있으면 "Snap Not Found" 화면 표시)
 * - imgIndex     {number}       - 현재 캐러셀에서 표시 중인 이미지 인덱스 (0-based)
 * - showMenu     {boolean}      - 작성자용 편집/삭제 드롭다운 메뉴 표시 여부
 * - badgeTypes   {Array}        - 백엔드에서 로드한 달개 유형 목록 [{id, name, emoji, ...}]
 * - badges       {Array}        - 현재 앨범의 달개 집계 [{emoji, name, count}]
 * - myBadges     {string[]}     - 내가 이 앨범에 남긴 달개 이모지 목록
 * - togglingBadge {number|null} - 현재 토글 중인 달개 유형 ID (중복 클릭 방지용)
 *
 * @hooks
 * - useParams    : URL의 :id 파라미터 읽기
 * - useNavigate  : 삭제 후 '/' 이동, 뒤로가기
 * - useAuth      : authUser로 현재 로그인 사용자 정보 획득 (작성자 여부 판별)
 * - useAlert     : showAlert(일반 알림), showConfirm(삭제 확인 모달)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchSnapDetail } from '@/api/snapService';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight, Award, Plus, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { postService } from '@/api/postService';
import { userService } from '@/api/userService';
import { badgeService } from '@/api/badgeService';
import { friendService } from '@/api/friendService';
import { DEFAULT_AVATAR, DEFAULT_POST_IMAGE, getImageUrl } from '@/utils/imageUtils';
import AlbumPhotoLayout, { sortAlbumPhotos } from '@/components/feed/AlbumPhotoLayout';
import { getSavedAlbumLayout } from '@/utils/albumLayoutStore';

export default function SnapDetailPage() {
    // ---------------------------------------------------------
    // [라우터 / 컨텍스트 훅 초기화]
    // ---------------------------------------------------------
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const { showAlert, showConfirm } = useAlert();

    console.log('[SnapDetailPage] route id =', id);
    console.log('[SnapDetailPage] authUser =', authUser);

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------
    const [rawSnap, setRawSnap] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [imgIndex, setImgIndex] = useState(0);
    const [showMenu, setShowMenu] = useState(false);

    // ---------------------------------------------------------
    // [달개(Badge) 관련 상태 변수]
    //
    // badgeTypes: 백엔드 BADGE_TYPES 테이블에서 가져온 달개 유형 목록
    //   → badgeService.getAllTypes() 호출로 로드
    //   → 달개 부여 버튼 그리드를 렌더링하는 데 사용
    //   → 각 항목: { id, name, emoji, sortOrder, description }
    //
    // badges: 현재 앨범에 달린 달개의 유형별 집계 데이터
    //   → badgeService.getAlbumDalgae(albumId) 또는 toggleAlbumDalgae() 응답으로 갱신
    //   → 각 항목: { emoji: "❤️", name: "좋아요", count: 5 }
    //   → "Badges Collected" 섹션에서 이모지 + 개수를 표시하는 데 사용
    //
    // myBadges: 현재 로그인 사용자가 이 앨범에 남긴 달개 이모지 문자열 배열
    //   → 예: ["❤️", "💪"]
    //   → 달개 버튼 중 내가 선택한 것을 강조 스타일(bg-black)로 표시하는 데 사용
    //   → includes() 메서드로 특정 이모지가 내 달개인지 판별
    //
    // togglingBadge: 현재 토글 API 호출 중인 달개 유형 ID
    //   → null이면 토글 중 아님 → 모든 달개 버튼 클릭 가능
    //   → 숫자면 해당 ID의 토글이 진행 중 → 중복 클릭 방지 (disabled 처리)
    //   → API 응답 후 다시 null로 초기화
    // ---------------------------------------------------------
    const [badgeTypes, setBadgeTypes] = useState([]);
    const [badges, setBadges] = useState([]);
    const [myBadges, setMyBadges] = useState([]);
    const [togglingBadge, setTogglingBadge] = useState(null);

    // 친구(글벗) 관련 상태
    const [friendStatus, setFriendStatus] = useState('none'); // 'none' | 'pending' | 'accepted'
    const [isRequesting, setIsRequesting] = useState(false);

    console.log('[SnapDetailPage] rawSnap =', rawSnap);
    console.log('[SnapDetailPage] isLoading =', isLoading);
    console.log('[SnapDetailPage] error =', error);
    console.log('[SnapDetailPage] showMenu =', showMenu);
    console.log('[SnapDetailPage] badgeTypes =', badgeTypes);
    console.log('[SnapDetailPage] badges =', badges);
    console.log('[SnapDetailPage] myBadges =', myBadges);
    console.log('[SnapDetailPage] togglingBadge =', togglingBadge);
    console.log('[SnapDetailPage] friendStatus =', friendStatus);
    console.log('[SnapDetailPage] isRequesting =', isRequesting);

    // ---------------------------------------------------------
    // [useEffect #1] 스냅 상세 데이터 패칭
    // ---------------------------------------------------------
    useEffect(() => {
        console.log('[useEffect #1] 스냅 상세 조회 시작, id =', id);

        setIsLoading(true);
        setError(null);
        setImgIndex(0);
        fetchSnapDetail(id)
            .then(async res => {
                console.log('[useEffect #1] fetchSnapDetail 성공, res =', res);
                // 백엔드 앨범 상세 응답에 profileImageUrl이 없으므로 유저 프로필 API로 보완
                if (res?.userId && !res.profileImageUrl) {
                    try {
                        const userProfile = await userService.getUserProfile(res.userId);
                        res.profileImageUrl = userProfile.profileImageUrl ?? null;
                    } catch (e) {
                        console.log('[useEffect #1] 프로필 이미지 조회 실패', e);
                    }
                }
                setRawSnap(res);
            })
            .catch(err => {
                console.log('[useEffect #1] fetchSnapDetail 실패, err =', err);
                setError(err);
            })
            .finally(() => {
                console.log('[useEffect #1] 스냅 상세 조회 종료');
                setIsLoading(false);
            });
    }, [id]);

    // ---------------------------------------------------------
    // [useEffect #2] 달개 유형 목록 로드 (컴포넌트 마운트 시 1회)
    //
    // badgeService.getAllTypes()를 호출하여 백엔드 BADGE_TYPES 테이블의
    // 모든 달개 유형을 가져온다.
    // 이 데이터는 "Give a badge" 섹션의 달개 버튼 그리드를 렌더링하는 데 사용된다.
    //
    // 응답 형태 (배열):
    // [
    //   { id: 1, category: 'BADGE', title: '좋아요', emoji: '❤️', ... },
    //   { id: 2, category: 'BADGE', title: '슬퍼요', emoji: '😢', ... },
    //   ...
    // ]
    //
    // title 필드를 달개 버튼의 라벨로 사용하고,
    // id 필드를 handleGiveBadge()에 전달하여 토글 API의 badgeTypeId로 사용한다.
    // ---------------------------------------------------------
    useEffect(() => {
        console.log('[useEffect #2] 달개 유형 목록 조회 시작');

        badgeService.getAllTypes()
            .then(res => {
                console.log('[useEffect #2] getAllTypes 성공, res =', res);
                setBadgeTypes(res);
            })
            .catch(err => {
                console.log('[useEffect #2] getAllTypes 실패, err =', err);
                setBadgeTypes([]);
            });
    }, []);

    // ---------------------------------------------------------
    // [useEffect #3] 앨범 달개 데이터 로드
    //
    // rawSnap이 로드된 후, badgeService.getAlbumDalgae(id)를 호출하여
    // 해당 앨범의 달개 집계와 내가 남긴 달개 목록을 가져온다.
    //
    // rawSnap.badges에도 달개 데이터가 있지만, 이는 앨범 상세 API의
    // 초기 데이터이고, 로그인 사용자의 myBadges 정보가 정확하지 않을 수 있다.
    // 따라서 별도로 /api/badges/albums/{albumId} 엔드포인트를 호출하여
    // 최신 달개 데이터를 가져온다.
    //
    // 응답 형태:
    // {
    //   badges: [{ emoji: "❤️", name: "좋아요", count: 3 }, ...],
    //   myBadges: ["❤️", "💪"]
    // }
    // ---------------------------------------------------------
    useEffect(() => {
        if (!rawSnap) return;

        console.log('[useEffect #3] rawSnap 로드됨, rawSnap =', rawSnap);
        console.log('[useEffect #3] rawSnap.badges 초기 세팅 =', rawSnap.badges);

        // rawSnap에서 초기 달개 데이터를 먼저 설정 (빠른 렌더링)
        setBadges(rawSnap.badges || []);

        console.log('[useEffect #3] getAlbumDalgae 호출, id =', id);

        // 이후 별도 API로 정확한 달개 데이터를 가져와 덮어씌움
        badgeService.getAlbumDalgae(id)
            .then(res => {
                console.log('[useEffect #3] getAlbumDalgae 성공, res =', res);
                setBadges(res.badges || []);
                setMyBadges(res.myBadges || []);
            })
            .catch(err => {
                console.log('[useEffect #3] getAlbumDalgae 실패, err =', err);
            });
    }, [rawSnap, id]);

    // ---------------------------------------------------------
    // [useEffect #4] 친구 관계 확인
    // rawSnap 로드 후, 작성자와의 친구 관계를 확인한다.
    // ---------------------------------------------------------
    useEffect(() => {
        if (!rawSnap || !authUser?.id) return;
        const authorId = rawSnap.userId;
        if (authUser.id === authorId) return; // 본인 게시글이면 스킵

        console.log('[useEffect #4] 친구 관계 확인 시작');
        console.log('[useEffect #4] authorId =', authorId);
        console.log('[useEffect #4] rawSnap.username =', rawSnap.username);

        const checkFriendship = async () => {
            try {
                const friends = await friendService.listFriends();
                console.log('[useEffect #4] listFriends 결과 =', friends);

                const isFriend = Array.isArray(friends) && friends.some(
                    f => String(f.friendId) === String(authorId)
                );
                console.log('[useEffect #4] isFriend =', isFriend);

                if (isFriend) {
                    console.log('[useEffect #4] 이미 글벗 상태');
                    setFriendStatus('accepted');
                    return;
                }
                // 내가 보낸 요청 중 대기 중인지 확인 (searchUsers로 확인)
                // searchUsers는 isPending 필드를 반환
                const results = await friendService.searchUsers(rawSnap.username);
                console.log('[useEffect #4] searchUsers 결과 =', results);

                const target = Array.isArray(results) && results.find(
                    u => String(u.userId) === String(authorId)
                );
                console.log('[useEffect #4] target 사용자 =', target);

                if (target?.isPending) {
                    console.log('[useEffect #4] 친구 요청 대기중 상태');
                    setFriendStatus('pending');
                } else if (target?.isFriend) {
                    console.log('[useEffect #4] 친구 수락 상태');
                    setFriendStatus('accepted');
                } else {
                    console.log('[useEffect #4] 친구 아님');
                    setFriendStatus('none');
                }
            } catch (err) {
                console.log('[useEffect #4] 친구 관계 확인 실패, err =', err);
                setFriendStatus('none');
            }
        };
        checkFriendship();
    }, [rawSnap, authUser?.id]);

    // 친구 요청 핸들러
    const handleFriendRequest = async () => {
        console.log('[handleFriendRequest] 호출');
        console.log('[handleFriendRequest] isRequesting =', isRequesting);
        console.log('[handleFriendRequest] friendStatus =', friendStatus);
        console.log('[handleFriendRequest] rawSnap.userId =', rawSnap?.userId);

        if (isRequesting || friendStatus !== 'none') return;
        setIsRequesting(true);
        try {
            await friendService.sendRequest(rawSnap.userId);
            console.log('[handleFriendRequest] sendRequest 성공');
            setFriendStatus('pending');
            showAlert('글벗 요청을 보냈습니다.', '완료', 'success');
        } catch (e) {
            console.log('[handleFriendRequest] sendRequest 실패, e =', e);
            if (e?.response?.status === 409) {
                showAlert('이미 요청했거나 글벗입니다.', '알림', 'alert');
                setFriendStatus('pending');
            } else {
                showAlert('글벗 요청에 실패했습니다.', '알림', 'alert');
            }
        } finally {
            console.log('[handleFriendRequest] 요청 종료');
            setIsRequesting(false);
        }
    };

    // ---------------------------------------------------------
    // [파생 데이터] rawSnap → snap 구조 변환
    // ---------------------------------------------------------
    const savedLayoutType = getSavedAlbumLayout(id);

    const snap = rawSnap ? {
        ...rawSnap,
        layoutType: savedLayoutType ?? rawSnap.layoutType,
        photos: sortAlbumPhotos(rawSnap.photos || []),
        images: sortAlbumPhotos(rawSnap.photos || []).map((photo) => getImageUrl(photo.photoUrl || photo.thumbUrl)),
        user: {
            id: rawSnap.userId,
            userId: rawSnap.userId,
            username: rawSnap.username,
            profileImage: getImageUrl(rawSnap.profileImageUrl) ?? null,
            info: rawSnap.recordDate ?? '',
        },
        description: rawSnap.bodyText ?? '',
    } : null;

    console.log('[SnapDetailPage] 파생 snap =', snap);

    // ---------------------------------------------------------
    // [handleGiveBadge] 달개 토글 핸들러
    //
    // ── 동작 흐름 ──
    // [1] togglingBadge가 null이 아니면 이미 토글 중이므로 무시 (중복 클릭 방지)
    // [2] setTogglingBadge(badgeTypeId): 로딩 표시 시작 (해당 버튼에 opacity 적용)
    // [3] badgeService.toggleAlbumDalgae(앨범ID, 달개유형ID) 호출
    //     → 백엔드: POST /api/badges/albums/{albumId}/toggle?badgeTypeId=N
    //     → 이미 같은 달개를 남겼으면 삭제(REMOVED), 없으면 생성(ADDED)
    // [4] 응답 데이터로 badges, myBadges 상태를 갱신
    //     → badges: 갱신된 달개 집계 → "Badges Collected" 섹션 업데이트
    //     → myBadges: 내 달개 목록 → 달개 버튼 강조 스타일 업데이트
    // [5] finally: setTogglingBadge(null) → 로딩 표시 해제
    //
    // ── useCallback 사용 이유 ──
    // handleGiveBadge는 달개 버튼의 onClick에 전달되는 함수인데,
    // 매 렌더링마다 새로운 함수가 생성되면 불필요한 리렌더링이 발생할 수 있다.
    // useCallback으로 감싸서 id, togglingBadge가 변경될 때만 새 함수를 생성한다.
    // ---------------------------------------------------------
    const handleGiveBadge = useCallback(async (badgeTypeId) => {
        console.log('[handleGiveBadge] 클릭된 badgeTypeId =', badgeTypeId);
        console.log('[handleGiveBadge] 현재 togglingBadge =', togglingBadge);
        console.log('[handleGiveBadge] 현재 id =', id);

        // 같은 달개를 연속으로 누를 때만 무시 (다른 달개는 동시 가능)
        if (togglingBadge === badgeTypeId) {
            console.log('[handleGiveBadge] 이미 해당 달개 토글 중이라 return');
            return;
        }
        setTogglingBadge(badgeTypeId);
        console.log('[handleGiveBadge] togglingBadge 세팅 =', badgeTypeId);
        try {
            // 백엔드 토글 API 호출: 같은 달개가 있으면 삭제, 없으면 생성
            const result = await badgeService.toggleAlbumDalgae(id, badgeTypeId);
            console.log('[handleGiveBadge] toggleAlbumDalgae 성공, result =', result);

            // 응답으로 받은 최신 달개 데이터로 상태 갱신 → UI 즉시 반영
            setBadges(result.badges || []);
            setMyBadges(result.myBadges || []);
        } catch (e) {
            console.log('[handleGiveBadge] toggleAlbumDalgae 실패, e =', e);
            showAlert('달개 전달에 실패했습니다.', '알림', 'alert');
        } finally {
            // 토글 완료 후 로딩 상태 해제
            console.log('[handleGiveBadge] 토글 종료, togglingBadge 초기화');
            setTogglingBadge(null);
        }
    }, [id, togglingBadge, showAlert]);

    // ---------------------------------------------------------
    // [handleDelete] 스냅 삭제 핸들러
    // ---------------------------------------------------------
    const handleDelete = () => {
        console.log('[handleDelete] 삭제 버튼 클릭, id =', id);
        showConfirm({
            message: '정말로 이 게시글을 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.',
            title: '게시글 삭제',
            type: 'alert',
            confirmText: '삭제',
            cancelText: '취소',
            onConfirm: async () => {
                try {
                    await postService.deletePost(id);
                    console.log('[handleDelete] deletePost 성공');
                    showAlert('게시글이 삭제되었습니다.', '완료', 'success');
                    navigate('/');
                } catch (e) {
                    console.log('[handleDelete] deletePost 실패, e =', e);
                    showAlert('게시글 삭제에 실패했습니다.', '오류', 'alert',);
                }
            },
        });
    };

    // ---------------------------------------------------------
    // [조기 반환 렌더링]
    // ---------------------------------------------------------
    if (isLoading) return <ResponsiveLayout showTabs={false}><div className="p-20 text-center font-bold italic opacity-20 animate-pulse uppercase tracking-widest">Loading Snap...</div></ResponsiveLayout>;

    if (error || !snap) return (
        <ResponsiveLayout showTabs={false}>
            <div className="p-20 text-center">
                <p className="text-[#a3b0c1] font-black italic tracking-widest uppercase mb-4">해당 스토리를 찾지 못했습니다.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="h-10 px-6 bg-black text-white rounded-full text-[12px] font-black italic tracking-widest uppercase"
                >
                    이전 페이지로....
                </button>
            </div>
        </ResponsiveLayout>
    );

    // ---------------------------------------------------------
    // [파생 값 계산]
    // ---------------------------------------------------------
    const isAuthor = String(authUser?.id) === String(snap?.user?.id);
    // totalBadges: badges 배열의 모든 count를 합산 → "TOTAL N" 표시에 사용
    const totalBadges = badges.reduce((acc, curr) => acc + (curr.count || 0), 0);

    console.log('[SnapDetailPage] isAuthor =', isAuthor);
    console.log('[SnapDetailPage] totalBadges =', totalBadges);

    return (
        <ResponsiveLayout showTabs={false}>
            <div className="bg-white dark:bg-[#101215] min-h-screen">


                {/* ── 작성자 정보 헤더 ── */}
                <div className="flex justify-between items-center px-4 py-4 sticky top-[60px] bg-white dark:bg-[#1c1f24] z-20 border-b border-[#f3f3f3] dark:border-[#292e35]">
                    <Link to={`/friend/${snap?.user?.id || snap?.user?.userId}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#f3f3f3]">
                            <img
                                src={getImageUrl(snap?.user?.profileImage) || DEFAULT_AVATAR}
                                alt="u"
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black italic tracking-tighter text-[15px] uppercase">{snap?.user?.username}</span>
                            <span className="text-[11px] font-bold text-[#a3b0c1] uppercase tracking-widest">{snap?.user?.info}</span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2">
                        {isAuthor ? (
                            <div className="relative">
                                <button onClick={() => {
                                    console.log('[UI] 더보기 메뉴 클릭, 현재 showMenu =', showMenu);
                                    setShowMenu(!showMenu);
                                }} className="p-2 text-[#ccd3db] h-8 w-8 flex items-center justify-center bg-[#f3f3f3] rounded-full hover:text-black transition-colors">
                                    <MoreHorizontal size={20} />
                                </button>
                                {showMenu && (
                                    <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-[#1c1f24] border border-[#f3f3f3] dark:border-[#292e35] shadow-xl rounded-lg z-30 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        <button onClick={() => {
                                            console.log('[UI] EDIT 클릭, 이동 경로 =', `/snap/${id}/edit`);
                                            navigate(`/snap/${id}/edit`);
                                        }} className="w-full px-4 py-3 text-[13px] font-bold flex items-center gap-2 hover:bg-[#fafafa] dark:hover:bg-[#292e35]"><Edit2 size={14} /> 수정</button>
                                        <button onClick={handleDelete} className="w-full px-4 py-3 text-[13px] font-bold flex items-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /> 삭제</button>
                                    </div>
                                )}
                            </div>
                        ) : friendStatus === 'accepted' ? (
                            <button disabled className="h-8 px-4 bg-gray-200 text-gray-600 rounded-full text-[12px] font-black italic tracking-widest uppercase flex items-center gap-1 cursor-default">
                                글벗
                            </button>
                        ) : friendStatus === 'pending' ? (
                            <button disabled className="h-8 px-4 bg-gray-400 text-white rounded-full text-[12px] font-black italic tracking-widest uppercase flex items-center gap-1 opacity-60 cursor-not-allowed">
                                요청 대기중
                            </button>
                        ) : (
                            <button
                                onClick={handleFriendRequest}
                                disabled={isRequesting}
                                className="h-8 px-4 bg-black text-white rounded-full text-[12px] font-black italic tracking-widest uppercase flex items-center gap-1 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                                <Plus size={12} /> ADD글벗
                            </button>
                        )}
                    </div>
                </div>

                {/* ── 이미지 캐러셀 ── */}
                <div className="bg-[#f9f9f9] dark:bg-[#101215] p-3 md:p-4">
                    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-white dark:bg-[#1c1f24] shadow-sm">
                        <div className="aspect-[4/5] md:aspect-[16/10]">
                            <AlbumPhotoLayout
                                photos={snap.photos}
                                layoutType={snap.layoutType}
                                fallbackImageUrl={DEFAULT_POST_IMAGE}
                                imageClassName="object-cover"
                            />
                        </div>
                    </div>
                </div>

                {false && <>
                <div className="relative w-full bg-[#f9f9f9] dark:bg-[#101215]" style={{ height: '60vh' }}>
                    <img
                        src={snap.images[imgIndex] || DEFAULT_POST_IMAGE}
                        className="w-full h-full object-contain"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_POST_IMAGE; }}
                    />
                    {snap.images.length > 1 && (
                        <>
                            <button
                                onClick={() => {
                                    console.log('[UI] 이전 이미지 클릭, 현재 imgIndex =', imgIndex);
                                    setImgIndex(i => Math.max(0, i - 1));
                                }}
                                disabled={imgIndex === 0}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-30"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    console.log('[UI] 다음 이미지 클릭, 현재 imgIndex =', imgIndex);
                                    setImgIndex(i => Math.min(snap.images.length - 1, i + 1));
                                }}
                                disabled={imgIndex === snap.images.length - 1}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-30"
                            >
                                <ChevronRight size={18} />
                            </button>
                            <div className="absolute bottom-4 right-4 z-10 bg-black/50 backdrop-blur-md text-white px-2 py-1 rounded text-[10px] font-black italic tracking-widest uppercase">
                                {imgIndex + 1} / {snap.images.length}
                            </div>
                        </>
                    )}
                </div>

                {/* ── 연관 상품 ── */}
                </>}
                <div className="flex overflow-x-auto gap-4 px-4 py-6 scrollbar-hide border-b border-[#f3f3f3] dark:border-[#292e35]">
                    {snap?.products?.map(p => (
                        <div key={p.id} className="shrink-0 w-[260px] flex gap-4 bg-[#fafafa] dark:bg-[#1c1f24] p-3 rounded-xl border border-[#f3f3f3] dark:border-[#292e35] relative group cursor-pointer hover:border-black dark:hover:border-[#e5e5e5] transition-all">
                            <img src={p.image} className="w-16 h-16 rounded object-cover" />
                            <div className="flex flex-col justify-center">
                                <span className="text-[11px] font-black italic tracking-widest uppercase text-black">{p.brand}</span>
                                <span className="text-[13px] font-medium text-[#424a54] line-clamp-1">{p.name}</span>
                                <span className="text-[14px] font-black italic tracking-tighter mt-1 text-black">BUY NOW</span>
                            </div>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ccd3db]" />
                        </div>
                    ))}
                </div>

                {/* ── 본문 텍스트 + 태그 + 달개 시스템 ── */}
                <div className="p-6">
                    <p className="text-[15px] leading-relaxed mb-6 font-medium text-[#424a54]">{snap?.description}</p>

                    <div className="flex flex-wrap gap-2 mb-10">
                        {snap?.tags?.map(t => <span key={t} className="text-[#0078ff] text-[15px] font-bold">#{t}</span>)}
                    </div>

                    {/* ── 달개(Badge) 시스템 섹션 ──────────────────────────
        이 섹션은 두 영역으로 구성된다:

        [1] Badges Collected (수집된 달개 목록)
            - badges 배열을 순회하며 각 달개의 이모지와 개수를 표시
            - badges가 빈 배열이면 "No Badges Yet" 메시지 표시
            - totalBadges: 모든 달개의 count 합산 → "TOTAL N" 표시

        [2] Give a badge (달개 부여 버튼 그리드)
            - badgeTypes 배열(백엔드 BADGE_TYPES)을 4열 그리드로 표시
            - 각 버튼: 이모지 + 유형명(title)
            - myBadges.includes(bt.emoji)가 true이면:
              → 내가 이미 이 달개를 남긴 상태 → bg-black 강조 스타일
            - 클릭 시 handleGiveBadge(bt.id) 호출
              → 토글: 이미 있으면 삭제(REMOVED), 없으면 생성(ADDED)
            - togglingBadge === bt.id 이면 opacity-50으로 로딩 표시

        [작성자 본인 제한]
            - isAuthor === true 이면 달개 부여 영역 전체를 opacity-40으로 흐리게 표시
            - 클릭 차단 오버레이(z-10)로 버튼 클릭을 물리적으로 막음
            - 버튼에 disabled 처리 추가 (이중 차단)
            - isSelected 강조 스타일 적용 안 함 (본인은 선택 상태 없음)
            - "본인 게시글에는 달개를 부여할 수 없습니다" 안내 문구 표시
    ─────────────────────────────────────────────────────── */}
                    <div className="bg-[#fafafa] dark:bg-[#1c1f24] rounded-2xl p-6 border border-[#f3f3f3] dark:border-[#292e35]">

                        {/* 달개 헤더: Award 아이콘 + "달개 부여하기" + 총 개수 */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Award className="text-black dark:text-white" size={20} />
                                <h3 className="text-[15px] font-black italic tracking-widest uppercase">달개 부여하기</h3>
                            </div>
                            <span className="text-[13px] font-black italic tracking-tighter text-black dark:text-white">총계 {totalBadges}</span>
                        </div>

                        {/* 수집된 달개 목록: badges 배열의 각 항목을 이모지 + 개수로 표시
            badges가 빈 배열이면 "No Badges Yet" 텍스트 표시 */}
                        <div className="flex flex-wrap gap-3 mb-8">
                            {badges.length > 0 ? badges.map(b => (
                                <div key={b.emoji} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#292e35] rounded-lg border border-[#f3f3f3] dark:border-[#424a54] shadow-sm">
                                    <span className="text-xl">{b.emoji}</span>
                                    <span className="text-[12px] font-black italic tracking-tighter">{b.count}</span>
                                </div>
                            )) : (
                                <p className="text-[12px] text-[#ccd3db] font-bold italic tracking-widest text-center w-full py-4 uppercase">
                                    No Badges Yet
                                </p>
                            )}
                        </div>

                        {/* 달개 부여 섹션:
            isAuthor일 때:
              - 래퍼 div에 opacity-40 + cursor-not-allowed 로 흐리게 표시
              - 절대 위치 오버레이(z-10)로 버튼 클릭을 물리적으로 차단
              - "본인 게시글에는 달개를 부여할 수 없습니다" 안내 문구 노출
            isAuthor가 아닐 때:
              - 정상 동작, myBadges 기반 isSelected 강조 스타일 적용
              - handleGiveBadge(bt.id) 호출로 토글 API 실행 */}
                        <div className={`relative ${isAuthor ? 'opacity-40 cursor-not-allowed' : ''}`}>

                            {/* 작성자 본인일 때만 렌더링되는 클릭 차단 오버레이.
                z-10으로 버튼 그리드 위에 올라가 모든 클릭 이벤트를 흡수.
                중앙에 안내 문구를 표시하여 왜 비활성화됐는지 사용자에게 알림. */}
                            {isAuthor && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center">
                                    <span className="text-[11px] font-black italic tracking-widest uppercase text-[#424a54] dark:text-[#a3b0c1] bg-white/80 dark:bg-[#1c1f24]/80 px-4 py-2 rounded-full border border-[#f3f3f3] dark:border-[#292e35]">
                                        본인 게시글에는 달개를 부여할 수 없습니다
                                    </span>
                                </div>
                            )}

                            <p className="text-[12px] font-black italic tracking-widest uppercase text-[#ccd3db] mb-4 text-center">
                                부여할 달개를 선택하세요
                            </p>

                            {/* 달개 유형 버튼 그리드 (4열)
                - isAuthor가 아닐 때: myBadges.includes(bt.emoji)로 isSelected 판별
                - isAuthor일 때: isSelected 항상 false (강조 스타일 미적용)
                - disabled 조건: togglingBadge 진행 중 OR 작성자 본인 (이중 차단)
                - togglingBadge === bt.id: 해당 버튼만 opacity-50 로딩 표시 */}
                            <div className="grid grid-cols-4 gap-3 max-w-[360px] mx-auto">
                                {badgeTypes.map(bt => {
                                    // myBadges 배열에 이 달개의 이모지가 포함되어 있으면 내가 이미 선택한 달개
                                    // isAuthor이면 본인 게시글이므로 선택 상태를 표시하지 않음
                                    const isSelected = !isAuthor && myBadges.includes(bt.emoji);
                                    return (
                                        <button
                                            key={bt.id}
                                            onClick={() => {
                                                // 작성자 본인이면 클릭 무시 (오버레이가 막지만 이중 방어)
                                                if (isAuthor) return;
                                                handleGiveBadge(bt.id);
                                            }}
                                            // togglingBadge 진행 중이거나 작성자 본인이면 버튼 비활성화
                                            disabled={togglingBadge === bt.id || isAuthor}
                                            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${isSelected
                                                    ? 'bg-black text-[#e5e5e5] shadow-xl scale-110'
                                                    : 'bg-white dark:bg-[#292e35] border border-[#f3f3f3] dark:border-[#424a54] text-[#ccd3db]'
                                                } ${
                                                // 비작성자일 때만 hover 스타일 적용
                                                !isAuthor
                                                    ? 'hover:border-black dark:hover:border-[#e5e5e5] hover:text-black dark:hover:text-[#e5e5e5]'
                                                    : ''
                                                } ${
                                                // 현재 토글 중인 달개 버튼만 흐리게 표시
                                                togglingBadge === bt.id ? 'opacity-50' : ''
                                                }`}
                                        >
                                            <span className="text-2xl">{bt.emoji}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-tighter">{bt.title || bt.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-20"></div>
            </div>
        </ResponsiveLayout>
    );
}
