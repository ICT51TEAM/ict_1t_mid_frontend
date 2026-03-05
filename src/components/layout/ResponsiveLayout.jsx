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
export default function ResponsiveLayout({ children }) {
    return (
        // ── 최외곽 컨테이너 ───────────────────────────────────────────────────
        // flex-col: 자식 요소들을 세로로 순서대로 쌓음
        // min-h-screen: 최소 화면 전체 높이 확보
        // max-w-[1200px] mx-auto: 최대 너비 1200px 제한 후 좌우 auto 마진으로 중앙 정렬
        // shadow-sm: 좌우에 가벼운 박스 그림자로 페이지 경계 시각화
        <div className="flex flex-col min-h-screen bg-[var(--color-mw-white)] max-w-[1200px] mx-auto shadow-sm">

            {/* ── GlobalNav: 데스크톱 전용 상단 내비게이션 ─────────────────────
                hidden: 기본적으로 숨김 (모바일 우선)
                sm:block: sm 브레이크포인트(640px) 이상에서만 표시
                내용: 좌측 페이지 링크 + 우측 검색·MY·Login/Logout 버튼 */}
            <div className="hidden sm:block">
                <GlobalNav />
            </div>

            {/* ── SnapHeader: 모바일 전용 상단 헤더 ────────────────────────────
                sticky top-0: 스크롤해도 화면 상단에 고정
                z-50: 컨텐츠 위에 항상 올라오도록 z-index 설정
                bg-white: 스크롤 시 배경이 투명해지지 않도록 불투명 흰 배경
                shadow-sm: 헤더 하단에 그림자로 컨텐츠와 구분
                sm:shadow-none: 데스크톱에서는 그림자 제거 (GlobalNav가 대신 표시됨)
                내용: "SNAP" 로고(홈 링크) + 알림 벨 아이콘(미읽음 카운트 배지) */}
            <div className="sticky top-0 z-50 bg-white shadow-sm sm:shadow-none">
                <SnapHeader />
            </div>

            {/* ── main: 페이지 컨텐츠 영역 ─────────────────────────────────────
                flex-1: 남은 수직 공간을 모두 차지 (헤더·푸터 사이를 꽉 채움)
                pb-20: 모바일에서 BottomNav(높이 약 66px + safe area) 영역만큼
                       하단 여백을 줘서 컨텐츠가 BottomNav에 가려지지 않도록 함
                sm:pb-0: 데스크톱에서는 BottomNav가 없으므로 하단 여백 제거
                {children}: App.jsx에서 라우팅에 따라 주입되는 각 페이지 컴포넌트 */}
            <main className="flex-1 pb-20 sm:pb-0">
                {children}
            </main>

            {/* ── BottomNav: 모바일 전용 하단 내비게이션 ──────────────────────
                내부적으로 sm:hidden을 통해 데스크톱에서는 자체적으로 숨겨짐.
                fixed bottom-0으로 화면 하단에 고정되어 스크롤과 무관하게 표시.
                6개 탭: 피드(/) · 창작(/create) · 달개(/badges) ·
                         글벗(/friends) · 금융(/finance) · 마이(/profile) */}
            <BottomNav />
        </div>
    );
}
