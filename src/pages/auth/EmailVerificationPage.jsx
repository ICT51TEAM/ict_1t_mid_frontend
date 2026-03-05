/**
 * @file EmailVerificationPage.jsx
 * @route /verify-email
 *
 * @description
 * 무신사 앱의 이메일 인증 페이지.
 * 회원가입 전에 이메일 소유 여부를 2단계로 확인한다.
 *
 * @2단계_흐름
 * ─────────────────────────────────────────────────────────────────────────
 * [step 1] 이메일 입력 단계
 *   - 사용자가 이메일 주소 입력
 *   - "인증번호 받기" 버튼 클릭 → handleSendCode() 호출
 *   - API: POST /api/auth/email/send-code
 *   - 성공: step = 2 로 변경 (코드 입력 단계로 전환)
 *   - 실패: 알림 표시 (이미 가입된 이메일 등), step 유지
 *
 * [step 2] 인증번호 입력 단계
 *   - 이메일로 전송된 6자리 숫자 코드 입력
 *   - "인증 완료" 버튼 클릭 → handleVerify() 호출 (코드 6자리 미만이면 버튼 비활성화)
 *   - API: POST /api/auth/email/verify-code
 *   - 성공: navigate('/signup', { state: { verifiedEmail: email } })
 *           → SignupPage로 인증된 이메일을 state로 전달
 *   - 실패: "인증번호가 올바르지 않습니다." 알림, step 유지
 *   - "이메일 재입력" 버튼: step = 1로 되돌아가 이메일 재입력 허용
 * ─────────────────────────────────────────────────────────────────────────
 *
 * @state
 * - email   {string}  - 사용자가 입력한 이메일 주소 (step 1 입력 필드와 바인딩)
 * - code    {string}  - 사용자가 입력한 6자리 인증번호 (step 2 입력 필드와 바인딩)
 * - step    {number}  - 현재 단계: 1(이메일 입력) 또는 2(코드 입력)
 * - loading {boolean} - API 요청 중 여부 (버튼 비활성화 + 로딩 스피너 표시용)
 *
 * @hooks
 * - useNavigate : 인증 성공 후 /signup으로 이동
 * - useAlert    : 오류/실패 알림 모달 표시
 *
 * @UI_아이콘_변화
 * - step 1: Mail 아이콘 (편지봉투 모양) → 이메일 입력 안내
 * - step 2: CheckCircle2 아이콘 (체크 원) → 코드 입력 안내
 * - 로딩 중: Loader2 (회전 애니메이션 스피너)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { authService } from '@/api/authService';
import { useAlert } from '@/context/AlertContext';

export default function EmailVerificationPage() {
    // ---------------------------------------------------------
    // [라우터 / 컨텍스트 훅 초기화]
    // navigate  : 인증 성공 후 /signup 으로 이동할 때 사용
    // showAlert : 에러/실패 상황에서 모달 알림 표시
    // ---------------------------------------------------------
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------

    // email: step 1에서 사용자가 입력하는 이메일 주소.
    // step 2에서도 어느 이메일로 코드가 발송됐는지 표시하는 데 사용된다.
    const [email, setEmail] = useState('');

    // code: step 2에서 사용자가 입력하는 6자리 인증번호 문자열.
    // maxLength={6} 설정으로 6자리 초과 입력 방지.
    // "인증 완료" 버튼은 code.length < 6 이면 disabled.
    const [code, setCode] = useState('');

    // step: 현재 UI 단계를 나타내는 숫자.
    //   1 → 이메일 입력 화면 (Mail 아이콘, "EMAIL AUTHENTICATION" 헤딩)
    //   2 → 코드 입력 화면 (CheckCircle2 아이콘, "ENTER CODE" 헤딩)
    const [step, setStep] = useState(1); // 1: Email, 2: Code

    // loading: true이면 API 요청 진행 중.
    // 버튼 비활성화(disabled) 및 Loader2 스피너 표시에 사용.
    const [loading, setLoading] = useState(false);

    // ---------------------------------------------------------
    // [handleSendCode] step 1 → 이메일로 인증번호 발송
    //
    // 동작 순서:
    //   [1] email이 비어있으면 즉시 종료 (버튼이 disabled이므로 보통 호출 안 됨)
    //   [2] loading = true (버튼 비활성화, 스피너 표시)
    //   [3] authService.sendEmailCode(email) 호출
    //       → API: POST /api/auth/email/send-code
    //       → 요청 바디: { email } 또는 쿼리 파라미터 (authService 내부 구현에 따라 다름)
    //   [4] 성공: setStep(2) → step 2(코드 입력 화면)로 전환
    //   [5] 실패: e.response?.data?.message 또는 기본 오류 메시지 알림
    //             step은 2로 넘어가지 않음 → 사용자가 이메일을 다시 확인하도록 유도
    //   [6] finally: loading = false
    // ---------------------------------------------------------
    const handleSendCode = async () => {
        // TODO: email이 비어있으면 return
        // TODO: setLoading(true) 호출
        // TODO: authService.sendEmailCode(email) 호출
        // TODO: 성공 시 setStep(2) 호출로 코드 입력 화면으로 전환
        // TODO: 실패 시 e.response?.data?.message 또는 '이메일 전송에 실패했습니다. 이미 가입된 이메일일 수 있습니다.' 로 showAlert
        // TODO: finally에서 setLoading(false) 호출
    };

    // ---------------------------------------------------------
    // [handleVerify] step 2 → 인증번호 검증 및 SignupPage로 이동
    //
    // 동작 순서:
    //   [1] code가 비어있으면 즉시 종료 (버튼이 disabled이므로 보통 호출 안 됨)
    //   [2] loading = true
    //   [3] authService.verifyEmailCode(email, code) 호출
    //       → API: POST /api/auth/email/verify-code
    //       → 요청 바디: { email, code }
    //   [4] 성공: navigate('/signup', { state: { verifiedEmail: email } })
    //             SignupPage에서 location.state.verifiedEmail로 이 이메일을 받아 사용
    //   [5] 실패: "인증번호가 올바르지 않습니다." 알림
    //             step을 유지 → 사용자가 코드를 다시 입력하거나 이메일 재입력 가능
    //   [6] finally: loading = false
    // ---------------------------------------------------------
    const handleVerify = async () => {
        // TODO: code가 비어있으면 return
        // TODO: setLoading(true) 호출
        // TODO: authService.verifyEmailCode(email, code) 호출
        // TODO: 성공 시 navigate('/signup', { state: { verifiedEmail: email } }) 호출
        // TODO: 실패 시 e.response?.data?.message 또는 '인증번호가 올바르지 않습니다.' 로 showAlert
        // TODO: finally에서 setLoading(false) 호출
    };

    // ---------------------------------------------------------
    // [JSX 렌더링]
    // ResponsiveLayout: showTabs={false} → 하단 탭바 숨김
    // 전체: 흰 배경, 세로 flex, p-4
    // ---------------------------------------------------------
    return (
        <ResponsiveLayout showTabs={false}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5] p-4">

                {/* ── 상단 헤더 ────────────────────────────────────────
                    - 뒤로가기 버튼 (ArrowLeft): navigate(-1)
                    - 중앙 제목 "VERIFY EMAIL" (대문자 이탤릭 스타일)
                    - 오른쪽 w-10 빈 div: 좌우 균형을 맞춰 제목이 정중앙에 오도록 함
                ─────────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate(-1)}><ArrowLeft size={24} /></button>
                    <h1 className="text-[18px] font-black italic tracking-tighter uppercase">VERIFY EMAIL</h1>
                    <div className="w-10"></div>
                </div>

                {/* ── 콘텐츠 중앙 영역 ──────────────────────────────────
                    max-w-[400px] mx-auto로 데스크탑에서도 좁게 중앙 배치.
                    아이콘, 헤딩, 설명 텍스트, 입력/버튼 영역 순서로 세로 배치.
                ─────────────────────────────────────────────────────── */}
                <div className="max-w-[400px] mx-auto w-full flex flex-col items-center">

                    {/* ── 단계 아이콘 ─────────────────────────────────────
                        step 1: Mail 아이콘 → "이메일을 입력하세요" 시각적 안내
                        step 2: CheckCircle2 아이콘 → "코드를 입력하세요" 시각적 안내
                        배경: 연한 회색 원형(rounded-3xl) 컨테이너
                    ─────────────────────────────────────────────────── */}
                    <div className="w-20 h-20 bg-[#f3f3f3] dark:bg-[#292e35] rounded-3xl flex items-center justify-center mb-8">
                        {step === 1 ? <Mail size={40} /> : <CheckCircle2 size={40} className="text-black" />}
                    </div>

                    {/* ── 헤딩 및 설명 텍스트 (단계별 다름) ────────────────
                        step 1: "EMAIL AUTHENTICATION" / "이메일 인증이 필요합니다."
                        step 2: "ENTER CODE" / "{email}로 전송된 6자리 인증번호를 입력해주세요."
                    ─────────────────────────────────────────────────── */}
                    <h2 className="text-2xl font-black italic mb-2 tracking-tighter">
                        {step === 1 ? 'EMAIL AUTHENTICATION' : 'ENTER CODE'}
                    </h2>
                    <p className="text-[14px] text-[#a3b0c1] text-center mb-10 font-medium">
                        {step === 1
                            ? '회원가입을 위해 이메일 인증이 필요합니다.'
                            : `${email}로 전송된\n6자리 인증번호를 입력해주세요.`}
                    </p>

                    {/* ── 단계별 입력/버튼 UI ──────────────────────────────
                        step 1과 step 2를 조건부 렌더링으로 전환.
                        space-y-4: 각 요소 사이 세로 간격 4.
                    ─────────────────────────────────────────────────── */}
                    <div className="w-full space-y-4">
                        {step === 1 ? (
                            <>
                                {/* step 1: 이메일 입력 필드 ─────────────────────────
                                    type=email, controlled (email state와 바인딩).
                                    focus 시 ring-1 border 강조 (dark/light 모두 지원).
                                ─────────────────────────────────────────────── */}
                                <input
                                    type="email"
                                    placeholder="example@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-14 px-5 bg-[#f3f3f3] dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[12px] text-[15px] font-bold outline-none border-none focus:ring-1 focus:ring-black dark:focus:ring-[#e5e5e5]"
                                />
                                {/* "인증번호 받기" 버튼:
                                    email이 비어있거나 loading 중이면 disabled (opacity-20).
                                    로딩 중: Loader2 스피너 표시. 평상시: 텍스트 "인증번호 받기". */}
                                <button
                                    onClick={handleSendCode}
                                    disabled={!email || loading}
                                    className="w-full h-14 bg-black text-white rounded-[12px] font-bold text-[15px] disabled:opacity-20 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : '인증번호 받기'}
                                </button>
                            </>
                        ) : (
                            <>
                                {/* step 2: 인증번호 입력 필드 ───────────────────────
                                    maxLength={6}: 6자리 초과 입력 방지.
                                    text-center + tracking-[8px]: 코드 자리 사이 간격을 넓혀 가독성 향상.
                                    text-2xl + font-black: 코드 숫자를 크고 굵게 표시.
                                ─────────────────────────────────────────────── */}
                                <input
                                    type="text"
                                    placeholder="000000"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full h-14 px-5 bg-[#f3f3f3] dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[12px] text-center text-2xl font-black tracking-[8px] outline-none border-none focus:ring-1 focus:ring-black dark:focus:ring-[#e5e5e5]"
                                />
                                {/* "인증 완료" 버튼:
                                    code가 6자리 미만이거나 loading 중이면 disabled.
                                    로딩 중: Loader2 스피너. 평상시: "인증 완료" 텍스트. */}
                                <button
                                    onClick={handleVerify}
                                    disabled={code.length < 6 || loading}
                                    className="w-full h-14 bg-black text-white rounded-[12px] font-bold text-[15px] disabled:opacity-20 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : '인증 완료'}
                                </button>
                                {/* "이메일 재입력" 버튼:
                                    setStep(1)로 step 1로 되돌아가 이메일을 다시 입력하게 함.
                                    연한 회색 텍스트 스타일로 보조 액션임을 표시. */}
                                <button
                                    onClick={() => setStep(1)}
                                    className="w-full py-2 text-[13px] text-[#a3b0c1] font-bold"
                                >
                                    이메일 재입력
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
