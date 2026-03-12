/**
 * @file BadgesPage.jsx
 * @route /badges
 *
 * @description
 * 달개(배지) 메인 페이지.
 * 현재 로그인한 사용자의 달개 통계(레벨, 총 달개 수, 최근 달개 목록)를 보여주고,
 * 전체 달개 카탈로그(모든 달개 유형)를 하단에 나열한다.
 *
 * @layout
 * ┌─────────────────────────────────────────┐
 * │  [Hero Section]                         │
 * │    Crown 아이콘 + "Prime Member"         │
 * │    LV.{level} 대형 텍스트               │
 * │    레벨 진행 바 (progress bar)           │
 * │    [Global Ranking] 버튼 + [?] 버튼     │
 * ├─────────────────────────────────────────┤
 * │  [Sub Header]                           │
 * │    "My Collection" / "Musinsa Awards"   │
 * ├─────────────────────────────────────────┤
 * │  [My Badges Grid]                       │
 * │    stats.recentBadges 를 4열 그리드로   │
 * │    각 뱃지: emoji + 이름 + ×count       │
 * ├─────────────────────────────────────────┤
 * │  [Badge Catalog]                        │
 * │    allTypes 목록을 1~2열 카드로 표시    │
 * │    각 카드: emoji + 카테고리 + 설명     │
 * └─────────────────────────────────────────┘
 *
 * @state
 *   stats          - 서버에서 받은 내 달개 통계 객체 (null이면 로딩 중)
 *                    { level: number, totalBadges: number, recentBadges: BadgeItem[] }
 *   allTypes       - 전체 달개 유형 배열. 달개 카탈로그 표시에 사용
 *                    [ { id, emoji, category, title, description } ]
 *   isInfoModalOpen - BadgeInfoModal 표시 여부 (true = 모달 열림)
 *
 * @levelCalculation
 *   level = Math.floor(totalBadges / 5) + 1
 *   progress(%) = ((totalBadges % 5) / 5) * 100
 *   예: 달개 7개 → LV.2, 진행도 40%
 *
 * @api
 *   badgeService.getMyStats()    → GET /api/badges/my-stats
 *   badgeService.getAllTypes()   → GET /api/badges/types
 *   두 호출은 병렬(Promise.all 아닌 순차)로 실행되지만 같은 async 블록 안에 있음
 *
 * @navigation
 *   /badges/ranking → 글로벌 랭킹 페이지 이동
 *   BadgeInfoModal  → 달개 안내 모달 열기 (HelpCircle 버튼)
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Trophy, Crown, Zap, Target, HelpCircle } from 'lucide-react';
import { badgeService } from '@/api/badgeService';
import BadgeInfoModal from '@/components/badges/BadgeInfoModal';

export default function BadgesPage() {
    const navigate = useNavigate();

    /**
     * @state stats
     * 백엔드에서 받아온 내 달개 통계 객체.
     * null 이면 아직 데이터를 불러오는 중 → 로딩 화면을 표시한다.
     * 구조: {
     *   level: number,          // Math.floor(totalBadges / 5) + 1 으로 계산된 레벨
     *   totalBadges: number,    // 내가 보유한 달개 총 개수
     *   recentBadges: Array<{   // 최근 획득 달개 목록 (My Collection 그리드에 표시)
     *     id: string|number,
     *     emoji: string,        // 달개를 상징하는 이모지
     *     name: string,         // 달개 이름
     *     count: number         // 같은 종류의 달개를 몇 개 보유했는지
     *   }>
     * }
     */
    const [stats, setStats] = useState(null);

    /**
     * @state allTypes
     * 서버에서 받아온 전체 달개 유형 목록 (Badge Catalog).
     * 이 앱에서 획득 가능한 모든 달개 종류를 설명하는 카드 목록으로 표시한다.
     * 구조: Array<{
     *   id: string|number,
     *   emoji: string,        // 달개 대표 이모지
     *   category: string,     // 달개 카테고리 레이블 (예: "STYLE", "SOCIAL")
     *   title: string,        // 달개 제목
     *   description: string   // 달개 획득 조건 설명
     * }>
     */
    const [allTypes, setAllTypes] = useState([]);

    /**
     * @state isInfoModalOpen
     * BadgeInfoModal 표시 여부를 제어하는 플래그.
     * Hero 섹션의 HelpCircle(?) 버튼을 클릭하면 true 로 전환되어 모달이 열린다.
     * 모달의 onClose 콜백에서 다시 false 로 전환된다.
     */
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    /**
     * @useEffect 데이터 초기 로드
     * @trigger 컴포넌트 최초 마운트 시 1회 실행 (deps: [])
     *
     * 동작:
     *   1. badgeService.getMyStats() 호출 → 내 달개 통계(level, totalBadges, recentBadges) 수신
     *   2. badgeService.getAllTypes() 호출 → 전체 달개 유형 목록 수신
     *   3. 각각 setStats, setAllTypes 로 상태 저장
     *
     * 로딩 처리:
     *   stats 가 null 이면 컴포넌트는 "loading..." 화면을 렌더링한다.
     *   두 API 가 모두 완료되면 stats 가 설정되어 메인 UI가 렌더링된다.
     */
    useEffect(() => {
        // TODO: badgeService.getMyStats() 호출 → setStats(s)
        // TODO: badgeService.getAllTypes() 호출 → setAllTypes(t)
        // 힌트: async 함수(load) 내부에서 순차적으로 두 API 호출 후 load() 실행
        const load = async () => {
            const stats = await badgeService.getMyStats();
            const allTypes = await badgeService.getAllTypes();
            console.log('[badge] stats:', stats, '/ allTypes:', allTypes?.length, '개');
            setStats(stats);
            setAllTypes(allTypes);
        };
        load();
    }, []);

    // stats가 null이면 아직 데이터 로딩 중 → 로딩 텍스트만 표시
    if (!stats) return <ResponsiveLayout showTabs={false}><div className="p-10 text-center">loading...</div></ResponsiveLayout>;

    return (
        // showTabs={true} : 하단 내비게이션 탭 표시
        <ResponsiveLayout showTabs={true}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5] pb-20">

                {/* ──────────────────────────────────────────────────────
                    Hero Section
                    배경 검정, 텍스트 흰색의 전면 히어로 영역.
                    Trophy 아이콘이 우측 상단에 반투명 워터마크로 배치됨.

                    표시 내용:
                    - Crown 아이콘 + "Prime Member" 레이블
                    - 현재 레벨: LV.{stats.level}  (대형 이탤릭 폰트)
                    - "Your Influence Power" 서브텍스트
                    - 레벨 진행 바:
                        너비 = ((totalBadges % 5) / 5) * 100 %
                        (5개 달개마다 레벨 업)
                    - "{totalBadges} Badges" + "Next: {level * 5} Badges" 텍스트
                    - [Global Ranking] 버튼 → /badges/ranking 로 이동
                    - [?] 버튼 (HelpCircle) → isInfoModalOpen = true (모달 열기)
                ────────────────────────────────────────────────────── */}
                <div className="px-6 py-12 flex flex-col items-center bg-black text-white relative overflow-hidden">
                    {/* 배경 장식용 Trophy 아이콘 (우측 상단, 반투명 10%) */}
                    <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12">
                        <Trophy size={200} />
                    </div>

                    <div className="z-10 flex flex-col items-center text-center">
                        {/* Crown 아이콘 + "Prime Member" 배지 레이블 */}
                        <div className="flex items-center gap-2 mb-4">
                            <Crown className="text-yellow-400" size={24} />
                            <span className="text-[12px] font-black tracking-[4px] uppercase text-yellow-400">Prime Member</span>
                        </div>

                        {/* 현재 레벨 표시 (stats.level, 기본값 0) */}
                        <h2 className="text-5xl font-black italic tracking-tighter uppercase mb-2">LV.{stats?.level || 0}</h2>
                        <p className="text-[14px] text-gray-400 font-bold tracking-widest uppercase mb-8">Your Influence Power</p>

                        {/* 레벨 진행 바
                            - 전체 너비 280px, 높이 4px
                            - 채워진 비율 = (totalBadges % 5) / 5 * 100
                              예: 달개 7개 → (7 % 5) / 5 * 100 = 40%
                            - 노란색(yellow-400) 글로우 효과 적용 */}
                        <div className="w-[280px] h-[4px] bg-white/10 rounded-full overflow-hidden mb-3">
                            <div className="h-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" style={{ width: `${Math.min((((stats?.totalBadges || 0) % 5) / 5) * 100, 100)}%` }}></div>
                        </div>

                        {/* 진행 바 하단 텍스트: 현재 달개 수 / 다음 레벨 달개 수 */}
                        <div className="flex justify-between w-[280px] text-[10px] font-black italic tracking-widest uppercase text-gray-500">
                            <span>{stats?.totalBadges || 0} Badges</span>
                            <span>Next: {(stats?.level || 1) * 5} Badges</span>
                        </div>
                    </div>

                    {/* Hero 하단 버튼 영역 */}
                    <div className="flex items-center gap-3 mt-10 z-10">
                        {/* [Global Ranking] 버튼 → /badges/ranking 페이지로 이동 */}
                        <button
                            onClick={() => navigate('/badges/ranking')}
                            className="flex items-center gap-2 px-6 py-2 bg-white/10 border border-white/20 rounded-full text-[12px] font-black italic tracking-widest uppercase hover:bg-white/20 transition-all"
                        >
                            <Trophy size={14} /> 전체 통계 보기
                        </button>

                        {/* [?] 버튼 → BadgeInfoModal 열기 (isInfoModalOpen = true) */}
                        <button
                            onClick={() => setIsInfoModalOpen(true)}
                            className="w-10 h-10 flex items-center justify-center bg-white/10 border border-white/20 rounded-full text-white hover:bg-white/20 transition-all"
                        >
                            <HelpCircle size={20} />
                        </button>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────
                    Sub Header
                    Hero 와 My Collection 사이의 구분 헤더.
                    좌측: Zap 아이콘 + "My Collection" 텍스트
                    우측: "Musinsa Awards" 서브텍스트
                ────────────────────────────────────────────────────── */}
                <div className="flex bg-[#fafafa] dark:bg-[#1c1f24] border-b border-[#f3f3f3] dark:border-[#292e35] py-4 px-6 justify-between items-center transition-colors">
                    <div className="flex items-center gap-2">
                        <Zap size={18} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-[12px] font-black italic tracking-widest uppercase dark:text-white">나의 달개들</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#ccd3db] dark:text-gray-500 uppercase tracking-[2px]">MyMoRy Awards</span>
                </div>

                {/* ──────────────────────────────────────────────────────
                    My Badges Grid (내 달개 컬렉션)
                    stats.recentBadges 배열을 4열(모바일) / 8열(데스크톱) 그리드로 표시.

                    각 달개 아이템:
                    - 정사각형 박스 안에 emoji (hover 시 125% scale)
                    - 달개 name (최대 1줄)
                    - ×{count} 보유 수량

                    달개가 없을 때:
                    - "No recent badges" 텍스트를 가운데 표시
                ────────────────────────────────────────────────────── */}
                <div className="p-6 dark:bg-[#101215]">
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-5">
                        {stats?.recentBadges?.length > 0 ? (
                            stats.recentBadges.map(badge => (
                                <div key={badge.id} className="flex flex-col items-center group cursor-pointer">
                                    {/* 달개 이모지 박스 (hover 시 검정 테두리) */}
                                    <div className="w-16 h-16 rounded-[18px] bg-[#f3f3f3] dark:bg-[#1c1f24] flex items-center justify-center border-2 border-transparent group-hover:border-black dark:group-hover:border-white transition-all shadow-sm">
                                        <span className="text-3xl group-hover:scale-125 transition-transform">{badge.emoji}</span>
                                    </div>
                                    {/* 달개 이름 (1줄 말줄임) */}
                                    <span className="mt-2 text-[10px] font-black italic tracking-tighter uppercase text-center line-clamp-1 dark:text-white">{badge.name}</span>
                                    {/* 보유 수량 */}
                                    <span className="text-[10px] font-bold text-[#a3b0c1]">×{badge.count}</span>
                                </div>
                            ))
                        ) : (
                            /* 달개가 없을 때 빈 상태 메시지 */
                            <div className="col-span-full py-10 text-center text-gray-400 text-[12px] font-bold italic tracking-widest uppercase opacity-30">
                                No recent badges
                            </div>
                        )}
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────
                    Badge Catalog (전체 달개 카탈로그)
                    allTypes 배열을 1열(모바일) / 2열(데스크톱) 카드 그리드로 표시.

                    섹션 헤더:
                    - 검정 배경의 Target 아이콘
                    - "Badge Catalog" 제목
                    - "Unlock your potential" 서브텍스트

                    각 카드:
                    - 좌측: emoji 이미지 박스 (hover 시 scale 110%)
                    - 우측:
                        - {type.category} 카테고리 (파란색 소문자)
                        - {type.title} 달개 이름 (대형 이탤릭)
                        - {type.description} 달개 획득 조건 설명
                    - 카드 전체 hover 시 검정 테두리 + 그림자
                ────────────────────────────────────────────────────── */}
                <div className="mt-10 px-6 pb-20 dark:bg-[#101215]">
                    {/* 섹션 헤더 */}
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center">
                            <Target size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black italic tracking-tighter uppercase leading-none dark:text-white">Badge Catalog</h3>
                            <p className="text-[11px] font-bold text-[#ccd3db] dark:text-gray-500 uppercase tracking-widest mt-1">Unlock your potential</p>
                        </div>
                    </div>

                    {/* 달개 유형 카드 그리드 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allTypes.map(type => (
                            <div key={type.id} className="bg-white dark:bg-[#1c1f24] p-5 rounded-[16px] flex items-center gap-5 border border-[#f3f3f3] dark:border-[#292e35] hover:border-black dark:hover:border-white transition-all cursor-pointer group shadow-sm hover:shadow-md">
                                {/* 달개 이모지 박스 (hover 시 scale 110%) */}
                                <div className="w-16 h-16 bg-[#f9f9f9] dark:bg-[#101215] rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <span className="text-3xl">{type.emoji}</span>
                                </div>
                                {/* 달개 정보 (카테고리, 제목, 설명) */}
                                <div className="flex flex-col flex-1">
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black italic tracking-widest uppercase mb-1">{type.category}</span>
                                    <span className="text-[16px] font-black italic tracking-tighter uppercase text-black dark:text-white leading-tight mb-1">{type.title}</span>
                                    <p className="text-[12px] text-[#7b8b9e] dark:text-gray-400 font-medium leading-relaxed">{type.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ──────────────────────────────────────────────────────
                BadgeInfoModal
                isInfoModalOpen 이 true 일 때 렌더링되는 달개 안내 모달.
                props:
                  isOpen   : isInfoModalOpen 상태값 전달
                  onClose  : 모달 닫기 콜백 → setIsInfoModalOpen(false)
            ────────────────────────────────────────────────────── */}
            <BadgeInfoModal
                isOpen={isInfoModalOpen}
                onClose={() => setIsInfoModalOpen(false)}
            />
        </ResponsiveLayout>
    );
}
