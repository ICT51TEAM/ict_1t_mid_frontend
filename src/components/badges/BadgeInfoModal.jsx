/**
 * @file BadgeInfoModal.jsx
 * @location src/components/badges/BadgeInfoModal.jsx
 *
 * @description
 * 달개(배지) 안내 모달 컴포넌트.
 * BadgesPage 에서 HelpCircle(?) 버튼을 클릭할 때 열린다.
 * 달개의 개념('달개'의 순우리말 어원), 전체 달개 유형 목록,
 * 그리고 랭킹 시스템을 설명하는 3개 섹션으로 구성된다.
 *
 * @props
 *   isOpen  {boolean}  - true 이면 모달을 렌더링, false 이면 null 반환 (모달 미표시)
 *   onClose {function} - 모달 닫기 콜백. 배경 클릭, X 버튼, CONFIRM 버튼에서 호출됨
 *
 * @layout
 * ┌─────────────────────────────────────────────┐
 * │  [오버레이] bg-black/60 backdrop-blur       │
 * │  ┌───────────────────────────────────────┐  │
 * │  │  [Header]                             │  │
 * │  │    Trophy 아이콘  BADGE GUIDE   [X]   │  │
 * │  ├───────────────────────────────────────┤  │
 * │  │  [Content] (스크롤 가능)              │  │
 * │  │    [Hero Card]                        │  │
 * │  │      "마음을 잇는 장식, 달개"          │  │
 * │  │      달개 개념 설명 텍스트             │  │
 * │  │    [Types List]                       │  │
 * │  │      로딩 중: Loader2 스피너          │  │
 * │  │      완료: 달개 유형 카드 목록         │  │
 * │  │        [이미지] [이름/설명]            │  │
 * │  │    [Footer Info]                      │  │
 * │  │      랭킹 시스템 설명 (노란색 배경)    │  │
 * │  ├───────────────────────────────────────┤  │
 * │  │  [Action Button]                      │  │
 * │  │    [ CONFIRM ] → onClose 호출         │  │
 * │  └───────────────────────────────────────┘  │
 * └─────────────────────────────────────────────┘
 *
 * @state
 *   badgeTypes  - 서버에서 받아온 전체 달개 유형 배열
 *                 [ { id, imageUrl, title, description } ]
 *   isLoading   - API 호출 중 여부. true 이면 Loader2 스피너 표시
 *
 * @api
 *   badgeService.getAllTypes() → GET /api/badges/types
 *   isOpen 이 true 로 바뀔 때마다 호출됨 (모달이 열릴 때마다 최신 데이터 갱신)
 *
 * @behavior
 *   - isOpen === false: 컴포넌트가 null 을 반환하므로 DOM에서 완전히 제거됨
 *   - 배경(오버레이) 클릭: onClose 호출
 *   - X 버튼 클릭: onClose 호출
 *   - CONFIRM 버튼 클릭: onClose 호출
 *   - 모달 카드 내부 클릭: 이벤트 버블링으로 오버레이에 전달되지 않음
 *     (오버레이에 onClick, 모달 카드에는 onClick 없음 → 자동으로 버블링 차단)
 */
import React, { useState, useEffect } from 'react';
import { X, BookOpen, Target, Sparkles, Loader2, Trophy, HelpCircle } from 'lucide-react';
import { badgeService } from '@/api/badgeService';

