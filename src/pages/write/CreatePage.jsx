/**
 * @file CreatePage.jsx
 * @route /create
 *
 * @description
 * 글쓰기(창작) 유형을 선택하는 정적 선택 페이지.
 * 상태(state)와 API 호출이 없는 순수 UI 페이지다.
 * 현재 두 가지 창작 유형을 제공하며, 하나는 활성화되어 있고
 * 하나는 "준비 중(Coming Soon)" 상태이다.
 *
 * @layout
 * ┌─────────────────────────────────────────┐
 * │  [Header] (sticky)                      │
 * │         창작 공간                        │
 * ├─────────────────────────────────────────┤
 * │  [Hero Section]                         │
 * │    "Be Creative" 레이블                 │
 * │    "Create Your Unique Style Snap"      │
 * ├─────────────────────────────────────────┤
 * │  [Creation Type Cards] (2개)            │
 * │    [사진첩 스냅] → /create-photo-album  │
 * │      RECOMMENDED 배지                   │
 * │      "최대 4장의 사진으로..."           │
 * │    [글 캔버스] (Coming Soon, 비활성)    │
 * │      "다양한 레이아웃으로... (준비 중)" │
 * ├─────────────────────────────────────────┤
 * │  [Style Insight 카드]                   │
 * │    "당신의 감각적인 스냅은..."          │
 * └─────────────────────────────────────────┘
 *
 * @state 없음
 * @api   없음 (순수 정적 UI)
 *
 * @creationTypes (상수 배열)
 *   [0] 사진첩 스냅:
 *       id: 'photo'
 *       title: '사진첩 스냅'
 *       description: '최대 4장의 사진으로 당신의 스타일을 기록하세요.'
 *       icon: Image (lucide)
 *       path: '/create-photo-album'  ← 클릭 시 이 경로로 이동
 *       theme: 'bg-black text-white' (검정 배경)
 *       badge: 'RECOMMENDED'         ← 노란색 뱃지
 *       isComingSoon: undefined      ← 활성화됨
 *
 *   [1] 글 캔버스:
 *       id: 'canvas'
 *       title: '글 캔버스'
 *       description: '다양한 레이아웃으로 일상을 자유롭게 작성 (준비 중)'
 *       icon: BookOpen (lucide)
 *       path: null                   ← 이동 불가 (클릭 시 navigate 미실행)
 *       theme: 'bg-white dark:bg-[#1c1f24] border border-[#f3f3f3]...'
 *       isComingSoon: true           ← opacity-50, cursor-not-allowed, disabled
 *
 * @cardBehavior
 *   활성 카드 (isComingSoon !== true):
 *     - onClick: type.path 가 있으면 navigate(type.path)
 *     - hover: scale-[1.02], shadow-xl
 *     - 우측 Plus 버튼 (흰색 반투명, hover 시 흰색 배경+검정 텍스트)
 *   비활성 카드 (isComingSoon === true):
 *     - disabled 속성 → 클릭 불가
 *     - opacity-50, cursor-not-allowed
 *     - Plus 버튼 없음
 *
 * @navigation
 *   navigate('/create-photo-album'): 사진첩 스냅 카드 클릭 시
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Image, BookOpen, Plus, Sparkles, LayoutGrid } from 'lucide-react';

export default function CreatePage() {
    const navigate = useNavigate();

    /**
     * @constant creationTypes
     * 창작 유형 목록. 이 배열을 map 하여 카드 버튼을 렌더링한다.
     *
     * 공통 필드:
     *   id          - React key 및 조건부 스타일링에 사용
     *   title       - 카드 제목 (한국어, 대형 이탤릭)
     *   description - 카드 설명 텍스트
     *   icon        - lucide 아이콘 컴포넌트
     *   path        - 클릭 시 이동할 경로 (null 이면 navigate 미실행)
     *   theme       - 카드 배경/텍스트 Tailwind 클래스
     *   badge       - (선택) 카드 제목 옆 노란색 소형 뱃지 텍스트
     *   isComingSoon- true 이면 disabled + opacity-50 + cursor-not-allowed
     */
    const creationTypes = [
        {
            id: 'photo',
            title: '사진첩 만들기',
            description: '최대 4장의 사진으로 당신의 스타일을 기록하세요.',
            icon: Image,
            path: '/create-photo-album',  // 활성: 이 경로로 이동
            theme: 'bg-black text-white',
            badge: 'RECOMMENDED'          // 노란색 뱃지 표시
        },
        {
            id: 'canvas',
            title: '이미지 캔버스',
            description: '나만의 디자인 스냅을 만들어 사진첩에 추가하세요.',
            icon: BookOpen,
            path: '/create-canvas',        // Konva 라이브러리 활용 페이지로 이동
            theme: 'bg-black text-white',
            //isComingSoon: true            // 비활성: disabled + opacity-50
            badge: 'NEW STYLE'          // 노란색 뱃지 표시
        }
    ];

    return (
        // showTabs={true}: 하단 내비게이션 탭 표시
        <ResponsiveLayout showTabs={true}>
            <div className="min-h-screen bg-[#f9f9fa] dark:bg-[#101215] text-black dark:text-white transition-colors duration-300">

                {/* ──────────────────────────────────────────────────────
                    Header (sticky, top-0)
                    - 좌측/우측: 여백 div (제목 중앙 정렬 유지)
                    - 가운데: "창작 공간" 제목
                ────────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between h-14 px-4 bg-white dark:bg-[#1c1f24] border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 z-40 transition-colors duration-300">
                    <div className="w-10"></div>
                    <h1 className="font-bold text-[16px]">창작 공간</h1>
                    <div className="w-10"></div>
                </div>

                <div className="max-w-2xl mx-auto px-6 py-12 space-y-12">

                    {/* ──────────────────────────────────────────────────────
                        Hero Section
                        - "Be Creative" 레이블 (노란색 배경 둥근 배지)
                          Sparkles 아이콘 + 텍스트
                        - "Create Your Unique Style Snap" 메인 헤드라인
                          (대형 이탤릭, 2줄)
                    ────────────────────────────────────────────────────── */}
                    <div className="space-y-4">
                        {/* "Be Creative" 레이블 */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400/10 rounded-full">
                            <Sparkles size={14} className="text-yellow-600" />
                            <span className="text-[11px] font-black italic tracking-widest text-yellow-700 uppercase">Be Creative</span>
                        </div>
                        {/* 메인 헤드라인 */}
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-tight">
                            Create Your <br />
                            Unique Style Memory
                        </h2>
                    </div>

                    {/* ──────────────────────────────────────────────────────
                        Creation Type Cards (창작 유형 선택 카드 목록)
                        creationTypes 배열을 map 하여 버튼 카드로 렌더링.

                        각 카드 구성:
                        [좌측] 아이콘 박스 (64px 정사각형)
                               + 제목 + 배지(있으면) + 설명 텍스트
                        [우측] Plus 버튼 (isComingSoon 아닐 때만 표시)
                               hover 시 흰색 배경 + 검정 텍스트로 전환

                        'photo' 카드 전용:
                        - 검정 배경 (bg-black text-white)
                        - 우측 상단 흰색 블러 원형 장식 (hover 시 scale 150%)
                        - RECOMMENDED 노란색 소형 뱃지

                        'canvas' 카드:
                        - 흰색/다크 배경 + 테두리
                        - disabled + opacity-50 + cursor-not-allowed
                        - Plus 버튼 없음
                    ────────────────────────────────────────────────────── */}
                    <div className="grid gap-4">
                        {creationTypes.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => type.path && navigate(type.path)} // path가 있을 때만 이동
                                disabled={type.isComingSoon}
                                className={`w-full p-8 rounded-[32px] flex items-center justify-between text-left group transition-all relative overflow-hidden ${type.theme} ${type.isComingSoon ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] shadow-xl active:scale-[0.98]'}`}
                            >
                                {/* 'photo' 카드: 우측 상단 블러 원형 장식 (hover 확대) */}
                                {type.id === 'photo' && (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
                                )}

                                {/* 카드 좌측: 아이콘 + 텍스트 */}
                                <div className="flex items-center gap-6 z-10">
                                    {/* 아이콘 박스 */}
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${type.id === 'photo' ? 'bg-white/10 border-white/20' : 'bg-white/10 border-white/20'}`}>
                                        <type.icon size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        {/* 제목 + 배지(있으면) */}
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-black italic tracking-tighter uppercase">{type.title}</h3>
                                            {/* RECOMMENDED 배지 (노란색, 'photo' 카드에만) */}
                                            {type.badge && (
                                                <span className="bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded italic">
                                                    {type.badge}
                                                </span>
                                            )}
                                        </div>
                                        {/* 설명 텍스트 */}
                                        <p className={`text-[13px] font-medium ${type.id === 'photo' ? 'opacity-70' : 'text-gray-400'}`}>
                                            {type.description}
                                        </p>
                                    </div>
                                </div>

                                {/* 카드 우측: Plus 버튼 (isComingSoon 카드에는 미표시) */}
                                {!type.isComingSoon && (
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all transition-colors">
                                        <Plus size={20} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* ──────────────────────────────────────────────────────
                        Style Insight 카드 (하단 정보 카드)
                        - 파란색 블러 원형 배경 장식 (우측 상단)
                        - LayoutGrid 아이콘 (파란색 배경 박스)
                        - "Style Insight" 제목
                        - 서비스 슬로건:
                          "당신의 감각적인 스냅은 이미 많은 사람들에게
                           새로운 스타일 영감이 되고 있습니다."
                    ────────────────────────────────────────────────────── */}
                    <div className="bg-white dark:bg-[#1c1f24] p-8 rounded-[32px] border border-[#f3f3f3] dark:border-[#292e35] shadow-sm relative overflow-hidden group">
                        {/* 파란색 블러 배경 장식 */}
                        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
                        <div className="relative z-10 flex items-center gap-6">
                            {/* LayoutGrid 아이콘 박스 */}
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                <LayoutGrid size={24} />
                            </div>
                            <div>
                                <h4 className="text-[15px] font-black italic tracking-widest uppercase mb-1">Style Insight</h4>
                                <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">당신의 감각적인 스냅은 이미 많은 사람들에게 새로운 스타일 영감이 되고 있습니다.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
