

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { authService } from '@/api/authService';
import { useAlert } from '@/context/AlertContext';

export default function EmailVerificationPage() {
    // ---------------------------------------------------------
    // [라우터 / 컨텍스트 훅 초기화]
    // ---------------------------------------------------------
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------

    const [email, setEmail] = useState(''); //step 1에서 사용자가 입력하는 이메일 주소.
    const [code, setCode] = useState(''); //step 2에서 사용자가 입력하는 6자리 인증번호 문자열
    const [step, setStep] = useState(1); // 1: Email, 2: Code 현재 UI 단계를 나타내는 숫자.
    const [loading, setLoading] = useState(false); // loading: true이면 API 요청 진행 중.
    const [isSubmitting, setIsSubmitting] = useState(false);  // 로딩중 여부,여러 번 호출되는 것을 방지
    const [error, setError] = useState(''); // 에러메세지

    // ---------------------------------------------------------
    // [handleSendCode] step 1 → 이메일로 인증번호 발송
    // ---------------------------------------------------------
    const handleSendCode = async () => {
        if (!email || !email.trim()) return;  // 입력 이메일 유효성 체크

        //입력 메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('올바른 이메일 형식을 입력해주세요.', '입력 오류', 'alert');
            return;
        }
        setLoading(true); // 버튼 비활성화 및 스피너 표시

        // 인증 메일 발송
        try {
            // 메일 등록 여부 확인
            const checkResult = await authService.checkEmailDuplicates(email);
            if (checkResult.isDuplicate) {
                showAlert('이미 가입된 메일입니다. 다시 확인해 보세요', '중복 가입 메일', 'alert');
                console.log('메일 중복 에러');
                return;// 인증메일 발송 안함
            }
            //메일이 등록되지 않은 경우 인증 메일 발송
            await authService.sendEmailCode(email); // 이메일 객체 전달 확인
            // 메일 발송 성공시
            setStep(2);
            showAlert('인증번호가 발송되었습니다. 메일함을 확인해주세요.', '발송 완료', 'success');
        }
        catch (err) {
            console.log('상세 에러', err);

            const serverError = err.response?.data;
            const errorMsg = (typeof serverError === 'string' ? serverError : serverError?.message)
                || '이메일 발송이 실패했습니다. 이미 가입된 이메일일 수 있습니다';

            showAlert(errorMsg, '메일 발송 실패', 'alert');
            console.log('이메일 발송 에러', err);
        }
        //로딩 종료
        finally {
            setLoading(false); // 로딩 종료
        }

    };

    // ---------------------------------------------------------
    // [handleVerify] step 2 → 인증번호 검증 및 SignupPage로 이동
    // ---------------------------------------------------------
    const handleVerify = async () => {
        if (!code || !code.trim()) return; // 코드 입력 여부 확인
        setLoading(true); //로딩 시작
        setError(''); // 이전 에러 메세지 초기화
        console.log("인증 시도 중인 이메일:", email);
        //검증 서비스 호출
        try {
            await authService.verifyEmailCode(email, code);
            console.log("가입 페이지로 넘길 이메일:", email);
            console.log("인증 성공! 이메일 데이터:", email);
            //성공시
            navigate('/signup', {
                state: { verifiedEmail: email },
                replace: true
            });
        }
        // 실패시
        catch (err) {
            console.log('상세 에러', err);

            const serverError = err.response?.data;
            const errorMsg = (typeof serverError === 'string' ? serverError : serverError?.message)
                || '인증코드가 일치하지 않습니다.';

            showAlert(errorMsg, '인증 실패', 'alert');
            console.log('인증 코드 검증 에러', err);
        }
        //로딩 종료
        finally {
            setLoading(false); // 로딩 종료
        }
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
                    <h1 className="text-[20px] font-black italic tracking-tighter uppercase"></h1>
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
                        {step === 1 ? '인증용 이메일 발송' : '인증 코드 입력'}
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
                                    type="text"
                                    inputMode="email"    // 모바일에서 이메일 키보드 표시
                                    autoComplete="email"
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
