/**
 * @file BadgeRankingPage.jsx
 * @route /badges/ranking
 *
 * @description
 * 달개(배지) 랭킹 페이지.
 * "전체 랭킹(GLOBAL)"과 "친구 랭킹(FRIENDS)" 두 탭으로 구분하여
 * 각 랭킹 목록을 순위, 프로필 이미지, 유저명, 레벨, 포인트로 표시한다.
 * 1위에는 숫자 대신 Crown 아이콘(금색)을 표시한다.
 *
 * @layout
 * ┌─────────────────────────────────────────┐
 * │  [Header]                               │
 * │    ← 뒤로가기    달개 랭킹              │
 * ├─────────────────────────────────────────┤
 * │  [탭]                                   │
 * │    [ 전체 랭킹 ]  [ 친구 랭킹 ]         │
 * │    활성 탭 하단에 검정 밑줄 표시        │
 * ├─────────────────────────────────────────┤
 * │  [랭킹 목록]  (renderContent 함수 반환) │
 * │    로딩 중  → "Calculating Rank..." 표시│
 * │    데이터 없음 → "No Data Found" 표시   │
 * │    데이터 있음 →                        │
 * │      [순위] [프로필] [이름/레벨] [점수] │
 * │      1위: Crown 아이콘(노란색)          │
 * │      2위+: 숫자                         │
 * └─────────────────────────────────────────┘
 *
 * @state
 *   ranking    - 서버에서 받아온 랭킹 사용자 배열
 *                [ { id, profileImage, username, level } ]
 *   activeTab  - 현재 활성화된 탭. 'GLOBAL' 또는 'FRIENDS'
 *                초기값: 'GLOBAL'
 *   isLoading  - API 호출 중 여부. true 면 로딩 UI 표시
 *
 * @pointCalculation
 *   포인트는 서버에서 받지 않고 프론트에서 계산:
 *   10000 - idx * 100  (1위: 10000pts, 2위: 9900pts, ...)
 *
 * @api
 *   GLOBAL  탭: badgeService.getGlobalRanking()  → GET /api/badges/ranking/global
 *   FRIENDS 탭: badgeService.getFriendsRanking() → GET /api/badges/ranking/friends
 *   탭이 바뀔 때마다 새로 호출됨 (useEffect deps: [activeTab])
 *
 * @errorHandling
 *   API 실패 시 ranking = [] 로 초기화하고 콘솔에 에러 출력
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, Crown } from 'lucide-react';
import { badgeService } from '@/api/badgeService';

export default function BadgeRankingPage() {
    const navigate = useNavigate();

    /**
     * @state ranking
     * 서버에서 받아온 랭킹 유저 목록.
     * 빈 배열이면 "No Data Found" 메시지를 표시한다.
     * 구조: Array<{
     *   id: string|number,       // 유저 고유 ID (React key로 사용)
     *   profileImage: string,    // 프로필 이미지 URL
     *   username: string,        // 유저명
     *   level: number            // 달개 레벨 (LV.N 형식으로 표시)
     * }>
     */
    const [ranking, setRanking] = useState([]);

    /**
     * @state activeTab
     * 현재 선택된 랭킹 탭.
     * 'GLOBAL'  → 전체 랭킹 (모든 사용자 대상)
     * 'FRIENDS' → 친구 랭킹 (나의 글벗 목록 중 순위)
     * 탭이 바뀌면 useEffect 가 새 API 를 호출한다.
     */
    const [activeTab, setActiveTab] = useState('GLOBAL');

    /**
     * @state isLoading
     * API 응답을 기다리는 동안 true.
     * true 이면 "Calculating Rank..." 텍스트와 pulse 애니메이션 표시.
     * API 완료(성공/실패 모두) 후 false 로 전환.
     */
    const [isLoading, setIsLoading] = useState(true);

    /**
     * @useEffect 랭킹 데이터 로드
     * @trigger activeTab 이 변경될 때마다 실행 (deps: [activeTab])
     *          컴포넌트 최초 마운트 시에도 실행됨 (초기값 'GLOBAL')
     *
     * 동작:
     *   1. isLoading = true 로 전환 (로딩 UI 표시)
     *   2. activeTab 에 따라 분기:
     *      - 'GLOBAL'  → badgeService.getGlobalRanking()  호출
     *      - 'FRIENDS' → badgeService.getFriendsRanking() 호출
     *   3. 응답이 배열이면 setRanking(data), 아니면 setRanking([])
     *   4. 에러 시 콘솔 출력 + setRanking([])
     *   5. finally: isLoading = false (항상 로딩 해제)
     */
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                if (activeTab === 'GLOBAL') {
                    const data = await badgeService.getGlobalRanking();
                    setRanking(Array.isArray(data) ? data : []);
                } else {
                    const data = await badgeService.getFriendsRanking();
                    setRanking(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error('랭킹 로드 실패:', error);
                setRanking([]);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [activeTab]); // global, friends 탭이 바뀔 때마다 실행
    

    /**
     * @function renderContent
     * 랭킹 목록 영역의 내용을 상태에 따라 분기하여 반환하는 렌더 함수.
     *
     * 반환 경우:
     *   1. isLoading === true
     *      → "Calculating Rank..." 텍스트 (pulse 애니메이션)
     *
     *   2. ranking.length === 0 (데이터 없음)
     *      → "No Data Found" 텍스트
     *
     *   3. 정상 데이터
     *      → ranking 배열을 순서대로 렌더링:
     *        - idx=0 (1위): Crown 아이콘 (노란색)
     *        - idx>0     : 숫자 (idx+1)
     *        - 프로필 이미지 (rounded-xl)
     *        - 유저명 + LV.{level} (파란색)
     *        - 포인트: 10000 - idx * 100 pts
     */
    const renderContent = () => {
        // 로딩 중: 계산 중 메시지 표시
        if (isLoading) return <div className="p-20 text-center font-bold italic opacity-20 animate-pulse uppercase tracking-widest">Calculating Rank...</div>;

        // 데이터 없음: 빈 상태 메시지
        if (ranking.length === 0) return (
            <div className="p-20 text-center text-gray-400 font-bold italic uppercase tracking-widest">
                No Data Found
            </div>
        );

        // 정상 랭킹 목록 렌더링
        return (
            <div className="flex flex-col">
                {ranking.map((user, idx) => (
                    <div key={user.id} className="flex items-center justify-between px-6 py-4 border-b border-[#f3f3f3] dark:border-[#292e35]">
                        <div className="flex items-center gap-4">
                            {/* 순위 표시: 1위 = Crown 아이콘(노란색), 2위+ = 숫자 */}
                            <div className="w-6 text-[14px] font-black italic text-[#ccd3db]">
                                {idx + 1 === 1 ? <Crown size={18} className="text-yellow-400" /> : idx + 1}
                            </div>
                            {/* 프로필 이미지 */}
                            <img src={user?.profileImage} alt="p" className="w-10 h-10 rounded-xl border border-[#f3f3f3]" />
                            <div className="flex flex-col">
                                {/* 유저명 */}
                                <span className="font-bold text-[14px]">{user?.username}</span>
                                {/* 달개 레벨 (파란색) */}
                                <span className="text-[11px] text-blue-600 font-bold">LV.{user?.level || 1}</span>
                            </div>
                        </div>
                        {/* 포인트: 1위 = 10000pts, 순위마다 100pts 감소 */}
                        <div className="text-[12px] font-bold text-[#7b8b9e]">
                            {10000 - idx * 100} pts
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        // showTabs={false}: 하단 내비게이션 탭 숨김 (서브 페이지)
        <ResponsiveLayout showTabs={false}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5]">

                {/* ──────────────────────────────────────────────────────
                    Header (상단 내비게이션 바)
                    - 좌측: ArrowLeft 버튼 → navigate(-1) 뒤로가기
                    - 가운데: "달개 랭킹" 제목 (flex-1 + text-center)
                    sticky top-0 으로 스크롤 시에도 고정
                ────────────────────────────────────────────────────── */}
                <div className="flex items-center h-14 px-4 border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 bg-white dark:bg-[#1c1f24] z-10">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="flex-1 text-center font-bold text-[16px] mr-8">달개 랭킹</h1>
                </div>

                {/* ──────────────────────────────────────────────────────
                    탭 영역 (전체 랭킹 / 친구 랭킹)
                    - 각 탭 버튼이 flex-1 로 균등 분할
                    - 활성 탭: 검정 텍스트 + 하단 h-[2px] 검정 인디케이터
                    - 비활성 탭: 회색 텍스트 (#a3b0c1)
                    - 클릭 시 setActiveTab 을 통해 탭 전환 → useEffect 재실행
                ────────────────────────────────────────────────────── */}
                <div className="flex border-b border-[#f3f3f3] dark:border-[#292e35]">
                    {/* 전체 랭킹 탭 버튼 */}
                    <button
                        onClick={() => setActiveTab('GLOBAL')}
                        className={`flex-1 py-3 text-[14px] font-bold relative ${activeTab === 'GLOBAL' ? 'text-black' : 'text-[#a3b0c1]'}`}
                    >
                        전체 랭킹
                        {/* 활성 탭 하단 인디케이터 (검정 2px 라인) */}
                        {activeTab === 'GLOBAL' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />}
                    </button>
                    {/* 친구 랭킹 탭 버튼 */}
                    <button
                        onClick={() => setActiveTab('FRIENDS')}
                        className={`flex-1 py-3 text-[14px] font-bold relative ${activeTab === 'FRIENDS' ? 'text-black' : 'text-[#a3b0c1]'}`}
                    >
                        친구 랭킹
                        {/* 활성 탭 하단 인디케이터 (검정 2px 라인) */}
                        {activeTab === 'FRIENDS' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />}
                    </button>
                </div>

                {/* ──────────────────────────────────────────────────────
                    랭킹 목록 영역
                    renderContent() 함수가 현재 상태에 따라 3가지 중 하나를 반환:
                    1. 로딩 중  → "Calculating Rank..." 애니메이션
                    2. 빈 데이터 → "No Data Found"
                    3. 정상 데이터 → 순위 목록 (Crown or 숫자, 프로필, 이름, 점수)
                ────────────────────────────────────────────────────── */}
                {renderContent()}
            </div>
        </ResponsiveLayout>
    );
}
