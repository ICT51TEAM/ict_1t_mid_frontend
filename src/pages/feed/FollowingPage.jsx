/**
 * @file FollowingPage.jsx
 * @route /following
 *
 * @description
 * 무신사 앱의 팔로잉 피드 페이지.
 * 현재는 팔로우한 유저가 없는 상태의 빈 화면(empty state)만 표시하는
 * 플레이스홀더(placeholder) 페이지이다.
 *
 * @현재_구현_상태
 * - 실제 팔로잉 피드 기능 미구현 (API 연결 없음)
 * - 팔로우한 유저가 없을 때의 빈 화면 UI만 존재
 * - "추천 스냅 보기" 버튼: onClick 없음 (기능 미구현)
 *
 * @향후_구현_예정
 * - 팔로잉 중인 사용자들의 최신 스냅 피드 표시
 * - SnapFeedPage의 friendsOnly=true 필터와 통합되거나 독립적으로 구현될 수 있음
 *
 * @state
 * - 없음 (상태 변수 없음, 완전한 정적 UI)
 *
 * @UI_구성 (빈 상태 화면)
 * - 가운데 정렬 flex 컨테이너
 * - 원형 회색 배경 + 사람 아이콘 이모지 (👤)
 * - "팔로우한 유저가 없습니다." 안내 텍스트
 * - "새로운 스타일을 찾아 팔로우해 보세요." 보조 안내 텍스트
 * - "추천 스냅 보기" 검은 버튼 (현재 onClick 없음)
 */

import React from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';

export default function FollowingPage() {
    // ---------------------------------------------------------
    // 이 컴포넌트는 상태 변수나 훅이 없는 순수 정적 UI 컴포넌트다.
    // 팔로잉 피드가 구현되면 여기에 useState, useEffect, API 호출 등이 추가될 예정.
    // ---------------------------------------------------------

    // ---------------------------------------------------------
    // [JSX 렌더링]
    // ResponsiveLayout: showTabs 기본값(true) → 하단 탭바 표시
    // ---------------------------------------------------------
    return (
        <ResponsiveLayout>
            {/* ── 빈 상태(Empty State) UI ───────────────────────────
                전체 컨테이너: flex-col + items-center (가로 중앙 정렬)
                              + justify-center는 없고 pt-20으로 상단 여백 확보
                              (화면 정중앙보다 약간 위에 배치)

                [사람 아이콘 컨테이너]
                - 64x64px 원형(rounded-full) 회색 배경
                - 내부에 👤 이모지 (text-2xl)
                - 테두리(border): 라이트/다크 모드 각각 다른 색상

                [안내 텍스트 1]
                - "팔로우한 유저가 없습니다."
                - 회색(#a3b0c1) + font-medium + text-[15px]

                [안내 텍스트 2]
                - "새로운 스타일을 찾아 팔로우해 보세요."
                - 동일 스타일, mb-4로 버튼과 간격

                [추천 스냅 보기 버튼]
                - 검은 배경 + 흰 텍스트, px-6 py-3 패딩
                - hover:bg-gray-800 호버 효과
                - 현재 onClick 없음 → 버튼이 아무 동작도 하지 않음
                - 향후 구현 시 SnapFeedPage(/)로 이동하거나 추천 API 연동 예정
            ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col items-center justify-center pt-20">
                {/* 사람 아이콘 원형 컨테이너 */}
                <div className="w-16 h-16 bg-gray-100 dark:bg-[#292e35] rounded-full flex items-center justify-center mb-4 border border-gray-200 dark:border-[#424a54]">
                    <span className="text-gray-400 text-2xl">👤</span>
                </div>

                {/* 주요 안내 텍스트: 팔로우한 유저가 없음을 알림 */}
                <p className="text-[#a3b0c1] font-medium text-[15px] mb-2">팔로우한 유저가 없습니다.</p>

                {/* 보조 안내 텍스트: 새로운 스타일 탐색 유도 */}
                <p className="text-[#a3b0c1] font-medium text-[15px] mb-4">새로운 스타일을 찾아 팔로우해 보세요.</p>

                {/* CTA 버튼: 현재 onClick 없음, 향후 추천 피드로 이동 기능 구현 예정 */}
                <button className="bg-black text-white px-6 py-3 font-semibold text-[15px] rounded hover:bg-gray-800 transition-colors">
                    추천 스냅 보기
                </button>
            </div>
        </ResponsiveLayout>
    );
}
