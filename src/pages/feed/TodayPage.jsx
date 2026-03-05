/**
 * @file TodayPage.jsx
 * @route /today
 *
 * @description
 * 무신사 앱의 "오늘" 페이지.
 * 무신사가 공식 제공하는 AI 생성 코디 이미지를 가로 스크롤 카드로 표시하고,
 * 사용자의 키/몸무게를 입력받아 유사 체형의 스냅을 추천하는 기능(미구현)을 포함한다.
 *
 * @현재_구현_상태
 * 1. "무신사 코디" 섹션: 4개의 정적 데모 데이터(coordiData)로 가로 스크롤 카드 표시.
 *    실제 API 연결 없이 picsum.photos 랜덤 이미지 사용.
 * 2. "나와 비슷한 체형 스냅 추천" 섹션: 키(height), 몸무게(weight) 입력 UI는 있으나
 *    아직 API 연결이 되어 있지 않음. 입력값이 state에만 저장되고 활용되지 않음.
 *
 * @state
 * - height {string} - 사용자가 입력한 키 (cm 단위). 체형 맞춤 추천에 사용 예정.
 *                     현재는 input controlled value로만 관리되고 API로 전송되지 않음.
 * - weight {string} - 사용자가 입력한 몸무게 (kg 단위). 체형 맞춤 추천에 사용 예정.
 *                     현재는 input controlled value로만 관리되고 API로 전송되지 않음.
 *
 * @정적_데이터
 * - coordiData: 무신사 코디 카드 데이터 배열 (4개 항목)
 *   각 항목: {
 *     id {number}      - 고유 식별자
 *     img {string}     - picsum.photos 랜덤 이미지 URL (시드 기반으로 항상 같은 이미지)
 *     title {string}   - 카드 제목 ("무신사 코디")
 *     likes {number}   - 좋아요 수 (표시용)
 *     comments {number}- 댓글 수 (0이면 댓글 수 UI 숨김)
 *     ai {boolean}     - AI 생성 이미지 여부 (true면 "✨ AI로 제작된 이미지" 뱃지 표시)
 *   }
 *
 * @UI_구성
 * 1. "무신사 코디" 섹션 (가로 스크롤)
 *    - 섹션 헤더: "무신사 코디" 제목 + "더보기" 버튼 (기능 미구현)
 *    - 가로 스크롤 가능한 코디 카드 목록 (overflow-x-auto)
 *    - 각 카드:
 *      - 이미지 (3:4 비율, lazy loading)
 *      - AI 생성 이미지 표시 뱃지 (ai === true일 때)
 *      - 좋아요 하트 버튼 (기능 미구현)
 *      - "MUSINSA" 텍스트 오버레이 (mix-blend-overlay로 반투명 효과)
 *      - 하단: 브랜드 로고 + 코디 제목 + 인증 체크 아이콘 + 좋아요/댓글 수
 *
 * 2. "나와 비슷한 체형 스냅 추천" 섹션
 *    - 왼쪽: 설명 텍스트
 *    - 오른쪽: 키(cm) 입력 + 몸무게(kg) 입력
 *    - 현재 API 연결 없음 (향후 구현 예정)
 */

import React, { useState } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Heart, MessageCircle } from 'lucide-react';
import FAB from '@/components/common/FAB';

