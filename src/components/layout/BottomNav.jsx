/**
 * @file BottomNav.jsx
 * @description 모바일 전용 하단 내비게이션 바 컴포넌트.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [역할 및 아키텍처에서의 위치]
 *   - ResponsiveLayout.jsx에서 렌더링됨. sm 브레이크포인트(640px) 이상에서는
 *     자체적으로 숨김 처리(sm:hidden)되어 데스크톱에서는 표시되지 않는다.
 *   - 화면 하단에 fixed 고정되어 스크롤과 무관하게 항상 접근 가능.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [탭 구성 (6개)]
 *   id        label   icon       path
 *   ────────────────────────────────────
 *   feed      피드     Home       /
 *   create    창작     PenTool    /create
 *   badges    달개     Award      /badges
 *   friends   글벗     Users      /friends
 *   finance   금융     Landmark   /finance
 *   profile   마이     User       /profile
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [활성 탭 판별 로직]
 *   - 피드('/') 탭: location.pathname이 정확히 '/'일 때만 활성
 *     (다른 탭들이 '/'로 시작하므로 startsWith를 사용하면 충돌)
 *   - 나머지 탭: location.pathname.startsWith(tab.path)로 판별
 *     (예: /badges/detail 경로도 badges 탭이 활성화됨)
 *   - 매칭되는 탭이 없으면 기본값 'feed'로 폴백
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [활성 탭 시각적 표현 (3가지 요소)]
 *   1. 아이콘 배경: bg-black 검정 배경 + 흰색 아이콘 + rounded-xl (비활성: 회색 아이콘)
 *   2. 레이블 텍스트: 활성 시 opacity-100으로 보임 (비활성: opacity-0으로 숨김)
 *   3. 상단 인디케이터: 버튼 최상단 중앙에 너비 32px, 높이 2px 검정 줄
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [Props]
 *   없음 (props를 받지 않으며, 현재 경로는 useLocation()으로 자체 판별)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [사용하는 훅]
 *   - useLocation : 현재 URL 경로를 읽어 활성 탭 판별에 사용
 *   - useNavigate : 탭 버튼 클릭 시 해당 경로로 프로그래매틱 이동
 */
import React from 'react';
// 현재 경로 읽기 및 프로그래매틱 내비게이션
import { useLocation, useNavigate } from 'react-router-dom';
// 각 탭에 사용할 lucide-react 아이콘:
//   Home     → 피드 탭
//   PenTool  → 창작 탭
//   Award    → 달개(배지) 탭
//   Users    → 글벗(친구) 탭
//   Landmark → 금융 탭
//   User     → 마이(프로필) 탭
import { Home, PenTool, Award, Users, Landmark, User } from 'lucide-react';

/**
 * @component BottomNav
 * @description 모바일 화면 하단에 고정되는 6탭 내비게이션 바.
 *              현재 경로에 따라 활성 탭을 자동 판별하고 시각적으로 강조 표시한다.
 */
