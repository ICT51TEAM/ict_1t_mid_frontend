/**
 * @file SignupPage.jsx
 * @route /signup
 *
 * @description
 * 무신사 앱의 회원가입 최종 정보 입력 페이지.
 * 이 페이지는 반드시 /verify-email (EmailVerificationPage) 에서 이메일 인증을 완료한 뒤
 * navigate('/signup', { state: { verifiedEmail: '...' } }) 를 통해 진입해야 한다.
 *
 * @사전조건
 * - location.state.verifiedEmail 이 존재해야 한다.
 * - 직접 URL로 접근하거나 verifiedEmail 이 없으면, useEffect가 즉시
 *   /verify-email로 replace 리다이렉트하여 이 페이지를 볼 수 없도록 막는다.
 *
 * @회원가입_흐름
 * [EmailVerificationPage] → 이메일 인증 성공
 *   → navigate('/signup', { state: { verifiedEmail } })
 *   → [SignupPage] 이메일(읽기 전용) + 사용자 이름 + 비밀번호 + 비밀번호 확인 입력
 *   → handleSignup → POST /api/auth/signup
 *   → 성공 시 /login으로 이동 ("가입 완료 후 로그인하세요")
 *
 * @state
 * - formData {object}          - 폼 전체 데이터를 하나의 객체로 관리
 *   - email {string}           - 이메일 인증 페이지에서 받아온 이메일 (읽기 전용, 수정 불가)
 *   - password {string}        - 사용자가 설정할 비밀번호
 *   - confirmPassword {string} - 비밀번호 확인 (handleSignup에서 password와 일치 여부 검증)
 *   - username {string}        - 활동할 닉네임(사용자 이름)
 * - isSubmitting {boolean}     - 가입 API 요청 중 여부 (중복 제출 방지)
 *
 * @hooks
 * - useNavigate  : 페이지 이동 (가입 성공 → /login, 미인증 접근 → /verify-email)
 * - useLocation  : location.state.verifiedEmail 읽기
 * - useAlert     : 알림 모달 표시
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft } from 'lucide-react';
import { authService } from '@/api/authService';
import { useAlert } from '@/context/AlertContext';

export default function SignupPage() {
    // ---------------------------------------------------------
    // [라우터 / 컨텍스트 훅 초기화]
    // navigate  : 가입 성공 → /login, 미인증 접근 → /verify-email replace
    // location  : EmailVerificationPage가 전달한 verifiedEmail 읽기
    // showAlert : 모달 알림 (입력 오류, 가입 성공, 가입 실패)
    // ---------------------------------------------------------
    const navigate = useNavigate();
    const location = useLocation();
    const { showAlert } = useAlert();

    // verifiedEmail: EmailVerificationPage에서 navigate state로 전달된 이미 인증된 이메일.
    // 없으면 빈 문자열('')로 초기화되고, 이후 useEffect에서 /verify-email로 튕겨낸다.
    // 이메일 인증 페이지에서 넘어온 이메일 정보 획득
    const verifiedEmail = location.state?.verifiedEmail || '';

    // ---------------------------------------------------------
    // [상태 변수]
    // formData: 폼 전체를 하나의 객체로 관리하는 controlled state.
    //   - email: verifiedEmail로 초기화, readOnly input에 표시됨 (사용자가 수정 불가)
    //   - password: 빈 문자열로 시작, 비밀번호 입력 필드와 바인딩
    //   - confirmPassword: 빈 문자열로 시작, 비밀번호 확인 필드와 바인딩
    //   - username: 빈 문자열로 시작, 닉네임 입력 필드와 바인딩
    // 각 필드 변경 시: setFormData({ ...formData, 해당필드: 새값 }) 스프레드 패턴 사용
    // ---------------------------------------------------------
    const [formData, setFormData] = useState({
        email: verifiedEmail,
        password: '',
        confirmPassword: '',
        username: ''
    });

    // isSubmitting: true이면 API 요청 진행 중 → 가입 버튼 disabled + "가입 중..." 텍스트 표시
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ---------------------------------------------------------
    // [useEffect #1] 미인증 접근 차단
    // 실행 시점: 컴포넌트 마운트 시 및 verifiedEmail, navigate, showAlert 변경 시
    // 조건: verifiedEmail이 빈 문자열('')이면 → 이메일 인증이 완료되지 않은 상태
    // 동작:
    //   1. "이메일 인증이 먼저 필요합니다." 알림 표시
    //   2. navigate('/verify-email', { replace: true })로 강제 이동
    //      (replace: true → 브라우저 히스토리에 /signup이 쌓이지 않아 뒤로가기해도 다시 못 들어옴)
    // 클린업: 없음
    // ---------------------------------------------------------
    // 인증된 이메일이 없으면 인증 페이지로 튕겨내기
    useEffect(() => {
        // TODO: verifiedEmail이 비어있으면 showAlert('이메일 인증이 먼저 필요합니다.', '접근 제한') 호출 후
        //       navigate('/verify-email', { replace: true }) 로 강제 이동
    }, [verifiedEmail, navigate, showAlert]);

    // ---------------------------------------------------------
    // [handleSignup] 회원가입 API 호출 핸들러
    //
    // @param {React.FormEvent} e - form onSubmit 이벤트
    //
    // 동작 순서:
    //   [1] e.preventDefault(): 기본 form submit(페이지 새로고침) 차단
    //   [2] isSubmitting 중복 제출 방지 체크
    //   [3] formData.password !== formData.confirmPassword 이면
    //       "비밀번호가 일치하지 않습니다." 알림 표시하고 함수 종료 (API 호출 안 함)
    //   [4] isSubmitting = true
    //   [5] authService.signup({ email, password, username }) 호출
    //       → API: POST /api/auth/signup
    //       → 요청 바디: { email: formData.email, password: formData.password, username: formData.username }
    //       → confirmPassword는 프론트엔드에서만 검증하고, 백엔드로는 전송하지 않음
    //   [6] 성공: "회원가입이 완료되었습니다. 로그인해주세요." 알림 → /login으로 이동
    //   [7] 실패: 백엔드 메시지 또는 기본 오류 메시지 알림
    //   [8] finally: isSubmitting = false
    // ---------------------------------------------------------
    const handleSignup = async (e) => {
        // TODO: e.preventDefault() 호출
        // TODO: isSubmitting 중복 방지 체크 (true이면 return)
        // TODO: formData.password !== formData.confirmPassword 이면
        //       showAlert('비밀번호가 일치하지 않습니다.', '입력 오류') 후 return
        // TODO: setIsSubmitting(true) 호출
        // TODO: authService.signup({ email: formData.email, password: formData.password, username: formData.username }) 호출
        // TODO: 성공 시 showAlert('회원가입이 완료되었습니다. 로그인해주세요.', '가입 성공', 'success') 후 navigate('/login')
        // TODO: 실패 시 error.response?.data?.message 또는 '회원가입 중 오류가 발생했습니다.' 로 showAlert
        // TODO: finally에서 setIsSubmitting(false) 호출
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
                                required
                            />
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
