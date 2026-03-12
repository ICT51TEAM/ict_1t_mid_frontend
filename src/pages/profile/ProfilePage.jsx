/**
 * @file ProfilePage.jsx
 * @route /profile
 * @description 로그인한 사용자의 본인 프로필 페이지.
 *
 * [화면 구성]
 *   1. 프로필 헤더 영역 - 프로필 이미지, 사용자명, 상태메시지, 글벗 수, 게시글 수, 레벨
 *   2. EXP 진행 바 - 현재 레벨의 뱃지 누적 수로 계산한 다음 레벨까지의 진척도
 *   3. 탭 바 - POSTS(격자 아이콘) / LIKES(하트 아이콘) / SAVED(북마크 아이콘)
 *   4. 콘텐츠 그리드 - 3열 이미지 그리드, 최초 3개 게시글에 TOP 뱃지 표시
 *
 * [핵심 설계 원칙]
 *   - user 상태를 authUser로 즉시 초기화함으로써, API 응답을 기다리지 않고
 *     페이지를 즉시 렌더링할 수 있다 (무한 로딩 스피너 방지).
 *   - 실제 데이터 fetch는 Promise.allSettled로 3개 API를 병렬 호출하여
 *     각각 독립적으로 성공/실패 처리한다. 한 API가 실패해도 나머지는 정상 표시.
 *
 * [상태 변수]
 *   @state {object|null} user            - 표시할 유저 정보 (authUser 기반으로 즉시 초기화)
 *   @state {Array}       posts           - 필터링된 내 게시글 목록
 *   @state {number}      friendCount     - 현재 사용자의 글벗(친구) 수
 *   @state {string}      activeTab       - 현재 선택된 탭 ('POSTS' | 'LIKES' | 'SAVED')
 *   @state {boolean}     postsLoading    - 게시글 목록 로딩 중 여부 (스피너 표시용)
 *
 * [주요 동작]
 *   - useEffect: authUser.id가 존재하면 3개 API를 병렬 호출 (getMyProfile, getPosts, listFriends)
 *   - posts 필터링: API에서 받은 전체 게시글 중 authorId === authUser.id인 것만 표시
 *   - TOP 뱃지: posts 배열 인덱스 0, 1, 2 (처음 3개)에 "TOP" 레이블 오버레이
 *   - 레벨 계산: Math.floor(totalBadges / 5) + 1  (뱃지 5개마다 레벨업)
 *   - EXP 진행률: (totalBadges % 5) * 20 %  (레벨 내 뱃지 0~4개 → 0~80%)
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Settings, Grid, Bookmark, Heart, Award, Plus, Edit3, Loader2 } from 'lucide-react';
import { userService } from '@/api/userService';
import { postService } from '@/api/postService';
import { friendService } from '@/api/friendService';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_AVATAR, DEFAULT_POST_IMAGE, getImageUrl } from '@/utils/imageUtils';

export default function ProfilePage() {
    console.log('ProfilePage 렌더링됨'); // 컴포넌트 진입 확인
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    console.log('authUser:', authUser); // authUser 상태 확인

    // AuthContext에서 현재 로그인된 사용자 정보를 가져온다.
    // authUser는 로그인 직후 메모리에 이미 올라와 있으므로 즉시 사용 가능.

    // -------------------------------------------------------------------------
    // [상태 변수 선언]
    // -------------------------------------------------------------------------

    /**
     * user: 화면에 표시될 프로필 정보.
     *
     * 초기화 트릭(lazy initializer):
     *   - authUser가 이미 존재하면 → 즉시 user로 설정 (API 응답 전에도 페이지 렌더링 가능)
     *   - totalBadges를 기반으로 level 필드를 미리 계산하여 포함
     *   - authUser가 null이면 → null 반환 (ProtectedRoute 덕분에 실제로는 거의 발생하지 않음)
     *
     * API 응답 후 getMyProfile() 성공 시 최신 데이터로 교체됨.
     */
    const [user, setUser] = useState(() => {
        if (!authUser) {
            console.log('[user] authUser 없음 → null');
            return null;
        }
        const initialUser = {
            ...authUser,
            level: Math.floor((authUser.totalBadges || 0) / 5) + 1,
        };
        console.log('[user] 초기값:', initialUser);
        return initialUser;
    });

    /**
     * posts: 현재 사용자의 게시글 목록.
     * API에서 전체 게시글을 받아온 뒤 authorId 기준으로 필터링하여 저장.
     * 초기값은 빈 배열.
     */
    const [posts, setPosts] = useState([]);

    /**
     * friendCount: 현재 사용자의 글벗(친구) 수.
     * listFriends() 응답 배열의 길이를 저장.
     * 초기값 0 → 실패 시에도 0 유지.
     */
    const [friendCount, setFriendCount] = useState(0);

    /**
     * activeTab: 현재 활성화된 콘텐츠 탭.
     * 'POSTS' | 'LIKES' | 'SAVED' 중 하나.
     * 현재 구현상 탭 전환은 UI만 바뀌며, LIKES/SAVED 내용은 미구현.
     */
    const [activeTab, setActiveTab] = useState('POSTS');

    /**
     * postsLoading: 게시글 로딩 중 여부.
     * true일 때 → 3열 그리드 대신 스피너(Loader2) 표시.
     * Promise.allSettled 완료 후 finally에서 false로 설정.
     */
    const [postsLoading, setPostsLoading] = useState(true);

    // -------------------------------------------------------------------------
    // [useEffect: 데이터 로드]
    // -------------------------------------------------------------------------

    /**
     * 마운트 시(또는 authUser.id 변경 시) 3개의 API를 병렬 호출하여 데이터 로드.
     *
     * 실행 조건: authUser?.id가 존재할 때만 실행.
     *   - authUser.id가 없으면 postsLoading을 false로 설정하고 종료.
     *
     * Promise.allSettled 사용 이유:
     *   - 개별 API 실패가 다른 API의 결과에 영향을 주지 않도록 함.
     *   - 예: 게시글 API 실패 → 프로필/글벗 수는 정상 표시.
     *
     * 병렬 API 호출:
     *   [0] userService.getMyProfile()   → GET /api/users/me
     *       성공: setUser(최신 프로필 데이터) - level 필드도 응답에 포함되어야 함
     *       실패: authUser 기반 초기값 유지 (lazy initializer에서 설정한 값)
     *
     *   [1] postService.getPosts({ type: 'photo' }) → GET /api/posts?type=photo
     *       성공: 응답 배열에서 authorId === authUser.id인 게시글만 필터링하여 저장
     *       실패: 빈 배열([]) 유지
     *
     *   [2] friendService.listFriends()  → GET /api/friends
     *       성공: 응답 배열의 length를 friendCount로 저장
     *       실패: 0 유지
     *
     * finally: postsLoading = false (성공/실패 무관하게 로딩 스피너 종료)
     *
     * 의존성 배열: [authUser?.id] - 사용자 ID가 바뀔 때만 재실행
     */
    useEffect(() => {
        console.log('useEffect 실행, authUser?.id:', authUser?.id);
        if (!authUser?.id) {
            setPostsLoading(false);
            return;
        }

        const loadData = async () => {
            console.log('loadData 시작, authUser:', authUser); // 이거 추가
            // TODO: [1] setPostsLoading(true) 호출
            // TODO: [2] Promise.allSettled([
            //             userService.getMyProfile(),
            //             postService.getPosts({ type: 'photo' }),
            //             friendService.listFriends()
            //           ]) 병렬 호출
            // TODO: [3] profileResult.status === 'fulfilled'이면 setUser(profileResult.value)
            // TODO: [4] postsResult.status === 'fulfilled'이면
            //             배열 여부 확인 후 authorId === authUser.id 필터링하여 setPosts()
            // TODO: [5] friendsResult.status === 'fulfilled'이면
            //             배열 길이를 setFriendCount()에 저장
            // 힌트: finally 블록에서 setPostsLoading(false) 호출
            setPostsLoading(true); //로딩 시작
            const withTimeout = (promise, name) =>
                Promise.race([ // API랑 타이머 중 먼저 끝나는 쪽 채택 (타임아웃 구현용)
                    promise,
                    new Promise((_, reject) => //성공 값을 안쓰겠다는 의미
                        setTimeout(() => reject(new Error(`${name} timeout`)), 8000) //8초 제한
                    )
                ])
            try{
                const [profileResult, postsResult, friendsResult] = await Promise.allSettled([ //결과다 받아 끝날때까지 기다릴테니까
                withTimeout(userService.getMyProfile(), 'profile'), //내거 가져오는 API 일까? 아니면 수정필요
                withTimeout(postService.getPosts({ type: 'photo' }), 'posts'), //전체 가져오는 API 일까? 아니면 수정필요
                withTimeout(friendService.listFriends(), 'friends') //내거 가져오는 API 일까? 아니면 수정필요
                ]);

                // 각각 결과 로그
                console.log('[Profile]', profileResult.status, profileResult.status === 'rejected' ? profileResult.reason : profileResult.value);
                console.log('[Posts]', postsResult.status, postsResult.status === 'rejected' ? postsResult.reason : postsResult.value);
                console.log('[Friends]', friendsResult.status, friendsResult.status === 'rejected' ? friendsResult.reason : friendsResult.value);

                if (profileResult.status === 'fulfilled') { //성공시fulfilled 실패시rejected
                    setUser(profileResult.value);
                }
                if (postsResult.status === 'fulfilled') {
                    setPosts(postsResult.value.filter(post => post.authorId === authUser.id));
                }
                if (friendsResult.status === 'fulfilled') {
                    setFriendCount(friendsResult.value.length);
                }
            }catch(error){
                console.error('Error loading profile data:', error);
            }finally{
                setPostsLoading(false);
            }
            
            
        };
        loadData(); //useEffect 에서 정의후 실행
    }, [authUser?.id]); //처음마운트시, authUser.id가 생길때, 다른계정으로 바뀔때 실행

    // -------------------------------------------------------------------------
    // [조기 반환: 로딩 상태]
    // -------------------------------------------------------------------------

    // user가 아직 없으면 스피너 (ProtectedRoute를 통해 authUser가 보장되므로 거의 발생 안 함)
    // lazy initializer에서 authUser를 user로 바로 설정하므로 이 분기는 사실상 authUser=null인 경우만 해당.
    if (!user) return (
        <ResponsiveLayout showTabs={false}>
            <div className="p-20 text-center font-black animate-pulse text-gray-400 italic uppercase tracking-widest">Loading SNAP...</div>
        </ResponsiveLayout>
    );

    // -------------------------------------------------------------------------
    // [JSX 렌더링]
    // -------------------------------------------------------------------------

    return (
        <ResponsiveLayout showTabs={true}>
            {/* 전체 페이지 컨테이너: 라이트/다크 모드 배경색 적용 */}
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5]">

                {/* ============================================================
                    [섹션 1] 프로필 헤더 영역
                    - 프로필 이미지 (rounded square, 96px / 128px)
                    - 우측 하단에 프로필 편집 버튼 (연필 아이콘, /profile/edit 이동)
                    - 사용자명 + 설정 아이콘 버튼 (/settings 이동)
                    - 상태 메시지 (statusMessage → bio → 기본 문구 순 폴백)
                    - 통계 3개: 글벗 수(클릭 시 /friends) / Posts 수(클릭 시 /profile) / Level(클릭 시 /badges)
                    - lg 이상 화면에서만 보이는 MESSAGE(준비중) / Friends 버튼
                ============================================================ */}
                <div className="bg-white dark:bg-[#1c1f24] px-4 pt-10 pb-6 flex flex-col md:flex-row items-center gap-6 md:gap-10 border-b border-[#f3f3f3] dark:border-[#292e35]">
                    <div className="relative">
                        {/* 프로필 이미지: profileImageUrl → profileImage → DEFAULT_AVATAR 순 폴백 */}
                        <img
                            src={getImageUrl(user.profileImageUrl || user.profileImage) || DEFAULT_AVATAR}
                            alt="p"
                            className="w-24 h-24 md:w-32 md:h-32 rounded-[28px] object-cover border border-[#eef1f4] shadow-sm"
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                        />
                        {/* 프로필 편집 버튼: 이미지 우측 하단에 오버레이, 클릭 시 /profile/edit 이동 */}
                        <button
                            onClick={() => navigate('/profile/edit')}
                            className="absolute bottom-0 right-0 w-8 h-8 md:w-10 md:h-10 bg-black text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:bg-gray-800 transition-all"
                        >
                            <Edit3 size={16} />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                        {/* 사용자명 + 설정 아이콘 */}
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-black italic tracking-tighter uppercase">{user.username}</h2>
                            {/* 설정 아이콘: 클릭 시 /settings 페이지로 이동 */}
                            <button onClick={() => navigate('/settings')} className="p-1 text-[#a3b0c1] hover:text-black">
                                <Settings size={20} />
                            </button>
                        </div>

                        {/* 상태 메시지: statusMessage → bio → 기본 텍스트 순으로 폴백 */}
                        <p className="text-[14px] font-medium text-[#7b8b9e] mb-5 leading-relaxed max-w-[400px]">
                            {user.statusMessage || user.bio || '나만의 스타일을 기록해보세요.'}
                        </p>

                        {/* 통계 3개: 글벗 수 / 게시글 수 / 레벨 */}
                        <div className="flex items-center gap-10">
                            {/* 글벗 수: 클릭 시 /friends 이동 */}
                            <div className="flex flex-col items-center md:items-start cursor-pointer" onClick={() => navigate('/friends')}>
                                <span className="text-[18px] font-black italic tracking-tighter">{friendCount}</span>
                                <span className="text-[11px] font-black text-[#ccd3db] uppercase tracking-widest">글벗</span>
                            </div>
                            {/* 게시글 수: 로딩 중이면 '-' 표시, 완료 후 실제 개수 표시 */}
                            <div className="flex flex-col items-center md:items-start cursor-pointer" onClick={() => navigate('/profile')}>
                                <span className="text-[18px] font-black italic tracking-tighter">{postsLoading ? '-' : posts.length}</span>
                                <span className="text-[11px] font-black text-[#ccd3db] uppercase tracking-widest">Posts</span>
                            </div>
                            {/* 레벨: 클릭 시 /badges 이동, user.level이 없으면 1 기본값 */}
                            <div className="flex flex-col items-center md:items-start cursor-pointer" onClick={() => navigate('/badges')}>
                                <span className="text-[18px] font-black italic tracking-tighter">LV.{user.level || 1}</span>
                                <span className="text-[11px] font-black text-[#ccd3db] uppercase tracking-widest">Level</span>
                            </div>
                        </div>
                    </div>

                    {/* lg 이상 화면에서만 표시되는 액션 버튼 영역 */}
                    <div className="hidden lg:flex flex-col gap-3 w-[220px]">
                        {/* MESSAGE 버튼: disabled 상태 (기능 미구현, 준비 중) */}
                        <button disabled className="w-full h-12 bg-black text-white rounded-[4px] font-black italic tracking-widest uppercase text-[17px] opacity-40 cursor-not-allowed">MESSAGE (준비중)</button>
                        {/* Friends 버튼: 클릭 시 /friends 이동 */}
                        <button onClick={() => navigate('/friends')} className="w-full h-12 border-2 border-black dark:border-[#e5e5e5] rounded-[4px] font-black italic tracking-widest uppercase text-[17px] hover:bg-black hover:text-white dark:hover:bg-[#e5e5e5] dark:hover:text-black transition-all">Friends</button>
                    </div>
                </div>

                {/* ============================================================
                    [섹션 2] EXP / 다음 레벨 진행 바
                    - Award 아이콘 + "Level Progress" 레이블
                    - 우측에 다음 레벨 표시 (현재 레벨 + 1)
                    - 진행 바 계산: (totalBadges % 5) * 20 %
                        예) totalBadges=7 → 7%5=2 → 40% 채워짐
                    - 하단에 현재 뱃지 수 / 레벨 목표 뱃지 수 표시
                        목표 뱃지 수 = 현재 레벨 * 5
                ============================================================ */}
                <div className="flex flex-col py-5 px-6 bg-[#fafafa] dark:bg-[#101215] border-b border-[#f3f3f3] dark:border-[#292e35]">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <Award size={16} className="text-yellow-500" />
                            <span className="text-[12px] font-black italic tracking-widest text-black dark:text-[#e5e5e5] uppercase">Level Progress</span>
                        </div>
                        {/* 다음 레벨 표시: 현재 레벨 + 1 */}
                        <span className="text-[11px] font-black text-[#a3b0c1] uppercase tracking-widest">Next: LV.{(user.level || 1) + 1}</span>
                    </div>
                    {/* 진행 바: 검정색 바가 왼쪽부터 채워짐, 1초 애니메이션 */}
                    <div className="w-full h-[6px] bg-[#e5e5e5] dark:bg-[#292e35] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-black transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(((user.totalBadges || 0) % 5) * 20, 100)}%` }}
                        ></div>
                    </div>
                    {/* 현재 뱃지 수 / 레벨 목표 뱃지 수 텍스트 */}
                    <div className="mt-1.5 text-right">
                        <span className="text-[10px] font-black text-[#ccd3db] uppercase tracking-widest">
                            {user.totalBadges || 0} / {((user.level || 1) * 5)} Badges
                        </span>
                    </div>
                </div>

                {/* ============================================================
                    [섹션 3] 탭 바
                    - POSTS(Grid 아이콘) / LIKES(Heart 아이콘) / SAVED(Bookmark 아이콘)
                    - sticky top-[60px]: 스크롤 시 상단에 고정 (헤더 높이 60px 아래)
                    - 활성 탭: 아이콘 stroke 두껍게(2.5px) + 하단에 검정 밑줄 표시
                    - 비활성 탭: 연한 회색(#ccd3db), hover 시 약간 진해짐
                    - onClick: setActiveTab으로 상태 변경 (탭 전환)
                    - 참고: LIKES/SAVED 탭의 콘텐츠는 현재 미구현
                ============================================================ */}
                <div className="flex border-b border-[#f3f3f3] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] sticky top-[60px] z-10 transition-all">
                    {[
                        { id: 'POSTS', icon: Grid },
                        { id: 'LIKES', icon: Heart },
                        { id: 'SAVED', icon: Bookmark },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => t.id === 'POSTS' && setActiveTab(t.id)}
                            disabled={t.id !== 'POSTS'}
                            className={`flex-1 py-4 flex justify-center items-center gap-1 relative 
                                ${t.id === 'POSTS' 
                                    ? (activeTab === t.id ? 'text-black dark:text-[#e5e5e5]' : 'text-[#ccd3db] hover:text-[#a3b0c1]')
                                    : 'text-[#ccd3db] opacity-40 cursor-not-allowed'
                                }`}
                        >
                            <t.icon size={22} className={activeTab === t.id ? 'stroke-[2.5px]' : 'stroke-[1.5px]'} />
                            {t.id !== 'POSTS' && (
                                <span className="text-[9px] font-black tracking-widest uppercase">준비중</span>
                            )}
                            {activeTab === t.id && t.id === 'POSTS' && (
                                <div className="absolute bottom-0 left-[20%] right-[20%] h-[2.5px] bg-black dark:bg-[#e5e5e5]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ============================================================
                    [섹션 4] 콘텐츠 그리드
                    - postsLoading=true: 중앙 스피너 표시 (Loader2 회전 애니메이션)
                    - posts.length > 0: 3열 이미지 그리드 렌더링
                        - 각 셀: aspect-ratio 3:4 (portrait 비율)
                        - hover 시 이미지 scale-105 확대 애니메이션
                        - 인덱스 0,1,2 (첫 3개 게시글)에 "TOP" 레이블 오버레이 (좌상단)
                        - 클릭 시 /snap/:id 상세 페이지로 이동
                        - 이미지 로드 실패 시 DEFAULT_POST_IMAGE로 폴백
                    - posts.length === 0: 빈 상태 안내 (Plus 아이콘 + "No Snap Yet")
                ============================================================ */}
                <div className="flex flex-wrap p-0.5 bg-white dark:bg-[#101215]">
                    {postsLoading ? (
                        // 로딩 중: 중앙 스피너
                        <div className="w-full py-20 flex items-center justify-center text-[#ccd3db]">
                            <Loader2 size={28} className="animate-spin" />
                        </div>
                    ) : posts.length > 0 ? (
                        // 게시글 존재: 3열 그리드 렌더링
                        posts.map((post, i) => (
                            <div
                                key={post.id}
                                onClick={() => navigate(`/snap/${post.id}`)}
                                className="w-1/3 p-0.5 aspect-[3/4] relative group cursor-pointer overflow-hidden"
                            >
                                {/* 게시글 썸네일 이미지: hover 시 scale-105 확대 */}
                                <img
                                    src={getImageUrl(post.imageUrl) || DEFAULT_POST_IMAGE}
                                    alt="post"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_POST_IMAGE; }}
                                />
                                {/* hover 시 어두운 오버레이 제거, 기본 상태에서는 약한 어둠 적용 */}
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all pointer-events-none"></div>
                                {/* TOP 뱃지: 인덱스 0,1,2 (처음 3개 게시글)에만 표시 */}
                                {i < 3 && (
                                    <div className="absolute top-2 left-2 bg-black text-white text-[10px] font-black italic px-1.5 py-0.5 tracking-tighter shadow-lg">
                                        TOP
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        // 게시글 없음: 빈 상태 안내
                        <div className="w-full py-32 flex flex-col items-center justify-center text-[#ccd3db]">
                            <Plus size={48} className="mb-4 opacity-20" />
                            <p className="text-[13px] font-black italic tracking-widest uppercase opacity-40">No Snap Yet</p>
                        </div>
                    )}
                </div>
            </div>
        </ResponsiveLayout>
    );
}
