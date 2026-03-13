/**
 * @file BadgesPage.jsx
 * @route /badges
 *
 * @description
 * 달개(배지) 메인 페이지.
 * 현재 로그인한 사용자의 달개 통계와 전체 글에 부여된 달개 통계를 보여준다.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Trophy, Crown, HelpCircle, BarChart3 } from 'lucide-react';
import { badgeService } from '@/api/badgeService';
import BadgeInfoModal from '@/components/badges/BadgeInfoModal';

/* ── 수직 바 차트 카드 ── */
function BarChartCard({ title, total, badges, barColor }) {
    // 가장 큰 값 기준으로 비율 계산 (최소 1 방지)
    const maxCount = Math.max(...badges.map(b => b.count), 1);

    return (
        <div className="bg-white dark:bg-[#1c1f24] border border-[#f3f3f3] dark:border-[#292e35] rounded-[24px] p-5 shadow-sm">
            {/* 제목 */}
            <span className="text-[11px] font-black italic tracking-widest uppercase dark:text-white block mb-1">
                {title}
            </span>
            {/* 총 개수 */}
            <span className="text-[10px] font-bold text-gray-400 block mb-4">
                {total}개
            </span>

            {badges.length > 0 ? (
                <div className="flex items-end justify-around gap-2" style={{ height: '140px' }}>
                    {badges.map(badge => {
                        // 최소 4% 높이를 줘서 0개여도 바가 살짝 보이게
                        const heightPercent = Math.max((badge.count / maxCount) * 100, 4);
                        return (
                            <div key={badge.id} className="flex flex-col items-center gap-1.5 flex-1 h-full">
                                {/* 숫자 */}
                                <span className="text-[10px] font-bold text-gray-400">{badge.count}</span>
                                {/* 바 배경 */}
                                <div className="w-full max-w-[32px] bg-[#f3f3f3] dark:bg-[#292e35] rounded-t-lg flex-1 flex flex-col justify-end overflow-hidden">
                                    {/* 채워지는 바 (아래→위) */}
                                    <div className={`w-full ${barColor} rounded-t-lg transition-all duration-700`} style={{ height: `${heightPercent}%` }} />
                                </div>
                                {/* 이모지 */}
                                <span className="text-lg">{badge.emoji}</span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex items-center justify-center text-gray-400 text-[11px] font-bold italic uppercase opacity-30 h-[140px]">
                    No badges
                </div>
            )}
        </div>
    );
}

/* ── 비교 카드 1개 ── */
function CompareCard({ emoji, name, myCount, globalCount }) {
    const percentage = globalCount > 0
        ? ((myCount / globalCount) * 100).toFixed(3)
        : '0.000';

    return (
        <div className="bg-white dark:bg-[#101215] rounded-2xl p-4 border border-[#f3f3f3] dark:border-[#292e35] flex flex-col items-center text-center">
            <span className="text-3xl mb-2">{emoji}</span>
            <span className="text-[10px] font-black italic tracking-tighter uppercase dark:text-white mb-1">{name}</span>
            <span className="text-[20px] font-black italic tracking-tighter text-black dark:text-white">{percentage}%</span>
            <span className="text-[9px] font-bold text-gray-400 mt-0.5">{myCount} / {globalCount}</span>
        </div>
    );
}

/* ── 메인 페이지 ── */
export default function BadgesPage() {
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [globalStats, setGlobalStats] = useState(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    // 마운트 시 내 통계 + 전체 통계 동시 로드
    useEffect(() => {
        const load = async () => {
            const [myStats, gStats] = await Promise.all([
                badgeService.getMyStats(),
                badgeService.getGlobalStats()
            ]);
            setStats(myStats);
            setGlobalStats(gStats);
        };
        load();
    }, []);

    // 로딩 중
    if (!stats || !globalStats) {
        return (
            <ResponsiveLayout showTabs={false}>
                <div className="p-10 text-center">loading...</div>
            </ResponsiveLayout>
        );
    }

    // 레벨 진행도 계산
    const totalBadges = stats.totalBadges || 0;
    const level = stats.level || 1;
    const progressPercent = Math.min(((totalBadges % 5) / 5) * 100, 100);

    // 내 달개 vs 전체 달개 비교 여부
    const myBadges = stats.recentBadges || [];
    const allBadges = globalStats.recentBadges || [];
    const showComparison = myBadges.length > 0 && allBadges.length > 0;

    return (
        <ResponsiveLayout showTabs={true}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5] pb-20">

                {/* ── Hero Section ── */}
                <div className="px-6 py-12 flex flex-col items-center bg-black text-white relative overflow-hidden">
                    {/* 배경 장식 */}
                    <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12">
                        <Trophy size={200} />
                    </div>

                    <div className="z-10 flex flex-col items-center text-center">
                        <div className="flex items-center gap-2 mb-4">
                            <Crown className="text-yellow-400" size={24} />
                            <span className="text-[12px] font-black tracking-[4px] uppercase text-yellow-400">Prime Member</span>
                        </div>

                        <h2 className="text-5xl font-black italic tracking-tighter uppercase mb-2">LV.{level}</h2>
                        <p className="text-[14px] text-gray-400 font-bold tracking-widest uppercase mb-8">Your Influence Power</p>

                        {/* 프로그레스 바 */}
                        <div className="w-[280px] h-[4px] bg-white/10 rounded-full overflow-hidden mb-3">
                            <div
                                className="h-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        <div className="flex justify-between w-[280px] text-[10px] font-black italic tracking-widest uppercase text-gray-500">
                            <span>{totalBadges} Badges</span>
                            <span>Next: {level * 5} Badges</span>
                        </div>
                    </div>

                    {/* 버튼 영역 */}
                    <div className="flex items-center gap-3 mt-10 z-10">
                        <button
                            onClick={() => navigate('/badges/ranking')}
                            className="flex items-center gap-2 px-6 py-2 bg-white/10 border border-white/20 rounded-full text-[12px] font-black italic tracking-widest uppercase hover:bg-white/20 transition-all"
                        >
                            <Trophy size={14} /> Global Ranking
                        </button>
                        <button
                            onClick={() => setIsInfoModalOpen(true)}
                            className="w-10 h-10 flex items-center justify-center bg-white/10 border border-white/20 rounded-full text-white hover:bg-white/20 transition-all"
                        >
                            <HelpCircle size={20} />
                        </button>
                    </div>
                </div>

                {/* ── 통계 대시보드 ── */}
                <div className="p-6 space-y-8">

                    {/* 섹션 헤더 */}
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black italic tracking-tighter uppercase leading-none dark:text-white">Dalgae Statistics</h3>
                            <p className="text-[11px] font-bold text-[#ccd3db] dark:text-gray-500 uppercase tracking-widest mt-1">Badge analytics overview</p>
                        </div>
                    </div>

                    {/* 차트 2개 나란히 */}
                    <div className="grid grid-cols-2 gap-4">
                        <BarChartCard
                            title="My Dalgae"
                            total={totalBadges}
                            badges={myBadges}
                            barColor="bg-yellow-400"
                        />
                        <BarChartCard
                            title="All Dalgae"
                            total={globalStats.totalBadges || 0}
                            badges={allBadges}
                            barColor="bg-blue-500"
                        />
                    </div>

                    {/* My vs Global 비교 */}
                    {showComparison && (
                        <div className="bg-[#fafafa] dark:bg-[#1c1f24] border border-[#f3f3f3] dark:border-[#292e35] rounded-[24px] p-6">
                            <span className="text-[12px] font-black italic tracking-widest uppercase dark:text-white block mb-5">My vs Global</span>
                            <div className="grid grid-cols-2 gap-3">
                                {myBadges.map(myBadge => {
                                    const globalBadge = allBadges.find(g => g.name === myBadge.name);
                                    return (
                                        <CompareCard
                                            key={myBadge.id}
                                            emoji={myBadge.emoji}
                                            name={myBadge.name}
                                            myCount={myBadge.count}
                                            globalCount={globalBadge?.count || 0}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <BadgeInfoModal
                isOpen={isInfoModalOpen}
                onClose={() => setIsInfoModalOpen(false)}
            />
        </ResponsiveLayout>
    );
}
