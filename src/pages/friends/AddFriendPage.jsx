/**
 * @file AddFriendPage.jsx
 * @route /add-friend
 *
 * @description
 * 새 글벗(친구)을 검색하고 신청할 수 있는 페이지.
 * 헤더 안에 검색창이 내장되어 있으며 페이지 진입 시 autoFocus 로 바로 입력 가능하다.
 * 폼 제출(엔터 또는 검색 버튼) 시 GET /api/friends/search?q={query} 를 호출하고
 * 결과 목록을 화면에 표시한다.
 * 각 결과 항목의 "친구 신청" 버튼은 현재 alert() 로만 동작하며,
 * 실제 API 연동은 미구현 상태이다.
 *
 * @layout
 * ┌─────────────────────────────────────────┐
 * │  [Header] (sticky)                      │
 * │    ← 뒤로가기   [검색창 (autoFocus)]    │
 * ├─────────────────────────────────────────┤
 * │  [Results 영역]                         │
 * │    결과 있음:                           │
 * │      [프로필 이미지 + 이름 + #ID]       │
 * │      [친구 신청 버튼]                   │
 * │    결과 없음 + query 있음:              │
 * │      "검색 결과가 없습니다."            │
 * │    query 비어있음:                      │
 * │      "찾고 싶은 친구의 이름을 입력하세요."│
 * └─────────────────────────────────────────┘
 *
 * @state
 *   query    - 검색창 입력값. 폼 제출 시 API 검색에 사용됨.
 *              빈 문자열이면 API 호출을 생략하고 안내 텍스트를 표시.
 *   results  - GET /api/friends/search?q={query} 응답 배열.
 *              빈 배열이고 query 가 있으면 "검색 결과 없음" 메시지 표시.
 *
 * @api
 *   friendService.searchUsers(query) → GET /api/friends/search?q={query}
 *   handleSearch 내에서 폼 submit 시 호출됨 (디바운스 없음, 명시적 제출만)
 *
 * @note
 *   "친구 신청" 버튼은 현재 alert('친구 요청을 보냈습니다.') 만 실행함.
 *   실제 API (POST /api/friends/request) 연동은 추후 구현 예정.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, Search } from 'lucide-react';
import { friendService } from '@/api/friendService';

export default function AddFriendPage() {
    const navigate = useNavigate();

    /**
     * @state query
     * 검색창의 현재 입력값.
     * onChange 마다 갱신되며, 폼 submit(handleSearch) 시 API 호출에 사용됨.
     * 비어 있으면 handleSearch 에서 API 호출을 건너뜀.
     */
    const [query, setQuery] = useState('');

    /**
     * @state results
     * GET /api/friends/search?q={query} 의 응답 유저 배열.
     * 구조: Array<{
     *   id: string|number,       // 유저 고유 ID (key 및 #ID 표시용)
     *   userId: string|number,   // 구버전 ID 필드 (fallback 용)
     *   username: string,        // 유저명 (목록에 표시)
     *   profileImage: string     // 프로필 이미지 URL
     * }>
     * 비어 있고 query 가 있으면 "검색 결과가 없습니다." 를 표시.
     */
    const [results, setResults] = useState([]);

    /**
     * @function handleSearch
     * @param {React.FormEvent} e - 폼 submit 이벤트 (기본 동작 방지용)
     *
     * 동작:
     *   1. e.preventDefault() 로 페이지 리로드 방지
     *   2. query.trim() 이 비어있으면 즉시 return (빈 검색 방지)
     *   3. friendService.searchUsers(query) 호출
     *      → GET /api/friends/search?q={query}
     *   4. 응답을 setResults 에 저장 → 결과 목록 렌더링
     *
     * 에러 처리: 현재 try-catch 없음 (API 실패 시 화면 변화 없음)
     *
     * 트리거: 검색창 form 의 onSubmit (엔터 키 또는 검색 버튼)
     */
    const handleSearch = async (e) => {
        // TODO: [1] e.preventDefault()로 폼 기본 동작(페이지 리로드) 방지
        e.preventDefault();
        // TODO: [2] query.trim()이 비어있으면 즉시 return
        const trimmedQuery = query.trim();
        if(!trimmedQuery) return;
        // TODO: [3] friendService.searchUsers(query) 호출 후 응답을 setResults()에 저장
        try{
             const data = await friendService.searchUsers(trimmedQuery);
             setResults(data || []);

        }catch(error){
            alert('친구를 찾을 수 없습니다.');
            setResults([]);
        }
        // 힌트: await를 사용하여 비동기 API 결과를 기다립니다.

    };

    return (
        // showTabs={false}: 하단 내비게이션 탭 숨김 (서브 페이지)
        <ResponsiveLayout showTabs={false}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5]">

                {/* ──────────────────────────────────────────────────────
                    Header (sticky, top-0)
                    - 좌측: ArrowLeft 버튼 → navigate(-1) 뒤로가기
                    - 우측: form 안에 검색창 배치
                      - autoFocus: 페이지 진입 시 바로 키보드 입력 가능
                      - placeholder: "친구 검색"
                      - onSubmit(handleSearch): 엔터 시 검색 실행
                      - Search 아이콘: 좌측 내부 (absolute 배치)
                ────────────────────────────────────────────────────── */}
                <div className="flex items-center h-14 px-4 border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 bg-white dark:bg-[#1c1f24] z-10">
                    {/* 뒤로가기 버튼 */}
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    {/* 검색 폼 (flex-1로 나머지 공간 차지) */}
                    <div className="flex-1 px-2">
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                placeholder="친구 검색"
                                className="w-full h-10 pl-10 pr-4 bg-[#f3f3f3] dark:bg-[#292e35] text-black dark:text-[#e5e5e5] rounded-full text-[14px] outline-none"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus  // 페이지 진입 시 자동 포커스
                            />
                            {/* 검색 아이콘 (좌측 내부 고정) */}
                            <Search size={18} className="absolute left-3 top-2.5 text-[#a3b0c1]" />
                        </form>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────
                    Results 영역
                    3가지 상태로 분기:

                    [1] results.length > 0 (검색 결과 있음)
                        유저 목록을 세로로 나열:
                        - 프로필 이미지 (rounded-xl, 12×12)
                        - 유저명 (font-bold, 14px)
                        - #ID (회색, 11px)
                        - 클릭: /friend/{id|userId} 로 프로필 이동
                        - "친구 신청" 버튼 (검정 배경):
                          현재 alert() 만 실행, 실제 API 연동 미구현

                    [2] results.length === 0 AND query 비지 않음 (검색 결과 없음)
                        → "검색 결과가 없습니다." 안내 텍스트

                    [3] query 비어있음 (초기 상태)
                        → "찾고 싶은 친구의 이름을 입력하세요." 안내 텍스트
                ────────────────────────────────────────────────────── */}
                <div className="p-6">
                    {results.length > 0 ? (
                        /* 검색 결과 목록 */
                        <div className="flex flex-col gap-6">
                            {results.map(user => (
                                <div key={user.id || user.userId} className="flex items-center justify-between">
                                    {/* 프로필 영역 (클릭 시 /friend/{id} 로 이동) */}
                                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/friend/${user.id || user.userId}`)}>
                                        <img src={user.profileImage} alt="u" className="w-12 h-12 rounded-xl border border-[#f3f3f3]" />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[14px]">{user.username}</span>
                                            <span className="text-[11px] text-[#7b8b9e]">#{user.id || user.userId}</span>
                                        </div>
                                    </div>
                                    {/* 친구 신청 버튼 (현재 alert 처리, API 미연동) */}
                                    <button
                                        onClick={async () => {
                                            try {
                                                 await friendService.sendRequest(user.id || user.userId);
                                                    alert('친구 요청을 보냈습니다.');
                                            } catch (error) {
                                                console.error('친구 요청 오류:', error);
                                                alert('친구 요청에 실패하거나 이미 요청된 상태입니다.');
                                            }
                                        }}
                                        className="px-4 py-2 bg-black text-white text-[12px] font-bold rounded-[4px]"
                                    >
                                        친구 신청
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        query ? (
                            /* query 있는데 결과 없음 */
                            <div className="py-20 text-center text-[#a3b0c1] text-[14px]">검색 결과가 없습니다.</div>
                        ) : (
                            /* query 비어있음 (초기 안내 메시지) */
                            <div className="py-20 text-center text-[#a3b0c1] text-[14px]">찾고 싶은 친구의 이름을 입력하세요.</div>
                        )
                    )}
                </div>
            </div>
        </ResponsiveLayout>
    );
}
