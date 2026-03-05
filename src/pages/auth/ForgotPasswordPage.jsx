/**
 * @file ForgotPasswordPage.jsx
 * @route /forgot-password
 *
 * @description
 * 무신사 앱의 비밀번호 찾기 페이지.
 * 사용자가 가입 시 사용한 이메일 주소를 입력하면,
 * 해당 이메일로 비밀번호 재설정용 인증번호를 발송한다.
 *
 * @전체_비밀번호_재설정_흐름
 * ─────────────────────────────────────────────────────────────────────────
 * [1단계] ForgotPasswordPage (/forgot-password)
 *   - 이메일 입력
 *   - handleSendCode → POST /api/auth/email/send-reset-code
 *   - 성공: navigate('/reset-password', { state: { email } })
 *           → 이메일을 state로 전달해 ResetPasswordPage가 사용
 *
 * [2단계] ResetPasswordPage (/reset-password)
 *   - 수신된 6자리 코드 + 새 비밀번호 + 새 비밀번호 확인 입력
 *   - [1] POST /api/auth/email/verify-reset-code (코드 검증)
 *   - [2] POST /api/auth/reset-password (비밀번호 변경)
 *   - 성공: /login 이동
 * ─────────────────────────────────────────────────────────────────────────
 *
 * @state
 * - email   {string}  - 사용자가 입력한 이메일 주소 (controlled input과 바인딩)
 * - loading {boolean} - API 요청 중 여부 (버튼 비활성화 + Loader2 스피너 표시용)
 *
 * @hooks
 * - useNavigate : 코드 발송 성공 후 /reset-password 로 이동
 * - useAlert    : 성공/실패 알림 모달 표시
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { authService } from '@/api/authService';
import { useAlert } from '@/context/AlertContext';

export default function ForgotPasswordPage() {
    // ---------------------------------------------------------
    // [라우터 / 컨텍스트 훅 초기화]
    // navigate  : 코드 발송 성공 시 /reset-password 로 이동 (email을 state로 전달)
    // showAlert : 성공/실패 알림 모달 표시
    // ---------------------------------------------------------
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------

    // email: 사용자가 입력하는 이메일 주소. controlled input과 바인딩.
    // 비밀번호 재설정 코드가 이 이메일로 발송되며,
    // 성공 시 navigate state로 ResetPasswordPage에 전달된다.
    const [email, setEmail] = useState('');

    // loading: true이면 API 요청 진행 중.
    // 버튼 비활성화(disabled + opacity-50) 및 Loader2 스피너 표시에 사용.
    const [loading, setLoading] = useState(false);

    // ---------------------------------------------------------
    // [handleSendCode] 비밀번호 재설정 인증번호 발송 핸들러
    //
    // @param {React.FormEvent} e - form onSubmit 이벤트
    //
    // 동작 순서:
    //   [1] e.preventDefault(): 기본 form submit(페이지 새로고침) 차단
    //   [2] loading 중복 호출 방지 체크
    //   [3] loading = true (버튼 비활성화, 스피너 표시)
    //   [4] authService.sendResetEmailCode(email) 호출
    //       → API: POST /api/auth/email/send-reset-code
    //       → 요청 바디: { email }
    //       → 백엔드가 해당 이메일로 6자리 재설정 코드를 발송
    //   [5] 성공:
    //       - "이메일로 인증번호가 발송되었습니다." 성공 알림 표시
    //       - navigate('/reset-password', { state: { email } })
    //         → ResetPasswordPage에서 location.state.email로 이 이메일을 읽음
    //   [6] 실패:
    //       - 백엔드 메시지 또는 "이메일 발송에 실패했습니다. 가입된 이메일인지 확인해주세요." 알림
    //       - 페이지 이동 없음 → 사용자가 이메일을 수정해 재시도 가능
    //   [7] finally: loading = false
    // ---------------------------------------------------------
    const handleSendCode = async (e) => {
        // TODO: e.preventDefault() 호출
        // TODO: loading 중복 방지 체크 (true이면 return)
        // TODO: setLoading(true) 호출
        // TODO: authService.sendResetEmailCode(email) 호출
        // TODO: 성공 시 showAlert('이메일로 인증번호가 발송되었습니다.', '발송 완료', 'success') 후
        //       navigate('/reset-password', { state: { email } }) 호출
        // TODO: 실패 시 err.response?.data?.message 또는 '이메일 발송에 실패했습니다. 가입된 이메일인지 확인해주세요.' 로 showAlert
        // TODO: finally에서 setLoading(false) 호출
    };

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
                    - 중앙 제목 "비밀번호 찾기"
                    - mr-8: 오른쪽 여백으로 제목이 시각적으로 중앙에 오도록 균형 맞춤
                ─────────────────────────────────────────────────────── */}
                <div className="flex items-center h-14 px-4 border-b border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24]">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="flex-1 text-center font-bold text-lg mr-8">비밀번호 찾기</h1>
                </div>

                {/* ── 본문 영역 ─────────────────────────────────────────
                    flex-col + items-center + px-6 py-10 로 중앙 정렬.
                ─────────────────────────────────────────────────────── */}
                <div className="flex flex-col items-center px-6 py-10">

                    {/* ── 안내 텍스트 ──────────────────────────────────────
                        "가입한 이메일 주소를 입력해 주세요."
                        "비밀번호 재설정을 위한 인증번호를 보내드립니다."
                        연한 회색(#7b8b9e)으로 보조 설명 텍스트 스타일.
                    ─────────────────────────────────────────────────── */}
                    <p className="text-[#7b8b9e] text-[14px] mb-8 text-center leading-relaxed">
                        가입한 이메일 주소를 입력해 주세요.<br />
                        비밀번호 재설정을 위한 인증번호를 보내드립니다.
                    </p>

                    {/* ── 이메일 입력 폼 ───────────────────────────────────
                        onSubmit → handleSendCode.
                        max-w-sm + flex-col + gap-4 레이아웃.

                        [이메일 input]
                        type=email, controlled (email state와 바인딩).
                        required: 빈값 제출 방지.

                        [인증번호 받기 버튼]
                        type=submit: form onSubmit 트리거.
                        loading 중: disabled + Loader2 스피너.
                        평상시: "인증번호 받기" 텍스트.
                    ─────────────────────────────────────────────────── */}
                    <form onSubmit={handleSendCode} className="w-full max-w-sm flex flex-col gap-4">
                        {/* 이메일 입력 필드: 가입 시 사용한 이메일을 입력 */}
                        <input
                            type="email"
                            placeholder="이메일 주소"
                            className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        {/* 인증번호 받기 버튼: 로딩 중이면 스피너, 아니면 텍스트 표시 */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 mt-4 bg-black dark:bg-[#e5e5e5] text-white dark:text-black font-bold text-[15px] rounded-[4px] hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : '인증번호 받기'}
                        </button>
                    </form>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
