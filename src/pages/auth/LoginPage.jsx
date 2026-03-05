/**
 * @file LoginPage.jsx
 * @route /login
 *
 * @description
 * 무신사 앱의 로그인 페이지 컴포넌트.
 * 사용자는 이메일/비밀번호로 일반 로그인하거나, 카카오 OAuth2를 통해 소셜 로그인할 수 있다.
 *
 * @주요_동작
 * 1. ProtectedRoute에서 로그인이 필요한 페이지에 비인증 상태로 접근하면,
 *    location.state.requireAuth = true 를 담아 이 페이지로 리다이렉트된다.
 *    → useEffect에서 이 값을 감지해 "로그인이 필요한 서비스입니다." 알림을 1회만 표시한다.
 * 2. handleLogin: 이메일/비밀번호 POST → 토큰+유저 정보를 AuthContext 및 localStorage에 저장.
 * 3. 카카오 버튼: window.location.href를 직접 변경해 백엔드 OAuth2 진입점으로 이동.
 *    (리다이렉트 후 KakaoCallback.jsx가 처리를 이어받음)
 * 4. 로그인 성공 후 location.state.from에 원래 가려던 경로가 있으면 그곳으로, 없으면 '/'로 이동.
 *
 * @state
 * - email {string}         - 이메일 입력 필드 값
 * - password {string}      - 비밀번호 입력 필드 값
 * - isSubmitting {boolean} - 로그인 API 요청 중 여부 (중복 제출 방지용)
 *
 * @ref
 * - hasShownAlert {React.MutableRefObject<boolean>}
 *   - ProtectedRoute 리다이렉트 경고 알림을 단 한 번만 표시하기 위한 플래그.
 *   - StrictMode의 이중 렌더링이나 의존성 변경으로 인해 알림이 여러 번 뜨는 것을 방지.
 *
 * @hooks
 * - useNavigate   : 로그인 성공 후 페이지 이동
 * - useLocation   : location.state(requireAuth, from) 읽기
 * - useAuth       : login() 함수로 전역 인증 상태 갱신
 * - useAlert      : showAlert()로 모달 알림 표시
 */

import { Link, useNavigate, useLocation } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/api/authService';
import { useEffect, useRef, useState } from 'react';

