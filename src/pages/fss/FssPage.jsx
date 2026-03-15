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
 * │    TrendingUp 아이콘                     │
 * │    "FINANCIAL SNAP" 제목                │
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
import { useAlert } from '@/context/AlertContext';

export default function FssPage() {

    /**
     * @state loading
     */
    const [loading, setLoading] = useState(false);

    /**
     * @state isSearched
     */
    const [isSearched, setIsSearched] = useState(false);

    /**
     * @state data
     */
    const [data, setData] = useState([]);

    /**
     * @state startDate
     */
    // 오늘 날짜 계산 (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    // 한 달 전 날짜 계산 (초기 시작일)
    const aMonthAgo = new Date();
    aMonthAgo.setMonth(aMonthAgo.getMonth() - 1);
    const initialStartDate = aMonthAgo.toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(initialStartDate);

    /**
     * @state endDate
     */
    const [endDate, setEndDate] = useState(today);
    const { showAlert } = useAlert();



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
        //1. 상태 초기화
        setLoading(true);
        setIsSearched(true);

        try {
            //2. 날짜 형식 변환
            const formmatedStartDate = startDate.replace(/-/g, '');
            const formmatedEndDate = endDate.replace(/-/g, '');
            //3. API 호출
            const result = await fssService.fetchFssData(formmatedStartDate, formmatedEndDate);
            console.log("1. 서버 원본 응답:", result);
            //4. 응답 확인 및 파싱
            const root = (result && result.reponse) ? result.reponse : result;
            console.log("2. 파싱된 root 데이터:", root);
            //5. 결과 코드 확인
            const successCode = ['1', '000', 'SUCCESS']
            const isSuccess = root && (!root.resultCode || successCode.includes(root.resultCode));
            //6. 성공시 처리
            if (isSuccess && (root.result || Array.isArray(result))) {
                const list = result?.reponse?.result || result?.result || (Array.isArray(result) ? result : []);
                console.log("3. 최종 저장될 list:", list);
                setData(list);
            }
            else {
                if (root?.errorMsg) {
                    console.log('FSS API error', root.errorMsg);
                }
                setData([]);
            }
        }
        // 7. 에러 처리
        catch (err) {
            console.log('상세 에러', err);
            setData([]);

            const serverError = err.response?.data;
            const errorMsg = (typeof serverError === 'string' ? serverError : serverError?.message)
                || '데이터 조회 중 문제가 발생했습니다.';

            showAlert(errorMsg, '데이터 조회 실패', 'alert');
        }

        //8. 로딩 종료
        finally {
            setLoading(false); // 로딩 종료

        }
    };

    return (
        <ResponsiveLayout showTabs={true}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5] pb-20">

                {/* ──────────────────────────────────────────────────────
                    Hero Section
                ────────────────────────────────────────────────────── */}
                <div className="px-6 py-12 flex flex-col items-center border-b border-[#f3f3f3] dark:border-[#292e35] bg-[#fafafa] dark:bg-[#1c1f24]">
                    <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl transform rotate-3 hover:rotate-0 transition-all">
                        <TrendingUp size={32} />
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">금융감독원 뉴스레터</h2>
                    <p className="text-[14px] text-[#a3b0c1] font-bold tracking-widest uppercase">새로운 소식을 뉴스레터로 확인하세요</p>
                </div>

                <div className="p-4">
                    {/* ──────────────────────────────────────────────────────
                        Search Panel (날짜 범위 선택 + 검색 버튼)
                    ────────────────────────────────────────────────────── */}
                    <div className="bg-black text-white p-8 rounded-[24px] mb-8 shadow-2xl relative overflow-hidden">
                        {/* Cpu 워터마크 */}
                        <div className="absolute top-[-20%] right-[-10%] opacity-10">
                            <Cpu size={180} />
                        </div>

                        {/* 패널 헤더 */}
                        <div className="flex flex-col gap-4 relative z-10 mb-6">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                <Landmark size={18} />
                            </div>
                            <h2 className="text-[18px] font-black italic tracking-widest uppercase">검색 기간 설정</h2>
                        </div>

                        {/* 수정된 핵심 영역: 계단식 정렬 적용 */}
                        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end relative z-10">

                            {/* 시작일 입력 */}
                            <div className="flex-1">
                                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 ml-1">시작 날짜</p>
                                <input
                                    type="date"
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-[13px] font-black italic tracking-widest outline-none focus:border-white/40 focus:bg-white/10 transition-all text-white"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            {/* 가로 모드일 때만 보이는 구분자 */}
                            <div className="hidden sm:block text-gray-600 mb-3 font-bold">~</div>

                            {/* 종료일 입력 */}
                            <div className="flex-1">
                                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 ml-1">마지막 날짜</p>
                                <input
                                    type="date"
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-[13px] font-black italic tracking-widest outline-none focus:border-white/40 focus:bg-white/10 transition-all text-white"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            {/* 검색 버튼 */}
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="w-full sm:w-auto sm:px-8 h-12 bg-white dark:bg-[#292e35] text-black dark:text-[#e5e5e5] font-black italic tracking-[1px] text-[14px] rounded-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-2 sm:mt-0"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                                <span>데이터 검색</span>
                            </button>
                        </div>
                    </div>

                    {/* ──────────────────────────────────────────────────────
                        Content Section (검색 결과 영역)
                    ────────────────────────────────────────────────────── */}
                    <div className="px-2">
                        {!isSearched ? (
                            <div className="py-24 flex flex-col items-center text-[#ccd3db] gap-4">
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#ccd3db] flex items-center justify-center">
                                    <Search size={28} />
                                </div>
                                <div className="text-center">
                                    <p className="text-[14px] font-black italic tracking-widest uppercase">조회 대기중</p>
                                    <p className="text-[11px] font-bold text-[#ccd3db] uppercase mt-1">조회 시작 날짜를 선택하세요</p>
                                </div>
                            </div>
                        ) : loading ? (
                            <div className="py-24 flex flex-col items-center text-black dark:text-[#e5e5e5] gap-4">
                                <Loader2 size={40} className="animate-spin text-black dark:text-[#e5e5e5]" />
                                <p className="text-[13px] font-black italic tracking-widest uppercase animate-pulse">데이터 조회중...</p>
                            </div>
                        ) : data.length > 0 ? (
                            <div className="flex flex-col divide-y divide-[#f3f3f3]">
                                <div className="pb-4 flex items-center justify-between border-b-2 border-black">
                                    <span className="text-[12px] font-black italic tracking-widest uppercase">뉴스레터</span>
                                    <span className="text-[10px] font-bold text-[#ccd3db] uppercase tracking-[1px]">{data.length} UPDATES</span>
                                </div>

                                {data.map((item, index) => {
                                    const id = item.contentId || item.idx || item.fcnNo || index;
                                    const title = item.subject || item.title || item.name || '공시 내용이 없습니다.';
                                    const date = item.regDate || item.reg_date || item.createdAt || '날짜 미상';
                                    const url = item.originUrl || item.origin_url || item.link || 'https://www.fss.or.kr';

                                    return (
                                        <div
                                            key={id}
                                            className="py-8 flex flex-col gap-3 cursor-pointer group hover:bg-[#fafafa] dark:hover:bg-[#1c1f24] transition-all px-2 -mx-2 rounded-xl"
                                            onClick={() => window.open(url, '_blank')}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black italic tracking-tighter uppercase rounded">NEWSLETTER</div>
                                                <div className="flex items-center gap-1.5 text-[#ccd3db]">
                                                    <Calendar size={12} />
                                                    <span className="text-[11px] font-bold tracking-widest uppercase">{date}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-start gap-4">
                                                <h3 className="font-black italic text-[18px] tracking-tighter uppercase leading-[1.2] text-[#111] dark:text-[#e5e5e5] group-hover:text-blue-600 transition-colors">
                                                    {title}
                                                </h3>
                                                <div className="w-10 h-10 rounded-full border border-[#f3f3f3] flex items-center justify-center text-[#ccd3db] group-hover:border-black group-hover:text-black transition-all shrink-0 translate-y-[-5px]">
                                                    <ExternalLink size={16} />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                <span className="text-[11px] font-bold text-[#a3b0c1] uppercase">데이터 제공: FSS.GO.KR</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-24 flex flex-col items-center text-[#ccd3db] gap-4">
                                <Info size={40} />
                                <p className="text-[14px] font-black italic tracking-widest uppercase">No Signals Found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Insight */}
                <div className="mx-6 p-8 bg-[#f9f9f9] dark:bg-[#1c1f24] rounded-[24px] border border-[#f3f3f3] dark:border-[#292e35] text-center mt-6">
                    <p className="text-[10px] font-black italic tracking-[3px] uppercase text-[#ccd3db] mb-2 leading-relaxed">ICT5 x MYMORY x FSS</p>
                    <p className="text-[12px] font-medium text-[#7b8b9e] max-w-[280px] mx-auto">금융감독원 공시 데이터를 바탕으로 실시간 마켓 트렌드를 분석합니다.</p>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
