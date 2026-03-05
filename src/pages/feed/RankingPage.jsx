/**
 * @file RankingPage.jsx
 * @route /ranking
 *
 * @description
 * 무신사 앱의 스냅 랭킹 페이지.
 * 좋아요 수 등 기준으로 정렬된 스냅을 2열 그리드로 표시하며,
 * 각 스냅 카드에 순위 번호를 오버레이로 보여준다.
 *
 * @SnapFeedPage와의_차이점
 * - 2열 그리드(columns-2) vs SnapFeedPage의 3열(columns-3)
 * - 필터 토글(전체/글벗) 없음 → 항상 전체 스냅 표시
 * - RankSnapCard 컴포넌트 사용 (rank 번호 오버레이 포함)
 * - 상단에 서브 탭(스냅/멤버/브랜드)과 스타일 필터 추가 UI 있음
 *   (현재는 UI만 있고 실제 필터링 기능은 미구현)
 *
 * @주요_기능
 * 1. 데이터 패칭: GET /api/albums/feed?type=photo
 *    (랭킹 페이지는 friendsOnly나 tag 파라미터 없이 전체를 요청)
 * 2. 클라이언트 사이드 페이지네이션 (무한 스크롤):
 *    - allItems에 전체 데이터 저장, displayCount만큼만 렌더링
 *    - sentinelRef가 뷰포트에 진입하면 displayCount += 20
 * 3. 취소 패턴 없음: SnapFeedPage와 달리 cancelled 플래그 미사용
 *    (랭킹 데이터는 마운트 시 1회 패칭, 의존성 변경 없음)
 *
 * @state
 * - allItems     {Array}   - 백엔드에서 받아온 스냅 전체 배열 (랭킹 순서 포함)
 * - displayCount {number}  - 현재 화면에 표시할 스냅 수 (초기: 20, 스크롤 시 +20씩 증가)
 * - loading      {boolean} - 데이터 패칭 중 여부 ("Loading..." 텍스트 표시용)
 *
 * @ref
 * - sentinelRef {React.RefObject} - 무한 스크롤 트리거 요소의 DOM 참조
 *
 * @UI_정적_데이터 (현재 기능 미구현)
 * - subTabs: ['스냅', '멤버', '브랜드'] - 탭 전환 UI만 있고 실제 전환 미구현
 *   (현재 항상 첫 번째 탭 '스냅'이 선택된 것처럼 스타일링됨)
 * - styles: ['전체', '캐주얼', '스트릿', '미니멀', '걸리시', '로맨틱', '시크']
 *   - 스타일 필터 버튼 UI만 있고 실제 필터링 미구현
 *   (현재 항상 첫 번째 '전체'가 활성화된 것처럼 스타일링됨)
 */

import React, { useEffect, useState, useRef } from 'react';
import apiClient from '@/api/apiClient';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import RankSnapCard from '@/components/feed/RankSnapCard';
import FAB from '@/components/common/FAB';
import { Info, ChevronDown } from 'lucide-react';

