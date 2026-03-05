/**
 * @file apiClient.js dkasjdlaksjdlaskdj         -----------------------------
 * @description Axios 기반 HTTP 클라이언트 설정 파일
 *
 * ─────────────────────────────────────────────────────────
 * 이 파일의 역할:
 *   모든 API 서비스 파일(authService, postService 등)이 공통으로
 *   임포트해서 사용하는 Axios 인스턴스(apiClient)를 생성하고
 *   내보낸다(export default).
 *
 * ─────────────────────────────────────────────────────────
 * [Base URL 결정 규칙]
 *   1. 웹 브라우저 개발 환경 (hostname === 'localhost' 또는 '127.0.0.1'):
 *      → baseURL = '/api'
 *      → Vite 개발 서버의 프록시(/api → http://localhost:8080/api)를 경유
 *      → 이렇게 하면 브라우저의 CORS(동일 출처 정책)를 우회할 수 있음
 *   2. 안드로이드 에뮬레이터 / 실 기기 (Capacitor):
 *      → baseURL = VITE_API_URL 환경 변수 값, 없으면 'http://10.0.2.2:8080/api'
 *      → 10.0.2.2 는 Android 에뮬레이터에서 Host PC의 localhost를 가리키는 특수 IP
 *
 * ─────────────────────────────────────────────────────────
 * [Axios 인스턴스 공통 설정]
 *   - baseURL  : 위 규칙에 따라 동적으로 결정
 *   - withCredentials: true  → 쿠키(세션 쿠키 등)를 요청에 포함
 *   - timeout  : 10000 ms (10초) — 응답 없으면 AxiosError 발생
 *   - headers  : Content-Type: application/json (기본)
 *
 * ─────────────────────────────────────────────────────────
 * [요청(Request) 인터셉터]
 *   모든 HTTP 요청이 전송되기 직전에 실행된다.
 *   localStorage에 'authToken' 키로 저장된 JWT 문자열이 있으면
 *   요청 헤더에 "Authorization: Bearer <token>" 을 자동으로 추가한다.
 *   → 개별 API 호출 시 매번 토큰을 직접 주입할 필요 없음
 *
 * ─────────────────────────────────────────────────────────
 * [응답(Response) 인터셉터]
 *   성공 응답(2xx): 그대로 통과시킨다.
 *   에러 응답 처리:
 *     - HTTP 401 Unauthorized가 반환됐을 때:
 *       1. 응답 body의 code 필드를 확인한다.
 *          code === 'TOKEN_EXPIRED' → 만료 안내 alert 표시
 *       2. localStorage에서 'authToken'을 제거한다(로그아웃 처리).
 *       3. 현재 페이지 경로가 '/login'이 아닌 경우에만
 *          window.location.href = '/login' 으로 강제 리다이렉트한다.
 *          (로그인 페이지에서 또 리다이렉트하는 무한 루프 방지)
 *     - 그 외 에러: Promise.reject(error) 로 호출한 측에 전파
 *
 * ─────────────────────────────────────────────────────────
 * [사용 예시 (다른 서비스 파일에서)]
 *   import apiClient from './apiClient';
 *   const response = await apiClient.get('/users/me');
 *
 * ─────────────────────────────────────────────────────────
 * [의존성]
 *   - axios (npm 패키지)
 *   - window.location (브라우저 전역 객체)
 *   - localStorage (브라우저 전역 스토리지)
 *   - import.meta.env.VITE_API_URL (Vite 환경 변수, .env 파일에 정의)
 */
import axios from 'axios';

/**
 * 현재 실행 환경에 맞는 API Base URL을 반환하는 함수
 *
 * @returns {string} 결정된 Base URL 문자열
 *   - 로컬 브라우저 개발 환경: '/api'  (Vite 프록시 경유)
 *   - Android 에뮬레이터/실 기기 : VITE_API_URL 또는 'http://10.0.2.2:8080/api'
 *
 * 동작 방식:
 *   1. window.location.hostname을 읽어 현재 호스트명을 확인한다.
 *   2. 'localhost' 또는 '127.0.0.1' 이면 상대 경로 '/api'를 반환한다.
 *      → vite.config.js의 proxy 설정으로 /api/* 가 실제 백엔드로 포워딩됨
 *   3. 그 외(Capacitor WebView, APK 실행 등)에는 절대 URL을 반환한다.
 *      → .env 파일의 VITE_API_URL이 있으면 그 값을, 없으면 기본값 사용
 */
const getBaseUrl = () => {
  const { hostname } = window.location;

  // 브라우저 개발 환경 (localhost) → Vite 프록시 사용 (CORS 우회)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/api';
  }

  // Android 에뮬레이터 (Capacitor) 또는 실 기기
  return import.meta.env.VITE_API_URL || 'http://10.0.2.2:8080/api';
};