export default function LoginPage() {
    // ---------------------------------------------------------
    // [라우터 / 컨텍스트 훅 초기화]
    // navigate : 로그인 성공 시 목적지 페이지로 이동
    // location : state를 통해 ProtectedRoute에서 넘어온 정보 확인
    // authLogin: AuthContext의 login 함수 – token과 user 객체를 전역 상태에 등록
    // showAlert: AlertContext의 모달 알림 함수
    // ---------------------------------------------------------
    const navigate = useNavigate();
    const location = useLocation();
    const { login: authLogin } = useAuth();
    const { showAlert } = useAlert();

    // hasShownAlert: ProtectedRoute 경고 알림이 여러 번 뜨는 것을 막는 ref
    // (렌더가 두 번 실행되는 React StrictMode 환경에서도 알림은 1회만 표시됨)
    const hasShownAlert = useRef(false);

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------

    // email: 사용자가 입력하는 이메일 주소 (controlled input)
    const [email, setEmail] = useState('');

    // password: 사용자가 입력하는 비밀번호 (controlled input, type=password로 마스킹)
    const [password, setPassword] = useState('');

    // isSubmitting: true이면 로그인 API 요청 중. 버튼 비활성화 및 텍스트 변경에 사용.
    // 중복 클릭으로 API가 여러 번 호출되는 것을 방지한다.
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ---------------------------------------------------------
    // [useEffect #1] ProtectedRoute 리다이렉트 감지
    // 실행 시점: location.state 또는 showAlert가 바뀔 때
    // 조건: location.state.requireAuth === true 이고 아직 알림을 표시한 적 없을 때
    // 동작: "로그인이 필요한 서비스입니다." 모달 알림을 표시하고,
    //        hasShownAlert.current를 true로 바꿔 이후 재실행 시 알림이 중복되지 않도록 한다.
    // 클린업: 없음 (이 useEffect는 부수효과(알림 표시)만 수행하며, 구독/타이머 없음)
    // ---------------------------------------------------------
    useEffect(() => {
        // TODO: location.state?.requireAuth가 true이고 hasShownAlert.current가 false일 때
        //       showAlert('로그인이 필요한 서비스입니다.\n로그인 후 이용해주세요.', '접근 제한') 호출
        //       후 hasShownAlert.current = true 로 설정
    }, [location.state, showAlert]);

    // ---------------------------------------------------------
    // [handleLogin] 이메일/비밀번호 로그인 처리 함수
    //
    // @param {React.FormEvent} e - form onSubmit 이벤트 (e.preventDefault로 페이지 새로고침 방지)
    //
    // 동작 순서:
    //   [1] 이미 요청 중이면 (isSubmitting === true) 즉시 종료해 중복 호출 방지
    //   [2] isSubmitting = true 로 버튼 비활성화
    //   [3] authService.login({ email, password }) 호출
    //       → API: POST /api/auth/login
    //       → 성공 시 백엔드가 { token: '...JWT...', user: { id, ... } } 반환
    //   [4] 응답에 token과 user가 모두 있으면:
    //       - authLogin(token, user): AuthContext에 토큰/유저 등록 (localStorage도 내부에서 저장)
    //       - "로그인되었습니다." 성공 알림 표시
    //       - location.state.from.pathname(원래 가려던 경로) 또는 '/'로 navigate
    //   [5] token/user가 없거나 예외 발생 시: 오류 알림 표시
    //   [6] finally: isSubmitting = false 로 버튼 재활성화
    // ---------------------------------------------------------
    const handleLogin = async (e) => {
        // TODO: e.preventDefault() 호출
        // TODO: isSubmitting 중복 방지 체크 (true이면 return)
        // TODO: setIsSubmitting(true) 호출
        // TODO: authService.login({ email, password }) 호출 → response의 token, user 확인
        // TODO: authLogin(token, user) 로 전역 상태 저장 후 showAlert 성공 알림
        // TODO: location.state?.from?.pathname || '/' 로 navigate (replace: true)
        // TODO: 에러 시 error.response?.data?.message 또는 기본 메시지로 showAlert() 호출
        // TODO: finally에서 setIsSubmitting(false) 호출
    };

    // ---------------------------------------------------------
    // [JSX 렌더링]
    // ResponsiveLayout: showTabs={false} → 하단 탭바 숨김 (로그인 페이지에서는 탭 불필요)
    // 전체 레이아웃: 세로 중앙 정렬 flex 컨테이너, 최소 높이 calc(100vh - 100px)
    // ---------------------------------------------------------
    return (
        <ResponsiveLayout showTabs={false}>
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-6 bg-white dark:bg-[#101215]">

                {/* ── 로고 섹션 ──────────────────────────────────────────
                    "MUSINSA" 텍스트 로고와 한 줄 슬로건.
                    로고는 4xl + font-black + italic 스타일로 강조됨.
                    슬로건("다양한 패션이 모이는 곳, 무신사")은 연한 회색(#a3b0c1)으로 표시.
                ─────────────────────────────────────────────────────── */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-black tracking-tighter text-black dark:text-[#e5e5e5] mb-2">MUSINSA</h1>
                    <p className="text-[#a3b0c1] text-[13px] tracking-wide">다양한 패션이 모이는 곳, 무신사</p>
                </div>

                {/* ── 로그인 폼 섹션 ─────────────────────────────────────
                    onSubmit → handleLogin 핸들러 호출.
                    max-w-sm로 좁은 폼 너비 고정, flex-col + gap-3으로 세로 배치.

                    [입력 필드]
                    - 이메일 input (type=email, controlled): email state와 양방향 바인딩
                    - 비밀번호 input (type=password, controlled): password state와 양방향 바인딩
                    - required 속성으로 빈값 제출 방지

                    [로그인 버튼]
                    - isSubmitting이 true이면 disabled + 반투명 + "LOGGING IN..." 텍스트
                    - isSubmitting이 false이면 활성화 + "LOGIN" 텍스트
                    - active:scale-[0.98]: 클릭 시 약간 축소되는 피드백 효과

                    [구분선 (OR)]
                    - flex로 좌우 border-t 라인과 "OR" 텍스트를 수평 정렬

                    [카카오 로그인 버튼]
                    - type="button": form submit 이벤트 차단 (handleLogin 호출 안 됨)
                    - onClick: window.location.href를 백엔드 OAuth2 진입점으로 직접 변경
                      (http://localhost:8080/api/oauth2/authorization/kakao)
                    - 카카오 공식 색상 #FEE500(배경) + #191919(텍스트)
                    - SVG 아이콘(카카오 로고 말풍선 형태) 인라인 포함
                ─────────────────────────────────────────────────────── */}
                <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-3">
                    <input
                        type="email"
                        placeholder="아이디(이메일)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors"
                        required
                    />
                    <input
                        type="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-12 px-4 border border-[#e5e5e5] dark:border-[#292e35] bg-white dark:bg-[#1c1f24] text-black dark:text-[#e5e5e5] rounded-[4px] text-[14px] focus:outline-none focus:border-black dark:focus:border-[#e5e5e5] transition-colors"
                        required
                    />

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full h-12 mt-2 bg-black dark:bg-[#e5e5e5] text-white dark:text-black font-black italic tracking-widest uppercase text-[15px] rounded-[4px] hover:bg-gray-800 dark:hover:bg-white transition-all active:scale-[0.98] ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSubmitting ? 'LOGGING IN...' : 'LOGIN'}
                    </button>

                    {/* ── 구분선 (OR) ─────────────────────────────────────
                        일반 로그인과 소셜 로그인을 시각적으로 구분하는 수평 줄 + 텍스트.
                        flex로 좌우 border-t 라인을 늘리고 중앙에 "OR" 텍스트 배치.
                    ─────────────────────────────────────────────────── */}
                    <div className="relative my-6 flex items-center">
                        <div className="flex-grow border-t border-[#f3f3f3] dark:border-[#292e35]"></div>
                        <span className="flex-shrink mx-4 text-[11px] font-black italic tracking-widest text-[#ccd3db] uppercase">OR</span>
                        <div className="flex-grow border-t border-[#f3f3f3] dark:border-[#292e35]"></div>
                    </div>

                    {/* ── 카카오 소셜 로그인 버튼 ───────────────────────────
                        type="button"으로 form submit을 막고,
                        onClick에서 window.location.href를 백엔드 OAuth2 URL로 직접 이동시킨다.
                        백엔드(Spring Security)가 카카오 인증 서버로 리다이렉트를 처리하고,
                        최종적으로 /auth/kakao/callback (KakaoCallback.jsx)으로 돌아온다.
                        카카오 디자인 가이드: 배경 #FEE500, 텍스트 #191919, 인라인 SVG 아이콘.
                    ─────────────────────────────────────────────────── */}
                    <button
                        type="button"
                        onClick={() => window.location.href = 'http://localhost:8080/api/oauth2/authorization/kakao'}
                        className="w-full h-12 bg-[#FEE500] text-[#191919] font-bold text-[15px] rounded-[4px] flex items-center justify-center gap-3 hover:bg-[#FADA0A] transition-all active:scale-[0.98]"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 1.5C4.029 1.5 0 4.605 0 8.438C0 10.89 1.665 13.035 4.155 14.318L3.09 18L7.14 15.345C7.74 15.42 8.37 15.465 9 15.465C13.971 15.465 18 12.36 18 8.528C18 4.695 13.971 1.59 9 1.59V1.5Z" fill="black" />
                        </svg>
                        카카오 로그인
                    </button>
                </form>

                {/* ── 하단 링크 섹션 ────────────────────────────────────
                    - "비밀번호 찾기" → /forgot-password 페이지로 이동 (Link 컴포넌트)
                    - 세로 구분선 (1px 높이 3 선)
                    - "회원가입" → /verify-email 페이지로 이동.
                      회원가입은 이메일 인증 먼저 완료해야 SignupPage에 접근 가능하므로
                      /signup이 아닌 /verify-email로 연결함.
                      font-black + italic 스타일로 강조.
                ─────────────────────────────────────────────────────── */}
                <div className="flex items-center gap-5 mt-10 text-[12px] font-bold text-[#a3b0c1] uppercase tracking-wider">
                    <Link to="/forgot-password" title="비밀번호 찾기" className="hover:text-black dark:hover:text-[#e5e5e5] transition-colors">비밀번호 찾기</Link>
                    <div className="w-[1px] h-3 bg-[#e5e5e5] dark:bg-[#292e35]"></div>
                    <Link to="/verify-email" title="회원가입" className="hover:text-black dark:hover:text-[#e5e5e5] text-black dark:text-[#e5e5e5] font-black italic">회원가입</Link>
                </div>

            </div>
        </ResponsiveLayout>
    );
}