export default function RankingPage() {
    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------

    // allItems: 백엔드 랭킹 API에서 받아온 스냅 전체 배열.
    // 배열의 index + 1이 곧 해당 스냅의 랭킹 순위가 된다.
    // (index 0 → 1위, index 1 → 2위, ...)
    // API 오류 시 빈 배열([])로 초기화.
    const [allItems, setAllItems] = useState([]);

    // displayCount: 현재 화면에 렌더링할 스냅 수.
    // 초기값: 20. 무한 스크롤로 sentinelRef가 보이면 +20씩 증가.
    const [displayCount, setDisplayCount] = useState(20);

    // loading: API 요청 중이면 true → "Loading..." 메시지 표시
    const [loading, setLoading] = useState(true);

    // sentinelRef: 무한 스크롤 트리거 요소(빈 div)의 DOM ref.
    // IntersectionObserver가 이 요소의 가시성을 감지해 displayCount를 증가시킨다.
    const sentinelRef = useRef(null);

    // ---------------------------------------------------------
    // [useEffect #1] 랭킹 데이터 패칭 (마운트 시 1회)
    // 실행 시점: 컴포넌트 마운트 시 단 1회 (빈 의존성 배열 [])
    //
    // 동작:
    //   [1] apiClient.get('/albums/feed', { params: { type: 'photo' } }) 호출
    //       → API: GET /api/albums/feed?type=photo
    //       → 필터 파라미터 없음 (전체 스냅, 랭킹 순서로 정렬됨)
    //   [2] 성공: setAllItems(res.data 배열)
    //   [3] 실패: setAllItems([]) (빈 배열)
    //   [4] finally: setLoading(false)
    //
    // 클린업: 없음
    // 주의: SnapFeedPage의 cancelled 패턴이 없으므로, 빠르게 언마운트되면
    //        setState 경고가 발생할 수 있음 (현재 구현에서는 미적용)
    // ---------------------------------------------------------
    useEffect(() => {
        // TODO: apiClient.get('/albums/feed', { params: { type: 'photo' } }) 호출
        // TODO: 성공 시 setAllItems(), 실패 시 setAllItems([])
        // 힌트: finally에서 setLoading(false) 호출
    }, []);

    // ---------------------------------------------------------
    // [useEffect #2] 무한 스크롤 IntersectionObserver 설정 (마운트 시 1회)
    // 실행 시점: 컴포넌트 마운트 시 단 1회 (빈 의존성 배열 [])
    //
    // 동작:
    //   [1] sentinelRef.current가 없으면 즉시 return
    //   [2] new IntersectionObserver 생성
    //       - 콜백: entry.isIntersecting이 true이면 (하단 sentinel이 뷰포트에 보이면)
    //               setDisplayCount(c => c + 20) → 20개 더 렌더링
    //   [3] obs.observe(el): 요소 관찰 시작
    //
    // 클린업: return () => obs.disconnect() → 언마운트 시 옵저버 해제
    // ---------------------------------------------------------
    useEffect(() => {
        // TODO: new IntersectionObserver(() => setDisplayCount(prev => prev+20)) 로 sentinelRef 감시
        // 힌트: obs.observe(sentinelRef.current), 클린업에서 obs.disconnect()
    }, []);

    // ---------------------------------------------------------
    // [파생 데이터]
    // snaps: allItems에서 앞 displayCount개만 잘라낸 배열.
    // RankSnapCard에 rank={index + 1}로 순위 번호를 전달한다.
    // ---------------------------------------------------------
    const snaps = allItems.slice(0, displayCount);

    // ---------------------------------------------------------
    // [UI 정적 데이터] (현재 기능 미구현)
    // subTabs: 상단 서브 탭 텍스트 배열
    //   - 첫 번째 탭(스냅)만 활성화 스타일 적용, 나머지는 비활성 스타일
    // styles: 스타일 필터 버튼 텍스트 배열
    //   - 첫 번째(전체)만 활성화 스타일, 나머지는 회색 텍스트
    // ---------------------------------------------------------
    const subTabs = ['스냅', '멤버', '브랜드'];
    const styles = ['전체', '캐주얼', '스트릿', '미니멀', '걸리시', '로맨틱', '시크'];

    // ---------------------------------------------------------
    // [JSX 렌더링]
    // ---------------------------------------------------------
    return (
        <ResponsiveLayout>

            {/* ── 서브 탭 (스냅 / 멤버 / 브랜드) ─────────────────────
                현재는 '스냅' 탭만 활성화 스타일(font-bold + border-b-2).
                '멤버', '브랜드' 탭은 UI는 있지만 기능 미구현.
                클릭해도 현재 아무런 상태 변화 없음.
            ─────────────────────────────────────────────────────── */}
            {/* Sub Tabs */}
            <div className="flex px-4 border-b border-[#f3f3f3] dark:border-[#292e35] bg-white dark:bg-[#1c1f24]">
                {subTabs.map((tab, idx) => (
                    <button key={tab} className={`py-3 mr-4 text-[14px] ${idx === 0 ? 'font-bold border-b-2 border-black' : 'text-[#7b8b9e] font-medium'}`}>
                        {tab}
                    </button>
                ))}
            </div>

            {/* ── 스타일 필터 (가로 스크롤) ───────────────────────────
                '전체', '캐주얼', '스트릿', ... 버튼들을 가로로 나열.
                overflow-x-auto + scrollbar-hide: 스크롤 가능, 스크롤바 숨김.
                현재는 첫 번째 버튼('전체')만 활성화 스타일 적용.
                클릭해도 현재 아무런 필터링 동작 없음 (미구현).
            ─────────────────────────────────────────────────────── */}
            {/* Style Filters */}
            <div className="flex overflow-x-auto px-4 py-3 bg-white dark:bg-[#1c1f24] scrollbar-hide border-b border-[#f3f3f3] dark:border-[#292e35] gap-4">
                {styles.map((style, idx) => (
                    <button key={style} className={`whitespace-nowrap text-[14px] ${idx === 0 ? 'font-bold text-black' : 'text-[#7b8b9e]'}`}>
                        {style}
                    </button>
                ))}
            </div>

            {/* ── 날짜 / 기간 정보 바 ──────────────────────────────────
                왼쪽: 랭킹 기준 시각 표시 ("03.03 12:00 기준")
                      Info 아이콘으로 더 많은 정보를 볼 수 있음을 암시 (현재 클릭 기능 없음)
                오른쪽: 랭킹 집계 기간 선택 버튼 ("최근 1일")
                        ChevronDown으로 드롭다운 암시 (현재 기능 미구현)
            ─────────────────────────────────────────────────────── */}
            {/* Date and Range */}
            <div className="flex justify-between items-center px-4 py-3 bg-[#f9f9fa] dark:bg-[#101215]">
                <span className="flex items-center text-[13px] text-[#7b8b9e]">
                    03.03 12:00 기준 <Info size={14} className="ml-1" />
                </span>
                <button className="flex items-center text-[13px] text-[#7b8b9e]">
                    최근 1일 <ChevronDown size={14} className="ml-0.5" />
                </button>
            </div>

            {/* ── 2열 랭킹 그리드 ──────────────────────────────────────
                loading: "Loading..." 텍스트 표시
                정상: columns-2 (2열 매이슨리 레이아웃)
                      SnapFeedPage의 3열과 달리 2열로 카드를 더 크게 표시

                RankSnapCard 컴포넌트:
                  - key: snap.id
                  - snap: 스냅 데이터 객체
                  - rank: index + 1 (1부터 시작하는 순위 번호)
                  - RankSnapCard 내부에서 rank를 오버레이로 표시하고 좋아요 버튼 포함
            ─────────────────────────────────────────────────────── */}
            {/* Grid */}
            <div className="bg-white dark:bg-[#101215]">
                {loading ? (
                    /* 데이터 로딩 중 */
                    <div className="p-4 text-center text-gray-400">Loading...</div>
                ) : (
                    /* 2열 매이슨리 그리드: 각 스냅에 rank(순위) 번호 전달 */
                    <div className="columns-2 gap-1 px-1">
                        {snaps.map((snap, index) => (
                            <RankSnapCard key={snap.id} snap={snap} rank={index + 1} />
                        ))}
                    </div>
                )}

                {/* ── 무한 스크롤 트리거 요소 ───────────────────────────
                    IntersectionObserver가 이 요소를 감지해 displayCount를 증가시킴.
                    displayCount < allItems.length일 때만 "Loading more..." 표시.
                ─────────────────────────────────────────────────── */}
                <div ref={sentinelRef} className="h-10 w-full flex items-center justify-center pt-4 pb-8">
                    {displayCount < allItems.length && <span className="text-gray-400 text-sm">Loading more...</span>}
                </div>
            </div>

            {/* FAB: 새 스냅 작성 버튼 (화면 우측 하단 고정) */}
            <FAB />
        </ResponsiveLayout>
    );
}
