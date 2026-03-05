/**
 * @file FAB.jsx
 * @description 화면 우측 하단에 고정되는 플로팅 액션 버튼(Floating Action Button) 컴포넌트.
 *
 * [역할]
 *   앱의 핵심 액션인 "새 게시글(Snap) 작성" 페이지로 이동하는 진입점 버튼.
 *   어떤 페이지에 있더라도 스크롤과 무관하게 항상 화면 우측 하단에 고정 표시됨.
 *
 * [위치 및 레이아웃]
 *   - position: fixed (고정 위치)
 *   - bottom: 90px (하단 네비게이션 바 높이를 고려하여 그 위에 위치)
 *   - right: 24px (화면 우측 가장자리에서 24px 안쪽)
 *   - z-index: 50 (대부분의 UI 요소 위에 표시)
 *
 * [버튼 디자인]
 *   - 크기: 56px × 56px 완전 원형(rounded-full)
 *   - 배경색: 검정(bg-black) / 텍스트(아이콘): 흰색
 *   - 아이콘: Plus (lucide-react, size=28, strokeWidth=2.5)
 *   - 그림자: shadow-2xl (짙은 그림자로 부유감 연출)
 *   - hover: scale-110 (10% 확대)
 *   - active(클릭): scale-95 (5% 축소 → 눌리는 느낌)
 *   - 전환 애니메이션: transition-all
 *
 * [접근성]
 *   - aria-label="Add Snap": 스크린 리더가 버튼 목적을 읽을 수 있도록 설정
 *
 * [라우팅]
 *   - react-router-dom <Link> 컴포넌트 사용 → to="/create"
 *   - <a> 태그 대신 Link를 써서 SPA 방식의 페이지 전환(새로고침 없음) 적용
 *
 * [Props]
 *   없음 (상태 없는 순수 표시 컴포넌트)
 *
 * [사용 위치]
 *   ResponsiveLayout 또는 최상위 레이아웃 컴포넌트에서 렌더링되어
 *   모든 페이지에서 공통으로 표시됨.
 */
import React from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FAB() {
    return (
        // 고정 위치 컨테이너: 하단 네비게이션 바(약 80px) 위, 우측 24px 안쪽, z-50
        <div className="fixed bottom-[90px] right-6 z-50">
            {/*
             * Link → /create: 새 Snap 작성 페이지로 SPA 전환
             * 원형 검정 버튼 (56×56px)
             * hover: scale-110 확대, active: scale-95 축소 (누르는 느낌)
             * shadow-2xl: 짙은 그림자로 버튼이 화면 위에 떠 있는 느낌 연출
             * aria-label: 스크린 리더를 위한 접근성 레이블
             */}
            <Link
                to="/create"
                className="w-[56px] h-[56px] rounded-full bg-black text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                aria-label="Add Snap"
            >
                {/* Plus 아이콘: 새 게시글 추가를 직관적으로 표현, strokeWidth=2.5로 굵게 */}
                <Plus size={28} strokeWidth={2.5} />
            </Link>
        </div>
    );
}