export default function BottomNav() {
    // ── 훅: 현재 URL 경로 ──────────────────────────────────────────────────────
    // location.pathname을 이용해 현재 어느 탭이 활성 상태인지 판별
    const location = useLocation();

    // ── 훅: 프로그래매틱 내비게이션 ────────────────────────────────────────────
    // 탭 버튼 클릭 시 navigate(path)로 해당 경로로 이동
    const navigate = useNavigate();

    // ── 상수: 탭 목록 정의 ────────────────────────────────────────────────────
    // 각 탭의 식별자(id), 화면에 표시되는 한국어 레이블, 아이콘 컴포넌트, 이동 경로를 정의.
    // 이 배열을 순회해 탭 버튼들을 동적으로 렌더링함.
    const tabs = [
        { id: 'feed',    label: '피드', icon: Home,     path: '/' },       // 메인 피드 페이지
        { id: 'create',  label: '창작', icon: PenTool,  path: '/create' },  // 게시물 작성 페이지
        { id: 'badges',  label: '달개', icon: Award,    path: '/badges' },  // 배지 목록 페이지
        { id: 'friends', label: '글벗', icon: Users,    path: '/friends' }, // 친구 목록 페이지
        { id: 'finance', label: '금융', icon: Landmark, path: '/finance' }, // 금융 정보 페이지
        { id: 'profile', label: '마이', icon: User,     path: '/profile' }, // 내 프로필 페이지
    ];

    // ── 파생값: 현재 활성 탭 ID 계산 ──────────────────────────────────────────
    // tabs 배열에서 현재 pathname과 일치하는 탭을 찾아 그 id를 반환.
    //
    // 판별 규칙:
    //   - 피드 탭(path='/')은 pathname이 정확히 '/'와 같을 때만 활성
    //     → startsWith('/')는 모든 경로가 해당되므로 exact match 필요
    //   - 나머지 탭은 pathname이 tab.path로 시작할 때 활성
    //     → 예) /badges/123 → badges 탭 활성
    //
    // 매칭되는 탭이 없으면 기본값 'feed' 사용 (옵셔널 체이닝 + nullish coalescing)
    const currentTab = tabs.find(tab => {
        if (tab.path === '/') return location.pathname === '/';
        return location.pathname.startsWith(tab.path);
    })?.id || 'feed';

    // ─── JSX 렌더링 ────────────────────────────────────────────────────────────
    return (
        // ── BottomNav 외곽 컨테이너 ───────────────────────────────────────────
        // fixed bottom-0 left-0 right-0: 화면 하단에 전체 너비로 고정
        // bg-white dark:bg-[#1c1f24]: 라이트/다크 모드 배경색
        // border-t: 상단에 얇은 구분선
        // z-50: 다른 컨텐츠 위에 렌더링 (스크롤 컨텐츠에 가려지지 않도록)
        // sm:hidden: 데스크톱(640px 이상)에서는 완전히 숨김
        // pb-safe: iOS safe area 하단 여백 (노치/홈 인디케이터 영역)
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1c1f24] border-t border-[#f3f3f3] dark:border-[#292e35] z-50 sm:hidden pb-safe">
            {/* 탭 버튼들을 수평으로 균등 분배하는 내부 컨테이너
                h-[66px]: BottomNav 전체 높이 66px
                px-2: 좌우 소량의 패딩 */}
            <div className="flex items-center justify-around h-[66px] px-2">
                {/* ── 탭 버튼 목록: tabs 배열을 순회해 동적 렌더링 ── */}
                {tabs.map((tab) => {
                    // 아이콘 컴포넌트를 변수에 담아 JSX에서 사용 (<Icon />)
                    const Icon = tab.icon;
                    // 현재 탭이 활성 탭인지 여부
                    const isActive = currentTab === tab.id;

                    return (
                        // ── 개별 탭 버튼 ──────────────────────────────────────
                        // flex-1: 모든 탭이 균등한 너비를 차지
                        // relative: 상단 인디케이터(absolute)의 기준 부모
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.path)}
                            className="flex flex-col items-center justify-center gap-1.5 flex-1 h-full relative"
                        >
                            {/* ── 아이콘 래퍼: 활성 시 검정 배경 + 밝은 아이콘 ──
                                isActive=true: bg-black, text-[#e5e5e5], rounded-xl
                                isActive=false: 배경 없음, text-[#a3b0c1] (회색) */}
                            <div className={`p-2 transition-all duration-300 ${isActive ? 'bg-black text-[#e5e5e5] rounded-xl' : 'text-[#a3b0c1]'}`}>
                                {/* 아이콘: 활성 탭은 strokeWidth 2.5(굵음), 비활성은 1.5(얇음) */}
                                <Icon
                                    size={20}
                                    strokeWidth={isActive ? 2.5 : 1.5}
                                />
                            </div>

                            {/* ── 레이블 텍스트 ────────────────────────────────
                                활성 탭: opacity-100으로 표시, 검정색 텍스트
                                비활성 탭: opacity-0으로 완전 숨김 (공간은 유지)
                                스타일: 9px, 굵은 이탤릭, 자간 넓음, 대문자 */}
                            <span
                                className={`text-[9px] font-black italic tracking-widest uppercase truncate transition-all ${isActive ? 'text-black dark:text-[#e5e5e5] opacity-100' : 'text-[#ccd3db] opacity-0'}`}
                            >
                                {tab.label}
                            </span>

                            {/* ── 상단 인디케이터: 활성 탭에만 표시 ───────────
                                버튼 최상단 중앙에 너비 32px, 높이 2px 검정 선으로
                                어느 탭이 활성인지 추가로 시각화함 */}
                            {isActive && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-black dark:bg-[#e5e5e5]"></div>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
