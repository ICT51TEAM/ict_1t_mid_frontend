/**
 * @file ResetPasswordPage.jsx
 * @route /reset-password
 *
 * @description
 * 무신사 앱의 비밀번호 재설정 페이지.
 * ForgotPasswordPage(/forgot-password)에서 이메일로 발송된 6자리 인증번호와
 * 새 비밀번호를 입력하여 비밀번호를 변경한다.
 *
 * @사전조건
 * - location.state.email 이 존재해야 한다.
 * - ForgotPasswordPage가 navigate('/reset-password', { state: { email } })로 전달한다.
 * - 직접 URL로 접근하거나 email이 없으면, useEffect가 즉시
 *   /forgot-password로 replace 리다이렉트한다.
 *
 * @비밀번호_재설정_2단계_API_호출_순서
 * handleReset 내부에서 아래 두 API를 순서대로 호출한다:
 *   [1] POST /api/auth/email/verify-reset-code
 *       → 이메일과 인증번호(code)를 검증. 코드가 틀리거나 만료됐으면 예외 발생.
 *   [2] POST /api/auth/reset-password
 *       → 이메일과 새 비밀번호(newPassword)로 실제 비밀번호를 변경.
 * 두 API 모두 성공해야 /login으로 이동. 하나라도 실패하면 오류 알림 표시.
 *
 * @state
 * - formData {object}            - 폼 전체 데이터를 하나의 객체로 관리
 *   - code            {string}   - 이메일로 받은 6자리 인증번호 입력값
 *   - newPassword     {string}   - 새로 설정할 비밀번호
 *   - confirmPassword {string}   - 새 비밀번호 확인 (handleReset에서 일치 여부 검증)
 * - loading {boolean}            - API 요청 중 여부 (버튼 비활성화 + 스피너)
 *
 * @hooks
 * - useNavigate : 미인증 접근 시 /forgot-password, 성공 시 /login 이동
 * - useLocation : location.state.email 읽기
 * - useAlert    : 오류/성공 알림 모달 표시
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, Loader2, Check, X } from 'lucide-react';
import { authService } from '@/api/authService';
import { useAlert } from '@/context/AlertContext';

export default function ResetPasswordPage() {
    // ---------------------------------------------------------
    // [라우터 / 컨텍스트 훅 초기화]
    // ---------------------------------------------------------
    const navigate = useNavigate();
    const location = useLocation();
    const { showAlert } = useAlert();
    const email = location.state?.email || '';

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        newPassword: '',
        confirmPassword: ''
    });
    // ─── 비밀번호 규칙 실시간 검증 ──────────────────
    // 비밀번호 입력값이 바뀔 때마다 이 객체가 다시 계산됨
    // /[정규식]/.test(문자열): 문자열이 정규식 패턴에 맞는지 true/false 반환
    const password = formData.newPassword;
    const passwordRules = {
        length: password.length >= 8 && password.length <= 20, // 원본 주석에 맞춰 8~20자로 유지
        // 길이 검사
        hasLetter: /[a-zA-Z]/.test(password),
        // 영문 포함 여부
        hasNumber: /[0-9]/.test(password),
        // 숫자 포함 여부
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password), // 특수문자 포함 여부
    }

    // ---------------------------------------------------------
    // [useEffect #1] 미인증 접근 차단
    useEffect(() => {
        if (!email) {
            showAlert('이메일 정보가 없습니다. 메일 인증부터 다시 시도해 주세요', 'alert');
            navigate('/reset-password', { replace: true });
        }
    }, [email, navigate, showAlert]);

    // ---------------------------------------------------------
    // [handleReset] 비밀번호 재설정 핸들러
    //
    // @param {React.FormEvent} e - form onSubmit 이벤트
    //
    // 동작 순서:
    //   [1] e.preventDefault(): 기본 form submit(페이지 새로고침) 차단
    //   [2] loading 중복 호출 방지 체크
    //   [3] formData.newPassword !== formData.confirmPassword 이면
    //       "비밀번호가 일치하지 않습니다." 알림 표시하고 함수 종료 (API 호출 안 함)
    //   [4] loading = true
    //   [5] API 호출 1단계: authService.verifyResetCode(email, formData.code)
    //       → POST /api/auth/email/verify-reset-code
    //       → 코드가 틀리거나 만료됐으면 예외 발생 → catch로 이동
    //   [6] API 호출 2단계: authService.resetPassword(email, formData.newPassword)
    //       → POST /api/auth/reset-password
    //       → 이메일 계정의 비밀번호를 newPassword로 변경
    //   [7] 성공: "비밀번호가 성공적으로 재설정되었습니다." 알림 → /login 이동
    //   [8] 실패: 백엔드 메시지 또는 "인증번호가 올바르지 않거나 만료되었습니다." 알림
    //   [9] finally: loading = false
    // ---------------------------------------------------------
    const handleReset = async (e) => {
        e.preventDefault();
        if (loading) return;

        // 비밀번호 일치 여부 확인
        if (formData.newPassword !== formData.confirmPassword) {
            showAlert('비밀번호가 일치하지 않습니다', '입력 오류', 'alert');
            return;
        }
        // 비밀번호 규칙 전체 충족 확인
        if (
            !passwordRules.length ||
            !passwordRules.hasLetter ||
            !passwordRules.hasNumber ||
            !passwordRules.hasSpecial
        ) {
            showAlert('비밀번호 규칙을 확인해주세요.', '비밀번호 오류');
            return;
        }
        setLoading(true); //로딩 시작

        //검증 서비스 호출
        try {
            console.log("보내는 데이터:", email, formData.code );
            await authService.verifyResetCode(email, formData.code); // 인증코드 검증
            await authService.resetPassword(email, formData.newPassword); // 신규 비밀번호 저장
            //성공시
            showAlert('비밀번호가 변경되었습니다', '비밀번호 변경', 'success');
            navigate('/login', { replace: true });

        }
        // 실패시
        catch (err) {
            console.log('상세 에러', err);

            const serverError = err.response?.data;
            const errorMsg = (typeof serverError === 'string' ? serverError : serverError?.message)
                || '인증코드가 올바르지 않습니다. 다시 시도해주세요.';

            showAlert(errorMsg, '비밀번호 변경 실패', 'alert');
            console.log('비밀번호 변경 에러', err);
        }
        //로딩 종료
        finally {
            setLoading(false); // 로딩 종료
        }
    }


    // ---------------------------------------------------------
    // [JSX 렌더링]
    // ResponsiveLayout: showTabs={false} → 하단 탭바 숨김
    // 전체: min-h-screen 세로 flex 레이아웃
    // ---------------------------------------------------------
    return (
        <ResponsiveLayout showTabs={false}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5]">

                {/* ── 상단 헤더 ────────────────────────────────────────
                    - 뒤로가기 버튼 (ArrowLeft): navigate(-1)
                    - 중앙 제목 "비밀번호 재설정"
                    - mr-8: 오른쪽 여백으로 제목 시각적 중앙 정렬
                ─────────────────────────────────────────────────────── */}
                <div className="flex items-center h-14 px-4 border-b border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24]">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="flex-1 text-center font-bold text-lg mr-8">비밀번호 재설정</h1>
                </div>

                {/* ── 폼 영역 ──────────────────────────────────────────
                    onSubmit → handleReset.
                    max-w-sm + flex-col + gap-4 레이아웃.

                    [인증번호 입력 필드]
                    - type=text (숫자만 입력하지만 text 타입 사용, 모바일 숫자 키패드 고려)
                    - formData.code와 바인딩
                    - "인증번호 6자리" 플레이스홀더로 입력 형식 안내

                    [새 비밀번호 입력 필드]
                    - type=password, formData.newPassword와 바인딩

                    [새 비밀번호 확인 입력 필드]
                    - type=password, formData.confirmPassword와 바인딩
                    - 제출 시 handleReset에서 newPassword와 비교

                    [비밀번호 재설정 완료 버튼]
                    - type=submit: form onSubmit 트리거
                    - loading 중: disabled + Loader2 스피너
                    - 평상시: "비밀번호 재설정 완료" 텍스트
                ─────────────────────────────────────────────────────── */}
                <div className="flex flex-col items-center px-6 py-10">
                    <form onSubmit={handleReset} className="w-full max-w-sm flex flex-col gap-4">

                        {/* 인증번호: 이메일로 받은 6자리 코드 */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-bold text-gray-700 dark:text-[#a3b0c1] ml-1">인증번호</label>
                            <input
                                type="text"
                                placeholder="인증번호 6자리"
                                className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>

                        {/* 새 비밀번호: 새로 사용할 비밀번호 */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-bold text-gray-700 dark:text-[#a3b0c1] ml-1">새 비밀번호</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="새로운 비밀번호"
                                className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors"
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                required

                            />
                        </div>

                        {/* 새 비밀번호 확인: handleReset에서 newPassword와 일치 여부 검증 */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-bold text-gray-700 dark:text-[#a3b0c1] ml-1">새 비밀번호 확인</label>
                            <input
                                id="confirm-password"
                                type="password"
                                placeholder="다시 한번 입력하세요"
                                className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required

                            />
                        </div>

                        {/* ════════════════════════════════════ */}
                        {/* ── 비밀번호 규칙 실시간 체크 표시 ── */}
                        {/* 각 규칙을 충족하면 ✓(초록), 미충족이면 ✗(회색) */}
                        {/* ════════════════════════════════════ */}
                        <div className="bg-secondary rounded-[16px] p-5 shadow-sm border border-border">
                            <p className="text-[14px] font-bold text-text-primary mb-3.5">비밀번호 규칙</p>
                            <div className="space-y-2.5">
                                {/* 규칙 1: 8~20자 */}
                                <div className="flex items-center gap-2">
                                    {/* 조건부 렌더링: 규칙 충족이면 Check 아이콘, 아니면 X 아이콘 */}
                                    {passwordRules.length ? (
                                        <Check className="w-[18px] h-[18px] text-green-500" strokeWidth={3} />
                                    ) : (
                                        <X className="w-[18px] h-[18px] text-red-500" strokeWidth={2.5} />
                                    )}
                                    {/* 충족 시 진한 텍스트, 미충족 시 연한 텍스트 */}
                                    <span
                                        className={`text-[13px] ${passwordRules.length ? 'text-text-primary font-bold' : 'text-text-tertiary font-medium'}`}
                                    >
                                        8~20자 이내
                                    </span>
                                </div>
                                {/* 규칙 2: 영문 포함 */}
                                <div className="flex items-center gap-2">
                                    {passwordRules.hasLetter ? (
                                        <Check className="w-[18px] h-[18px] text-green-500" strokeWidth={3} />
                                    ) : (
                                        <X className="w-[18px] h-[18px] text-red-500" strokeWidth={2.5} />
                                    )}
                                    <span
                                        className={`text-[13px] ${passwordRules.hasLetter ? 'text-text-primary font-bold' : 'text-text-tertiary font-medium'}`}
                                    >
                                        영문 포함
                                    </span>
                                </div>
                                {/* 규칙 3: 숫자 포함 */}
                                <div className="flex items-center gap-2">
                                    {passwordRules.hasNumber ? (
                                        <Check className="w-[18px] h-[18px] text-green-500" strokeWidth={3} />
                                    ) : (
                                        <X className="w-[18px] h-[18px] text-red-500" strokeWidth={2.5} />
                                    )}
                                    <span
                                        className={`text-[13px] ${passwordRules.hasNumber ? 'text-text-primary font-bold' : 'text-text-tertiary font-medium'}`}
                                    >
                                        숫자 포함
                                    </span>
                                </div>
                                {/* 규칙 4: 특수문자 포함 */}
                                <div className="flex items-center gap-2">
                                    {passwordRules.hasSpecial ? (
                                        <Check className="w-[18px] h-[18px] text-green-500" strokeWidth={3} />
                                    ) : (
                                        <X className="w-[18px] h-[18px] text-red-500" strokeWidth={2.5} />
                                    )}
                                    <span
                                        className={`text-[13px] ${passwordRules.hasSpecial ? 'text-text-primary font-bold' : 'text-text-tertiary font-medium'}`}
                                    >
                                        특수문자 포함 (!@#$%^&* 등)
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 제출 버튼: 로딩 중이면 스피너, 아니면 "비밀번호 재설정 완료" 텍스트 */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 mt-6 bg-black dark:bg-[#e5e5e5] text-white dark:text-black font-bold text-[15px] rounded-[4px] hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : '비밀번호 재설정 완료'}
                        </button>
                    </form>
                </div>
            </div>
        </ResponsiveLayout>
    );
};
