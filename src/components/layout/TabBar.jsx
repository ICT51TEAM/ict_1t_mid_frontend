/**
 * @file TabBar.jsx
 * @description 상단 탭 바 컴포넌트. NavLink의 활성 상태에 따라 하단 밑줄 인디케이터를 표시한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [역할 및 아키텍처에서의 위치]
 *   - 현재 메인 레이아웃(ResponsiveLayout)에서는 사용되지 않는 보조 컴포넌트.
 *   - BottomNav가 모바일 내비게이션의 실제 역할을 담당하고 있으며,
 *     이 TabBar는 특정 페이지 내부의 서브 탭 UI나 향후 레이아웃 교체를 위해
 *     별도로 유지되고 있다.
 *   - 필요한 페이지에서 직접 import해 사용할 수 있다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [탭 구성 (5개)]
 *   name    path
 *   ─────────────────────
 *   피드    /
 *   창작    /create
 *   달개    /badges
 *   글벗    /friends
 *   금융    /finance
 *
 *   (BottomNav의 6개와 달리 '마이(/profile)' 탭이 없음)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [활성 탭 표현 방식]
 *   - React Router의 <NavLink>를 사용해 isActive 상태를 자동으로 감지.
 *   - 활성 탭: 텍스트 색상 검정(text-black) + 하단에 2px 검정 밑줄 인디케이터
 *   - 비활성 탭: 회색 텍스트(text-[#a3b0c1]), hover 시 검정으로 전환
 *   - 밑줄 인디케이터: absolute 위치로 탭 버튼 하단 전체 너비에 걸쳐 표시
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [NavLink 렌더 프롭 패턴]
 *   - className prop에 함수 ({ isActive }) => string 형태로 전달해
 *     활성/비활성 클래스를 동적으로 적용.
 *   - children prop에도 함수 ({ isActive }) => JSX 형태로 전달해
 *     활성 탭에만 밑줄 인디케이터 <span>을 조건부 렌더링.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [레이아웃 구조]
 *
 *   ┌────────────────────────────────────────┐  ← border-b 하단 구분선
 *   │  [피드]  [창작]  [달개]  [글벗]  [금융] │  ← px-4, 수평 나열
 *   │   ───                                  │  ← 활성 탭 하단 2px 검정 줄
 *   └────────────────────────────────────────┘
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [Props]
 *   없음 (탭 목록이 내부에 하드코딩되어 있으며 외부 props를 받지 않음)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [주의사항]
 *   - 현재 메인 레이아웃에서는 사용되지 않으므로(BottomNav 사용 중),
 *     이 컴포넌트를 수정해도 앱의 주 내비게이션에 영향을 주지 않는다.
 *   - NavLink는 기본적으로 exact match를 사용하지 않으므로,
 *     '/' 경로의 피드 탭은 모든 경로에서 활성화될 수 있다.
 *     필요 시 end prop을 추가해야 한다.
 */
import React from 'react';
// NavLink: 현재 경로와 일치 여부를 isActive로 제공하는 React Router 컴포넌트
import { NavLink } from 'react-router-dom';

/**
 * @component TabBar
 * @description 수평 탭 바. 각 탭은 NavLink로 구성되며,
 *              현재 경로와 일치하는 탭에 하단 밑줄 인디케이터를 표시한다.
 *              현재 메인 레이아웃에서는 사용되지 않으며, BottomNav가 그 역할을 대신한다.
 */
export default function TabBar() {
    // ── 상수: 탭 목록 정의 ────────────────────────────────────────────────────
    // 각 탭의 표시 이름(name)과 이동 경로(path)를 정의하는 배열.
    // 이 배열을 순회해 탭 링크들을 동적으로 렌더링함.
    // BottomNav와 달리 '마이(/profile)' 탭은 포함되지 않음.
    const tabs = [
        { name: '피드', path: '/' },       // 메인 피드 페이지
        { name: '창작', path: '/create' },  // 게시물 작성 페이지
        { name: '달개', path: '/badges' },  // 배지 목록 페이지
        { name: '글벗', path: '/friends' }, // 친구 목록 페이지
        { name: '금융', path: '/finance' }, // 금융 정보 페이지
    ];

    // ─── JSX 렌더링 ────────────────────────────────────────────────────────────
    return (
        // ── TabBar 컨테이너 ───────────────────────────────────────────────────
        // flex: 탭들을 수평 나열
        // px-4: 좌우 내부 패딩
        // border-b border-[#f3f3f3]: 하단에 연한 회색 구분선
        <div className="flex px-4 border-b border-[#f3f3f3]">
            {/* tabs 배열을 순회해 NavLink 탭 렌더링 */}
            {tabs.map((tab) => (
                // ── 개별 탭 NavLink ───────────────────────────────────────────
                // NavLink: React Router가 isActive를 자동 관리하는 Link 확장 컴포넌트
                // key: tab.name을 고유 키로 사용
                //
                // className 렌더 프롭:
                //   isActive=true  → text-black (검정 텍스트)
                //   isActive=false → text-[#a3b0c1] hover:text-black (회색 → hover 검정)
                //   공통: py-3 px-3 text-[15px] font-medium transition-all relative
                //   relative: 자식 요소인 밑줄 인디케이터(absolute)의 기준 부모
                <NavLink
                    key={tab.name}
                    to={tab.path}
                    className={({ isActive }) =>
                        `py-3 px-3 text-[15px] font-medium transition-all relative ${isActive ? 'text-black' : 'text-[#a3b0c1] hover:text-black'
                        }`
                    }
                >
                    {/* children 렌더 프롭: isActive를 받아 탭 이름과 인디케이터를 조건부 렌더링 */}
                    {({ isActive }) => (
                        <>
                            {/* 탭 이름 텍스트 */}
                            {tab.name}

                            {/* ── 하단 밑줄 인디케이터: 활성 탭에만 표시 ─────────
                                absolute bottom-0 left-0 right-0: 탭 버튼 하단 전체 너비
                                h-[2px] bg-black: 2px 높이의 검정 밑줄 */}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
                            )}
                        </>
                    )}
                </NavLink>
            ))}
        </div>
    );
}
