/**
 * @file SignupPage.jsx
 * @route /signup
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, Check, X } from 'lucide-react';
import { authService } from '@/api/authService';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';

export default function SignupPage() {
    // ---------------------------------------------------------
    // [라우터 / 컨텍스트 훅 초기화]
    // ---------------------------------------------------------
    const navigate = useNavigate();
    const location = useLocation();
    const { showAlert } = useAlert();
    const { login: authLogin } = useAuth();

    const verifiedEmail = location.state?.verifiedEmail || ''; //이미 인증된 이메일 정보 저장
    const [error, setError] = useState('');

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------
    const [formData, setFormData] = useState({
        email: verifiedEmail,
        password: '',
        confirmPassword: '',
        username: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ─── 비밀번호 규칙 실시간 검증 ──────────────────
    // 비밀번호 입력값이 바뀔 때마다 이 객체가 다시 계산됨
    // /[정규식]/.test(문자열): 문자열이 정규식 패턴에 맞는지 true/false 반환
    const password = formData.password;
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
    // ---------------------------------------------------------
    // 인증된 이메일이 없으면 인증 페이지로 튕겨내기
    useEffect(() => {
        console.log("현재 location.state:", location.state);
        console.log("전달받은 이메일:", verifiedEmail);
        // verifiedEmail 체크
        if (!location.state || !verifiedEmail) {
            showAlert('이메일 인증을 먼저 진행해 주세요', '접근 제한', 'alert'); // 사용자 안내
            navigate('/verify-email', { replace: true }); // 인증 페이지로 강제 이동
            return;
        }
    }, [verifiedEmail, navigate, showAlert]);

    // ---------------------------------------------------------
    // [handleSignup] 회원가입 API 호출 핸들러
    // ---------------------------------------------------------
    const handleSignup = async (e) => {
        e.preventDefault(); // 새로고침 방지
        if (isSubmitting) return; // 이중 클릭 방지
        // 비밀번호 일치 여부 확인
        if (formData.password !== formData.confirmPassword) {
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
        setIsSubmitting(true); // 로딩 시작(버튼 비활성화)
        console.log('회원가입 페이지 시작');
        setError(''); // 이전 에러 메세지 초기화
        // 일치한 경우 
        try {
            //회원 가입 api 호출
            await authService.signup({
                email: formData.email,
                password: formData.password,
                username: formData.username
            });
            //가입 성공시 바로 로그인
            const loginResponse = await authService.login({
                email: formData.email,
                password: formData.password
            });

            console.log('실제 로그인 응답:', loginResponse);

            //const token = loginResponse.accessToken; // 응답받은 토큰 저장
            const userData = loginResponse.user || loginResponse; // 응답데이터 저장

            if (userData) {
                authLogin( userData); // 사용자 정보 저장
                showAlert('회원 가입을 환영합니다.', '회원 가입 성공', 'success');
                //window.location.href = '/';
                navigate('/', { replace: true });
            }
        }
        catch (err) {
            console.log('상세 에러', err);

            const serverError = err.response?.data;
            const errorMsg = (typeof serverError === 'string' ? serverError : serverError?.message)
                || '회원 가입 중 문제가 발생했습니다.';

            showAlert(errorMsg, '회원 가입 실패', 'alert');
            console.log('회원 가입 에러', err);
        }
        //로딩 종료
        finally {
            setIsSubmitting(false); // 로딩 종료
        }

    };

    // ---------------------------------------------------------
    // [JSX 렌더링]
    // ResponsiveLayout: showTabs={false} → 하단 탭바 숨김
    // 전체 레이아웃: 위에서 아래로 flex 컬럼, min-h-screen
    // ---------------------------------------------------------
    return (
        <ResponsiveLayout showTabs={false}>
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215]">

                {/* ── 상단 헤더 ────────────────────────────────────────
                    - 뒤로가기 버튼 (ArrowLeft 아이콘): navigate(-1)로 이전 페이지(verify-email)로 이동
                    - 중앙 제목 "회원가입"
                    - 오른쪽 빈 공간(mr-8): 제목이 시각적으로 정확히 중앙에 오도록 좌우 균형 맞춤
                ─────────────────────────────────────────────────────── */}
                <div className="flex items-center h-14 px-4 border-b border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24]">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="flex-1 text-center font-bold text-lg mr-8">회원가입</h1>
                </div>

                {/* ── 폼 영역 ──────────────────────────────────────────
                    onSubmit → handleSignup 핸들러.
                    max-w-sm + flex-col + gap-4 레이아웃.

                    [이메일 필드]
                    - readOnly: 사용자가 수정할 수 없음 (이메일 인증으로 이미 확정된 값)
                    - bg-[#f3f3f3] / text-[#a3b0c1]: 비활성화된 것처럼 보이는 회색 스타일
                    - cursor-not-allowed: 마우스 커서로 수정 불가 표시

                    [사용자 이름 필드]
                    - 닉네임(username) 입력. 활동명으로 사용.
                    - onChange: setFormData 스프레드로 username만 업데이트

                    [비밀번호 필드]
                    - type=password, onChange: password 업데이트

                    [비밀번호 확인 필드]
                    - type=password, onChange: confirmPassword 업데이트
                    - 제출 시 handleSignup에서 password와 비교 검증

                    [가입하기 버튼]
                    - isSubmitting 중: disabled + 반투명 + "가입 중..." 텍스트
                    - 정상: "가입하기" 텍스트
                ─────────────────────────────────────────────────────── */}
                <div className="flex flex-col items-center px-6 py-10">
                    <form onSubmit={handleSignup} className="w-full max-w-sm flex flex-col gap-4">

                        {/* 이메일: 이메일 인증에서 확정된 값, readOnly로 고정 */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-bold text-gray-700 dark:text-[#a3b0c1] ml-1">이메일</label>
                            <input
                                type="email"
                                placeholder="example@musinsa.com"
                                className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-[#f3f3f3] dark:bg-[#292e35] text-[#a3b0c1] rounded-[4px] text-[14px] outline-none cursor-not-allowed"
                                value={formData.email}
                                readOnly
                                required
                            />
                        </div>

                        {/* 사용자 이름: 서비스 내 활동 닉네임 */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-bold text-gray-700 dark:text-[#a3b0c1] ml-1">사용자 이름</label>
                            <input
                                type="text"
                                placeholder="활동할 이름을 입력하세요"
                                className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                maxLength={20}
                                required
                            />
                            <p className="text-[11px] text-gray-400 dark:text-[#6b7a90] ml-1 mt-1">
                                1~20자 이내로 입력해주세요 ({formData.username?.length || 0}/20)
                            </p>
                        </div>

                        {/* 비밀번호: 새로 설정할 비밀번호 */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-bold text-gray-700 dark:text-[#a3b0c1] ml-1">비밀번호</label>
                            <input
                                type="password"
                                placeholder="비밀번호"
                                className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>

                        {/* 비밀번호 확인: handleSignup에서 password와 일치 여부 검증 */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-bold text-gray-700 dark:text-[#a3b0c1] ml-1">비밀번호 확인</label>
                            <input
                                type="password"
                                placeholder="비밀번호 확인"
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


                        {/* 가입하기 버튼: isSubmitting 중에는 비활성화 */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full h-12 mt-6 bg-black text-white font-bold text-[15px] rounded-[4px] hover:bg-gray-800 transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? '가입 중...' : '가입하기'}
                        </button>
                    </form>

                    {/* ── 로그인 링크 ─────────────────────────────────────
                        이미 계정이 있는 사용자를 위한 /login 페이지 링크.
                    ─────────────────────────────────────────────────── */}
                    <div className="mt-8 text-[13px] text-gray-500 dark:text-[#a3b0c1] font-bold">
                        이미 아이디가 있으신가요? <Link to="/login" className="text-black dark:text-[#e5e5e5] underline ml-1">로그인</Link>
                    </div>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
