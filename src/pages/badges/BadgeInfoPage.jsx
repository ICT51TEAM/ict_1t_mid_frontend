/**
 * @file BadgeInfoPage.jsx
 * @route /badges/info
 *
 * @description
 * 달개(배지) 시스템을 설명하는 순수 정적 정보 페이지.
 * API 호출이 없으며, 상태(state)도 없다.
 * 달개의 한국어 어원, 획득 방법, 시스템 비전을 소개한다.
 *
 * '달개'는 배지(badge)의 순우리말로,
 * 이 앱에서 사용자의 활동 및 스타일 영향력을 상징하는 특별한 엠블럼이다.
 *
 * @layout
 * ┌─────────────────────────────────────────┐
 * │  [Header]                               │
 * │    ← 뒤로가기       달개 가이드         │
 * ├─────────────────────────────────────────┤
 * │  [Main Hero]                            │
 * │    Trophy 아이콘 (회전 hover 효과)       │
 * │    "Decorate Your Digital Influence"    │
 * │    "The Art of Badges" 서브텍스트       │
 * ├─────────────────────────────────────────┤
 * │  [Core Concept 섹션]                    │
 * │    달개의 의미 설명 텍스트               │
 * │    (순우리말 어원, 프로필 의미)          │
 * ├─────────────────────────────────────────┤
 * │  [How to Earn 2열 그리드]               │
 * │    [Steady Action]   [Special Missions] │
 * │    꾸준한 활동 설명   레어 달개 설명     │
 * ├─────────────────────────────────────────┤
 * │  [System Vision 섹션]                   │
 * │    "The Future of Snap" 배지            │
 * │    스타일 여정 마무리 문구              │
 * └─────────────────────────────────────────┘
 *
 * @props 없음
 * @state 없음
 * @api   없음 (순수 정적 UI)
 *
 * @navigation
 *   navigate(-1): 헤더 ← 버튼 클릭 시 이전 페이지로 이동
 *
 * @icons (lucide-react)
 *   ArrowLeft   - 뒤로가기 버튼
 *   Trophy      - 히어로 섹션 중앙 아이콘
 *   BookOpen    - Core Concept 섹션 아이콘
 *   PenTool     - Steady Action 카드 아이콘
 *   Target      - Special Missions 카드 아이콘
 *   Sparkles    - (import 되어 있으나 현재 미사용)
 *   Cpu         - (import 되어 있으나 현재 미사용)
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, BookOpen, PenTool, Cpu, Target, Trophy } from 'lucide-react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';

export default function BadgeInfoPage() {
  const navigate = useNavigate();

  return (
    // showTabs={false}: 하단 내비게이션 숨김 (서브 정보 페이지)
    <ResponsiveLayout showTabs={false}>
      <div className="min-h-screen bg-[#f9f9fa] dark:bg-[#101215] text-black dark:text-white transition-colors duration-300 pb-20">

        {/* ──────────────────────────────────────────────────────
            Header (상단 내비게이션 바)
            - 좌측: ArrowLeft 버튼 → navigate(-1) 뒤로가기
            - 가운데: "달개 가이드" 제목
            - 우측: 여백용 빈 div (중앙 정렬 유지)
            sticky top-0 으로 스크롤 시에도 고정됨
        ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between h-14 px-4 bg-white dark:bg-[#1c1f24] border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 z-40">
          <button onClick={() => navigate(-1)} className="p-2">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-[16px]">달개 가이드</h1>
          <div className="w-10"></div>
        </div>

        {/* 전체 콘텐츠 컨테이너 (최대 너비 3xl, 수평 중앙 정렬, 섹션 간격 16) */}
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-16">

          {/* ──────────────────────────────────────────────────────
              Main Hero 섹션
              - Trophy 아이콘: 검정 배경 80px 박스, 초기 rotate-3
                hover 시 rotate-0 으로 전환 (500ms transition)
              - 메인 헤드라인: "Decorate Your Digital Influence"
                (대형 이탤릭 블랙, 2줄 표시)
              - 서브텍스트: "The Art of Badges" (회색, 자간 4px)
          ────────────────────────────────────────────────────── */}
          <div className="text-center space-y-6">
            {/* Trophy 아이콘 박스 (hover 회전 효과) */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-black dark:bg-white rounded-3xl shadow-2xl mb-4 rotate-3 transform hover:rotate-0 transition-transform duration-500">
              <Trophy className="w-10 h-10 text-yellow-400 dark:text-yellow-600" />
            </div>
            {/* 메인 헤드라인 */}
            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              Decorate Your <br />
              Digital Influence
            </h2>
            {/* 서브텍스트 */}
            <p className="text-[14px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[4px]">The Art of Badges</p>
          </div>

          {/* ──────────────────────────────────────────────────────
              Core Concept 섹션 (달개의 의미)
              - 흰색 배경 카드, 둥근 모서리(32px)
              - 우측 상단에 파란색 블러 원형 배경 장식 (hover 시 진해짐)
              - BookOpen 아이콘 + "달개의 의미" 섹션 제목
              - 설명 텍스트 2단락:
                1) '달개'는 배지의 순우리말 → 기록과 성장의 상징
                2) 무신사 SNAP 활동의 성과 → 프로필 장식
          ────────────────────────────────────────────────────── */}
          <section className="bg-white dark:bg-[#1c1f24] p-10 rounded-[32px] border border-[#f3f3f3] dark:border-[#292e35] shadow-xl relative overflow-hidden group">
            {/* 배경 장식: 파란색 블러 원 (hover 시 더 진해짐) */}
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
            <div className="relative z-10 space-y-6">
              {/* 섹션 헤더: BookOpen 아이콘 + 제목 */}
              <div className="flex items-center gap-3">
                <BookOpen className="text-blue-500" />
                <h3 className="text-xl font-black italic tracking-tighter uppercase">달개의 의미</h3>
              </div>
              {/* 달개 개념 설명 텍스트 */}
              <div className="space-y-4 text-[15px] font-medium leading-relaxed text-gray-600 dark:text-gray-300">
                <p>'달개'는 배지의 순우리말입니다. 당신의 소중한 기록과 성장을 상징하는 특별한 장식이죠.</p>
                <p>무신사 SNAP에서 활동하며 얻은 모든 성과는 하나의 달개가 되어 당신의 프로필을 빛나게 할 것입니다.</p>
              </div>
            </div>
          </section>

          {/* ──────────────────────────────────────────────────────
              How to Earn 섹션 (달개 획득 방법)
              2열 그리드 (모바일: 1열)

              [왼쪽] Steady Action 카드:
              - 검정 배경 / 흰색 텍스트
              - PenTool 아이콘 (노란색)
              - 매일 스냅 작성 + 소통으로 꾸준히 달개 획득

              [오른쪽] Special Missions 카드:
              - 밝은 회색 배경
              - Target 아이콘 (검정/흰색)
              - 특정 테마 코디 업로드 or 인기 게시물 → 레어 달개 획득
          ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Steady Action 카드 (검정 배경) */}
            <section className="bg-black dark:bg-white p-8 rounded-[24px] text-white dark:text-black">
              <PenTool className="mb-4 text-yellow-400 dark:text-yellow-600" />
              <h4 className="text-lg font-black italic tracking-tighter uppercase mb-2">Steady Action</h4>
              <p className="text-[13px] opacity-70 font-medium leading-relaxed text-gray-400 dark:text-gray-500">
                매일 스냅을 작성하고, 다른 글벗들과 소통하세요. 꾸준한 활동만이 최고 등급의 달개를 얻는 유일한 길입니다.
              </p>
            </section>

            {/* Special Missions 카드 (회색 배경) */}
            <section className="bg-gray-100 dark:bg-gray-800 p-8 rounded-[24px]">
              <Target className="mb-4 text-black dark:text-white" />
              <h4 className="text-lg font-black italic tracking-tighter uppercase mb-2">Special Missions</h4>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                특정 테마의 코디를 업로드하거나, 많은 관심을 받은 게시물은 한정적인 '레어 달개'를 획득할 수 있게 해줍니다.
              </p>
            </section>
          </div>

          {/* ──────────────────────────────────────────────────────
              System Vision 섹션 (달개 시스템의 비전)
              - "The Future of Snap" 레이블 (둥근 배지 형태)
              - 서비스 철학 요약 텍스트:
                "스타일과 진정성을 평가 → 달개는 패션 여정"
              - 텍스트 최대 너비 xl, 중앙 정렬
          ────────────────────────────────────────────────────── */}
          <section className="text-center py-10">
            {/* "The Future of Snap" 레이블 배지 */}
            <div className="bg-[#f9f9fa] dark:bg-[#101215] inline-block px-8 py-3 rounded-full border border-[#e5e5e5] dark:border-[#292e35] mb-6">
              <span className="text-[12px] font-black italic tracking-widest uppercase">The Future of Snap</span>
            </div>
            {/* 서비스 철학 마무리 문구 */}
            <p className="text-[16px] font-bold text-gray-400 leading-relaxed max-w-xl mx-auto">
              우리는 당신의 스타일과 그 속에 담긴 진정성을 높이 평가합니다. <br />
              달개는 단순한 그래픽이 아닌, 당신의 패션 여정입니다.
            </p>
          </section>
        </div>
      </div>
    </ResponsiveLayout>
  );
}
