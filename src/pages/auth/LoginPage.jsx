/**
 * ──────────────────────────────────────────────────────
 * LoginPage.tsx — 로그인 페이지
 * ──────────────────────────────────────────────────────
 *
 * [역할]
 * 사용자가 이메일+비밀번호 또는 카카오 로그인으로 로그인하는 화면.
 *
 * [로그인 흐름]
 * 1) 이메일/비밀번호 입력 → "로그인" 버튼 클릭
 * 2) authService.login() → 백엔드 /api/auth/login에 POST 요청
 * 3) 성공 시: AuthContext의 login() 호출 → 토큰+사용자정보 저장 → /feed로 이동
 * 4) 실패 시: 에러 메시지 표시
 *
 * [상태(state) 관리]
 *   - email, password: 입력값
 *   - isLoading: 로딩 중인지 (버튼 비활성화, 스피너 표시)
 *   - error: 에러 메시지
 * ──────────────────────────────────────────────────────
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
    // ---------------------------------------------------------
    const navigate = useNavigate();
    const location = useLocation();
    const { login: authLogin } = useAuth();
    const { showAlert } = useAlert();
    const hasShownAlert = useRef(false);

    // ---------------------------------------------------------
    // [상태 변수]
    // ---------------------------------------------------------

    const [email, setEmail] = useState('');  // 이메일 입력값
    const [password, setPassword] = useState(''); //패스워드 입력값
    const [isSubmitting, setIsSubmitting] = useState(false);  // 로딩중 여부,여러 번 호출되는 것을 방지
    const [error, setError] = useState(''); // 에러메세지


    // ---------------------------------------------------------
    // [useEffect #1] ProtectedRoute 리다이렉트 감지
    // 실행 시점: location.state 또는 showAlert가 바뀔 때
    // 조건: location.state.requireAuth === true 이고 아직 알림을 표시한 적 없을 때
    // 동작: "로그인이 필요한 서비스입니다." 모달 알림을 표시하고,
    //        hasShownAlert.current를 true로 바꿔 이후 재실행 시 알림이 중복되지 않도록 한다.
    // 클린업: 없음 (이 useEffect는 부수효과(알림 표시)만 수행하며, 구독/타이머 없음)
    // ---------------------------------------------------------
    useEffect(() => {
        if (location.state?.requireAuth && !hasShownAlert.current) {
            showAlert('로그인이 필요한 서비스입니다.\n 로그인 후 이용해주세요', '접근 제한','alert');
            hasShownAlert.current = true;
        }
    }, [location.state, showAlert]);

    // ---------------------------------------------------------
    // [handleLogin] 이메일/비밀번호 로그인 처리 함수
    //
    // @param {React.FormEvent} e - form onSubmit 이벤트 (e.preventDefault로 페이지 새로고침 방지)
    // ---------------------------------------------------------
    const handleLogin = async (e) => {
        e.preventDefault();  // 폼 기본동작(새로고침) 방지
        if (isSubmitting) return;// 중복호출 방지
        console.log("로그인 버튼 시작됨");
        setIsSubmitting(true); // 로딩 시작
        setError(''); // 이전 에러 메세지 초기화
        try {
            //백엔드에 로그인 요청
            console.log('로그인 요청 시작!!');
            const provider = '';
            const response = await authService.login({
                email,
                password,
            });
            //백엔드에서 받은 response처리
            const userData = response.user || response; // 응답데이터 저장
            const token = response.token; // 응답받은 토큰 저장

            if (token && userData) {
                authLogin(token, userData); // 토큰&사용자 정보 저장
                showAlert('방문을 환영합니다.', '로그인 성공', 'success');
                // 원래 접속하려던 페이지 또는 기본 피드 페이지로 이동
                const destination = location.state?.from?.pathname || 'feed';
                navigate(destination, { replace: true });
            }
            else {
                throw new Error("사용자 정보가 올바르지 않습니다");

            }

        }
        //에러 처리
        catch (err) {
            console.log('상세 에러',err);

            const serverError = err.response?.data;
            const errorMsg = (typeof serverError === 'string' ? serverError : serverError?.message)
                || '로그인 처리 중 문제가 발생했습니다.';

            showAlert(errorMsg, '로그인 실패', 'alert');
        }
        //로딩 종료
        finally {
            setIsSubmitting(false); // 로딩 종료
        }
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
                    <h1 className="text-4xl font-black tracking-tighter text-black dark:text-[#e5e5e5] mb-2">MYSTORY</h1>
                    <p className="text-[#a3b0c1] text-[13px] tracking-wide">나만의 스토리를 만들어가는 곳</p>
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
