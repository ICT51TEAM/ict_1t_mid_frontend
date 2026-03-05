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
 * 4. 달개(Badge) 시스템: 8가지 이모지 달개를 게시물에 전달할 수 있음
 *    (현재 미구현, 클릭 시 "준비 중" 알림 표시)
 * 5. 게시물 삭제: showConfirm으로 확인 후 DELETE API 호출 → '/' 이동
 *
 * @데이터_변환 (rawSnap → snap)
 * 백엔드 rawSnap 구조를 프론트엔드에서 사용하기 편한 snap 구조로 변환:
 * - images 배열 생성:
 *   rawSnap.photos[] → slotIndex 기준 오름차순 정렬 → photoUrl 값만 추출한 배열
 * - user 객체 정규화:
 *   { id: userId, userId, username, profileImage: profileImageUrl, info: recordDate }
 * - description: rawSnap.bodyText
 * - badges: rawSnap.badges (달개 배열)
 * - likedByMe: rawSnap.likedByMe
 * - myBadge: rawSnap.myBadge (내가 이미 전달한 달개 이모지)
 *
 * @state
 * - rawSnap   {object|null}  - 백엔드에서 받아온 원본 스냅 데이터
 * - isLoading {boolean}      - API 요청 중 여부 (로딩 화면 표시용)
 * - error     {any}          - 패칭 오류 (있으면 "Snap Not Found" 화면 표시)
 * - imgIndex  {number}       - 현재 캐러셀에서 표시 중인 이미지 인덱스 (0-based)
 * - showMenu  {boolean}      - 작성자용 편집/삭제 드롭다운 메뉴 표시 여부
 *
 * @상수
 * - AVAILABLE_BADGES: 사용자가 게시물에 전달할 수 있는 8가지 달개(이모지) 목록
 *   각 항목: { emoji: '💡', name: '영감' } 형태
 *
 * @hooks
 * - useParams    : URL의 :id 파라미터 읽기
 * - useNavigate  : 삭제 후 '/' 이동, 뒤로가기
 * - useAuth      : authUser로 현재 로그인 사용자 정보 획득 (작성자 여부 판별)
 * - useAlert     : showAlert(일반 알림), showConfirm(삭제 확인 모달)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchSnapDetail } from '@/api/snapService';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight, Award, Plus, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { postService } from '@/api/postService';
import { DEFAULT_AVATAR, DEFAULT_POST_IMAGE } from '@/utils/imageUtils';

// ---------------------------------------------------------
// [상수] AVAILABLE_BADGES - 달개 시스템에서 사용 가능한 8가지 이모지 목록
// 사용자가 마음에 드는 스냅에 달개(이모지 반응)를 전달할 수 있다.
// 현재는 미구현 상태로, 클릭 시 "준비 중" 알림이 표시됨.
// 형식: { emoji: 이모지 문자열, name: 한글 이름 }
// ---------------------------------------------------------
const AVAILABLE_BADGES = [
    { emoji: '💡', name: '영감' },   // 영감을 주는 코디
    { emoji: '👏', name: '박수' },   // 박수를 보내는 반응
    { emoji: '🔥', name: '열정' },   // 열정적인 스타일
    { emoji: '😍', name: '취향' },   // 취향 저격 코디
    { emoji: '👕', name: '코디' },   // 코디가 마음에 드는 경우
    { emoji: '✨', name: '빛남' },   // 빛나는 스타일
    { emoji: '👍', name: '추천' },   // 추천하고 싶은 코디
    { emoji: '🙌', name: '응원' },   // 응원을 보내는 반응
];

