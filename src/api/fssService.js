/**
 * @file fssService.js
 * @description 금융감독원(FSS) 공시 데이터 조회 API를 담당하는 서비스 파일
 *
 * ─────────────────────────────────────────────────────────
 * FSS(금융감독원) 공시 데이터란?
 *   금융감독원(Financial Supervisory Service)이 제공하는 공개 금융 공시 정보이다.
 *   이 앱에서는 특정 기간의 공시 데이터를 조회하여 사용자에게 제공한다.
 *   직접 금감원 Open API를 호출하는 것이 아니라, 백엔드 서버가 금감원 API를
 *   프록시하여 데이터를 반환하므로 API 키 관리와 CORS 문제를 백엔드에서 처리한다.
 *
 * ─────────────────────────────────────────────────────────
 * [호출되는 백엔드 엔드포인트]
 *   GET /api/fss/list
 *     쿼리 파라미터:
 *       startDate : string  - 조회 시작 날짜 (YYYYMMDD 형식, 예: "20240101")
 *       endDate   : string  - 조회 종료 날짜 (YYYYMMDD 형식, 예: "20240331")
 *       apiType   : string  - 응답 형식 ('json' 고정)
 *
 * ─────────────────────────────────────────────────────────
 * [날짜 형식 변환]
 *   프론트엔드는 날짜를 'YYYY-MM-DD' 형식 (ISO 8601)으로 사용하지만,
 *   백엔드(및 금감원 API)는 'YYYYMMDD' 형식을 요구한다.
 *   따라서 fetchFssData() 내부에서 replace(/-/g, '') 변환을 수행한다:
 *   예: '2024-03-03' → '20240303'
 *       '2024-01-01' → '20240101'
 *
 * ─────────────────────────────────────────────────────────
 * [백엔드 구현 참조]
 *   백엔드 FssController.java:
 *     @GetMapping("/list")
 *     public ResponseEntity<?> getFssList(
 *       @RequestParam(value = "startDate", required = false) String startDate,
 *       @RequestParam(value = "endDate",   required = false) String endDate
 *     )
 *   startDate, endDate 모두 required = false 이므로 파라미터 없이도 호출 가능하나,
 *   이 서비스는 항상 날짜 파라미터를 포함하여 호출한다.
 *
 * ─────────────────────────────────────────────────────────
 * [요청 URL 예시]
 *   프론트: fetchFssData('2024-01-01', '2024-03-31')
 *   변환 후 URL: GET /api/fss/list?startDate=20240101&endDate=20240331&apiType=json
 *
 * ─────────────────────────────────────────────────────────
 * [응답 데이터 형태]
 *   백엔드가 금감원 API 응답을 그대로 전달하거나 가공하여 반환한다.
 *   금감원 API 기준 응답 (json 형식):
 *   {
 *     status   : string,   // 응답 상태 코드 (예: "000" = 정상)
 *     message  : string,   // 상태 메시지
 *     list     : [         // 공시 목록
 *       {
 *         rcept_no     : string,   // 접수 번호
 *         rcept_dt     : string,   // 접수 일자 (YYYYMMDD)
 *         corp_cls      : string,  // 법인 구분 (Y:유가, K:코스닥 등)
 *         corp_code     : string,  // 고유 번호
 *         corp_name     : string,  // 법인명
 *         report_nm     : string,  // 보고서명
 *         flr_nm        : string,  // 공시 제출인명
 *         rm            : string   // 비고
 *       }
 *     ],
 *     total_count: number  // 전체 공시 건수
 *   }
 *   (실제 응답 형태는 백엔드 가공 방식에 따라 다를 수 있음)
 *
 * ─────────────────────────────────────────────────────────
 * [에러 처리]
 *   try-catch 없이 에러를 호출부로 전파한다.
 *   호출하는 컴포넌트에서 try-catch로 에러를 처리해야 한다.
 *   주요 실패 케이스:
 *   - 400 Bad Request : 날짜 형식 오류
 *   - 500 Internal Server Error : 금감원 API 호출 실패 또는 서버 오류
 *   - 타임아웃 : apiClient의 10초 타임아웃 초과 (외부 API 연동 특성상 느릴 수 있음)
 *
 * ─────────────────────────────────────────────────────────
 * [관련 파일]
 *   - src/api/apiClient.js      : axios 인스턴스 (10초 타임아웃 설정)
 *   - src/pages/fss/FssPage.jsx : fetchFssData() 사용
 *   - 백엔드 FssController.java : /api/fss/list 엔드포인트 구현
 *   - 백엔드 FssService.java    : 금감원 API 프록시 로직
 */
import apiClient from './apiClient';

/**
 * fssService 객체
 *
 * 금융감독원 공시 데이터 관련 API를 묶어 named export한다.
 * 사용: import { fssService } from './fssService';
 */
export const fssService = {
    /**
     * 금융감독원 공시 데이터 목록 조회
     *
     * 지정한 기간 내의 금감원 공시 데이터를 조회한다.
     * 프론트엔드의 'YYYY-MM-DD' 날짜 형식을 백엔드가 요구하는
     * 'YYYYMMDD' 형식으로 자동 변환하여 요청한다.
     *
     * @param {string} startDate - 조회 시작 날짜 (YYYY-MM-DD 형식)
     *   예: '2024-01-01', '2024-03-03'
     *   내부에서 '20240101', '20240303'으로 변환됨
     *
     * @param {string} endDate   - 조회 종료 날짜 (YYYY-MM-DD 형식)
     *   예: '2024-03-31'
     *   내부에서 '20240331'로 변환됨
     *
     * @returns {Promise<Object>} 금감원 공시 데이터 응답
     *   {
     *     status      : string,   // 응답 상태 (예: "000" = 정상)
     *     message     : string,   // 상태 메시지
     *     list        : Array,    // 공시 목록 (각 항목: rcept_no, corp_name, report_nm 등)
     *     total_count : number    // 전체 공시 건수
     *   }
     *
     * HTTP: GET /api/fss/list?startDate=YYYYMMDD&endDate=YYYYMMDD&apiType=json
     * 인증 필요: 예 (apiClient의 JWT 자동 주입)
     * 성공: 200 OK
     * 실패: 400 (날짜 형식 오류), 500 (금감원 API 오류)
     */
    fetchFssData: async (startDate, endDate) => {
        // TODO: GET /fss/list 를 호출하고 response.data를 반환하세요.
        // 주의: 날짜 형식을 'YYYY-MM-DD' → 'YYYYMMDD' 로 변환해야 합니다.
        //       replace(/-/g, '') 를 사용하면 모든 '-' 문자를 제거할 수 있습니다.
        //       예: "2024-03-03".replace(/-/g, '') → "20240303"
        // 힌트:
        //   response = await apiClient.get('/fss/list', {
        //     params: {
        //       startDate: startDate.replace(/-/g, ''),  // "2024-03-03" → "20240303"
        //       endDate: endDate.replace(/-/g, ''),
        //       apiType: 'json'
        //     }
        //   })
        //   return response.data
        const response = await apiClient.get('/fss/list', {
            params: {
                startDate: startDate.replace(/-/g, ''),
                endDate: endDate.replace(/-/g, ''),
                apiType: 'json'
            }
        });
        return response.data;
    }
};