export default function TodayPage() {
    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------

    // height: 사용자가 입력한 키 (cm). type=number 입력 필드와 바인딩.
    // 현재는 state에만 저장되고 API 호출에 사용되지 않음.
    // 향후 "체형 맞춤 스냅 추천" API 연결 시 사용 예정.
    const [height, setHeight] = useState('');

    // weight: 사용자가 입력한 몸무게 (kg). type=number 입력 필드와 바인딩.
    // height와 동일하게 현재 미사용 (API 미연결).
    const [weight, setWeight] = useState('');

    // ---------------------------------------------------------
    // [정적 데이터] coordiData - 무신사 코디 섹션 카드 데이터
    // 실제 서비스에서는 API로 받아와야 하지만, 현재는 정적 배열로 정의.
    // img: picsum.photos의 seed 파라미터로 항상 동일한 이미지 사용.
    // ai: true → 카드 이미지 하단에 "✨ AI로 제작된 이미지" 뱃지 표시.
    // comments: 0이면 댓글 수 UI가 렌더링되지 않음.
    // ---------------------------------------------------------
    const coordiData = [
        { id: 1, img: 'https://picsum.photos/seed/c1/300/400', title: '무신사 코디', likes: 103, comments: 0, ai: true },
        { id: 2, img: 'https://picsum.photos/seed/c2/300/400', title: '무신사 코디', likes: 284, comments: 2, ai: true },
        { id: 3, img: 'https://picsum.photos/seed/c3/300/400', title: '무신사 코디', likes: 278, comments: 2, ai: true },
        { id: 4, img: 'https://picsum.photos/seed/c4/300/400', title: '무신사 코디', likes: 230, comments: 0, ai: true },
    ];

    // ---------------------------------------------------------
    // [JSX 렌더링]
    // ResponsiveLayout: showTabs 기본값(true) → 하단 탭바 표시
    // 전체 배경: #f9f9f9(연한 회색)으로 섹션 구분감 강조
    // ---------------------------------------------------------
    return (
        <ResponsiveLayout>
            <div className="bg-[#f9f9f9] dark:bg-[#101215] min-h-screen pb-20">

                {/* ── 무신사 코디 섹션 ──────────────────────────────────
                    배경: 흰색(bg-white), 섹션 하단 mb-3으로 구분감.
                    pt-4 pb-6 패딩.

                    [섹션 헤더]
                    - "무신사 코디" 제목 (text-lg font-bold)
                    - "더보기" 버튼 (현재 onClick 없음, 기능 미구현)

                    [가로 스크롤 카드 목록]
                    - flex + overflow-x-auto + scrollbar-hide: 가로 스크롤, 스크롤바 숨김
                    - gap-1 px-4: 카드 간격 및 좌우 패딩
                    - 각 카드: min-w-[150px] w-[150px]로 고정 너비

                    각 코디 카드 구조:
                    [이미지 영역] aspect-[3/4] → 3:4 세로 비율
                    - lazy loading (loading="lazy")
                    - AI 뱃지: ai === true이면 좌하단에 "✨ AI로 제작된 이미지" 표시
                    - 하트 버튼: 우하단에 위치 (현재 onClick 없음)
                    - "MUSINSA" 텍스트: mix-blend-overlay로 이미지와 자연스럽게 합성

                    [텍스트 영역] py-2
                    - 브랜드 로고 (20x20 작은 이미지) + 코디 제목 + 파란 체크 아이콘
                    - 좋아요 수 (Heart 아이콘 + 숫자)
                    - 댓글 수 (comments > 0일 때만 표시, MessageCircle 아이콘 + 숫자)
                ─────────────────────────────────────────────────────── */}
                {/* 무신사 코디 Section */}
                <div className="bg-white dark:bg-[#1c1f24] pb-6 pt-4 mb-3">
                    {/* 섹션 헤더: 제목 + 더보기 */}
                    <div className="px-4 flex justify-between items-center mb-3">
                        <h2 className="text-lg font-bold text-black dark:text-[#e5e5e5]">무신사 코디</h2>
                        {/* "더보기" 버튼: 현재 기능 미구현 */}
                        <button className="text-[13px] text-[#7b8b9e] underline underline-offset-2">더보기</button>
                    </div>

                    {/* 가로 스크롤 코디 카드 목록 */}
                    <div className="flex overflow-x-auto gap-1 px-4 scrollbar-hide">
                        {coordiData.map(item => (
                            <div key={item.id} className="min-w-[150px] w-[150px] flex flex-col relative">
                                {/* 이미지 컨테이너: 3:4 비율 */}
                                <div className="relative overflow-hidden aspect-[3/4] bg-gray-100 rounded-sm">
                                    {/* 코디 이미지: lazy loading으로 성능 최적화 */}
                                    <img src={item.img} alt="Coordi" className="w-full h-full object-cover" loading="lazy" />

                                    {/* AI 생성 이미지 뱃지: ai === true인 카드에만 표시 */}
                                    {item.ai && (
                                        <div className="absolute bottom-2 left-2 flex items-center bg-transparent drop-shadow-md text-white text-[10px]">
                                            ✨ AI로 제작된 이미지
                                        </div>
                                    )}

                                    {/* 좋아요 하트 버튼: 우하단 위치 (현재 onClick 없음) */}
                                    <button className="absolute bottom-2 right-2 text-white">
                                        <Heart size={18} fill="transparent" strokeWidth={2} />
                                    </button>

                                    {/* "MUSINSA" 브랜드 워터마크: mix-blend-overlay로 이미지와 합성 */}
                                    <div className="absolute right-2 bottom-6 font-black italic text-md text-black mix-blend-overlay">
                                        MUSINSA
                                    </div>
                                </div>

                                {/* 카드 하단 텍스트 영역 */}
                                <div className="py-2">
                                    {/* 브랜드 로고 + 코디 제목 + 공식 인증 아이콘 */}
                                    <div className="flex items-center gap-1 mb-1">
                                        {/* 브랜드 로고 이미지 (20x20) */}
                                        <div className="w-5 h-5 rounded-[4px] bg-gray-200 aspect-square overflow-hidden shrink-0 border border-gray-100">
                                            <img src="https://picsum.photos/seed/musinsa_logo/20/20" alt="logo" />
                                        </div>
                                        <span className="text-[12px] font-bold">{item.title}</span>
                                        {/* 파란 체크 인증 뱃지 */}
                                        <span className="text-[10px] bg-blue-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">✔</span>
                                    </div>
                                    {/* 좋아요 수 + 댓글 수 (댓글 0개이면 숨김) */}
                                    <div className="flex items-center text-[#7b8b9e] text-[11px] gap-2">
                                        <div className="flex items-center gap-[2px]">
                                            <Heart size={10} /> {item.likes}
                                        </div>
                                        {/* 댓글이 1개 이상일 때만 댓글 수 표시 */}
                                        {item.comments > 0 && (
                                            <div className="flex items-center gap-[2px]">
                                                <MessageCircle size={10} /> {item.comments}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── 체형 맞춤 추천 섹션 ───────────────────────────────
                    배경: 흰색, h-[120px] 고정 높이, flex + gap-4.
                    mb-3으로 다음 섹션과 구분.

                    [왼쪽 텍스트 영역] flex-1
                    - 제목: "나와 비슷한 체형 스냅 추천"
                    - 설명: "키 ∙ 몸무게를 입력하고, 스냅을 추천 받아 보세요."

                    [오른쪽 입력 영역] w-[120px] 고정 너비
                    - 키(cm) 입력:
                      type=number, controlled (height state와 바인딩)
                      오른쪽에 "cm" 단위 텍스트 절대 위치
                    - 몸무게(kg) 입력:
                      type=number, controlled (weight state와 바인딩)
                      오른쪽에 "kg" 단위 텍스트 절대 위치
                    - 입력값 변경: e.target.value로 각 state 업데이트
                    - 현재 "추천 받기" 버튼 없음 → API 연결 미구현
                ─────────────────────────────────────────────────────── */}
                {/* 체형 맞춤 추천 Section */}
                <div className="bg-white dark:bg-[#1c1f24] p-4 flex gap-4 h-[120px] mb-3">
                    {/* 왼쪽: 설명 텍스트 */}
                    <div className="flex-1 flex flex-col justify-center">
                        <h3 className="text-[15px] font-bold text-black dark:text-[#e5e5e5] mb-1">나와 비슷한 체형 스냅 추천</h3>
                        <p className="text-[13px] text-[#424a54] leading-tight mt-1">
                            키 ∙ 몸무게를 입력하고,<br />스냅을 추천 받아 보세요.
                        </p>
                    </div>

                    {/* 오른쪽: 키/몸무게 숫자 입력 영역 */}
                    <div className="w-[120px] flex flex-col gap-2 justify-center bg-[#e5e5e5]/40 dark:bg-[#292e35]/40 p-2 rounded-sm shrink-0">
                        {/* 키 입력 필드: cm 단위 */}
                        <div className="flex bg-[#f3f3f3] dark:bg-[#292e35] rounded border border-gray-200/50 dark:border-[#424a54]/50 relative">
                            <input
                                type="number"
                                placeholder="키"
                                value={height}
                                onChange={e => setHeight(e.target.value)}
                                className="w-full bg-transparent text-[13px] py-1.5 pl-2 pr-6 outline-none appearance-none"
                            />
                            {/* "cm" 단위 텍스트: 입력 필드 우측에 절대 위치로 고정 */}
                            <span className="absolute right-2 top-1.5 text-[12px] text-gray-400">cm</span>
                        </div>

                        {/* 몸무게 입력 필드: kg 단위 */}
                        <div className="flex bg-[#f3f3f3] dark:bg-[#292e35] rounded border border-gray-200/50 dark:border-[#424a54]/50 relative">
                            <input
                                type="number"
                                placeholder="몸무게"
                                value={weight}
                                onChange={e => setWeight(e.target.value)}
                                className="w-full bg-transparent text-[13px] py-1.5 pl-2 pr-6 outline-none appearance-none"
                            />
                            {/* "kg" 단위 텍스트: 입력 필드 우측에 절대 위치로 고정 */}
                            <span className="absolute right-2 top-1.5 text-[12px] text-gray-400">kg</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* FAB: 새 스냅 작성 버튼 (화면 우측 하단 고정) */}
            <FAB />
        </ResponsiveLayout>
    );
}