export default function SnapDetailPage() {
    // ---------------------------------------------------------
    // [라우터 / 컨텍스트 훅 초기화]
    // id         : URL /snap/:id 에서 추출한 스냅 고유 ID 문자열
    // navigate   : 삭제 완료 후 '/', 에러 화면의 "GO BACK" 버튼에서 navigate(-1)
    // authUser   : 현재 로그인한 사용자 객체. id로 작성자 여부 판별.
    // showAlert  : 일반 알림 모달 표시
    // showConfirm: 확인/취소 선택이 필요한 모달 표시 (삭제 확인용)
    // ---------------------------------------------------------
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const { showAlert, showConfirm } = useAlert();

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------

    // rawSnap: 백엔드 API에서 받아온 원본 스냅 데이터 객체.
    // null이면 아직 로딩 중 또는 에러 상태.
    // 아래 snap 파생 변수로 변환되어 실제 렌더링에 사용됨.
    const [rawSnap, setRawSnap] = useState(null);

    // isLoading: true이면 API 요청 진행 중 → "Loading Snap..." 전체 화면 표시
    const [isLoading, setIsLoading] = useState(true);

    // error: API 호출 실패 시 에러 객체가 저장됨.
    // null이 아니면 "Snap Not Found" 에러 화면 표시.
    const [error, setError] = useState(null);

    // imgIndex: 현재 캐러셀에서 보이는 이미지의 인덱스 (0-based).
    // 초기값: 0 (첫 번째 이미지)
    // ChevronLeft 버튼: Math.max(0, i - 1) → 0 아래로 안 내려감
    // ChevronRight 버튼: Math.min(images.length - 1, i + 1) → 마지막 인덱스 초과 방지
    const [imgIndex, setImgIndex] = useState(0);

    // showMenu: 작성자용 편집/삭제 드롭다운 메뉴의 표시 여부.
    // MoreHorizontal 버튼 클릭 시 토글.
    // true: 메뉴 드롭다운 표시 (EDIT, DELETE 버튼)
    const [showMenu, setShowMenu] = useState(false);

    // ---------------------------------------------------------
    // [useEffect #1] 스냅 상세 데이터 패칭
    // 실행 시점: 컴포넌트 마운트 시 및 id(URL 파라미터) 변경 시
    //
    // 동작 순서:
    //   [1] setIsLoading(true): 로딩 화면 표시
    //   [2] setError(null): 이전 에러 초기화
    //   [3] setImgIndex(0): 캐러셀 인덱스 초기화 (다른 스냅으로 이동 시 첫 번째 이미지부터 시작)
    //   [4] fetchSnapDetail(id) 호출
    //       → API: GET /api/albums/:id
    //       → snapService 내부에서 apiClient 사용
    //   [5] 성공: setRawSnap(data) → 원본 데이터 저장 → snap 파생 변수에서 변환
    //   [6] 실패: setError(err) → 에러 화면 표시
    //   [7] finally: setIsLoading(false) → 로딩 화면 종료
    //
    // 클린업: 없음 (간단한 단일 요청으로 취소 패턴 미적용)
    // ---------------------------------------------------------
    useEffect(() => {
        // TODO: setIsLoading(true), setError(null), setImgIndex(0) 먼저 호출
        // TODO: fetchSnapDetail(id) 호출 → 성공 시 setRawSnap(), 실패 시 setError()
        // 힌트: finally에서 setIsLoading(false) 호출
    }, [id]);

    // ---------------------------------------------------------
    // [파생 데이터] rawSnap → snap 구조 변환
    // rawSnap이 null이면 snap도 null (로딩/에러 상태에서 렌더링 차단).
    //
    // 변환 내용:
    // - images: rawSnap.photos 배열을 slotIndex 오름차순 정렬 후 photoUrl만 추출.
    //   (.slice()로 원본 배열 변경 없이 정렬, 정렬 키 없으면 0으로 처리)
    // - user: 사용자 관련 필드를 정규화된 user 객체로 묶음
    //   (id와 userId 모두 rawSnap.userId로 설정, 일부 컴포넌트가 둘 다 참조할 수 있어서)
    // - description: rawSnap.bodyText (스냅 본문 텍스트)
    // - badges: rawSnap.badges (받은 달개 배열, 없으면 빈 배열)
    // - likedByMe: rawSnap.likedByMe (좋아요 여부)
    // - myBadge: rawSnap.myBadge (내가 전달한 달개 이모지, 없으면 null)
    // ---------------------------------------------------------
    const snap = rawSnap ? {
        ...rawSnap,
        // photos 배열을 slotIndex 순서로 정렬 후 URL만 추출
        images: (rawSnap.photos || [])
            .slice()
            .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
            .map(p => p.photoUrl),
        // 사용자 정보를 정규화된 객체로 변환
        user: {
            id: rawSnap.userId,
            userId: rawSnap.userId,
            username: rawSnap.username,
            profileImage: rawSnap.profileImageUrl ?? null,
            info: rawSnap.recordDate ?? '',
        },
        description: rawSnap.bodyText ?? '',
        badges: rawSnap.badges ?? [],
        likedByMe: rawSnap.likedByMe ?? false,
        myBadge: rawSnap.myBadge ?? null,
    } : null;

    // ---------------------------------------------------------
    // [handleGiveBadge] 달개 전달 핸들러 (현재 미구현)
    // 8가지 달개 버튼 클릭 시 호출됨.
    // 현재는 "달개 전달 기능은 준비 중입니다." 알림만 표시.
    // 향후 구현 예정: API 호출로 실제 달개 전달 처리.
    // ---------------------------------------------------------
    const handleGiveBadge = () => {
        showAlert('달개 전달 기능은 준비 중입니다.', '알림');
    };

    // ---------------------------------------------------------
    // [handleDelete] 스냅 삭제 핸들러
    // 동작 순서:
    //   [1] showConfirm("정말로 이 스냅을 삭제하시겠습니까?", 콜백, "스냅 삭제")
    //       → 사용자가 확인을 누르면 콜백 실행
    //   [2] (확인 시) postService.deletePost(id) 호출
    //       → API: DELETE /api/albums/:id (또는 /api/posts/:id, postService 내부 구현에 따라 다름)
    //   [3] 성공: "삭제되었습니다." 알림 → navigate('/') 메인 피드로 이동
    //   [4] 실패: "삭제에 실패했습니다." 알림
    // ---------------------------------------------------------
    const handleDelete = () => {
        // TODO: [1] showConfirm("정말로 이 스냅을 삭제하시겠습니까?", async 콜백, "스냅 삭제") 호출
        // TODO: [2] 콜백 내부: postService.deletePost(id) 호출
        // TODO: [3] 성공 시 showAlert('삭제되었습니다.', ...) + navigate('/')
        // TODO: [4] 실패 시 showAlert('삭제에 실패했습니다.')
    };

    // ---------------------------------------------------------
    // [조기 반환 렌더링]
    // isLoading: 전체 화면 로딩 텍스트 ("Loading Snap..." + pulse 애니메이션)
    // error 또는 snap이 null: "Snap Not Found" 에러 화면 + "GO BACK" 버튼
    // ---------------------------------------------------------
    if (isLoading) return <ResponsiveLayout showTabs={false}><div className="p-20 text-center font-bold italic opacity-20 animate-pulse uppercase tracking-widest">Loading Snap...</div></ResponsiveLayout>;

    if (error || !snap) return (
        <ResponsiveLayout showTabs={false}>
            <div className="p-20 text-center">
                <p className="text-[#a3b0c1] font-black italic tracking-widest uppercase mb-4">Snap Not Found</p>
                <button
                    onClick={() => navigate(-1)}
                    className="h-10 px-6 bg-black text-white rounded-full text-[12px] font-black italic tracking-widest uppercase"
                >
                    GO BACK
                </button>
            </div>
        </ResponsiveLayout>
    );

    // ---------------------------------------------------------
    // [파생 값 계산]
    // isAuthor: 현재 로그인 사용자(authUser.id)와 스냅 작성자(snap.user.id)가 같으면 true
    //           → true: 편집/삭제 메뉴 표시
    //           → false: "Follow" 버튼 표시
    // myBadge: 내가 이미 전달한 달개 이모지 (null이면 전달 안 함)
    //          → 달개 버튼 중 내가 선택한 것은 강조 스타일(bg-black) 적용
    // totalBadges: 모든 달개의 count 합산 → "TOTAL N" 표시에 사용
    // ---------------------------------------------------------
    const isAuthor = authUser?.id === snap?.user?.id;
    const myBadge = snap?.myBadge ?? null;
    const totalBadges = (snap?.badges || []).reduce((acc, curr) => acc + (curr.count || 0), 0);

    // ---------------------------------------------------------
    // [JSX 렌더링]
    // ResponsiveLayout: showTabs={false} → 하단 탭바 숨김 (상세 페이지에서는 탭 불필요)
    // ---------------------------------------------------------
    return (
        <ResponsiveLayout showTabs={false}>
            <div className="bg-white dark:bg-[#101215] min-h-screen">

                {/* ── 작성자 정보 헤더 ─────────────────────────────────
                    sticky top-[60px]: 스크롤 시 상단에 고정 (TopNav 아래, z-20)
                    [왼쪽] 작성자 아바타 + 이름 + 날짜 → /friend/:userId 로 이동하는 Link
                    [오른쪽]
                    - isAuthor === true: MoreHorizontal 버튼 → showMenu 토글
                      showMenu가 true이면 드롭다운 메뉴 표시:
                        - "EDIT": /snap/:id/edit 로 이동
                        - "DELETE": handleDelete() 호출
                    - isAuthor === false: "Follow" 버튼 (현재 기능 미구현)
                ─────────────────────────────────────────────────────── */}
                {/* User Header */}
                <div className="flex justify-between items-center px-4 py-4 sticky top-[60px] bg-white dark:bg-[#1c1f24] z-20 border-b border-[#f3f3f3] dark:border-[#292e35]">
                    {/* 작성자 아바타 + 이름/날짜 (클릭 시 작성자 프로필로 이동) */}
                    <Link to={`/friend/${snap?.user?.id || snap?.user?.userId}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#f3f3f3]">
                            <img
                                src={snap?.user?.profileImage || DEFAULT_AVATAR}
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

                    {/* 오른쪽 액션: 작성자면 메뉴, 타인이면 팔로우 버튼 */}
                    <div className="flex items-center gap-2">
                        {isAuthor ? (
                            /* 작성자 전용: 점 3개 메뉴 버튼 + 드롭다운 */
                            <div className="relative">
                                <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-[#ccd3db] h-8 w-8 flex items-center justify-center bg-[#f3f3f3] rounded-full hover:text-black transition-colors">
                                    <MoreHorizontal size={20} />
                                </button>
                                {/* 드롭다운 메뉴: showMenu가 true일 때만 표시 */}
                                {showMenu && (
                                    <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-[#1c1f24] border border-[#f3f3f3] dark:border-[#292e35] shadow-xl rounded-lg z-30 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        {/* EDIT: 스냅 수정 페이지로 이동 */}
                                        <button onClick={() => navigate(`/snap/${id}/edit`)} className="w-full px-4 py-3 text-[13px] font-bold flex items-center gap-2 hover:bg-[#fafafa] dark:hover:bg-[#292e35]"><Edit2 size={14} /> EDIT</button>
                                        {/* DELETE: 삭제 확인 모달 후 삭제 API 호출 */}
                                        <button onClick={handleDelete} className="w-full px-4 py-3 text-[13px] font-bold flex items-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /> DELETE</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* 비작성자: Follow 버튼 (현재 기능 미구현) */
                            <button className="h-8 px-4 bg-black text-white rounded-full text-[12px] font-black italic tracking-widest uppercase flex items-center gap-1 hover:scale-105 active:scale-95 transition-all">
                                <Plus size={12} /> Follow
                            </button>
                        )}
                    </div>
                </div>

                {/* ── 이미지 캐러셀 ────────────────────────────────────
                    현재 imgIndex에 해당하는 이미지를 전체 너비로 표시.
                    이미지 로드 실패 시: DEFAULT_POST_IMAGE로 대체.
                    사진이 2장 이상일 때만 좌/우 버튼과 인덱스 표시 렌더링:
                    - ChevronLeft 버튼: Math.max(0, i-1) → 첫 번째에서 비활성화(disabled)
                    - ChevronRight 버튼: Math.min(length-1, i+1) → 마지막에서 비활성화
                    - 우측 하단 인덱스 뱃지: "{imgIndex+1} / {총 사진 수}"
                ─────────────────────────────────────────────────────── */}
                {/* Image Carousel */}
                <div className="relative w-full bg-[#f9f9f9] dark:bg-[#101215]">
                    <img
                        src={snap.images[imgIndex] || DEFAULT_POST_IMAGE}
                        className="w-full h-auto object-contain"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_POST_IMAGE; }}
                    />
                    {/* 사진이 2장 이상일 때만 캐러셀 컨트롤 렌더링 */}
                    {snap.images.length > 1 && (
                        <>
                            {/* 이전 이미지 버튼 (첫 번째 이미지에서 비활성화) */}
                            <button
                                onClick={() => setImgIndex(i => Math.max(0, i - 1))}
                                disabled={imgIndex === 0}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-30"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            {/* 다음 이미지 버튼 (마지막 이미지에서 비활성화) */}
                            <button
                                onClick={() => setImgIndex(i => Math.min(snap.images.length - 1, i + 1))}
                                disabled={imgIndex === snap.images.length - 1}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center disabled:opacity-30"
                            >
                                <ChevronRight size={18} />
                            </button>
                            {/* 현재 이미지 위치 표시 뱃지: "1 / 3" 형태 */}
                            <div className="absolute bottom-4 right-4 z-10 bg-black/50 backdrop-blur-md text-white px-2 py-1 rounded text-[10px] font-black italic tracking-widest uppercase">
                                {imgIndex + 1} / {snap.images.length}
                            </div>
                        </>
                    )}
                </div>

                {/* ── 연관 상품 가로 스크롤 ────────────────────────────
                    snap.products 배열이 있을 때 표시 (없으면 빈 영역).
                    overflow-x-auto + scrollbar-hide: 가로 스크롤 가능, 스크롤바 숨김.
                    각 상품 카드: 이미지 + 브랜드명 + 상품명 + "BUY NOW" 클릭 가능.
                ─────────────────────────────────────────────────────── */}
                {/* Products */}
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

                {/* ── 본문 텍스트 + 태그 + 달개 시스템 ────────────────
                    p-6 패딩 컨테이너 내부:

                    [본문 텍스트]
                    snap.description (rawSnap.bodyText): 스냅 본문 텍스트 표시

                    [태그 목록]
                    snap.tags 배열 → 각 태그를 "#태그" 형태로 파란색으로 표시

                    [달개 시스템 (Badge System)]
                    - "Badges Collected" 헤딩 + "TOTAL N" 표시
                    - 현재 받은 달개 목록: 이모지 + 개수
                      (없으면 "No Badges Yet" 텍스트)
                    - "Give a badge" 섹션: AVAILABLE_BADGES 8개를 4열 그리드로 표시
                      - 각 버튼: 이모지 + 이름
                      - 내가 이미 선택한 달개(myBadge === ab.emoji): 강조 스타일(bg-black)
                      - 클릭 시: handleGiveBadge() → "준비 중" 알림
                ─────────────────────────────────────────────────────── */}
                <div className="p-6">
                    {/* 스냅 본문 텍스트 */}
                    <p className="text-[15px] leading-relaxed mb-6 font-medium text-[#424a54]">{snap?.description}</p>

                    {/* 태그 목록: #태그명 형태로 파란색 표시 */}
                    <div className="flex flex-wrap gap-2 mb-10">
                        {snap?.tags?.map(t => <span key={t} className="text-[#0078ff] text-[15px] font-bold">#{t}</span>)}
                    </div>

                    {/* 달개(Badge) 시스템 섹션 */}
                    <div className="bg-[#fafafa] dark:bg-[#1c1f24] rounded-2xl p-6 border border-[#f3f3f3] dark:border-[#292e35]">
                        {/* 달개 헤더: Award 아이콘 + "Badges Collected" + 총 개수 */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Award className="text-black" size={20} />
                                <h3 className="text-[15px] font-black italic tracking-widest uppercase">Badges Collected</h3>
                            </div>
                            <span className="text-[13px] font-black italic tracking-tighter text-black">TOTAL {totalBadges}</span>
                        </div>

                        {/* 수집된 달개 목록: 이모지 + 개수 표시 */}
                        <div className="flex flex-wrap gap-3 mb-8">
                            {snap.badges?.length > 0 ? snap.badges.map(b => (
                                <div key={b.emoji} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#292e35] rounded-lg border border-[#f3f3f3] dark:border-[#424a54] shadow-sm">
                                    <span className="text-xl">{b.emoji}</span>
                                    <span className="text-[12px] font-black italic tracking-tighter">{b.count}</span>
                                </div>
                            )) : <p className="text-[12px] text-[#ccd3db] font-bold italic tracking-widest text-center w-full py-4 uppercase">No Badges Yet</p>}
                        </div>

                        {/* 달개 전달 섹션: 8가지 달개를 4열 그리드로 표시 */}
                        <p className="text-[12px] font-black italic tracking-widest uppercase text-[#ccd3db] mb-4 text-center">Give a badge</p>
                        <div className="grid grid-cols-4 gap-3 max-w-[360px] mx-auto">
                            {AVAILABLE_BADGES.map(ab => (
                                <button
                                    key={ab.emoji}
                                    onClick={() => handleGiveBadge(ab.emoji)}
                                    /* 내가 이미 선택한 달개는 강조 스타일, 나머지는 기본 스타일 */
                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${myBadge === ab.emoji ? 'bg-black text-[#e5e5e5] shadow-xl scale-110' : 'bg-white dark:bg-[#292e35] border border-[#f3f3f3] dark:border-[#424a54] text-[#ccd3db] hover:border-black dark:hover:border-[#e5e5e5] hover:text-black dark:hover:text-[#e5e5e5]'}`}
                                >
                                    <span className="text-2xl">{ab.emoji}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">{ab.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 하단 여백: 내비게이션 바와 콘텐츠가 겹치지 않도록 */}
                <div className="h-20"></div>
            </div>
        </ResponsiveLayout>
    );
}
