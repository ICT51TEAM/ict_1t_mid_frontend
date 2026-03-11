/**
 * @file SnapFeedPage.jsx
 * @route / (메인 피드)
 *
 * @description
 * 무신사 앱의 메인 스냅 피드 페이지.
 * 모든 사용자의 스냅(패션 코디 사진)을 3열 매이슨리(masonry) 그리드로 표시한다.
 * URL 쿼리 파라미터 ?q= 로 태그 검색이 가능하며,
 * 전체 / 글벗(팔로잉) 필터 토글로 표시 범위를 조절할 수 있다.
 *
 * @주요_기능
 * 1. 데이터 패칭: GET /api/albums/feed?type=photo&friendsOnly=...&tag=...
 * 2. 필터 토글: '전체'(all) 또는 '글벗'(following) 탭으로 전환
 *    - 'all': friendsOnly=false (파라미터 생략)
 *    - 'following': friendsOnly=true (팔로잉 사용자 스냅만 표시)
 * 3. 태그 검색: URL ?q=태그명 → API tag 파라미터로 전달
 *    - 검색 중에는 필터 UI 대신 검색 키워드 + 삭제 버튼 표시
 * 4. 클라이언트 사이드 페이지네이션 (무한 스크롤):
 *    - 백엔드에서 전체 데이터를 한 번에 받아 allItems에 저장
 *    - displayCount(초기값 20)만큼만 화면에 렌더링
 *    - 페이지 하단의 sentinelRef 요소가 뷰포트에 진입하면 displayCount += 20
 * 5. 취소(cancellation): useEffect 내 let cancelled = false 패턴으로
 *    언마운트 후 setState 호출을 방지
 *
 * @state
 * - allItems     {Array}   - 백엔드에서 받아온 스냅 전체 배열 (페이지네이션 전 원본 데이터)
 * - displayCount {number}  - 현재 화면에 표시할 스냅 수 (초기: 20, 스크롤 시 +20씩 증가)
 * - loading      {boolean} - 데이터 패칭 중 여부 ("Loading..." 텍스트 표시용)
 * - filter       {string}  - 현재 필터 상태: 'all' 또는 'following'
 *
 * @searchParams (URL 쿼리 파라미터)
 * - q {string} - 태그 검색어. 없으면 빈 문자열('')로 처리.
 *   예: /?q=스트릿 → API 호출 시 tag=스트릿 파라미터로 전달
 *   검색 삭제: searchParams.delete('q') + setSearchParams()
 *
 * @ref
 * - sentinelRef {React.RefObject} - 무한 스크롤 트리거 요소의 DOM 참조.
 *   이 요소가 IntersectionObserver에 의해 화면에 보이면 displayCount를 증가시킨다.
 *
 * @hooks
 * - useSearchParams : URL 쿼리 파라미터 읽기/수정 (q 파라미터)
 */

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '@/api/apiClient';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import SnapCard from '@/components/feed/SnapCard';
import FAB from '@/components/common/FAB';
import { Search as SearchIcon, X } from 'lucide-react';

