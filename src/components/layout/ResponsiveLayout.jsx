/**
 * @file ResponsiveLayout.jsx
 * @description 앱 전체의 반응형 레이아웃을 정의하는 최상위 래퍼(wrapper) 컴포넌트.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [역할 및 아키텍처에서의 위치]
 *   - App.jsx에서 각 페이지 컴포넌트를 감싸는 공통 레이아웃 껍데기 역할을 한다.
 *   - 데스크톱·모바일 환경을 구분해 각각 다른 내비게이션 컴포넌트를 렌더링한다.
 *   - 페이지 컨텐츠({children})는 중앙의 <main> 영역에 삽입된다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [레이아웃 구조 (위에서 아래 순서)]
 *
 *   ┌─────────────────────────────────────────┐  ← 최대 1200px 중앙 정렬 컨테이너
 *   │  GlobalNav  (데스크톱 전용, sm 이상만 표시) │
 *   ├─────────────────────────────────────────┤
 *   │  SnapHeader (모바일 전용, sticky 고정)    │
 *   ├─────────────────────────────────────────┤
 *   │                                         │
 *   │  <main> — 페이지 컨텐츠 영역 ({children}) │
 *   │           모바일: 하단 pb-20 (BottomNav   │
 *   │           높이만큼 여백)                  │
 *   │           데스크톱: pb-0 (여백 없음)       │
 *   │                                         │
 *   ├─────────────────────────────────────────┤
 *   │  BottomNav (모바일 전용, fixed bottom)   │
 *   └─────────────────────────────────────────┘
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [반응형 분기 기준]
 *   - Tailwind CSS의 'sm' 브레이크포인트(640px)를 기준으로:
 *       모바일(<640px): SnapHeader + BottomNav 표시, GlobalNav 숨김
 *       데스크톱(≥640px): GlobalNav 표시, SnapHeader는 렌더링되지만
 *                         GlobalNav 아래 위치함(모바일 우선 설계)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [Props]
 *   @param {React.ReactNode} children - 레이아웃 내부에 렌더링할 페이지 컨텐츠
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [주요 스타일 결정]
 *   - max-w-[1200px] mx-auto : 최대 너비 1200px, 수평 중앙 정렬
 *   - shadow-sm              : 좌우에 가벼운 그림자로 컨텐츠 영역 구분
 *   - min-h-screen           : 짧은 페이지에서도 전체 화면 높이 유지
 *   - bg-[var(--color-mw-white)] : CSS 변수로 배경색 지정 (다크모드 대응)
 *   - SnapHeader: sticky top-0 z-50 — 스크롤 시 화면 상단에 고정
 */
import React from 'react';
// 데스크톱 전용 상단 내비게이션 바
import GlobalNav from './GlobalNav';
// 모바일 전용 상단 헤더 (SNAP 로고 + 알림 아이콘)
import SnapHeader from './SnapHeader';
// 모바일 전용 하단 내비게이션 바 (6개 탭)
import BottomNav from './BottomNav';

/**
 * @component ResponsiveLayout
 * @description 모든 인증된/일반 페이지를 감싸는 공통 레이아웃 컴포넌트.
 *              GlobalNav(데스크톱), SnapHeader(모바일), 페이지 컨텐츠, BottomNav(모바일)
 *              순서로 수직 배치된다.
 *
 * @param {React.ReactNode} children - <main> 내부에 렌더링될 페이지 컴포넌트
 */
export default function ResponsiveLayout({ children, showTabs = true }) {
    return (
        <div className="flex flex-col min-h-screen bg-[var(--color-mw-white)] max-w-[1200px] mx-auto shadow-sm">

            <div className="hidden sm:block">
                <GlobalNav />
            </div>

            <div className="sticky top-0 z-50 bg-white dark:bg-[#1c1f24] shadow-sm sm:shadow-none">
                <SnapHeader />
            </div>

            <main className={`flex-1 ${showTabs ? 'pb-24' : 'pb-0'} sm:pb-0`}>
                {children}
            </main>

            {showTabs && <BottomNav />}
        </div>
    );
}
