/**
 * @file GlobalNav.jsx
 * @description 데스크톱 전용 상단 내비게이션 바 컴포넌트.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [역할 및 아키텍처에서의 위치]
 *   - ResponsiveLayout.jsx에서 sm 브레이크포인트(640px) 이상일 때만 표시됨.
 *   - 검정(#111111) 배경의 얇은(44px) 수평 바 형태.
 *   - 좌측에는 페이지 링크, 우측에는 검색·MY·로그인/로그아웃 버튼 배치.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [레이아웃 구성]
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  [HOME] [CREATE] [FRIENDS] [BADGES] [FINANCE]  │  [🔍] [MY] [LOGOUT] │
 *   └──────────────────────────────────────────────────────────────────┘
 *       ← 좌측 섹션 (overflow-x-auto, 소형 화면에서 스크롤 가능)
 *                                                     ← 우측 섹션 (flex-shrink-0, 항상 고정)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [좌측 섹션: 페이지 링크]
 *   leftItems 배열로 정의된 5개 링크를 <Link> 컴포넌트로 렌더링.
 *   현재 경로와 정확히 일치(location.pathname === item.path)하면
 *   흰색 + 굵은 이탤릭 + 밑줄 스타일로 활성 상태 표시.
 *   소형 화면에서는 overflow-x-auto로 가로 스크롤 가능 (스크롤바 숨김).
 *
 *   링크 목록:
 *     HOME     → /
 *     CREATE   → /create
 *     FRIENDS  → /friends
 *     BADGES   → /badges
 *     FINANCE  → /finance
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [우측 섹션: 검색 + MY + 로그인/로그아웃]
 *   검색 폼:
 *     - md 브레이크포인트(768px) 이상에서만 표시
 *     - 입력창: 기본 너비 140px, 포커스 시 200px로 확장 (transition)
 *     - 제출 시 /?q=검색어 형태로 피드 페이지에 검색 쿼리 파라미터 전달
 *     - 제출 후 입력값 초기화
 *     - 검색어가 빈 문자열이면 제출 무시
 *   MY 링크: /profile로 이동하는 고정 링크
 *   로그인/로그아웃 버튼:
 *     - isAuthenticated=true: LOGOUT 버튼 → 클릭 시 logout() 후 /login으로 이동
 *     - isAuthenticated=false: LOGIN 링크 → /login 페이지로 이동
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [State 변수]
 *   - searchTerm : string — 검색 입력창의 현재 텍스트 값.
 *                           제출 성공 시 빈 문자열로 초기화됨.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [사용하는 훅 및 컨텍스트]
 *   - useLocation    : 현재 경로를 읽어 활성 링크 스타일 적용에 사용
 *   - useNavigate    : 로그아웃 후 /login 이동, 검색 제출 후 쿼리 이동
 *   - useAuth        : isAuthenticated(로그인 여부), logout(로그아웃 함수) 접근
 *   - React.useState : 검색어 상태 관리
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [Props]
 *   없음 (필요한 모든 데이터를 훅에서 자체 조회)
 */
import React from 'react';
// 검색 아이콘 (우측 검색 입력창 내부에 표시)
import { Search } from 'lucide-react';
// Link: 선언적 내비게이션 링크 / useLocation: 현재 경로 / useNavigate: 프로그래매틱 이동
import { Link, useLocation, useNavigate } from 'react-router-dom';
// 인증 상태 및 로그아웃 함수 접근
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';

/**
 * @component GlobalNav
 * @description 데스크톱(sm 이상) 환경에서 화면 상단에 렌더링되는 전역 내비게이션 바.
 *              검정 배경(#111111), 높이 44px의 수평 바.
 */
