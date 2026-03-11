/**
 * ──────────────────────────────────────────────────────
 * authService.ts — 인증(로그인/회원가입/로그아웃) API 호출 서비스
 * ──────────────────────────────────────────────────────
 *
 * [역할]
 * 프론트엔드에서 백엔드의 인증 API(/auth/...)를 호출하는 함수들을 모아놓은 파일.
 *
 * [사용 흐름]
 * LoginPage에서 → authService.login() 호출 → 백엔드 /api/auth/login에 POST 요청
 * → 응답으로 토큰 + 사용자 정보 받음 → AuthContext에 저장 → 로그인 완료
 * ──────────────────────────────────────────────────────
 * */

import apiClient from './apiClient';

/**
 * authService 객체
 */
export const authService = {

    /* ═══ 실제 API 호출 (백엔드 연결 모드) ═══ */

    /**
     * [1] 일반 이메일/비밀번호 로그인
     **/
    login: async (credentials) => {
        const response = await apiClient.post('/auth/login', credentials);
        return response.data;
    },

    /**
     * [2] 신규 회원가입
     */
    signup: async (userData) => {
        const response = await apiClient.post('/auth/signup', userData);
        return response.data;
    },

    /**
     * [3] 카카오 소셜 로그인
     * 실행 의미가 없어 주석 처리함
     */
    /*
    kakaoLogin: async (kakaoCode) => {
        const response = await apiClient.post('/auth/kakao/login',kakaoCode);
        return response.data;

    },*/

    /**
     * [4] 이메일 인증 코드 발송
     */
    sendEmailCode: async (email) => {
        const response = await apiClient.post('/auth/email/send-code', { email });
        return response.data;
    },

    /**
     * [5] 이메일 인증 코드 검증
     */
    verifyEmailCode: async (email, code) => {
        const response = await apiClient.post('/auth/email/verify-code', { email, code });
        return response.data;
    },

    /**
     * [6] 비밀번호 재설정용 이메일 인증 코드 발송
     */
    sendResetEmailCode: async (email) => {
        const response = await apiClient.post('/auth/email/send-reset-code', { email });
        return response.data;
    },

    /**
     * [7] 비밀번호 재설정용 코드 검증
     */
    verifyResetCode: async (email, code) => {
        const response = await apiClient.post('/auth/email/verify-reset-code', { email, code });
        return response.data;
    },

    /**
     * [8] 비밀번호 재설정 완료
     */
    resetPassword: async (email, newPassword) => {
        const response = await apiClient.post('/auth/reset-password', { email, newPassword });
        return response.data;
    },

    /**
     * [9] 로그아웃 (서버 세션/토큰 무효화)
     */
    logout: async () => {
        try {
            await apiClient.post('/auth/logout');
            return response.data;
        }
        finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
        }
        return response.data;
    },

    /**
     * [10] 회원 중복 체크(이메일 중복 체크)
     */
    checkEmailDuplicates: async (email) => {
        const response = await apiClient.get(`/auth/email/check?email=${encodeURIComponent(email)}`);
        return response.data;
    }
};
