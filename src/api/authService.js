/**
 * @file authService.js
 * @description 사용자 인증(Authentication) 관련 모든 API 호출을 담당하는 서비스 파일
 *
 * ─────────────────────────────────────────────────────────
 * 이 파일의 역할:
 *   회원가입, 로그인, 로그아웃, 이메일 인증, 비밀번호 재설정 등
 *   사용자 신원 확인과 관련된 모든 백엔드 API 요청을 처리한다.
 *   각 함수는 apiClient(axios 인스턴스)를 통해 백엔드 Spring Boot 서버와 통신한다.
 *
 * ─────────────────────────────────────────────────────────
 * [호출되는 백엔드 엔드포인트 목록]
 *   POST /api/auth/login                   → 일반 이메일/비밀번호 로그인
 *   POST /api/auth/signup                  → 신규 회원가입
 *   POST /api/auth/kakao/login             → 카카오 소셜 로그인
 *   POST /api/auth/email/send-code         → 이메일 인증 코드 발송
 *   POST /api/auth/email/verify-code       → 이메일 인증 코드 검증
 *   POST /api/auth/email/send-reset-code   → 비밀번호 재설정용 이메일 코드 발송
 *   POST /api/auth/email/verify-reset-code → 비밀번호 재설정용 코드 검증
 *   POST /api/auth/reset-password          → 새 비밀번호로 재설정
 *   POST /api/auth/logout                  → 서버 측 세션/토큰 무효화
 *
 * ─────────────────────────────────────────────────────────
 * [요청/응답 데이터 형태]
 *   login:
 *     요청: { email: string, password: string }
 *     응답: { token: string, userId: number, username: string, ... }
 *           → 응답의 token을 localStorage에 'authToken' 키로 저장해야 함
 *              (저장은 이 서비스가 아닌 호출하는 컴포넌트/컨텍스트에서 처리)
 *
 *   signup:
 *     요청: { email: string, password: string, username: string }
 *     응답: 성공 메시지 또는 생성된 사용자 정보
 *
 *   kakaoLogin:
 *     요청: { kakaoCode: string } (카카오 OAuth 인가 코드)
 *     응답: login과 동일한 형태 (JWT 토큰 포함)
 *
 *   sendEmailCode / sendResetEmailCode:
 *     요청: { email: string }
 *     응답: 성공 메시지 문자열 또는 { message: string }
 *
 *   verifyEmailCode / verifyResetCode:
 *     요청: { email: string, code: string }
 *     응답: 검증 성공 메시지 또는 boolean
 *
 *   resetPassword:
 *     요청: { email: string, newPassword: string }
 *     응답: 성공 메시지
 *
 *   logout:
 *     요청: 없음 (Authorization 헤더의 JWT로 식별)
 *     응답: 없음 (finally 블록에서 localStorage 토큰 제거 처리)
 *
 * ─────────────────────────────────────────────────────────
 * [특이 사항]
 *   - logout()은 try-finally 패턴을 사용한다.
 *     서버 요청이 실패하더라도(네트워크 오류 등) finally 블록에서
 *     반드시 localStorage의 authToken을 제거하여 클라이언트 로그아웃을 보장한다.
 *   - 에러 처리: 기본적으로 에러를 catch하지 않고 호출부로 전파한다.
 *     따라서 이 서비스를 사용하는 컴포넌트가 try-catch로 에러를 처리해야 한다.
 *
 * ─────────────────────────────────────────────────────────
 * [관련 파일]
 *   - src/api/apiClient.js          : axios 인스턴스 (JWT 자동 주입, 401 처리)
 *   - src/context/AuthContext.jsx   : 이 서비스를 호출하고 토큰/유저 상태 관리
 *   - src/pages/auth/LoginPage.jsx  : login() 호출
 *   - src/pages/auth/SignupPage.jsx : signup(), sendEmailCode(), verifyEmailCode() 호출
 */
import apiClient from './apiClient';

/**
 * authService 객체
 *
 * 인증 관련 API 함수들을 하나의 객체로 묶어 named export한다.
 * 사용: import { authService } from './authService';
 *       await authService.login({ email, password });
 */
