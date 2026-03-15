/**
 * ──────────────────────────────────────────────────────
 * apiClient.ts — 백엔드 서버와 통신하는 HTTP 클라이언트 설정 (최종 통합본)
 * ──────────────────────────────────────────────────────
 * * [역할]
 * 모든 API 호출의 기본 주소(baseURL)를 접속 환경(Web/App)에 따라 자동으로 전환하고,
 * 인증 토큰 첨부 및 세션 유지 설정을 공통으로 처리합니다.
 *
 * [Axios란?]
 * JavaScript에서 HTTP 요청(GET, POST, PUT, DELETE)을 쉽게 보낼 수 있게 해주는 라이브러리.
 * fetch()의 더 편리한 버전이라고 생각하면 된다.
 *
 * [인터셉터(Interceptor)란?]
 * 모든 요청/응답에 자동으로 끼워넣는 "중간 처리"이다.
 * 예: 모든 요청에 자동으로 로그인 토큰을 붙이는 것.
 * ──────────────────────────────────────────────────────
 */
import axios from 'axios';

/**
 * [환경 감지 및 Base URL 결정 함수]
 * - 웹 브라우저 (Vite): http://localhost:8080/api
 * - 안드로이드 에뮬레이터: http://10.0.2.2:8080/api
 */
const getBaseUrl = () => {
  const { hostname, port, href } = window.location;

  // 브라우저 개발 환경 (localhost) → Vite 프록시 사용 (CORS 우회)
  if (hostname === 'localhost' && port === '5173') {
    console.log('[Environment]: Web Browser (localhost:5173)');
    return '/api';
  }
  // Android 에뮬레이터 (Capacitor) 또는 실 기기
  if (hostname === '127.0.0.1') {
    console.log('[Environment]: android App');
    return 'http://10.0.2.2:8080/api';
  }
  // 기타 상황
  return import.meta.env.VITE_API_URL || 'http://10.0.2.2:8080/api';
};

/**
 * 공통 Axios 인스턴스
 *
 * 모든 API 서비스 파일이 이 인스턴스를 임포트하여 HTTP 통신에 사용한다.
 * axios.create()로 기본 설정을 고정시킨 독립 인스턴스이므로,
 * 전역 axios 설정을 변경하지 않고 프로젝트 전용 설정을 유지할 수 있다.
 */
const apiClient = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  timeout: 30000, // 30초 타임아웃 - 이 시간 안에 응답 없으면 에러 처리
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────────────────────────
// 요청 인터셉터: localStorage 토큰을 Authorization 헤더에 자동 주입
// ─────────────────────────────────────────────────────────
// apiClient를 통한 모든 HTTP 요청이 전송되기 직전에 이 함수가 실행된다.
apiClient.interceptors.request.use((config) => {
  // localStorage에서 JWT 액세스 토큰을 읽어온다
  const token = localStorage.getItem('accessToken');
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
  async (error) => {
    const originalRequest = error.config;

    // 🚩 [수정] 로그인/회원가입/리프레시 자체 요청 중 발생한 에러는 갱신 로직을 타지 않음
    // URL에 'login', 'signup', 'refresh'가 포함되어 있다면 바로 에러 리턴
    const isAuthPath = originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/signup') ||
      originalRequest.url.includes('/auth/refresh');

    if (isAuthPath || originalRequest._retry) {
      return Promise.reject(error);
    }

    // 401 에러(인증 만료)가 발생하고 재시도한 적이 없을 때
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 1. 서버에 새로운 액세스 토큰 요청 (쿠키는 자동으로 전송됨)
        // 🚩 [주의] baseURL이 이미 설정되어 있다면 상대 경로 '/auth/refresh'만 사용하세요.
        const { data } = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {}, {
          withCredentials: true
        });

        const newAccessToken = data.accessToken;

        // 2. 새 토큰 저장 및 헤더 업데이트
        localStorage.setItem('accessToken', newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // 3. 원래 실패했던 요청 재시도
        return apiClient(originalRequest);
      } catch (refreshError) {
        // 리프레시 토큰도 만료된 경우 -> 로그아웃 처리
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');

        // showAlert가 정의되어 있는지 확인 후 실행
        if (typeof showAlert === 'function') {
          showAlert('세션이 만료되었습니다. 다시 로그인해주세요.', '인증 실패', 'alert');
        }

        // 무한 루프 방지를 위해 로그아웃 후 로그인 페이지로 이동
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // 모든 에러를 호출부로 전파하여 개별 try-catch에서 처리할 수 있게 한다
    console.error('❌ [API Error]:', error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