export default function BadgeInfoModal({ isOpen, onClose }) {

  /**
   * @state badgeTypes
   * 달개 유형 목록. Types List 섹션에서 카드 형태로 나열된다.
   * 구조: Array<{
   *   id: string|number,     // React key 용
   *   imageUrl: string,      // 달개 대표 이미지 URL (object-cover로 표시)
   *   title: string,         // 달개 이름 (대문자 이탤릭)
   *   description: string    // 달개 획득 조건 설명
   * }>
   * API 실패 시 빈 배열([])로 초기화됨
   */
  const [badgeTypes, setBadgeTypes] = useState([]);

  /**
   * @state isLoading
   * badgeService.getAllTypes() 호출 중일 때 true.
   * true 이면 Types List 섹션에서 Loader2 스피너 + "Loading Catalog" 텍스트를 표시.
   * API 완료(성공/실패) 후 false 로 전환.
   */
  const [isLoading, setIsLoading] = useState(false);

  /**
   * @useEffect 달개 유형 데이터 로드
   * @trigger isOpen 이 변경될 때마다 실행 (deps: [isOpen])
   *
   * 동작:
   *   1. isOpen === false 이면 즉시 return (모달이 닫혀 있을 때 불필요한 API 호출 방지)
   *   2. isOpen === true 이면:
   *      a. isLoading = true 로 전환
   *      b. badgeService.getAllTypes() 호출 → GET /api/badges/types
   *      c. 성공: setBadgeTypes(data)
   *      d. 실패: setBadgeTypes([]) (빈 배열로 초기화)
   *      e. finally: isLoading = false
   *
   * 주의: 매번 모달이 열릴 때 새로 호출하므로 항상 최신 달개 목록을 표시한다.
   */
  useEffect(() => {
    // TODO: isOpen === false 이면 즉시 return (API 호출 불필요)
    // TODO: setIsLoading(true) 후 badgeService.getAllTypes() 호출
    // TODO: 성공 시 setBadgeTypes(data), 실패 시 setBadgeTypes([])
    // 힌트: .then(setBadgeTypes).catch(() => setBadgeTypes([])).finally(() => setIsLoading(false))
    if (!isOpen) return;    //모달 = 팝업창, isOpen = true 이면 팝업창이 열림

    setIsLoading(true);
    badgeService.getAllTypes()
      .then(setBadgeTypes)    //badgeTypes를 나중에 화면에 뿌린다
      .catch(() => setBadgeTypes([]))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  // isOpen === false 이면 null 반환 → 모달이 DOM에서 완전히 사라짐
  if (!isOpen) return null;

  return (
    // 전체화면 오버레이 (fixed + inset-0, z-index 100)
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">

      {/* ──────────────────────────────────────────────────────
          배경 오버레이 (반투명 검정 + blur)
          클릭 시 onClose 호출 → 모달 닫기
      ────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* ──────────────────────────────────────────────────────
          모달 카드 (최대 너비 lg, 최대 높이 85vh, 스크롤 가능)
          - animate-in fade-in zoom-in-95: 열릴 때 페이드+확대 애니메이션
          - overflow-hidden: 내부 스크롤을 Content 영역에서만 처리
      ────────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1c1f24] rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden border dark:border-[#292e35]">

        {/* ──────────────────────────────────────────────────────
            Header
            - 좌측: Trophy 아이콘(노란색) + "BADGE GUIDE" 제목
            - 우측: X 버튼 → onClose 호출
            배경: 흰색/다크모드 배경 유지 (스크롤 시에도 고정)
        ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f3f3f3] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-white">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-[18px] font-black italic tracking-tighter uppercase">BADGE GUIDE</h2>
          </div>
          {/* X 닫기 버튼 (hover 시 검정 배경으로 반전) */}
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-[#f3f3f3] dark:bg-[#292e35] rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* ──────────────────────────────────────────────────────
            Content 영역 (스크롤 가능, 섹션 간격 8)
        ────────────────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto scrollbar-hide space-y-8">

          {/* ────────────────────────────────────────────────
              Hero Card ("마음을 잇는 장식, 달개")
              - 검정 배경(라이트 모드) / 흰색 배경(다크 모드)
              - 우측 상단에 노란색 블러 원형 장식 (hover 시 scale 150%)
              - "The Concept" 상단 레이블
              - "마음을 잇는 장식, 달개" 대형 제목
              - 달개 개념 설명 텍스트 (반투명 박스 안에 배치)
          ──────────────────────────────────────────────── */}
          <div className="bg-black dark:bg-white p-8 rounded-[24px] relative overflow-hidden group shadow-xl">
            {/* 배경 장식: 노란색 블러 원 (hover 시 커짐) */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:scale-150 transition-transform duration-700" />
            <div className="z-10 relative">
              {/* 상단 레이블 */}
              <span className="text-[11px] font-black italic tracking-widest text-white/50 dark:text-black/40 uppercase mb-2 block">The Concept</span>
              {/* 메인 제목 */}
              <h3 className="text-2xl font-black italic tracking-tighter text-white dark:text-black uppercase mb-3">마음을 잇는 장식, 달개</h3>
              {/* 달개 개념 설명 (반투명 내부 박스) */}
              <p className="text-[13px] text-white/70 dark:text-black/60 font-medium leading-relaxed bg-white/5 dark:bg-black/5 p-4 rounded-xl border border-white/10 dark:border-black/5">
                '달개'는 배지의 순우리말입니다. 당신의 소중한 기록과 성장을 상징하며, 무신사 SNAP에서의 영향력을 증명하는 특별한 엠블럼입니다.
              </p>
            </div>
          </div>

          {/* ────────────────────────────────────────────────
              Types List (달개 유형 목록)
              - 섹션 헤더: Sparkles 아이콘 + "Badge Categories"
              - isLoading === true: Loader2 스피너 + "Loading Catalog"
              - isLoading === false: 달개 유형 카드 목록
                각 카드:
                  - 좌측: 이미지 박스 (14px × 14px, object-cover, hover scale 110%)
                  - 우측: 달개 이름(대문자 이탤릭) + 설명 텍스트
                  - hover 시 검정/흰색 테두리로 전환
          ──────────────────────────────────────────────── */}
          <div>
            {/* 섹션 헤더 */}
            <div className="flex items-center gap-2 mb-6 ml-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span className="text-[14px] font-black italic tracking-widest uppercase text-black dark:text-white">Badge Categories</span>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                /* 로딩 중: 스피너 + "Loading Catalog" 텍스트 */
                <div className="flex flex-col items-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">Loading Catalog</p>
                </div>
              ) : (
                /* 달개 유형 카드 목록 */
                <div className="grid grid-cols-1 gap-3">
                  {badgeTypes?.map((type) => (
                    <div key={type.id} className="flex gap-4 items-center p-4 bg-gray-50 dark:bg-[#101215] rounded-2xl border border-transparent hover:border-black dark:hover:border-white transition-all group">
                      {/* 달개 이미지 박스 (hover 시 scale 110%) */}
                      <div className="w-14 h-14 bg-white dark:bg-[#1c1f24] rounded-xl flex items-center justify-center shadow-sm border border-[#f3f3f3] dark:border-[#292e35] group-hover:scale-110 transition-transform overflow-hidden">
                        <span className="text-3xl">{type.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* 달개 이름 */}
                        <p className="text-[14px] font-black italic tracking-tighter uppercase text-black dark:text-white mb-0.5">
                          {type.title}
                        </p>
                        {/* 달개 획득 조건 설명 */}
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-snug">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ────────────────────────────────────────────────
              Footer Info (랭킹 시스템 설명)
              - 노란색 반투명 배경 (yellow-400/10)
              - Target 아이콘(노란색) + "Ranking System" 레이블
              - 랭킹 산정 방식 설명:
                달개 총 점수에 따라 Global Ranking 산정
                → "꾸준히 기록하고 더 많은 달개를 모아보세요!"
          ──────────────────────────────────────────────── */}
          <div className="bg-yellow-400/10 dark:bg-yellow-400/5 rounded-2xl p-5 border border-yellow-400/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-yellow-600" />
              <span className="text-[12px] font-black italic tracking-widest uppercase text-yellow-700 dark:text-yellow-400">Ranking System</span>
            </div>
            {/* 랭킹 시스템 안내 텍스트 */}
            <p className="text-[12px] text-gray-600 dark:text-gray-300 leading-relaxed font-bold">
              수집한 달개의 총 점수에 따라 <span className="text-black dark:text-white border-b-2 border-black/10 dark:border-white/10 uppercase italic">Global Ranking</span>이 산정됩니다. 꾸준히 기록하고 더 많은 달개를 모아보세요!
            </p>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────
            Action Button 영역 (모달 하단 고정)
            - CONFIRM 버튼: 클릭 시 onClose 호출 → 모달 닫기
            - 배경: 연회색(라이트) / 다크모드 배경
            - 버튼 스타일: 검정 배경 + 흰색 텍스트 + 대문자 이탤릭
        ────────────────────────────────────────────────────── */}
        <div className="px-6 py-6 border-t border-[#f3f3f3] dark:border-[#292e35] bg-gray-50 dark:bg-[#1c1f24]">
          <button
            onClick={onClose}
            className="w-full h-14 bg-black dark:bg-white text-white dark:text-black font-black italic tracking-[2px] uppercase text-[15px] rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-all active:scale-95 shadow-lg"
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}
