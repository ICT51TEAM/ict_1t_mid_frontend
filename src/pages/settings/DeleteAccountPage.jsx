/**
 * @file DeleteAccountPage.jsx
 * @route /settings/delete-account
 * @description 로그인한 사용자가 자신의 계정을 영구 삭제하는 페이지.
 *
 * [화면 구성]
 *   1. 상단 고정 헤더 - 뒤로가기 버튼(ArrowLeft) / "계정 탈퇴" 제목
 *   2. 경고 영역:
 *      - 빨간 경고 아이콘(AlertTriangle) 원형 배경
 *      - "계정을 삭제하시겠습니까?" 제목
 *      - 삭제 시 영구 삭제되는 데이터 안내 문구
 *   3. 폼 영역:
 *      - 비밀번호 입력 필드 (확인용)
 *      - "계정 영구 삭제" 버튼 (빨간색)
 *
 * [상태 변수]
 *   @state {string} password - 계정 삭제 확인을 위해 입력하는 현재 비밀번호
 *       초기값: '' (빈 문자열)
 *       onChange에서 setPassword로 직접 업데이트 (단일 필드라 formData 객체 불필요)
 *
 * [주요 동작: handleSubmit]
 *   1. e.preventDefault(): 기본 form submit(페이지 새로고침) 방지
 *   2. window.confirm('정말 탈퇴하시겠습니까? 관련 데이터가 모두 삭제됩니다.')
 *      → 취소 클릭 시: 아무 동작 없음 (함수 종료 안 됨 주의 - if 블록 미실행)
 *      → 확인(OK) 클릭 시:
 *   3. userService.deleteAccount({ password }) 호출
 *      → DELETE /api/users/me (또는 유사 엔드포인트)
 *      → { password } 객체를 요청 바디에 담아 전송 (서버에서 비밀번호 검증)
 *   4. alert('탈퇴 처리가 완료되었습니다.')
 *   5. navigate('/login'): 로그인 페이지로 이동
 *      (실제 로그아웃/토큰 삭제는 미구현 - AuthContext logout 없음)
 *
 * [UX 설계]
 *   - 경고 아이콘과 안내 문구로 되돌릴 수 없음을 강조
 *   - 버튼 색상: 빨간색(bg-red-500) → hover 시 더 진한 빨간색(bg-red-600)
 *   - 비밀번호 입력 포커스 테두리: 빨간색(focus:border-red-500) → 삭제 행위 강조
 *   - window.confirm으로 2단계 확인 절차 적용 (실수 방지)
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { userService } from '@/api/userService';
import { useAuth } from '@/context/AuthContext';

export default function DeleteAccountPage() {
    const navigate = useNavigate();

    const {logout} = useAuth();
    // -------------------------------------------------------------------------
    // [상태 변수 선언]
    // -------------------------------------------------------------------------

    /**
     * password: 계정 삭제 전 신원 확인용으로 입력하는 현재 비밀번호.
     * 단일 문자열 상태 (폼 필드가 하나뿐이라 formData 객체 대신 단순 string 사용).
     * input의 value와 양방향 바인딩되며, onChange에서 setPassword로 직접 업데이트.
     * userService.deleteAccount({ password })에 그대로 전달됨.
     */
    const [password, setPassword] = useState('');

    // -------------------------------------------------------------------------
    // [핸들러 함수]
    // -------------------------------------------------------------------------

    /**
     * handleSubmit: 계정 영구 삭제 처리 함수.
     *
     * @param {Event} e - form submit 이벤트
     *
     * 처리 순서:
     *   1. e.preventDefault(): 브라우저 기본 submit 동작(페이지 새로고침) 차단
     *   2. window.confirm(): 최종 확인 다이얼로그 표시
     *      메시지: '정말 탈퇴하시겠습니까? 관련 데이터가 모두 삭제됩니다.'
     *      - 취소: if 블록이 실행되지 않아 아무 동작 없음
     *      - 확인: 아래 3~5단계 실행
     *   3. userService.deleteAccount({ password }) 호출
     *      → 백엔드에 비밀번호를 담아 DELETE 요청
     *      → 서버에서 비밀번호 검증 후 계정 및 모든 관련 데이터 삭제
     *   4. alert('탈퇴 처리가 완료되었습니다.'): 사용자에게 완료 피드백
     *      ※ 원본 코드에 '완료' 오타('완려')가 있으나 실제 코드 변경 없이 유지됨
     *   5. navigate('/login'): 로그인 페이지로 이동
     *      ※ 주의: AuthContext의 logout/토큰 삭제가 호출되지 않아 세션이 완전히
     *              정리되지 않을 수 있음. 백엔드 토큰 무효화에 의존해야 함.
     *
     * 에러 처리: try-catch 없음. API 실패 시 미처리 예외가 콘솔에 출력됨.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        const isConfirmed = await showAlert(
        '정말 탈퇴하시겠습니까? 관련 데이터가 모두 삭제됩니다.',
        '회원 탈퇴 확인',
        'confirm' // 프로젝트의 Alert 종류에 따라 'warning' 또는 'confirm' 사용
    );
        if (isConfirmed) {
            await userService.deleteAccount({ password });
            showAlert('탈퇴 처리가 완료되었습니다.','탈퇴 완료','success');
            logout();
            navigate('/login');
        }
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
                    - 중: "계정 탈퇴" 제목 (flex-1 + text-center + mr-8로 중앙 정렬)
                    - sticky top-0 z-10: 스크롤 시 최상단에 고정
                ============================================================ */}
                <div className="flex items-center h-14 px-4 border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 bg-white dark:bg-[#1c1f24] z-10">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="flex-1 text-center font-bold text-lg mr-8">계정 탈퇴</h1>
                </div>

                {/* ============================================================
                    [섹션 2] 경고 영역 + 비밀번호 입력 폼
                    - max-w-sm mx-auto: 중앙 정렬, 최대 너비 384px
                ============================================================ */}
                <div className="p-6 max-w-sm mx-auto w-full">

                    {/* ----------------------------------------------------------
                        경고 안내 영역
                        - 빨간 삼각형 경고 아이콘(AlertTriangle) → 64px 원형 배경
                          배경: 연한 빨간(red-50 / dark: red-900/20)
                          테두리: 연한 빨간(red-100 / dark: red-900/30)
                        - "계정을 삭제하시겠습니까?" 제목 (18px 볼드)
                        - 삭제 시 영향 안내 문구:
                          프로필, 사진, 동영상, 댓글, 좋아해 기록이 영구 삭제됨을 경고
                    ---------------------------------------------------------- */}
                    <div className="mb-10 text-center">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/30">
                            <AlertTriangle className="text-red-500" size={32} />
                        </div>
                        <h2 className="text-[18px] font-bold mb-3">계정을 삭제하시겠습니까?</h2>
                        <p className="text-[13px] text-[#7b8b9e] leading-relaxed">
                            계정을 삭제하면 프로필, 사진, 동영상, 댓글, 좋아해 기록 등 모든 데이터가 영구적으로 삭제됩니다.
                        </p>
                    </div>

                    {/* ----------------------------------------------------------
                        계정 삭제 확인 폼
                        - onSubmit → handleSubmit
                        - 비밀번호 입력 필드:
                            type="password": 입력값 마스킹
                            placeholder="비밀번호": 입력 안내
                            required: 브라우저 레벨 필수 입력 검사
                            focus 테두리: 빨간색(focus:border-red-500) → 위험 행위 강조
                            value/onChange: password 상태와 양방향 바인딩
                        - "계정 영구 삭제" 버튼:
                            type="submit": form onSubmit 트리거
                            bg-red-500 / hover:bg-red-600: 위험 행위를 빨간색으로 강조
                            mt-6: 입력 필드와의 상단 여백
                    ---------------------------------------------------------- */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* 비밀번호 확인 입력 필드 */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[13px] font-bold text-gray-500 dark:text-[#a3b0c1] ml-1">회원님의 비밀번호</label>
                            <input
                                type="password"
                                className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-red-500 transition-colors"
                                required
                                placeholder="비밀번호"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {/* 계정 삭제 최종 제출 버튼: 빨간색으로 위험 행위 강조 */}
                        <button
                            type="submit"
                            className="w-full h-12 mt-6 bg-red-500 text-white font-bold text-[15px] rounded-[4px] hover:bg-red-600 transition-colors"
                        >
                            계정 영구 삭제
                        </button>
                    </form>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
