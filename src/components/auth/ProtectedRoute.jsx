/**
 * @file ProtectedRoute.jsx
 * @description 인증이 필요한 라우트를 보호하는 래퍼 컴포넌트.
 *
 * [역할]
 *   App.jsx에서 로그인이 필요한 페이지를 <ProtectedRoute> 로 감싸면,
 *   로그인하지 않은 사용자가 해당 URL에 직접 접근하려 할 때 자동으로 로그인 페이지로
 *   리다이렉트하며, 접근 시도한 경로와 인증 필요 여부를 state로 함께 전달한다.
 *
 * [사용 예시]
 *   <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
 *
 * [렌더링 분기]
 *   1. isLoading=true:
 *      - AuthContext에서 localStorage를 읽어 사용자 세션을 복원하는 중
 *      - 아직 인증 상태가 확정되지 않았으므로 즉시 리다이렉트하면 안 됨
 *      - 전체 화면 중앙에 원형 스피너(border-t-transparent 트릭) 표시
 *      - 스피너: w-8 h-8, border-4 border-black, border-t-transparent, rounded-full, animate-spin
 *
 *   2. isLoading=false && isAuthenticated=false:
 *      - 로그인되지 않은 것으로 확정
 *      - <Navigate> 컴포넌트로 /login 페이지로 리다이렉트
 *      - replace=true: 브라우저 히스토리에 현재 페이지를 남기지 않음
 *        (뒤로가기로 미인증 페이지에 다시 접근하지 못하도록)
 *      - state 전달:
 *          from: location  → 원래 접근하려 했던 경로 정보
 *                             (로그인 후 이 경로로 돌아갈 수 있도록 활용 가능)
 *          requireAuth: true → LoginPage에서 이 값을 읽어
 *                              "로그인이 필요한 서비스입니다." 경고 메시지 표시
 *
 *   3. isLoading=false && isAuthenticated=true:
 *      - 정상 인증 상태 → children을 그대로 렌더링 (보호된 페이지 접근 허용)
 *
 * [Props]
 *   @prop {React.ReactNode} children - 보호할 페이지/컴포넌트
 *
 * [의존성]
 *   - useAuth(): AuthContext에서 isAuthenticated, isLoading 값을 가져옴
 *       isLoading:       localStorage에서 토큰/사용자 정보를 복원 중인지 여부
 *       isAuthenticated: 현재 사용자가 로그인된 상태인지 여부
 *   - useLocation(): 현재 접근 시도한 URL 경로 정보 (Navigate state.from에 전달)
 *   - Navigate: react-router-dom의 선언적 리다이렉트 컴포넌트
 *
 * [LoginPage 연동]
 *   LoginPage는 useLocation()으로 state를 읽어:
 *   - state?.requireAuth === true → "로그인이 필요한 서비스입니다." alert 표시
 *   - state?.from → 로그인 성공 후 원래 페이지로 이동 가능
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * [ProtectedRoute]
 * 인증이 필요한 페이지를 보호하는 래퍼 컴포넌트입니다.
 * 로그인하지 않은 유저가 접근할 경우 로그인 페이지로 리다이렉트하며
 * state에 인증이 필요하다는 정보를 담아 보냅니다.
 */
const ProtectedRoute = ({ children }) => {
    // AuthContext에서 인증 상태 및 로딩 여부를 가져온다.
    // isLoading: 앱 초기화 시 localStorage에서 사용자 세션 복원 중인지 여부.
    //            true인 동안에는 아직 인증 여부가 확정되지 않았으므로 리다이렉트 보류.
    // isAuthenticated: 현재 사용자가 로그인된 상태인지 여부.
    const { isAuthenticated, isLoading } = useAuth();

    // 현재 접근 시도한 URL 경로 정보.
    // 미인증 시 /login으로 리다이렉트할 때 state.from으로 전달하여
    // 로그인 성공 후 원래 경로로 돌아올 수 있도록 한다.
    const location = useLocation();

    // -------------------------------------------------------------------------
    // [분기 1] isLoading=true: 세션 복원 중 → 전체 화면 스피너 표시
    // -------------------------------------------------------------------------
    // localStorage에서 토큰을 읽어 AuthContext를 초기화하는 과정이 완료되기 전까지
    // 인증 여부가 불확실하므로 즉시 리다이렉트하면 안 된다.
    // 스피너가 사라지고 나서 아래 분기 2 또는 분기 3으로 진행된다.
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                {/* 원형 스피너: border-t-transparent 트릭으로 한쪽이 열린 원 모양 회전 효과 */}
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // [분기 2] isAuthenticated=false: 미인증 → /login 리다이렉트
    // -------------------------------------------------------------------------
    // 팝업을 여기서 직접 띄우지 않고, 로그인 페이지로 정보를 넘깁니다.
    // 이렇게 하면 페이지 전환과 팝업 스트레스가 겹치지 않아 훨씬 안정적입니다.
    // state 구성:
    //   from: location        → 원래 접근하려 했던 경로 (로그인 후 복귀용)
    //   requireAuth: true     → LoginPage에서 "로그인이 필요한 서비스입니다." 메시지 표시용
    // replace=true: 히스토리 스택에서 현재 페이지를 대체 (뒤로가기로 재접근 방지)
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location, requireAuth: true }} replace />;
    }

    // -------------------------------------------------------------------------
    // [분기 3] isAuthenticated=true: 정상 인증 → children 렌더링
    // -------------------------------------------------------------------------
    // 로그인된 사용자는 보호된 페이지에 정상 접근 허용.
    return children;
};

export default ProtectedRoute;
