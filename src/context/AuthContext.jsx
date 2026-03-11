/**
 * @file AuthContext.jsx
 * @description 앱 전역 인증(Authentication) 상태를 관리하는 React Context 모듈.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [역할 및 아키텍처에서의 위치]
 *   - 이 모듈은 앱의 최상위 Provider 계층(main.jsx)에서 <AuthProvider>로 감싸져,
 *     모든 하위 컴포넌트가 인증 상태(로그인 여부, 유저 정보)에 접근할 수 있도록 한다.
 *   - Provider 순서: AuthProvider > AlertProvider > BrowserRouter > App
 *     (AuthProvider가 가장 바깥에 위치해야 라우터·알림 컨텍스트를 포함한
 *      모든 하위 트리에서 auth 상태를 사용할 수 있다.)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [제공하는 Context 값 (value shape)]
 *   {
 *     user          : object | null  — 현재 로그인된 사용자 객체. 로그아웃 시 null.
 *     isAuthenticated: boolean       — user가 존재하면 true, 아니면 false. (!!user)
 *     isLoading     : boolean        — 앱 최초 진입 시 localStorage 복원 작업 완료 전까지 true.
 *     login         : function       — 로그인 처리 함수. 토큰·유저 정보를 저장소에 저장.
 *     logout        : function       — 로그아웃 처리 함수. 저장소에서 인증 데이터 삭제.
 *     updateUser    : function       — 유저 정보를 부분 업데이트하는 함수.
 *     checkAuth     : function       — localStorage에서 세션을 복원하는 함수.
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [State 변수]
 *   - user      : 현재 로그인된 사용자 정보 객체(예: { id, username, email, ... }).
 *                 로그인 전·로그아웃 후에는 null.
 *   - isLoading : 앱 최초 마운트 시 localStorage에서 세션 복원을 시도하는 동안 true.
 *                 복원 완료(성공/실패 모두) 후 false로 전환됨.
 *                 이 값이 true인 동안 라우트 가드가 페이지 렌더링을 보류해야 한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [주요 동작 흐름]
 *   1. 앱 최초 실행 → useEffect가 checkAuth()를 호출
 *   2. checkAuth()가 localStorage에서 'authToken'과 'user'를 읽어옴
 *   3. 두 값이 모두 존재하면 user 상태를 복원하고 isLoading = false
 *   4. 이후 login()/logout()으로 상태를 갱신하고 localStorage와 동기화
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [Export]
 *   - AuthProvider : 인증 상태를 제공하는 Context Provider 컴포넌트
 *   - useAuth      : AuthContext에 접근하기 위한 커스텀 훅
 */
import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '@/api/apiClient';

// ─── Context 생성 ──────────────────────────────────────────────────────────────
const AuthContext = createContext(undefined);

// ─── AuthProvider 컴포넌트 ─────────────────────────────────────────────────────
/**
 * @component AuthProvider
 * @description 인증 상태(user, isLoading)와 관련 함수들을 하위 트리 전체에 제공한다.
 * @param {React.ReactNode} children - Provider가 감쌀 자식 컴포넌트 트리
 */
export const AuthProvider = ({ children }) => {
  // ── State: 현재 로그인된 사용자 객체 ──────────────────────────────────────
  const [user, setUser] = useState(null);

  // ── State: 초기 인증 복원 중 여부 ─────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);

  // ── 파생 상태: 인증 여부 ──────────────────────────────────────────────────
  const isAuthenticated = !!user;

  // ── 함수: login ───────────────────────────────────────────────────────────
  /**
   * @function login
   * @description 로그인 성공 시 호출. JWT 토큰과 사용자 정보를 localStorage에 저장하고
   * user 상태를 갱신한다.
   */
  const login = (accessToken, userData) => {
    if (!accessToken || !userData) {
      console.error("로그인 데이터가 부족합니다:", { accessToken, userData });
      return;
    }
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  // ── 함수: logout ──────────────────────────────────────────────────────────
  /**
   * @function logout
   * @description 로그아웃 처리. localStorage에서 인증 관련 데이터를 모두 삭제하고
   * user 상태를 null로 초기화한다.
   */
  const logout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error("서버 로그아웃 처리 실패 (무시하고 클라이언트 정리 진행):", err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('notificationEnabled');
      setUser(null);
    }
  }; // <--- 여기서 AuthProvider가 닫히지 않도록 수정했습니다.

  // ── 함수: updateUser ──────────────────────────────────────────────────────
  /**
   * @function updateUser
   * @description 현재 로그인된 사용자의 정보를 부분 업데이트(patch)한다.
   */
  const updateUser = (data) => {
    setUser((prev) => {
      if (!prev) return null;
      const updatedData = { ...prev, ...data }; // 변수명 충돌 방지를 위해 updatedData로 변경
      localStorage.setItem('user', JSON.stringify(updatedData));
      return updatedData;
    });
  };

  // ── 함수: checkAuth ───────────────────────────────────────────────────────
  /**
   * @function checkAuth
   * @description 앱 최초 실행 시 localStorage에 저장된 인증 정보로 세션을 복원한다.
   */
  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    const storageUser = localStorage.getItem('user');
    try {
      if (token && storageUser) {
        const { data } = await apiClient.post('/auth/refresh', {}, {
          withCredentials: true
        });
        localStorage.setItem('accessToken', data.accessToken);
        setUser(JSON.parse(storageUser));
      }
    } catch (e) {
      console.log('로컬스토리지의 사용자 정보 파싱 실패', e);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ── useEffect: 앱 최초 마운트 시 세션 복원 ────────────────────────────────
  useEffect(() => {
    checkAuth();
  }, []);

  // ─── JSX: Context Provider 렌더링 ─────────────────────────────────────────
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; // <--- AuthProvider 함수가 여기서 정상적으로 닫힙니다.

// ─── 커스텀 훅: useAuth ────────────────────────────────────────────────────────
/**
 * @hook useAuth
 * @description AuthContext에 접근하기 위한 커스텀 훅.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 반드시 AuthProvider 안에서 사용해야 합니다.');
  }
  return context;
};