export default function GlobalNav() {
    // ── 훅: 현재 URL 경로 ──────────────────────────────────────────────────────
    // 좌측 링크의 활성 스타일(흰색+밑줄) 적용 여부를 판별하는 데 사용
    const location = useLocation();

    // ── 훅: 프로그래매틱 내비게이션 ────────────────────────────────────────────
    // 로그아웃 후 /login 리다이렉트, 검색 제출 후 /?q=... 이동에 사용
    const navigate = useNavigate();

    // ── 컨텍스트: 인증 상태 및 로그아웃 함수 ─────────────────────────────────
    // isAuthenticated: 로그인 여부 boolean
    // logout: 로컬스토리지 초기화 + user 상태 null 처리
    const { isAuthenticated, logout } = useAuth();
    const { showAlert } = useAlert();

    // ── 상수: 좌측 내비게이션 링크 목록 ─────────────────────────────────────
    // 순서대로 렌더링됨. path는 활성 여부 판별과 <Link to> 속성에 모두 사용.
    const leftItems = [
        { name: 'HOME', path: '/' },       // 메인 피드 페이지
        { name: 'CREATE', path: '/create' },  // 게시물 작성 페이지
        { name: 'FRIENDS', path: '/friends' }, // 친구 목록 페이지
        { name: 'BADGES', path: '/badges' },  // 배지 목록 페이지
        { name: 'FINANCE', path: '/finance' }, // 금융 정보 페이지
    ];

    // ── 함수: handleLogout ────────────────────────────────────────────────────
    /**
     * @function handleLogout
     * @description LOGOUT 버튼 클릭 시 실행.
     *              AuthContext의 logout()으로 인증 상태를 초기화하고
     *              /login 페이지로 이동한다.
     */
    const handleLogout = () => {
        // AuthContext의 logout: localStorage 토큰·유저 정보 삭제 + user 상태 null
        logout();
        // 로그아웃 후 로그인 페이지로 리다이렉트
        showAlert('로그아웃되었습니다.', '로그아웃', 'success');
        navigate('/login');
    };

    // ── State: 검색어 ─────────────────────────────────────────────────────────
    // 검색 입력창의 현재 텍스트 값. 폼 제출 성공 시 빈 문자열로 초기화됨.
    const [searchTerm, setSearchTerm] = React.useState('');

    // ── 함수: handleSearch ────────────────────────────────────────────────────
    /**
     * @function handleSearch
     * @description 검색 폼 제출(submit) 이벤트 핸들러.
     *              검색어를 URL 쿼리 파라미터로 인코딩해 피드 페이지(/)로 이동.
     *
     * @param {React.FormEvent} e - 폼 submit 이벤트 객체
     *
     * 동작 흐름:
     *   1. e.preventDefault()로 기본 폼 제출(페이지 새로고침) 방지
     *   2. searchTerm을 trim()해 앞뒤 공백 제거
     *   3. 빈 문자열이면 아무 동작도 하지 않음
     *   4. encodeURIComponent로 특수문자·한글 등을 URL 안전 형태로 인코딩
     *   5. /?q=검색어 경로로 이동 (FeedPage에서 q 파라미터를 읽어 필터링)
     *   6. 입력창 초기화
     */
    const handleSearch = (e) => {
        // 기본 폼 제출(페이지 전체 새로고침) 방지
        e.preventDefault();
        if (searchTerm.trim()) {
            // 검색어를 쿼리 파라미터로 인코딩해 피드 페이지로 이동
            navigate(`/?q=${encodeURIComponent(searchTerm.trim())}`);
            // 검색 완료 후 입력창 초기화
            setSearchTerm('');
        }
    };

    // ─── JSX 렌더링 ────────────────────────────────────────────────────────────
    return (
        // ── GlobalNav 전체 컨테이너 ──────────────────────────────────────────
        // bg-[#111111]: 거의 검정에 가까운 어두운 배경색
        // text-[#c4c4c4]: 기본 링크/텍스트 색상 (연한 회색)
        // h-[44px]: 내비게이션 바의 고정 높이 44px
        <div className="bg-[#111111] text-[#c4c4c4] text-[13px] font-medium h-[44px]">
            {/* 내부 flex 컨테이너: 좌측(확장)·우측(고정) 두 섹션으로 구성 */}
            <div className="flex items-center justify-between h-full px-3 w-full">

                {/* ── 좌측 섹션: 페이지 링크 목록 ─────────────────────────────
                    flex-1: 남은 공간 모두 차지
                    overflow-x-auto scrollbar-hide: 넘치면 스크롤바 없이 가로 스크롤
                    pl-4: 좌측 내부 패딩 */}
                <div className="flex items-center flex-1 overflow-x-auto scrollbar-hide pl-4">
                    {/* space-x-6: 링크 사이 24px 간격
                        flex-shrink-0: 링크들이 줄어들지 않도록 고정
                        pr-4: 우측 섹션과의 여백 */}
                    <div className="flex items-center space-x-6 flex-shrink-0 pr-4">
                        {/* leftItems 배열을 순회해 링크 렌더링 */}
                        {leftItems.map((item) => {
                            // 현재 경로와 링크 경로가 정확히 일치하면 활성 상태
                            const isActive = location.pathname === item.path;
                            return (
                                // 활성 링크: 흰색 + font-black + italic + tracking-widest + underline
                                // 비활성 링크: hover 시 흰색으로 전환
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`flex-shrink-0 transition-all ${isActive ? 'text-white font-black italic tracking-widest underline underline-offset-4' : 'hover:text-white'}`}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* ── 우측 섹션: 검색 + MY + 로그인/로그아웃 ─────────────────
                    border-l border-[#333]: 좌측 섹션과 구분선
                    ml-4 pl-4: 구분선 주변 여백
                    flex-shrink-0: 공간이 부족해도 줄어들지 않음 */}
                <div className="flex items-center gap-4 border-l border-[#333] ml-4 flex-shrink-0 pl-4">
                    {/* 검색·MY는 md(768px) 이상에서만 표시 */}
                    <div className="hidden md:flex items-center gap-4">
                        {/* ── 검색 폼 ────────────────────────────────────────
                            제출 시 handleSearch() 호출 */}
                        <form onSubmit={handleSearch} className="relative group">
                            {/* 검색 입력창:
                                - bg-[#222]: 어두운 배경
                                - 기본 너비 140px → 포커스 시 200px로 확장 (transition)
                                - placeholder: 회색 'SEARCH' 텍스트 */}
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="SEARCH"
                                className="bg-[#222] text-white text-[11px] font-black italic tracking-widest px-4 py-1.5 rounded-full outline-none border border-transparent focus:border-white/30 w-[140px] transition-all focus:w-[200px] placeholder:text-gray-500"
                            />
                            {/* 검색 제출 버튼: 입력창 우측 내부에 절대 위치
                                group-hover: 폼에 마우스 올리면 아이콘 흰색으로 변환 */}
                            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-white">
                                <Search size={14} />
                            </button>
                        </form>

                        {/* MY 링크: /profile 페이지로 이동 */}
                        <Link to="/profile" className="text-[12px] font-black italic tracking-widest hover:text-white transition-colors">MY</Link>
                    </div>

                    {/* ── 로그인/로그아웃 버튼: 인증 상태에 따라 분기 ──────────
                        공통 스타일: 흰색 배경 + 검정 텍스트 + 이탤릭 + 자간
                        hover 시 bg-gray-200으로 약간 어두워짐 */}
                    {isAuthenticated ? (
                        // 로그인 상태: LOGOUT 버튼 → handleLogout() 실행
                        <button
                            onClick={handleLogout}
                            className="bg-white text-black px-4 py-1.5 text-[11px] font-black italic tracking-[1px] hover:bg-gray-200 transition-all"
                        >
                            LOGOUT
                        </button>
                    ) : (
                        // 비로그인 상태: LOGIN 링크 → /login 페이지로 이동
                        <Link
                            to="/login"
                            className="bg-white text-black px-4 py-1.5 text-[11px] font-black italic tracking-[1px] hover:bg-gray-200 transition-all"
                        >
                            LOGIN
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
