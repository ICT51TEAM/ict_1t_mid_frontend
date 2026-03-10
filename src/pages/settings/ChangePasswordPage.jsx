/**
 * @file ChangePasswordPage.jsx
 * @route /settings/change-password
 * @description 로그인한 사용자가 계정 비밀번호를 변경하는 페이지.
 *
 * [화면 구성]
 *   1. 상단 고정 헤더 - 뒤로가기 버튼(ArrowLeft) / "비밀번호 변경" 제목
 *   2. 폼 영역 (max-w-sm, 중앙 정렬):
 *      - 현재 비밀번호 입력 (required)
 *      - 새 비밀번호 입력 (required)
 *      - 새 비밀번호 확인 입력 (required)
 *      - "비밀번호 변경 완료" 제출 버튼
 *
 * [상태 변수]
 *   @state {object} formData - 폼 입력값 객체
 *       formData.currentPassword  {string} - 현재(기존) 비밀번호 입력값
 *       formData.newPassword      {string} - 새로 설정할 비밀번호 입력값
 *       formData.confirmPassword  {string} - 새 비밀번호 확인용 재입력값
 *
 * [주요 동작: handleSubmit]
 *   1. e.preventDefault(): 기본 form submit(페이지 새로고침) 방지
 *   2. 유효성 검사: formData.newPassword !== formData.confirmPassword
 *      → alert('비밀번호가 일치하지 않습니다.') 후 return (API 호출 없이 중단)
 *   3. userService.changePassword(email, currentPassword, newPassword) 호출
 *      → PUT /api/users/me/password 또는 유사 엔드포인트
 *      → 첫 번째 인수로 'user@example.com'이 하드코딩됨 (실제 사용자 이메일이 아님)
 *   4. alert('비밀번호가 변경되었습니다.')
 *   5. navigate('/settings'): 설정 페이지로 이동
 *
 * [입력 필드 공통 스타일]
 *   - 높이 48px, 좌우 패딩 16px
 *   - 테두리: 라이트 #e5e5e5 / 다크 #292e35
 *   - 배경: 라이트 흰색 / 다크 #1c1f24
 *   - 포커스: 라이트 검정 테두리 / 다크 흰색 테두리 (outline 없음)
 *   - type="password": 브라우저 기본 비밀번호 마스킹 적용
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, X, Check } from 'lucide-react';
import { userService } from '@/api/userService';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';

export default function ChangePasswordPage() {
    const navigate = useNavigate();

    // -------------------------------------------------------------------------
    // [상태 변수 선언]
    // -------------------------------------------------------------------------

    /**
     * formData: 비밀번호 변경 폼의 세 가지 입력값을 하나의 객체로 관리.
     * - currentPassword: 현재 비밀번호 (서버에서 기존 비밀번호 검증에 사용)
     * - newPassword:     새 비밀번호 (실제 변경될 비밀번호)
     * - confirmPassword: 새 비밀번호 확인 (클라이언트 측 일치 검사용, 서버에 전송 안 함)
     * 각 input의 onChange에서 스프레드 연산자로 해당 키만 업데이트.
     */
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

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

    // -------------------------------------------------------------------------
    // [핸들러 함수]
    // -------------------------------------------------------------------------

    /**
     * handleSubmit: 폼 제출 시 비밀번호 변경 처리.
     *
     * @param {Event} e - form submit 이벤트
     *
     * 처리 순서:
     *   1. e.preventDefault(): 브라우저 기본 동작(페이지 새로고침) 차단
     *   2. 클라이언트 측 유효성 검사:
     *      newPassword !== confirmPassword이면 alert 후 함수 종료
     *      (두 필드가 일치해야만 API 호출 진행)
     *   3. userService.changePassword('user@example.com', currentPassword, newPassword) 호출
     *      → 백엔드 비밀번호 변경 API 요청
     *      주의: 첫 번째 인수 이메일이 'user@example.com'으로 하드코딩되어 있음.
     *            실제 운영에서는 AuthContext에서 로그인된 사용자의 이메일을 사용해야 함.
     *   4. 성공 시: alert('비밀번호가 변경되었습니다.') → navigate('/settings')
     *   5. 에러 처리: try-catch 없음 (API 에러 시 콘솔에 미처리 예외로 표시됨)
     */
    const { user } = useAuth();  // 실제 어떻게 쓰이는지에 따라 다름............ 아래 user.email도
    const [loading, setLoading] = useState(false);
    const { showConfirm, showAlert } = useAlert(); 
    const handleSubmit = async (e) => {
        // TODO: [1] e.preventDefault() 호출
        // TODO: [2] 클라이언트 측 유효성 검사:
        //           formData.newPassword !== formData.confirmPassword이면
        //           alert('비밀번호가 일치하지 않습니다.') 후 return
        // TODO: [3] userService.changePassword('user@example.com', formData.currentPassword, formData.newPassword) 호출
        //           주의: 첫 번째 인수 이메일이 'user@example.com'으로 하드코딩되어 있음
        // TODO: [4] 성공 시 alert('비밀번호가 변경되었습니다.') → navigate('/settings')
        // 힌트: try-catch 없이 구현 (API 에러 시 콘솔에 미처리 예외로 표시됨)
        e.preventDefault(); //submit 이벤트의 기본 동작(페이지 새로고침) 방지
        if (formData.newPassword !== formData.confirmPassword) {
            showAlert('비밀번호가 일치하지 않습니다.');
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
        await userService.changePassword({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword
        });
        showAlert('비밀번호가 변경되었습니다.', '성공', 'success');
        navigate('/settings');
    };

    // -------------------------------------------------------------------------
    // [JSX 렌더링]
    // -------------------------------------------------------------------------

    return (
        <ResponsiveLayout showTabs={false}>
            {/* 전체 페이지 컨테이너 */}
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5]">

                {/* ============================================================
                    [섹션 1] 상단 고정 헤더
                    - 좌: ArrowLeft 버튼 → navigate(-1) (이전 페이지로)
                    - 중: "비밀번호 변경" 제목 (flex-1 + text-center로 중앙 정렬)
                    - 우: mr-8 여백으로 제목 중앙 정렬을 위한 좌측 버튼과 균형 맞춤
                    - sticky top-0 z-10: 스크롤 시 최상단에 고정
                ============================================================ */}
                <div className="flex items-center h-14 px-4 border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 bg-white dark:bg-[#1c1f24] z-10">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="flex-1 text-center font-bold text-lg mr-8">비밀번호 변경</h1>
                </div>

                {/* ============================================================
                    [섹션 2] 비밀번호 변경 폼
                    - max-w-sm mx-auto: 중앙 정렬, 최대 너비 384px
                    - onSubmit → handleSubmit
                    - flex flex-col gap-5: 세 입력 그룹 세로 배치, 20px 간격

                    [입력 그룹 1] 현재 비밀번호
                      - type="password": 입력값 마스킹
                      - required: 브라우저 레벨 필수 입력 검사
                      - value/onChange: formData.currentPassword 양방향 바인딩

                    [입력 그룹 2] 새 비밀번호
                      - pt-4: 위 그룹과 시각적 구분을 위한 추가 상단 패딩
                      - value/onChange: formData.newPassword 양방향 바인딩

                    [입력 그룹 3] 새 비밀번호 확인
                      - 새 비밀번호와 일치 여부를 handleSubmit에서 검사
                      - value/onChange: formData.confirmPassword 양방향 바인딩

                    [제출 버튼]
                      - type="submit": 클릭 시 form의 onSubmit(handleSubmit) 트리거
                      - mt-6: 입력 그룹과의 상단 여백
                      - 검정 배경, 흰 텍스트, hover 시 dark gray
                ============================================================ */}
                <div className="p-6 max-w-sm mx-auto w-full">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {/* 현재 비밀번호 입력 */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-bold text-gray-500 dark:text-[#a3b0c1] ml-1">현재 비밀번호</label>
                            <input
                                type="password"
                                className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors"
                                required
                                value={formData.currentPassword}
                                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            />
                        </div>

                        {/* 새 비밀번호 입력: pt-4로 이전 그룹과 시각적 간격 추가 */}
                        <div className="flex flex-col gap-1.5 pt-4">
                            <label className="text-[13px] font-bold text-gray-500 dark:text-[#a3b0c1] ml-1">새 비밀번호</label>
                            <input
                                type="password"
                                className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors"
                                required
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            />
                        </div>

                        {/* 새 비밀번호 확인 입력: handleSubmit에서 newPassword와 일치 여부 검사 */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-bold text-gray-500 dark:text-[#a3b0c1] ml-1">새 비밀번호 확인</label>
                            <input
                                type="password"
                                className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors"
                                required
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                                        <Check className="w-[18px] h-[18px] text-primary" strokeWidth={3} />
                                    ) : (
                                        <X className="w-[18px] h-[18px] text-text-disabled" strokeWidth={2.5} />
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
                                        <Check className="w-[18px] h-[18px] text-primary" strokeWidth={3} />
                                    ) : (
                                        <X className="w-[18px] h-[18px] text-text-disabled" strokeWidth={2.5} />
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
                                        <Check className="w-[18px] h-[18px] text-primary" strokeWidth={3} />
                                    ) : (
                                        <X className="w-[18px] h-[18px] text-text-disabled" strokeWidth={2.5} />
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
                                        <Check className="w-[18px] h-[18px] text-primary" strokeWidth={3} />
                                    ) : (
                                        <X className="w-[18px] h-[18px] text-text-disabled" strokeWidth={2.5} />
                                    )}
                                    <span
                                        className={`text-[13px] ${passwordRules.hasSpecial ? 'text-text-primary font-bold' : 'text-text-tertiary font-medium'}`}
                                    >
                                        특수문자 포함 (!@#$%^&* 등)
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* 제출 버튼: type="submit"으로 form의 onSubmit 트리거 */}
                        <button
                            type="submit"
                            className="w-full h-12 mt-6 bg-black text-white font-bold text-[15px] rounded-[4px] hover:bg-gray-800 transition-colors"
                        >
                            비밀번호 변경 완료
                        </button>
                    </form>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