export default function SnapFeedPage() {
    // ---------------------------------------------------------
    // [URL 쿼리 파라미터]
    // searchParams: URLSearchParams 객체, ?q= 값을 읽는 데 사용
    // setSearchParams: 쿼리 파라미터를 프로그래밍적으로 변경 (검색 삭제 시 사용)
    // searchQuery: ?q= 파라미터 값. 없으면 '' (빈 문자열)
    // ---------------------------------------------------------
    const [searchParams, setSearchParams] = useSearchParams();
    const searchQuery = searchParams.get('q') || '';

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------

    // filter: 현재 활성화된 피드 필터.
    //   'all'       → 전체 스냅 표시 (friendsOnly=false)
    //   'following' → 팔로잉 사용자 스냅만 표시 (friendsOnly=true)
    const [filter, setFilter] = useState('all');



    // API 파라미터 매핑
    const getVisibility = () => {
        if (filter === 'following') return 'FRIENDS';
        if (filter === 'mine') return 'PRIVATE';
        return undefined; // 전체
    };




    // allItems: 백엔드 API에서 받아온 스냅 전체 배열.
    // 클라이언트 페이지네이션을 위해 전체 데이터를 한 번에 메모리에 저장.
    // API 오류 시 빈 배열([])로 초기화.
    const [allItems, setAllItems] = useState([]);

    // displayCount: 현재 화면에 렌더링할 스냅 수.
    // 초기값: 20 (처음에 20개만 표시)
    // 무한 스크롤로 sentinelRef가 보일 때마다 +20씩 증가.
    // filter 또는 searchQuery 변경 시 20으로 리셋 (새 검색 결과 처음부터 표시).
    const [displayCount, setDisplayCount] = useState(20);

    // loading: API 요청 중이면 true → "Loading..." 메시지 표시.
    // 초기값 true (첫 로딩 시 즉시 로딩 상태 표시).
    const [loading, setLoading] = useState(true);

    // sentinelRef: 무한 스크롤 트리거 요소의 DOM ref.
    // JSX 하단의 빈 div에 연결되어, IntersectionObserver가 이 요소의 가시성을 감지한다.
    const sentinelRef = useRef(null);

    // ---------------------------------------------------------
    // [useEffect #1] 데이터 패칭 (filter 또는 searchQuery 변경 시 재실행)
    // 실행 시점: 컴포넌트 마운트 시, filter 상태 변경 시, searchQuery(URL ?q=) 변경 시
    //
    // 동작 순서:
    //   [1] cancelled = false: 클린업 함수에서 true로 바꿀 취소 플래그
    //   [2] setLoading(true): 로딩 UI 표시
    //   [3] setDisplayCount(20): 페이지네이션 카운터 초기화
    //       (필터/검색 변경 시 이전 결과의 페이지 위치를 리셋)
    //   [4] apiClient.get('/albums/feed', { params: { type: 'photo', friendsOnly: ..., tag: ... } })
    //       → API: GET /api/albums/feed
    //       → params.type: 'photo' (사진 타입 스냅만 요청)
    //       → params.friendsOnly: filter === 'following' → true, 'all' → false
    //       → params.tag: searchQuery가 있으면 전달, 없으면 undefined (파라미터 생략)
    //   [5] 성공: !cancelled 확인 후 setAllItems(res.data 배열)
    //       (cancelled가 true이면 이미 언마운트됐으므로 setState 호출 생략)
    //   [6] 실패: !cancelled 확인 후 setAllItems([]) (빈 배열로 초기화)
    //   [7] finally: !cancelled 확인 후 setLoading(false)
    //
    // 클린업: return () => { cancelled = true }
    //   → 컴포넌트 언마운트 또는 의존성 변경 시 호출됨
    //   → 이미 진행 중인 비동기 요청의 응답이 왔을 때 setState를 막아 메모리 누수 방지
    // ---------------------------------------------------------
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setDisplayCount(20);

        const fetchFeed = async () => {
            try {
                const tagParam = searchQuery || undefined;
                const response = await apiClient.get('/albums/feed', {
                    params: { type: 'photo', visibility: getVisibility() }
                });
                if (!cancelled) {
                    setAllItems(response.data || []);
                }
            } catch (error) {
                if (!cancelled) {
                    setAllItems([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchFeed();

        return () => {
            cancelled = true;
        };
    }, [filter, searchQuery]);

    useEffect(() => {
        if (!sentinelRef.current) return;
        const obs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setDisplayCount(prev => prev + 20);
            }
        });
        obs.observe(sentinelRef.current);
        return () => obs.disconnect();
    }, []);

    // ---------------------------------------------------------
    // [파생 데이터]
    // snaps: allItems에서 앞 displayCount개만 잘라낸 배열.
    // 이 배열이 실제로 화면에 렌더링되는 스냅 목록.
    // displayCount가 증가할수록 더 많은 항목이 렌더링됨.
    // ---------------------------------------------------------
    const snaps = allItems.slice(0, displayCount);

    // ---------------------------------------------------------
    // [JSX 렌더링]
    // ResponsiveLayout: showTabs 기본값(true) → 하단 탭바 표시
    // ---------------------------------------------------------
    return (
        <ResponsiveLayout>
            {/* ── 상단 필터 바 ───────────────────────────────────────
                flex justify-between: 왼쪽(카운트/검색 상태), 오른쪽(필터 토글) 배치.
                sticky top 없음 → 스크롤과 함께 올라감.

                [왼쪽 - 검색 상태 또는 현재 필터 표시 뱃지]
                - searchQuery가 있을 때:
                  SearchIcon + 검색어 텍스트 + X(삭제) 버튼
                  X 버튼 클릭 → searchParams.delete('q') + setSearchParams(searchParams)
                  → URL에서 ?q= 제거 → useEffect #1 재실행 → 전체 피드 다시 로드
                - searchQuery가 없을 때:
                  현재 filter에 따라 'All Snaps' 또는 'Following' 텍스트 표시

                [오른쪽 - 필터 토글 버튼 그룹]
                - 둥근 pill 형태의 토글 버튼 2개: "전체" / "글벗"
                - 활성화된 버튼: bg-black + text-white + shadow-md
                - 비활성화된 버튼: 회색 텍스트
                - 클릭 시 setFilter 호출 → useEffect #1 재실행으로 API 재요청
            ─────────────────────────────────────────────────────── */}
            {/* Count and Filter */}
            <div className="flex justify-between items-center px-4 py-6 bg-white dark:bg-[#101215] border-b border-[#f3f3f3] dark:border-[#292e35] transition-colors">
                {/* 현재 표시 상태 뱃지: 검색 중이면 검색어 표시, 아니면 필터 이름 */}
                <div className="bg-black dark:bg-[#292e35] px-4 py-2.5 rounded-[2px] shadow-xl flex items-center gap-2">
                    <span className="text-[15px] font-black italic tracking-widest text-white dark:text-[#e5e5e5] uppercase leading-none block">
                        {searchQuery ? (
                            /* 검색 모드: 돋보기 아이콘 + 검색어 + X 버튼 */
                            <div className="flex items-center gap-2">
                                <SearchIcon size={14} className="stroke-[3px]" />
                                <span>"{searchQuery}"</span>
                                {/* X 버튼: 클릭 시 URL에서 ?q= 파라미터 제거 */}
                                <button
                                    onClick={() => {
                                        searchParams.delete('q');
                                        setSearchParams(searchParams);
                                    }}
                                    className="ml-1 p-0.5 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            /* 일반 모드: 현재 필터 이름 표시 */
                            filter === 'all' ? 'All Snaps' : 'Following'
                        )}
                    </span>
                </div>

                {/* 전체/글벗 필터 토글 버튼 그룹 */}
                <div className="flex bg-[#f3f3f3] dark:bg-[#1c1f24] p-1 rounded-full shrink-0 ml-4">
                    {/* "전체" 버튼: 클릭 시 filter = 'all' */}
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all duration-300 ${filter === 'all' ? 'bg-black text-white shadow-md' : 'text-[#a3b0c1] hover:text-black dark:hover:text-white'}`}
                    >
                        전체
                    </button>
                    {/* "글벗" 버튼: 클릭 시 filter = 'following' → friendsOnly=true */}
                    <button
                        onClick={() => setFilter('following')}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all duration-300 ${filter === 'following' ? 'bg-black text-white shadow-md' : 'text-[#a3b0c1] hover:text-black dark:hover:text-white'}`}
                    >
                        글벗
                    </button>
                    {/* "내 스냅" 버튼: 클릭 시 filter = 'mine' → visibility=PRIVATE */}
                    <button
                        onClick={() => setFilter('mine')}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all duration-300 ${filter === 'mine' ? 'bg-black text-white shadow-md' : 'text-[#a3b0c1] hover:text-black dark:hover:text-white'}`}
                    >
                        나만
                    </button>
                </div>
            </div>

            {/* ── 메이슨리 그리드 및 로딩/빈 상태 ─────────────────────
                loading: "Loading..." 텍스트 표시
                snaps.length === 0: "No snaps found" 텍스트 표시
                정상: columns-3 (3열 매이슨리 레이아웃, CSS columns 속성 사용)
                      gap-1 px-1: 컬럼 간격 및 외부 패딩

                SnapCard 컴포넌트:
                  - key: snap.id (React 리스트 렌더링 최적화용 고유 키)
                  - snap: 스냅 데이터 객체 전달
            ─────────────────────────────────────────────────────── */}
            {/* Masonry Grid */}
            <div className="bg-white dark:bg-[#101215] transition-colors pb-10">
                {loading ? (
                    /* 데이터 로딩 중 표시 */
                    <div className="p-4 text-center text-gray-400">Loading...</div>
                ) : snaps.length === 0 ? (
                    /* 결과 없음 표시 (검색 결과 없거나 피드가 비어있을 때) */
                    <div className="p-4 text-center text-gray-400">No snaps found</div>
                ) : (
                    /* 3열 매이슨리 그리드: CSS columns-3으로 자동 높이 배분 */
                    <div className="columns-3 gap-1 px-1">
                        {snaps.map((snap) => (
                            <SnapCard key={snap.id} snap={snap} />
                        ))}
                    </div>
                )}

                {/* ── 무한 스크롤 트리거 요소 (sentinel) ────────────────
                    이 div가 뷰포트에 진입하면 IntersectionObserver 콜백이 실행되어
                    displayCount를 +20 증가시킨다.
                    displayCount < allItems.length일 때만 "Loading more..." 텍스트 표시
                    (모든 데이터를 다 불러오면 텍스트 사라짐).
                ─────────────────────────────────────────────────── */}
                {/* Infinite Scroll Trigger */}
                <div ref={sentinelRef} className="h-10 w-full flex items-center justify-center pt-4 pb-8">
                    {displayCount < allItems.length && <span className="text-gray-400 text-sm">Loading more...</span>}
                </div>
            </div>

            {/* ── FAB (Floating Action Button) ──────────────────────
                새 스냅 작성 버튼. 화면 우측 하단에 고정 표시.
                ResponsiveLayout 내부에 렌더링되어 레이아웃 구조를 따름.
            ─────────────────────────────────────────────────────── */}
            <FAB />
        </ResponsiveLayout>
    );
}
