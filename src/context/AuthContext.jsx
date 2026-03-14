/**
 * @file AuthContext.jsx
 * @description 앱 전역 인증(Authentication) 상태 및 보안 가드를 관리하는 React Context 모듈.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [역할 및 아키텍처에서의 위치]
 * - 앱의 최상위 계층에서 인증 상태를 유지하고, 새로고침 시 세션을 복원한다.
 * - Provider 순서: BrowserRouter > AuthProvider > AlertProvider > App
 * ※ 중요: AuthContext 내부에서 navigate()를 사용하기 위해 반드시 
 * BrowserRouter가 AuthProvider를 감싸는 구조여야 한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [제공하는 Context 값 (value shape)]
 * {
 * user           : object | null  — 현재 로그인된 사용자 객체.
 * isAuthenticated : boolean        — 현재 로그인 여부 (!!user).
 * isLoading      : boolean         — 세션 복원 및 토큰 갱신 프로세스 진행 중 여부.
 * login          : function        — 로그인 성공 시 호출. 토큰/유저 정보를 저장 및 상태 업데이트.
 * logout         : function        — 로그아웃 처리. 스토리지 클리어 및 세션 종료.
 * updateUser     : function        — 유저 프로필 등 상태 부분 업데이트.
 * checkAuth      : function        — 새로고침 시 서버와 통신하여 세션 유효성을 검증하고 복원.
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [보안 및 가드 동작]
 * 1. 새로고침 대응: 앱 진입 시 `useEffect`가 `checkAuth()`를 실행하여 로컬 정보를 기반으로 
 * 서버에 `/auth/refresh` 요청을 보냄.
 * 2. 로딩 가드: `isLoading`이 true인 동안은 하위 트리의 렌더링을 차단하여, 
 * 비인증 사용자가 찰나의 순간에 보호된 컨텐츠를 보는 것을 방지함.
 * 3. 직접 접근 방어: 유효하지 않은 토큰으로 보호된 경로 접근 시, `checkAuth`에서 예외를 
 * 캐치하여 `replace: true` 옵션으로 로그인 페이지로 강제 리다이렉트.
 * 4. 백버튼 무력화: 로그아웃 및 세션 만료 시 히스토리 스택을 교체하여 뒤로가기로 
 * 인증 페이지 재진입을 차단함.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * [보안 전략: Hybrid Storage]
 * - Access Token: localStorage에 저장 (클라이언트 요청 헤더 부착용)
 * - Refresh Token: HTTP Only 쿠키에 저장 (CSRF 방어 및 XSS 탈취 차단)
 * - 동작: 새로고침 시 쿠키의 Refresh Token을 이용해 서버로부터 새 Access Token을 발급받음.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [역할 및 아키텍처]
 * - Provider 순서: BrowserRouter > AuthProvider > App
 * ※ navigate() 사용을 위해 BrowserRouter가 반드시 AuthProvider를 감싸야 함.
 *
 * [제공하는 Context 값]
 * - user: 유저 정보 객체 / isAuthenticated: 로그인 여부 / isLoading: 인증 복구 중 여부
 * - login/logout: 세션 시작 및 종료 / checkAuth: 토큰 갱신 및 유효성 검증
 * * ─────────────────────────────────────────────────────────────────────────────
 * [주요 동작 흐름]
 * 1. 앱 마운트 → checkAuth() 실행 → isLoading = true
 * 2. localStorage 확인 → 서버 API 호출 (토큰 갱신 및 유효성 검증)
 * 3. 검증 성공 시: user 상태 복원 / 검증 실패 시: 스토리지 정리 및 로그인 이동
 * 4. 작업 완료 → isLoading = false → 앱 컨텐츠 노출
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const isVerifying = useRef(false);

  // ── 페이지 전환 처리를 위한 navigate 함수 ──────────────────────────────────
  const navigate = useNavigate();
  const location = useLocation();

  // ── 파생 상태: 로그인 인증 여부 (T/F)───────────────────────────────────────
  const [notiRefreshTag, setNotiRefreshTag] = useState(0);

  //  태그를 1씩 증가시켜 변화를 주는 함수
  const refreshNotifications = useCallback(() => {
    setNotiRefreshTag(prev => prev + 1);
  }, []);

  // ── 함수: login ─────────────────────────────────────────────────────────
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

  // ── 로컬 스토리지 정리 ──────────────────────────────────────────────────────────
  const handleLogoutCleanUp = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // ── 함수: logout ──────────────────────────────────────────────────────────
  /**
   * @function logout
   * @description 로그아웃 처리. localStorage에서 인증 관련 데이터를 모두 삭제하고
   * user 상태를 null로 초기화한다.
   */
  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', {}, { withCredentials: true });
    } catch (err) {
      console.error("서버 로그아웃 처리 실패 (무시하고 클라이언트 정리 진행):", err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('notificationEnabled');
      handleLogoutCleanUp();
      window.location.replace('/login'); // 백버튼 무력화
    }
  };

  // ── 함수: updateUser ──────────────────────────────────────────────────────
  /**
   * @function updateUser
   * @description 현재 로그인된 사용자의 정보를 부분 업데이트(patch)한다.
   */
  const updateUser = useCallback((data) => {
    setUser((prev) => {
      if (!prev) return null;
      const updatedData = { ...prev, ...data }; // 변수명 충돌 방지를 위해 updatedData로 변경
      localStorage.setItem('user', JSON.stringify(updatedData));
      return updatedData;
    });
  }, []);

  // ── 함수: checkAuth ───────────────────────────────────────────────────────
  /**
   * @function checkAuth
   * @description 앱 최초 실행 시 localStorage에 저장된 인증 정보로 세션을 복원한다.
   */
  const checkAuth = useCallback(async () => {
    if (isVerifying.current) {
      console.log("이미 인증 확인 중입니다. 중복 요청을 차단합니다.");
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      isVerifying.current = true; // 요청 시작 잠금

      // 2. Refresh Token을 이용한 세션 복구 요청
      const response = await apiClient.post('/auth/refresh', {}, { withCredentials: true });

      const data = response.data;
      console.log("서버 응답 데이터:", data); // 디버깅용 로그

      const newAccessToken = data.accessToken;
      const userData = data.user || JSON.parse(localStorage.getItem('user'));

      if (newAccessToken && userData) {
        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        console.log("✅ 세션 복구 성공");
      } else {
        throw new Error(`데이터 부족 - 토큰: ${!!newAccessToken}, 유저: ${!!userData}`);
      }
    } catch (error) {
      console.error('인증 확인 중 오류 발생:', error);

      // 1. 서버 응답이 401(Unauthorized)인 경우에만 로그아웃 처리 및 이동
      if (error.response?.status === 401) {
        handleLogoutCleanUp();
        if (location.pathname !== '/login' && location.pathname !== '/signup') {
          navigate('/login', { replace: true });
        }
      } else {
        // 2. 단순 네트워크 에러나 다른 에러일 경우, 
        // 기존에 로컬스토리지에 유저 정보가 있다면 일단 유지 (세션 유지 시도)
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      }
    } finally {
      isVerifying.current = false;
      setIsLoading(false);
    }

  }, [navigate, location.pathname, handleLogoutCleanUp]);

  // ── useEffect: 앱 최초 마운트 시 세션 복원 ────────────────────────────────
  useEffect(() => {
    checkAuth();
  }, []);

  // ─── JSX: Context Provider 렌더링 ─────────────────────────────────────────

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    setUser,
    login,
    logout,
    checkAuth,
    updateUser,
    notiRefreshTag,      // 알림 태그
    triggerNotiRefresh: refreshNotifications // 알림 갱신 함수
  };

  // isLoading이 true일 때 실제 App 내용을 숨김 (보안 가드)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium text-sm">인증 정보를 확인 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

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