/**
 * 공통 Axios 인스턴스
 *
 * 모든 API 서비스 파일이 이 인스턴스를 임포트하여 HTTP 통신에 사용한다.
 * axios.create()로 기본 설정을 고정시킨 독립 인스턴스이므로,
 * 전역 axios 설정을 변경하지 않고 프로젝트 전용 설정을 유지할 수 있다.
 *
 * 설정 항목:
 *   @property {string}  baseURL         - 요청 URL의 공통 앞부분 (환경별 동적 결정)
 *   @property {boolean} withCredentials - 크로스 오리진 요청에도 쿠키 포함 여부 (true)
 *   @property {number}  timeout         - 최대 응답 대기 시간 (ms). 초과 시 AxiosError
 *   @property {object}  headers         - 기본 요청 헤더. Content-Type은 JSON으로 고정
 *                                         (multipart 요청 시 개별 호출에서 오버라이드)
 */
const apiClient = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  timeout: 10000, // 10초 타임아웃 - 이 시간 안에 응답 없으면 에러 처리
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────────────────────────
// 요청 인터셉터: localStorage 토큰을 Authorization 헤더에 자동 주입
// ─────────────────────────────────────────────────────────
// apiClient를 통한 모든 HTTP 요청이 전송되기 직전에 이 함수가 실행된다.
// 처리 흐름:
//   1. localStorage.getItem('authToken') 으로 JWT 문자열을 읽는다.
//   2. 토큰이 존재하면 config.headers.Authorization에 'Bearer <token>' 형태로 추가한다.
//   3. 수정된(또는 원본) config 객체를 반환하면 Axios가 실제 요청을 보낸다.
//   4. 인터셉터 자체에서 에러가 나면 Promise.reject(error)로 전파한다.
// 주의: 로그인/회원가입처럼 토큰이 없어도 되는 요청에서는 토큰이 없으므로
//       Authorization 헤더가 추가되지 않아 정상적으로 동작한다.
apiClient.interceptors.request.use(
  (config) => {
    // localStorage에서 JWT 액세스 토큰을 읽어온다
    const token = localStorage.getItem('authToken');
    if (token) {
      // Bearer 스킴(scheme)으로 Authorization 헤더에 토큰을 첨부한다
      // 백엔드의 JWTAuthenticationFilter.java가 이 헤더를 파싱하여 인증을 처리한다
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  // 요청 설정 단계에서 발생한 에러는 그대로 reject하여 호출부로 전파
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────
// 응답 인터셉터: 401 발생 시 토큰 삭제 후 로그인 페이지로 이동
// ─────────────────────────────────────────────────────────
// 서버로부터 응답을 받은 직후 이 인터셉터가 실행된다.
//
// 성공 응답(2xx):
//   response 객체를 그대로 반환 → 호출한 서비스 함수가 response.data를 읽음
//
// 에러 응답:
//   HTTP 401 Unauthorized 인 경우만 특수 처리:
//     a) error.response.data.code 를 확인한다.
//        'TOKEN_EXPIRED' 이면 사용자에게 만료 안내 alert를 띄운다.
//     b) localStorage에서 'authToken'을 제거한다 (로그아웃 효과).
//     c) 현재 URL이 '/login' 을 포함하지 않으면 /login으로 강제 이동한다.
//        (로그인 페이지 자체에서 401이 날 때 무한 리다이렉트 방지)
//   401 이외의 에러(403, 404, 500 등):
//     Promise.reject(error) 로 호출부(서비스 함수/컴포넌트)에 전파한다.
apiClient.interceptors.response.use(
  // 성공 응답은 그대로 통과
  (response) => response,
  (error) => {
    // HTTP 상태 코드 401 (Unauthorized) 일 때만 자동 처리
    if (error.response && error.response.status === 401) {
      // 백엔드가 응답 body에 담아준 에러 코드와 메시지를 추출한다
      const errorCode = error.response.data?.code;
      const errorMessage = error.response.data?.message;

      // 토큰이 만료된 경우에는 사용자에게 친절한 안내 메시지를 표시한다
      if (errorCode === 'TOKEN_EXPIRED') {
        alert(errorMessage || '로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
      }

      // 인증 토큰을 localStorage에서 제거하여 로그아웃 상태로 만든다
      localStorage.removeItem('authToken');

      // 이미 로그인 페이지에 있다면 다시 이동하지 않는다 (무한 루프 방지)
      if (!window.location.pathname.includes('/login')) {
        // 브라우저를 로그인 페이지로 강제 이동시킨다
        window.location.href = '/login';
      }
    }
    // 모든 에러를 호출부로 전파하여 개별 try-catch에서 처리할 수 있게 한다
    return Promise.reject(error);
  }
);

export default apiClient;
