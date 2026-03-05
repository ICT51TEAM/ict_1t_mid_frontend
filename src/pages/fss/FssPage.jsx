/**
 * @file FssPage.jsx
 * @route /finance
 *
 * @description
 * 금융감독원(FSS) 공시 데이터 조회 페이지.
 * 사용자가 날짜 범위(시작일~종료일)를 지정하면 백엔드 프록시를 통해
 * FSS API 를 호출하고, 조회된 공시 목록을 카드 형태로 나열한다.
 * 각 공시 항목을 클릭하면 금감원 원문 페이지가 새 탭으로 열린다.
 *
 * @layout
 * ┌─────────────────────────────────────────┐
 * │  [Hero Section]                         │
 * │    TrendingUp 아이콘                    │
 * │    "FINANCIAL SNAP" 제목               │
 * │    "Stay ahead of the market trend"    │
 * ├─────────────────────────────────────────┤
 * │  [Search Panel] (검정 배경 카드)        │
 * │    Landmark + "Select Timeline"         │
 * │    From: [날짜 입력] ~ To: [날짜 입력]  │
 * │    [FETCH INSIGHTS 버튼]                │
 * ├─────────────────────────────────────────┤
 * │  [Content Section]                      │
 * │    미검색: "Awaiting Query" 안내        │
 * │    로딩 중: Loader2 스피너              │
 * │    결과 있음: "Market Feed" 목록        │
 * │      각 항목: REPORT 태그 + 날짜        │
 * │               제목 + ExternalLink 버튼 │
 * │               FSS.GO.KR 출처 표시      │
 * │    결과 없음: "No Signals Found"        │
 * ├─────────────────────────────────────────┤
 * │  [Footer Insight]                       │
 * │    "ICT5 x SNAP x FSS" 서비스 설명     │
 * └─────────────────────────────────────────┘
 *
 * @state
 *   loading     - fetchData API 호출 중 여부. true 이면 버튼 비활성 + 스피너 표시
 *   isSearched  - 검색 버튼을 한 번이라도 눌렀는지 여부.
 *                 false 이면 "Awaiting Query" 초기 안내 화면을 표시.
 *                 true 이면 loading 또는 data 상태에 따라 분기.
 *   data        - FSS API 응답에서 파싱된 공시 항목 배열
 *                 [ { contentId|idx|fcnNo, subject|title|name, regDate|reg_date|createdAt,
 *                     originUrl|origin_url|link } ]
 *   startDate   - 검색 시작일 (YYYY-MM-DD 형식, date input 과 연결)
 *                 초기값: 오늘로부터 1달 전
 *   endDate     - 검색 종료일 (YYYY-MM-DD 형식, date input 과 연결)
 *                 초기값: 오늘
 *
 * @api
 *   fssService.fetchFssData(startDate, endDate)
 *   → GET /api/fss/list?startDate=YYYYMMDD&endDate=YYYYMMDD
 *   (백엔드가 날짜 포맷 변환을 처리하거나 프론트에서 '-' 제거 후 전달)
 *
 * @fssResponseStructure
 *   금감원 API 응답 구조 (의도적 오타 주의):
 *   {
 *     "reponse": {           ← "response" 가 아닌 "reponse" (금감원 API 원본 오타)
 *       "resultCode": "1",   ← "1", "000", "SUCCESS" 또는 없으면 성공으로 간주
 *       "result": [ ... ]    ← 실제 공시 데이터 배열
 *     }
 *   }
 *   파싱 로직:
 *     root = result.reponse ?? result  (reponse 키가 없으면 result 자체를 root 로 사용)
 *     isSuccess = code === '1' || '000' || 'SUCCESS' || !code
 *     list = root.result (배열) 또는 result 자체 (배열)
 *
 * @itemFieldFallback
 *   각 항목의 필드 이름은 FSS API 버전에 따라 다를 수 있어 OR 체인으로 처리:
 *   id    : item.contentId || item.idx || item.fcnNo || index
 *   title : item.subject || item.title || item.name || '공시 내용이 없습니다.'
 *   date  : item.regDate || item.reg_date || item.createdAt || '날짜 미상'
 *   url   : item.originUrl || item.origin_url || item.link || 'https://www.fss.or.kr'
 */
import React, { useState } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Landmark, Search, Calendar, ExternalLink, Loader2, Info, TrendingUp, Cpu } from 'lucide-react';
import { fssService } from '@/api/fssService';

