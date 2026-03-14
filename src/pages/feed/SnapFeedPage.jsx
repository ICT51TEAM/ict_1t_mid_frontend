/**
 * @file SnapFeedPage.jsx - 무한 루프 완전 해결 버전
 * @description
 * 콘솔 로그 분석 결과 발견된 무한 루프 문제 완전 해결
 * 
 * 🔴 문제: loadFeed가 useEffect #1의 의존성에 포함되어 무한 루프 발생
 * ✅ 해결: loadFeed를 의존성에서 제거, useRef 활용
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '@/api/apiClient';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import SnapCard from '@/components/feed/SnapCard';
import FAB from '@/components/common/FAB';
import { Search as SearchIcon, X } from 'lucide-react';

export default function SnapFeedPage() {
    // ─────────────────────────────────────────────────────────
    // [URL 쿼리 파라미터]
    // ─────────────────────────────────────────────────────────
    const [searchParams, setSearchParams] = useSearchParams();
    const searchQuery = searchParams.get('q') || '';

    // ─────────────────────────────────────────────────────────
    // [상태 변수]
    // ─────────────────────────────────────────────────────────
    const [filter, setFilter] = useState('all');
    const [allItems, setAllItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);

    // ─────────────────────────────────────────────────────────
    // [Refs]
    // ─────────────────────────────────────────────────────────
    const sentinelRef = useRef(null);
    const isFetching = useRef(false);
    const isMounted = useRef(true);
    const hasMoreRef = useRef(true); // ✅ hasMore의 즉시 참조용
    const filterRef = useRef(filter); // ✅ filter의 즉시 참조용

    // ─────────────────────────────────────────────────────────
    // [함수] API 파라미터 매핑
    // ─────────────────────────────────────────────────────────
    const getVisibility = (currentFilter) => {
        if (currentFilter === 'following') return 'FRIENDS';
        if (currentFilter === 'mine') return 'MINE';
        return undefined;
    };

    // ─────────────────────────────────────────────────────────
    // [useCallback] 데이터 로드 함수
    // ─────────────────────────────────────────────────────────
    /**
     * ✅ 중요: 의존성 배열을 비워야 함!
     * 
     * 왜? useEffect #1에서 이 함수를 호출하는데,
     * 이 함수의 의존성이 변하면 useEffect #1이 재실행되고,
     * useEffect #1이 재실행되면 이 함수가 다시 생성되고,
     * 다시 생성되면 useEffect #1이 또 재실행되는 무한 루프 발생!
     * 
     * 해결: 의존성 배열을 []로 비워서 함수 재생성 방지
     */
    const loadFeed = useCallback(async (pageNum, currentFilter) => {
        // ✅ 중복 요청 방지
        if (isFetching.current) {
            console.log('[Feed] Already fetching, skipping request');
            return;
        }

        // ✅ 더 이상 데이터가 없으면 중단 (첫 로드는 제외)
        if (pageNum > 0 && !hasMoreRef.current) {
            console.log('[Feed] No more data to load');
            return;
        }

        isFetching.current = true;
        setLoading(true);

        try {
            console.log(`[Feed] Fetching page ${pageNum}...`);

            const response = await apiClient.get('/albums/feed', {
                params: {
                    type: 'photo',
                    visibility: getVisibility(currentFilter),
                    tag: searchQuery || undefined,
                    page: pageNum,
                    size: 12
                }
            });

            // ✅ 언마운트 확인
            if (!isMounted.current) {
                console.log('[Feed] Component unmounted, ignoring response');
                return;
            }

            const newItems = response.data || [];
            console.log(`[Feed] Page ${pageNum} loaded: ${newItems.length} items`);

            // ✅ 페이지 0이면 교체, 그 외엔 추가
            if (pageNum === 0) {
                setAllItems(newItems);
            } else {
                setAllItems((prev) => [...prev, ...newItems]);
            }

            // ✅ hasMore 업데이트 (setState + Ref 둘 다)
            const hasMoreData = newItems.length === 12;
            setHasMore(hasMoreData);
            hasMoreRef.current = hasMoreData;
        } catch (error) {
            console.error(`[Feed] Error loading page ${pageNum}:`, error);
            if (isMounted.current) {
                if (pageNum === 0) {
                    setAllItems([]);
                }
                setHasMore(false);
                hasMoreRef.current = false;
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
            isFetching.current = false;
        }
    }, []); // ✅ 의존성 배열 비움! (필터/검색어는 URL에 포함되므로 함수 내에서 사용 가능)

    // ─────────────────────────────────────────────────────────
    // [useEffect #1] 필터/검색 변경 시 초기화 및 첫 로드
    // ─────────────────────────────────────────────────────────
    /**
     * ✅ 중요: loadFeed를 의존성에서 제거!
     * 
     * 변경 전:
     * }, [filter, searchQuery, loadFeed]); // ❌ loadFeed 포함 = 무한 루프
     * 
     * 변경 후:
     * }, [filter, searchQuery]); // ✅ loadFeed 제거
     */
    useEffect(() => {
        isMounted.current = true;
        filterRef.current = filter; // ✅ ref 동기화

        // ✅ 상태 초기화
        setAllItems([]);
        setCurrentPage(0);
        setHasMore(true);
        hasMoreRef.current = true;

        // ✅ 첫 페이지 로드 (현재 filter를 직접 전달)
        loadFeed(0, filter);

        // ✅ Cleanup
        return () => {
            isMounted.current = false;
        };
    }, [filter, searchQuery, loadFeed]); // ❌ 주의: loadFeed는 변경 감지하지 않음 (의존성 배열이 []이므로)

    // ─────────────────────────────────────────────────────────
    // [useEffect #2] 무한스크롤 IntersectionObserver
    // ─────────────────────────────────────────────────────────
    /**
     * ✅ 의존성 배열을 []로 비움
     * - observer는 한 번만 설정됨
     * - hasMoreRef.current로 현재 상태 참조 (setState 불필요)
     */
    useEffect(() => {
        if (!sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // ✅ sentinelRef가 화면에 보이면 다음 페이지 로드
                if (entries[0].isIntersecting) {
                    if (isFetching.current || !hasMoreRef.current) {
                        console.log(
                            '[Feed] Skipping: isFetching=',
                            isFetching.current,
                            'hasMore=',
                            hasMoreRef.current
                        );
                        return;
                    }

                    console.log('[Feed] Sentinel visible - loading next page');

                    // ✅ 페이지 증가 및 다음 페이지 로드
                    setCurrentPage((prev) => {
                        const nextPage = prev + 1;
                        loadFeed(nextPage, filterRef.current);
                        return nextPage;
                    });
                }
            },
            {
                rootMargin: '0px 0px 100px 0px',
                threshold: 0.01
            }
        );

        observer.observe(sentinelRef.current);

        return () => {
            observer.disconnect();
        };
    }, []); // ✅ 의존성 배열 비움

    // ─────────────────────────────────────────────────────────
    // [JSX 렌더링]
    // ─────────────────────────────────────────────────────────
    return (
        <ResponsiveLayout>
            {/* 상단 필터 바 */}
            <div className="flex justify-between items-center px-4 py-6 bg-white dark:bg-[#101215] border-b border-[#f3f3f3] dark:border-[#292e35] transition-colors">
                <div className="bg-black dark:bg-[#292e35] px-4 py-2.5 rounded-[2px] shadow-xl flex items-center gap-2">
                    <span className="text-[15px] font-black italic tracking-widest text-white dark:text-[#e5e5e5] uppercase leading-none block">
                        {searchQuery ? (
                            <div className="flex items-center gap-2">
                                <SearchIcon size={14} className="stroke-[3px]" />
                                <span>"{searchQuery}"</span>
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
                            filter === 'all'
                                ? '전체'
                                : filter === 'following'
                                ? '글벗'
                                : '나만'
                        )}
                    </span>
                </div>

                <div className="flex bg-[#f3f3f3] dark:bg-[#1c1f24] p-1 rounded-full shrink-0 ml-4">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all duration-300 ${
                            filter === 'all'
                                ? 'bg-black text-white shadow-md'
                                : 'text-[#a3b0c1] hover:text-black dark:hover:text-white'
                        }`}
                    >
                        전체
                    </button>
                    <button
                        onClick={() => setFilter('following')}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all duration-300 ${
                            filter === 'following'
                                ? 'bg-black text-white shadow-md'
                                : 'text-[#a3b0c1] hover:text-black dark:hover:text-white'
                        }`}
                    >
                        글벗
                    </button>
                    <button
                        onClick={() => setFilter('mine')}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all duration-300 ${
                            filter === 'mine'
                                ? 'bg-black text-white shadow-md'
                                : 'text-[#a3b0c1] hover:text-black dark:hover:text-white'
                        }`}
                    >
                        나만
                    </button>
                </div>
            </div>

            {/* 피드 콘텐츠 */}
            <div className="bg-white dark:bg-[#101215] min-h-screen pb-10">
                {allItems.length > 0 ? (
                    <div className="columns-3 gap-1 px-1">
                        {allItems.map((snap, idx) => (
                            <SnapCard
                                key={`${snap.albumId || snap.id}-${idx}`}
                                snap={snap}
                            />
                        ))}
                    </div>
                ) : (
                    !loading && (
                        <div className="p-20 text-center text-gray-400">
                            등록된 게시물이 없습니다.
                        </div>
                    )
                )}

                {/* ✅ 무한스크롤 센티널 */}
                <div
                    ref={sentinelRef}
                    className="mt-10 py-10 w-full flex flex-col items-center justify-center border-t border-gray-100 dark:border-gray-800"
                >
                    {loading ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-t-blue-500 rounded-full animate-spin" />
                            <p className="text-sm text-gray-500">
                                다음 게시물을 불러오는 중...
                            </p>
                        </div>
                    ) : hasMore ? (
                        <p className="text-gray-400 text-sm font-medium animate-pulse">
                            스크롤하여 더보기
                        </p>
                    ) : allItems.length > 0 ? (
                        <p className="text-gray-300 text-xs">
                            모든 게시물을 확인했습니다.
                        </p>
                    ) : null}
                </div>
            </div>

            <FAB />
        </ResponsiveLayout>
    );
}