export const authService = {

    /* ═══ 실제 API 호출 (백엔드 연결 모드) ═══ */

    /**
     * [1] 일반 이메일/비밀번호 로그인
     *
     * 사용자가 입력한 이메일과 비밀번호를 백엔드에 전송하여
     * 인증에 성공하면 JWT 액세스 토큰을 받아온다.
     *
     * @param {Object} credentials           - 로그인 자격 증명 객체
     * @param {string} credentials.email     - 사용자 이메일 주소
     * @param {string} credentials.password  - 사용자 비밀번호 (평문, HTTPS로 전송)
     *
     * @returns {Promise<Object>} 백엔드 응답 data
     *   예: { token: "eyJhbGci...", userId: 42, username: "홍길동", email: "hong@email.com" }
     *   → 호출한 컨텍스트에서 token을 localStorage.setItem('authToken', token) 으로 저장
     *
     * HTTP: POST /api/auth/login
     * 요청 body: { email: string, password: string }
     * 성공: 200 OK + 응답 body
     * 실패: 401 (비밀번호 틀림), 404 (이메일 없음) 등 → Promise.reject(error)
     */
    login: async (credentials) => {
        // TODO: POST /auth/login 을 호출하고 response.data를 반환하세요.
        // 힌트: apiClient.post('/auth/login', credentials) → response.data
    },

    /**
     * [2] 신규 회원가입
     *
     * 새로운 사용자 계정을 생성한다. 이미 사용 중인 이메일이면 에러가 발생한다.
     * 회원가입 후 이메일 인증이 필요한 경우 sendEmailCode()를 별도로 호출해야 한다.
     *
     * @param {Object} userData              - 회원가입 정보 객체
     * @param {string} userData.email        - 가입할 이메일 주소 (아이디로 사용)
     * @param {string} userData.password     - 설정할 비밀번호
     * @param {string} userData.username     - 표시될 사용자 이름(닉네임)
     *
     * @returns {Promise<Object>} 백엔드 응답 data
     *   예: { message: "회원가입 성공" } 또는 생성된 유저 정보
     *
     * HTTP: POST /api/auth/signup
     * 요청 body: { email: string, password: string, username: string }
     * 성공: 201 Created 또는 200 OK
     * 실패: 409 Conflict (이메일 중복), 400 Bad Request (유효성 검사 실패)
     */
    signup: async (userData) => {
        // TODO: POST /auth/signup 을 호출하고 response.data를 반환하세요.
        // 힌트: apiClient.post('/auth/signup', userData) → response.data
    },

    /**
     * [3] 카카오 소셜 로그인
     *
     * 카카오 OAuth 인가 코드를 백엔드에 전달하면, 백엔드가 카카오 API를 통해
     * 사용자 정보를 조회한 후 JWT 토큰을 발급해서 반환한다.
     * 프론트엔드는 카카오 인가 코드만 전달하면 되므로, 카카오 API 키를
     * 노출시키지 않아도 된다(백엔드에서 처리).
     *
     * @param {string} kakaoCode - 카카오 OAuth 서버로부터 받은 인가 코드 (1회용)
     *   카카오 로그인 페이지에서 리다이렉트 시 URL 쿼리 파라미터로 전달됨
     *   예: https://yourapp.com/auth/kakao/callback?code=ABCDE12345
     *
     * @returns {Promise<Object>} 백엔드 응답 data
     *   예: { token: "eyJhbGci...", userId: 7, username: "카카오유저", isNewUser: false }
     *
     * HTTP: POST /api/auth/kakao/login
     * 요청 body: { kakaoCode: string }
     * 성공: 200 OK + JWT 토큰 응답
     * 실패: 400 (유효하지 않은 code), 500 (카카오 서버 오류)
     */
    kakaoLogin: async (kakaoCode) => {
        // TODO: POST /auth/kakao/login 을 호출하고 response.data를 반환하세요.
        // 힌트: body는 { kakaoCode } 객체로 전달 → apiClient.post('/auth/kakao/login', { kakaoCode }) → response.data
    },

    /**
     * [4] 이메일 인증 코드 발송
     *
     * 회원가입 시 이메일 주소의 실소유자 확인을 위해
     * 해당 이메일로 6자리 인증 코드를 발송한다.
     * 코드는 백엔드에서 생성하여 DB에 저장하고 이메일로 전송한다.
     * 발송 후 verifyEmailCode()로 코드를 검증해야 한다.
     *
     * @param {string} email - 인증 코드를 받을 이메일 주소
     *
     * @returns {Promise<Object>} 백엔드 응답 data
     *   예: { message: "인증 코드가 발송되었습니다." }
     *
     * HTTP: POST /api/auth/email/send-code
     * 요청 body: { email: string }
     * 성공: 200 OK
     * 실패: 400 (이미 가입된 이메일), 500 (메일 발송 실패)
     */
    sendEmailCode: async (email) => {
        // TODO: POST /auth/email/send-code 를 호출하고 response.data를 반환하세요.
        // 힌트: body는 { email } 객체로 전달 → apiClient.post('/auth/email/send-code', { email }) → response.data
    },

    /**
     * [5] 이메일 인증 코드 검증
     *
     * 사용자가 이메일로 받은 인증 코드를 입력하면,
     * 백엔드에 저장된 코드와 일치하는지 확인한다.
     * 검증 성공 시 해당 이메일이 인증된 것으로 처리된다.
     *
     * @param {string} email - 인증 코드를 받은 이메일 주소
     * @param {string} code  - 사용자가 입력한 6자리 인증 코드
     *
     * @returns {Promise<Object>} 백엔드 응답 data
     *   예: { message: "이메일 인증이 완료되었습니다." } 또는 { verified: true }
     *
     * HTTP: POST /api/auth/email/verify-code
     * 요청 body: { email: string, code: string }
     * 성공: 200 OK
     * 실패: 400 (코드 불일치 또는 만료)
     */
    verifyEmailCode: async (email, code) => {
        // TODO: POST /auth/email/verify-code 를 호출하고 response.data를 반환하세요.
        // 힌트: body는 { email, code } 객체로 전달 → apiClient.post('/auth/email/verify-code', { email, code }) → response.data
    },

    /**
     * [6] 비밀번호 재설정용 이메일 인증 코드 발송
     *
     * 비밀번호를 잊어버린 사용자가 비밀번호 재설정을 요청할 때
     * 해당 이메일 주소가 가입된 계정인지 확인 후 재설정 코드를 발송한다.
     * sendEmailCode()와 다른 엔드포인트를 사용하여 용도를 구분한다.
     *
     * @param {string} email - 비밀번호 재설정 코드를 받을 이메일 주소
     *
     * @returns {Promise<Object>} 백엔드 응답 data
     *   예: { message: "재설정 코드가 발송되었습니다." }
     *
     * HTTP: POST /api/auth/email/send-reset-code
     * 요청 body: { email: string }
     * 성공: 200 OK
     * 실패: 404 (가입되지 않은 이메일), 500 (메일 발송 실패)
     */
    sendResetEmailCode: async (email) => {
        // TODO: POST /auth/email/send-reset-code 를 호출하고 response.data를 반환하세요.
        // 힌트: body는 { email } 객체로 전달 → apiClient.post('/auth/email/send-reset-code', { email }) → response.data
    },

    /**
     * [7] 비밀번호 재설정용 코드 검증
     *
     * 비밀번호 재설정 흐름에서, 사용자가 이메일로 받은 재설정 코드를
     * 입력하면 유효한 코드인지 백엔드에 확인한다.
     * 검증 성공 후 resetPassword()를 호출하여 비밀번호를 변경한다.
     *
     * @param {string} email - 재설정 코드를 받은 이메일 주소
     * @param {string} code  - 사용자가 입력한 재설정 코드
     *
     * @returns {Promise<Object>} 백엔드 응답 data
     *   예: { message: "코드 확인 완료" } 또는 { verified: true }
     *
     * HTTP: POST /api/auth/email/verify-reset-code
     * 요청 body: { email: string, code: string }
     * 성공: 200 OK
     * 실패: 400 (코드 불일치 또는 만료)
     */
    verifyResetCode: async (email, code) => {
        // TODO: POST /auth/email/verify-reset-code 를 호출하고 response.data를 반환하세요.
        // 힌트: body는 { email, code } 객체로 전달 → apiClient.post('/auth/email/verify-reset-code', { email, code }) → response.data
    },

    /**
     * [8] 비밀번호 재설정 완료
     *
     * verifyResetCode()로 코드 검증이 완료된 후 새 비밀번호를 설정한다.
     * 이메일과 새 비밀번호를 전송하면 백엔드에서 해당 계정의 비밀번호를
     * 업데이트한다.
     *
     * @param {string} email       - 비밀번호를 재설정할 계정의 이메일 주소
     * @param {string} newPassword - 새로 설정할 비밀번호 (평문, HTTPS로 전송)
     *
     * @returns {Promise<Object>} 백엔드 응답 data
     *   예: { message: "비밀번호가 재설정되었습니다." }
     *
     * HTTP: POST /api/auth/reset-password
     * 요청 body: { email: string, newPassword: string }
     * 성공: 200 OK
     * 실패: 400 (유효성 검사 실패), 404 (계정 없음)
     */
    resetPassword: async (email, newPassword) => {
        // TODO: POST /auth/reset-password 를 호출하고 response.data를 반환하세요.
        // 힌트: body는 { email, newPassword } 객체로 전달 → apiClient.post('/auth/reset-password', { email, newPassword }) → response.data
    },

    /**
     * [9] 로그아웃 (서버 세션/토큰 무효화)
     *
     * 서버에 로그아웃 요청을 보내 JWT 토큰을 블랙리스트에 등록하거나
     * 서버 측 세션을 무효화한다.
     * try-finally 패턴을 사용하여 서버 요청 성공 여부와 관계없이
     * 반드시 클라이언트의 localStorage에서 토큰을 제거한다.
     *
     * 동작 흐름:
     *   1. try: POST /api/auth/logout 요청 → 서버 측 토큰 무효화
     *   2. finally: localStorage.removeItem('authToken') → 클라이언트 토큰 제거
     *   (서버 요청 실패해도 클라이언트는 반드시 로그아웃 처리됨)
     *
     * @returns {Promise<void>} 반환값 없음
     *
     * HTTP: POST /api/auth/logout
     * 요청 body: 없음 (Authorization 헤더의 JWT로 사용자 식별)
     * 성공: 200 OK
     * 실패: 에러가 나도 finally로 localStorage 토큰은 제거됨
     */
    logout: async () => {
        // TODO: try { POST /auth/logout 호출 } finally { localStorage.removeItem('authToken') }
        // 힌트: try 블록에서 apiClient.post('/auth/logout') 호출,
        //       finally 블록에서 반드시 localStorage.removeItem('authToken') 실행
    }
};