export default function FssPage() {

    /**
     * @state loading
     * fetchData API 호출 진행 중 여부.
     * true 이면:
     *   - FETCH INSIGHTS 버튼이 disabled 상태 (중복 클릭 방지)
     *   - 버튼 아이콘이 Loader2 스피너로 전환
     *   - Content 영역에 대형 Loader2 + "Scanning Financial Data..." 표시
     * API 완료(성공/실패 모두) 후 false 로 전환됨 (finally)
     */
    const [loading, setLoading] = useState(false);

    /**
     * @state isSearched
     * 사용자가 FETCH INSIGHTS 버튼을 최소 1회 눌렀는지 여부.
     * false: Content 영역에 "Awaiting Query" 초기 안내 화면 표시
     * true : loading 또는 data 에 따라 스피너/목록/빈 상태 표시
     * fetchData 호출 시 즉시 true 로 전환됨
     */
    const [isSearched, setIsSearched] = useState(false);

    /**
     * @state data
     * FSS API 파싱 결과 배열.
     * 비어 있으면 "No Signals Found" 표시.
     * 각 항목 구조 (FSS API 필드명이 버전마다 다를 수 있어 fallback 처리):
     *   { contentId|idx|fcnNo: id,
     *     subject|title|name: 공시 제목,
     *     regDate|reg_date|createdAt: 등록일,
     *     originUrl|origin_url|link: 원문 링크 }
     */
    const [data, setData] = useState([]);

    // 오늘 날짜 계산 (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    // 한 달 전 날짜 계산 (초기 시작일)
    const aMonthAgo = new Date();
    aMonthAgo.setMonth(aMonthAgo.getMonth() - 1);
    const initialStartDate = aMonthAgo.toISOString().split('T')[0];

    /**
     * @state startDate
     * 검색 기간의 시작일. date input 과 연결됨.
     * 초기값: 오늘로부터 1달 전 (YYYY-MM-DD)
     * fetchData 호출 시 API 에 전달됨
     */
    const [startDate, setStartDate] = useState(initialStartDate);

    /**
     * @state endDate
     * 검색 기간의 종료일. date input 과 연결됨.
     * 초기값: 오늘 (YYYY-MM-DD)
     * fetchData 호출 시 API 에 전달됨
     */
    const [endDate, setEndDate] = useState(today);

    /**
     * @function fetchData
     * FSS 공시 데이터를 조회하는 메인 함수.
     * FETCH INSIGHTS 버튼의 onClick 에 연결됨.
     *
     * 동작 순서:
     *   1. loading = true, isSearched = true 로 전환
     *   2. fssService.fetchFssData(startDate, endDate) 호출
     *      → GET /api/fss/list?startDate=YYYYMMDD&endDate=YYYYMMDD
     *   3. 응답 파싱:
     *      a. root = result.reponse ?? result
     *         ('reponse' 는 금감원 API 의 의도적 오타)
     *      b. resultCode 확인: '1', '000', 'SUCCESS', 또는 빈값이면 성공
     *      c. 실패(errorMsg 있음): setData([]) 후 return
     *      d. 성공: root.result 배열 또는 result 배열을 setData 에 저장
     *   4. 에러(네트워크 등): setData([])
     *   5. finally: loading = false
     */
    const fetchData = async () => {
        // TODO: fssService.getFssList(startDate, endDate) 호출, 날짜형식 'YYYY-MM-DD'→'YYYYMMDD' 변환 필요
        // 힌트: [1] setLoading(true), setIsSearched(true) 먼저 호출
        //       [2] fssService.fetchFssData(startDate, endDate) 호출
        //       [3] 응답에서 root = result.reponse ?? result 로 파싱
        //           ('reponse'는 금감원 API의 의도적 오타)
        //       [4] resultCode가 '1', '000', 'SUCCESS' 또는 없으면 성공으로 처리
        //       [5] 성공 시 root.result 배열을 setData()에 저장
        //       [6] 에러 시 setData([])
        //       [7] finally에서 setLoading(false)
    };

    return (
        // showTabs={true}: 하단 내비게이션 탭 표시
        <ResponsiveLayout showTabs={true}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5] pb-20">

                {/* ──────────────────────────────────────────────────────
                    Hero Section (페이지 상단 히어로)
                    - TrendingUp 아이콘 (검정 박스, rotate-3 → hover 시 0)
                    - "FINANCIAL SNAP" 대형 이탤릭 제목
                    - "Stay ahead of the market trend" 서브텍스트
                ────────────────────────────────────────────────────── */}
                <div className="px-6 py-12 flex flex-col items-center border-b border-[#f3f3f3] dark:border-[#292e35] bg-[#fafafa] dark:bg-[#1c1f24]">
                    <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl transform rotate-3 hover:rotate-0 transition-all">
                        <TrendingUp size={32} />
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">FINANCIAL SNAP</h2>
                    <p className="text-[14px] text-[#a3b0c1] font-bold tracking-widest uppercase">Stay ahead of the market trend</p>
                </div>

                <div className="p-4">
                    {/* ──────────────────────────────────────────────────────
                        Search Panel (날짜 범위 선택 + 검색 버튼)
                        - 검정 배경 카드 (bg-black)
                        - 우측 상단에 Cpu 아이콘 워터마크 (opacity-10)
                        - Landmark 아이콘 + "Select Timeline" 헤더
                        - From/To 날짜 입력:
                            startDate ↔ From date input (onChange: setStartDate)
                            endDate   ↔ To   date input (onChange: setEndDate)
                        - FETCH INSIGHTS 버튼:
                            onClick: fetchData()
                            disabled: loading === true (중복 호출 방지)
                            loading 중 → Loader2 스피너, 아니면 Search 아이콘
                    ────────────────────────────────────────────────────── */}
                    <div className="bg-black text-white p-8 rounded-[24px] mb-8 shadow-2xl relative overflow-hidden">
                        {/* Cpu 워터마크 (우측 상단 반투명) */}
                        <div className="absolute top-[-20%] right-[-10%] opacity-10">
                            <Cpu size={180} />
                        </div>

                        {/* 패널 헤더: Landmark 아이콘 + "Select Timeline" */}
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                <Landmark size={18} />
                            </div>
                            <h2 className="text-[18px] font-black italic tracking-widest uppercase">Select Timeline</h2>
                        </div>

                        <div className="flex flex-col gap-4 relative z-10">
                            {/* 날짜 범위 입력 (From ~ To) */}
                            <div className="flex gap-4 items-center">
                                {/* 시작일 입력 (startDate 상태 연결) */}
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 ml-1">From</p>
                                    <input
                                        type="date"
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-[13px] font-black italic tracking-widest outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                {/* 구분자 */}
                                <div className="text-gray-600 mt-5 font-bold">~</div>
                                {/* 종료일 입력 (endDate 상태 연결) */}
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 ml-1">To</p>
                                    <input
                                        type="date"
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-[13px] font-black italic tracking-widest outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            {/* FETCH INSIGHTS 버튼
                                loading 중: Loader2 스피너 표시 + 버튼 비활성
                                대기 중:    Search 아이콘 표시 */}
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="w-full h-14 bg-white dark:bg-[#292e35] text-black dark:text-[#e5e5e5] font-black italic tracking-[2px] text-[15px] rounded-xl mt-4 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={22} />}
                                FETCH INSIGHTS
                            </button>
                        </div>
                    </div>

                    {/* ──────────────────────────────────────────────────────
                        Content Section (검색 결과 영역)
                        isSearched / loading / data 에 따라 4가지 상태 표시:

                        [1] isSearched === false (아직 검색 안 함)
                            → 원형 점선 Search 아이콘 + "Awaiting Query" 텍스트

                        [2] isSearched === true AND loading === true (로딩 중)
                            → 대형 Loader2 스피너 + "Scanning Financial Data..."

                        [3] isSearched === true AND loading === false AND data.length > 0 (결과 있음)
                            → "Market Feed" 헤더 + {data.length} UPDATES 카운트
                            → 각 공시 항목 카드:
                               - "REPORT" 태그 + 등록일
                               - 공시 제목 (hover 시 파란색)
                               - ExternalLink 버튼 (원형)
                               - 출처 "FSS.GO.KR" (녹색 점 + 텍스트)
                               - 클릭 시 window.open(url, '_blank') 로 원문 새 탭 열기

                        [4] isSearched === true AND loading === false AND data.length === 0 (결과 없음)
                            → Info 아이콘 + "No Signals Found"
                    ────────────────────────────────────────────────────── */}
                    <div className="px-2">
                        {!isSearched ? (
                            /* [1] 초기 안내 화면 */
                            <div className="py-24 flex flex-col items-center text-[#ccd3db] gap-4">
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#ccd3db] flex items-center justify-center">
                                    <Search size={28} />
                                </div>
                                <div className="text-center">
                                    <p className="text-[14px] font-black italic tracking-widest uppercase">Awaiting Query</p>
                                    <p className="text-[11px] font-bold text-[#ccd3db] uppercase mt-1">Select dates to begin discovery</p>
                                </div>
                            </div>
                        ) : loading ? (
                            /* [2] 로딩 중 */
                            <div className="py-24 flex flex-col items-center text-black dark:text-[#e5e5e5] gap-4">
                                <Loader2 size={40} className="animate-spin text-black dark:text-[#e5e5e5]" />
                                <p className="text-[13px] font-black italic tracking-widest uppercase animate-pulse">Scanning Financial Data...</p>
                            </div>
                        ) : data.length > 0 ? (
                            /* [3] 결과 목록 */
                            <div className="flex flex-col divide-y divide-[#f3f3f3]">
                                {/* 결과 헤더: "Market Feed" + 건수 */}
                                <div className="pb-4 flex items-center justify-between border-b-2 border-black">
                                    <span className="text-[12px] font-black italic tracking-widest uppercase">Market Feed</span>
                                    <span className="text-[10px] font-bold text-[#ccd3db] uppercase tracking-[1px]">{data.length} UPDATES</span>
                                </div>

                                {/* 각 공시 항목 카드 */}
                                {data.map((item, index) => {
                                    // 필드명 fallback 처리 (FSS API 버전마다 키 이름 다름)
                                    const id    = item.contentId || item.idx || item.fcnNo || index;
                                    const title = item.subject || item.title || item.name || '공시 내용이 없습니다.';
                                    const date  = item.regDate || item.reg_date || item.createdAt || '날짜 미상';
                                    const url   = item.originUrl || item.origin_url || item.link || 'https://www.fss.or.kr';

                                    return (
                                        <div
                                            key={id}
                                            className="py-8 flex flex-col gap-3 cursor-pointer group hover:bg-[#fafafa] dark:hover:bg-[#1c1f24] transition-all px-2 -mx-2 rounded-xl"
                                            onClick={() => window.open(url, '_blank')} // 원문 새 탭 열기
                                        >
                                            {/* 항목 상단: REPORT 태그 + 날짜 */}
                                            <div className="flex items-center gap-3">
                                                <div className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black italic tracking-tighter uppercase rounded">REPORT</div>
                                                <div className="flex items-center gap-1.5 text-[#ccd3db]">
                                                    <Calendar size={12} />
                                                    <span className="text-[11px] font-bold tracking-widest uppercase">{date}</span>
                                                </div>
                                            </div>
                                            {/* 공시 제목 + ExternalLink 버튼 */}
                                            <div className="flex justify-between items-start gap-4">
                                                {/* hover 시 파란색으로 전환 */}
                                                <h3 className="font-black italic text-[18px] tracking-tighter uppercase leading-[1.2] text-[#111] dark:text-[#e5e5e5] group-hover:text-blue-600 transition-colors">
                                                    {title}
                                                </h3>
                                                {/* 외부 링크 아이콘 버튼 (hover 시 검정 테두리) */}
                                                <div className="w-10 h-10 rounded-full border border-[#f3f3f3] flex items-center justify-center text-[#ccd3db] group-hover:border-black group-hover:text-black transition-all shrink-0 translate-y-[-5px]">
                                                    <ExternalLink size={16} />
                                                </div>
                                            </div>
                                            {/* 출처 표시 */}
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                <span className="text-[11px] font-bold text-[#a3b0c1] uppercase">Authenticated Source: FSS.GO.KR</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* [4] 결과 없음 */
                            <div className="py-24 flex flex-col items-center text-[#ccd3db] gap-4">
                                <Info size={40} />
                                <p className="text-[14px] font-black italic tracking-widest uppercase">No Signals Found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────
                    Footer Insight
                    페이지 최하단 서비스 설명 카드.
                    "ICT5 x SNAP x FSS" 레이블
                    "금융감독원 공시 데이터를 바탕으로 실시간 마켓 트렌드를 분석합니다."
                ────────────────────────────────────────────────────── */}
                <div className="mx-6 p-8 bg-[#f9f9f9] dark:bg-[#1c1f24] rounded-[24px] border border-[#f3f3f3] dark:border-[#292e35] text-center mt-6">
                    <p className="text-[10px] font-black italic tracking-[3px] uppercase text-[#ccd3db] mb-2 leading-relaxed">ICT5 x SNAP x FSS</p>
                    <p className="text-[12px] font-medium text-[#7b8b9e] max-w-[280px] mx-auto">금융감독원 공시 데이터를 바탕으로 실시간 마켓 트렌드를 분석합니다.</p>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
