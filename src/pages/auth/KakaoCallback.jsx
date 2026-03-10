/**
 * @file KakaoCallback.jsx
 * @route /auth/kakao/callback
 *
 * @description
 * 카카오 OAuth2 로그인의 콜백 처리 컴포넌트.
 * 사용자가 카카오 인증 서버에서 인증을 완료하면, 백엔드 Spring Security가
 * 이 페이지로 리다이렉트하면서 URL 쿼리 파라미터에 인증 결과를 담아 전달한다.
 *
 * @카카오_OAuth2_전체_흐름
 * ─────────────────────────────────────────────────────────────────────────
 * [1] 사용자가 LoginPage의 "카카오 로그인" 버튼 클릭
 *     → window.location.href = 'http://100.91.129.24:8080/api/oauth2/authorization/kakao'
 *
 * [2] 백엔드(Spring Security OAuth2)가 카카오 인증 서버로 리다이렉트
 *
 * [3] 사용자가 카카오 인증 완료
 *
 * [4] 카카오 인증 서버 → 백엔드 콜백 URL로 code 전달
 *
 * [5] 백엔드가 토큰 발급 및 사용자 등록/로그인 처리 후
 *     이 페이지(프론트엔드 /auth/kakao/callback)로 리다이렉트:
 *     /auth/kakao/callback?token=JWT토큰&isNewUser=true/false&nickname=닉네임
 *
 * [6] KakaoCallback.jsx가 URL 파라미터를 파싱하여
 *     localStorage와 AuthContext에 저장 후 '/'로 이동
 * ─────────────────────────────────────────────────────────────────────────
 *
 * @URL_파라미터 (백엔드가 전달)
 * - token     {string}  - JWT 액세스 토큰
 * - isNewUser {string}  - "true" 또는 "false" (신규 가입 여부)
 * - nickname  {string}  - URL 인코딩된 카카오 닉네임 (decodeURIComponent로 디코딩)
 *
 * @ref
 * - hasProcessed {React.MutableRefObject<boolean>}
 *   - React StrictMode에서 useEffect가 두 번 실행되는 것을 방지하는 플래그.
 *   - 첫 번째 실행 시 hasProcessed.current = true로 설정.
 *   - 두 번째 실행(StrictMode cleanup 후 재실행) 시 초반에 return하여 중복 처리 차단.
 *   - 이 ref가 없으면 navigate('/')가 두 번 호출되거나 localStorage가 중복 저장될 수 있음.
 *
 * @렌더링
 * - 이 페이지는 사용자가 직접 보는 UI가 아닌 처리용 컴포넌트.
 * - 로딩 스피너(Loader2)와 "카카오 로그인 처리 중..." 텍스트만 표시.
 * - 처리 완료 즉시 '/'로 navigate 되므로 사용자 눈에 거의 보이지 않음.
 *
 * @hooks
 * - useNavigate : 처리 완료 후 '/' 이동, 오류 시 '/login?error=true' 이동
 * - useLocation : URL 쿼리 파라미터(search) 읽기
 * - useAuth     : login()으로 AuthContext에 토큰/유저 등록
 * - useAlert    : 신규 가입자에게 환영 알림 표시
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { useAlert } from '@/context/AlertContext';
import axios from 'axios';

export default function KakaoCallback() {
    // ---------------------------------------------------------
    // [라우터 / 컨텍스트 훅 초기화]
    // navigate  : 처리 완료 → '/', 오류 발생 → '/login?error=true'
    // location  : URL의 ?token=...&isNewUser=...&nickname=... 파싱용
    // login     : AuthContext의 login 함수 (token, user 객체를 전역 상태에 등록)
    // showAlert : 신규 가입자 환영 알림 표시
    // ---------------------------------------------------------
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const hasProcessed = useRef(false); //React StrictMode의 이중 실행을 방지하는 ref.
    const { showAlert } = useAlert();

    // ---------------------------------------------------------
    // [useEffect #1] 카카오 콜백 처리 (핵심 로직)
    // 실행 시점: 컴포넌트 마운트 시 및 location.search, navigate, login, showAlert 변경 시
    //
    // 동작 순서:
    //   [1] hasProcessed.current가 이미 true이면 즉시 return (중복 실행 방지)
    //
    //   [2] URL 쿼리 파라미터 파싱
    //       - new URLSearchParams(location.search)로 파라미터 객체 생성
    //       - token: params.get('token') → JWT 액세스 토큰
    //       - isNewUser: params.get('isNewUser') === 'true' → 신규 사용자 여부 boolean
    //       - nickname: decodeURIComponent(params.get('nickname') || '카카오 사용자')
    //                   → URL 인코딩된 한글 닉네임 디코딩, 없으면 '카카오 사용자' 기본값
    //
    //   [3] token이 존재하는 경우:
    //       [3-1] hasProcessed.current = true (이후 중복 실행 차단)
    //       [3-2] tempUser 객체 생성:
    //             { id: 'social', provider: 'kakao', name: nickname }
    //             → 카카오 사용자임을 식별하는 임시 user 객체 (백엔드에서 실제 id를 받지 않음)
    //       [3-3] localStorage.setItem('accessToken', token): 브라우저 저장소에 토큰 저장
    //       [3-4] localStorage.setItem('user', JSON.stringify(tempUser)): 유저 정보 저장
    //       [3-5] login(token, tempUser): AuthContext에 토큰/유저 등록 (전역 인증 상태 갱신)
    //       [3-6] isNewUser가 true이면: "{nickname}님, 회원이 되신 것을 환영합니다!" 환영 알림
    //       [3-7] navigate('/', { replace: true }): 피드 페이지로 이동
    //             (replace: true → 히스토리에 /auth/kakao/callback이 남지 않음)
    //
    //   [4] token이 없는 경우 (인증 실패/오류):
    //       - console.error 출력
    //       - navigate('/login', { replace: true }): 로그인 페이지로 돌아감
    //
    //   오류 처리: try/catch로 localStorage 저장이나 login() 실행 중 예외 발생 시
    //              '/login?error=true'로 이동
    //
    // 클린업: 없음 (navigate는 클린업 필요 없음)
    // ---------------------------------------------------------
    useEffect(() => {
        if (hasProcessed.current) return;
        hasProcessed.current = true;
        // URL에서 인가 코드(code) 추출 (카카오 리다이렉트 시 전달됨)
        const params = new URLSearchParams(location.search);
        const accessToken = params.get('accessToken');
        const refreshToken = params.get('refreshToken');
        const isNewUser = params.get('isNewUser') === 'true'; // 문자열 'true'를 불리언으로 변환
        const userStr = params.get('user');

        console.log("전달받은 accessToken:", accessToken);
        try {
            if (accessToken && refreshToken) {
                console.error("현재 URL:", window.location.href); // 현재 전체 주소를 찍어보세요.
                //  로컬스토리지에 두 토큰 저장
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
                if (userStr) {
                    localStorage.setItem('user', userStr);
                }
                // AuthContext의 login 함수 호출 (3개의 인자 전달)
                const userData = userStr ? JSON.parse(decodeURIComponent(userStr)) : { id: 'temp', nickname: '사용자' };
                login(accessToken, refreshToken, userData);

                console.log("accessToken 토큰 저장 완료", accessToken);
                console.log("refreshToken 토큰 저장 완료", refreshToken);

                //페이지 이동
                if (isNewUser) {
                    showAlert('신규 회원 가입을 환영합니다.', '회원 가입 성공', 'success');
                    navigate('/profile', { replace: true }); // 프로필 설정 페이지
                }
                else {
                    showAlert('카카오로 로그인이되었습니다.', '로그인 성공', 'success');
                    const destination = location.state?.from?.pathname || '/feed';
                    navigate(destination, { replace: true });
                }

            }
        }
        catch (err) {
            console.error('카카오 로그인 처리 중 오류:', err);
            showAlert('로그인 처리 중 오류가 발생했습니다.', '오류', 'error');
            navigate('/login?error=true', { replace: true });
        }
        return;

    }, [location.search, navigate, login]);

    // ---------------------------------------------------------
    // [JSX 렌더링]
    // 처리 전용 페이지이므로 최소한의 로딩 UI만 표시.
    // 전체 화면 중앙에 Loader2 스피너와 안내 텍스트만 배치.
    // useEffect의 navigate가 즉시 실행되므로 사용자 눈에 거의 보이지 않음.
    // ---------------------------------------------------------
    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#101215]">
            {/* 로딩 중 표시: 카카오 인증 처리가 완료될 때까지 스피너와 텍스트 표시 */}
            <div className="text-center animate-in fade-in duration-500">
                {/* Loader2: 회전 애니메이션 스피너 아이콘 (animate-spin 클래스로 회전) */}
                <Loader2 className="w-10 h-10 animate-spin text-black dark:text-white mx-auto mb-4" />
                <p className="text-[15px] text-gray-500 dark:text-gray-400 font-bold">카카오 로그인 처리 중...</p>
            </div>
        </div>
    );
}
