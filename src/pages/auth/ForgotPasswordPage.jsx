


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { authService } from '@/api/authService';
import { useAlert } from '@/context/AlertContext';

export default function ForgotPasswordPage() {
    // ---------------------------------------------------------
    // [라우터 / 컨텍스트 훅 초기화]
    // ---------------------------------------------------------
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // ---------------------------------------------------------
    // [handleSendCode] 비밀번호 재설정 인증번호 발송 핸들러
    const handleSendCode = async (e) => {
        e.preventDefault();

        //입력 메일 형식 검증
        if (!email || !email.trim()) return;  // 입력 이메일 유효성 체크
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('올바른 이메일 형식을 입력해주세요.', '입력 오류', 'alert');
            return;
        }

        if (loading) return;
        setLoading(true); //로딩 시작

        console.log("인증 시도 중인 이메일:", email);
        //검증 서비스 호출
        try {
            await authService.sendResetEmailCode(email);
            console.log("인증 성공! 이메일 데이터:", email);
            //성공시
            navigate('/reset-password', {
                state: { email },
                replace: true
            });
        }
        // 실패시
        catch (err) {
            console.log('상세 에러', err);

            const serverError = err.response?.data;
            const errorMsg = (typeof serverError === 'string' ? serverError : serverError?.message)
                || '이메일 발송에 실패했습니다. 가입된 이메일인지 확인해주세요.';

            showAlert(errorMsg, '메일 발송 실패', 'alert');
            console.log('메일 발송 에러', err);
        }
        //로딩 종료
        finally {
            setLoading(false); // 로딩 종료
        }
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
