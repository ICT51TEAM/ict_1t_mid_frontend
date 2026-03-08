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

// ─── Context 생성 ──────────────────────────────────────────────────────────────
// AuthContext: 인증 상태를 담는 React Context 객체.
// 초기값을 undefined로 설정해두면, Provider 없이 useAuth()를 호출했을 때
// 아래 useAuth 훅에서 명확한 에러를 던질 수 있다.
const AuthContext = createContext(undefined);


// ─── AuthProvider 컴포넌트 ─────────────────────────────────────────────────────
/**
 * @component AuthProvider
 * @description 인증 상태(user, isLoading)와 관련 함수들을 하위 트리 전체에 제공한다.
 *              반드시 앱의 최상위(main.jsx)에서 모든 컴포넌트를 감싸야 한다.
 *
 * @param {React.ReactNode} children - Provider가 감쌀 자식 컴포넌트 트리
 */
export const AuthProvider = ({ children }) => {
  // ── State: 현재 로그인된 사용자 객체 ──────────────────────────────────────
  // null이면 비로그인 상태, 객체이면 로그인된 사용자 정보.
  // login()으로 설정, logout()으로 null로 초기화됨.
  const [user, setUser] = useState(null);

  // ── State: 초기 인증 복원 중 여부 ─────────────────────────────────────────
  // 앱 진입 시 localStorage에서 세션을 복원하는 동안 true.
  // checkAuth() 완료 후 항상 false로 설정됨.
  // 라우트 가드(PrivateRoute 등)는 이 값이 false가 될 때까지 렌더링을 대기해야 함.
  const [isLoading, setIsLoading] = useState(true);

  // ── 파생 상태: 인증 여부 ──────────────────────────────────────────────────
  // user 객체가 존재하면 true, null이면 false.
  // !!를 사용해 불리언으로 변환함. 별도 state가 아닌 파생값이므로 항상 user와 동기화됨.
  const isAuthenticated = !!user;

  // ── 함수: login ───────────────────────────────────────────────────────────
  /**
   * @function login
   * @description 로그인 성공 시 호출. JWT 토큰과 사용자 정보를 localStorage에 저장하고
   *              user 상태를 갱신한다.
   *
   * @param {string} token    - 서버에서 발급받은 JWT 액세스 토큰
   * @param {object} userData - 로그인한 사용자의 정보 객체 (예: { id, username, email })
   *
   * 저장 구조:
   *   localStorage['authToken'] = token (문자열)
   *   localStorage['user']      = JSON.stringify(userData) (직렬화된 객체)
   */
  const login = (token, userData) => {
    // TODO: localStorage에 'authToken'(token), 'user'(JSON.stringify(userData)) 저장 후 setUser(userData) 호출
    localStorage.setItem('authToken', token); // 로컬스토리지에 토큰 저장
    setUser(userData); // userdate 갱신
    localStorage.setItem('user', JSON.stringify(userData)); // 로컬스토리지에 사용자 정보도 저장
  };

  // ── 함수: logout ──────────────────────────────────────────────────────────
  /**
   * @function logout
   * @description 로그아웃 처리. localStorage에서 인증 관련 데이터를 모두 삭제하고
   *              user 상태를 null로 초기화한다.
   *              이 함수 호출 후 isAuthenticated는 자동으로 false가 된다.
   */
  const logout = () => {
    // TODO: localStorage에서 'authToken', 'user' 제거 후 setUser(null) 호출
    localStorage.removeItem('authToken'); //토큰삭제
    localStorage.removeItem('user'); //사용자 정보 삭제
    setUser(null); // state를 null로 변환
  };

  // ── 함수: updateUser ──────────────────────────────────────────────────────
  /**
   * @function updateUser
   * @description 현재 로그인된 사용자의 정보를 부분 업데이트(patch)한다.
   *              기존 user 객체에 새 데이터를 스프레드(...)로 병합하므로,
   *              변경된 필드만 전달해도 된다.
   *              변경된 정보는 localStorage['user']에도 반영된다.
   *
   * @param {object} data - 업데이트할 사용자 정보의 일부 (예: { profileImage: '...' })
   *
   * 주의: 로그인되지 않은 상태(user === null)에서 호출하면 아무 변경 없이 null을 반환.
   */
  const updateUser = (data) => {
    // TODO: setUser(prev => ({...prev, ...data})) 로 사용자 정보 부분 업데이트
    setUser((prev) => {
      if (!prev) return null;
      const updateUser = { ...prev, ...data };
      //변경된 정보를 localStorage에도 저장하여 새로고침 유지
      localStorage.setItem('user', JSON.stringify(updateUser));
      return updateUser;
    });
  };

  // ── 함수: checkAuth ───────────────────────────────────────────────────────
  /**
   * @function checkAuth
   * @description 앱 최초 실행 시 localStorage에 저장된 인증 정보로 세션을 복원한다.
   *              비동기 함수(async)이지만 현재 구현은 네트워크 요청 없이 로컬 스토리지만 읽음.
   *              (향후 서버에 토큰 유효성 검증 요청을 추가할 수 있는 구조)
   *
   * 동작 흐름:
   *   1. localStorage에서 'authToken'과 'user' 읽기
   *   2. 둘 다 존재하면 'user' 문자열을 JSON.parse로 파싱하여 user 상태 복원
   *   3. JSON 파싱 실패(손상된 데이터)면 logout()으로 저장소를 정리
   *   4. 항상 마지막에 isLoading = false로 설정 (성공/실패 무관)
   */
  const checkAuth = async () => {
    // TODO: localStorage에서 'authToken'과 'user'를 읽어 파싱 후 setUser() 호출, 완료 후 setIsLoading(false)
    const token = localStorage.getItem('authToken'); // 저장된 토큰 불러오기
    const storageUser = localStorage.getItem('userData'); // 저장된 사용자 정보 불러오기
    if (token && storageUser) {
      // 로그인 상태 복원
      try {
        setUser(JSON.parse(storageUser)); // JSON 문자열 -> 객체로 변환
      }
      catch (e) {
        console.log('로컬스토리지의 사용자 정보 파싱 실패', e);
        logout();
        isLoading = false;
      }
    }
  };

  // ── useEffect: 앱 최초 마운트 시 세션 복원 ────────────────────────────────
  // [실행 시점] 컴포넌트가 처음 DOM에 마운트될 때 단 1회 실행 (의존성 배열 = [])
  // [하는 일]   checkAuth()를 호출해 localStorage에서 이전 세션의 인증 정보를 복원
  // [정리(cleanup)] 없음. 단순 1회성 초기화 작업이므로 정리 함수 불필요.
  useEffect(() => {
    // checkAuth() 호출
    checkAuth();
  }, []); // 빈 배열: 마운트 1회만 실행, 의존성 없음

  // ─── JSX: Context Provider 렌더링 ─────────────────────────────────────────
  // AuthContext.Provider로 하위 트리를 감싸고 value에 공개할 상태·함수를 전달.
  // {children}은 <AuthProvider>로 감싸인 모든 하위 컴포넌트 트리를 의미함.
  return (
    <AuthContext.Provider
      value={{
        user,           // 현재 로그인 사용자 객체 (null이면 비로그인)
        isAuthenticated, // 로그인 여부 boolean
        isLoading,      // 초기 세션 복원 중 여부 boolean
        login,          // 로그인 처리 함수
        logout,         // 로그아웃 처리 함수
        checkAuth,      // 세션 재확인 함수 (외부에서 필요 시 호출 가능)
        updateUser,     // 사용자 정보 부분 업데이트 함수
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── 커스텀 훅: useAuth ────────────────────────────────────────────────────────
/**
 * @hook useAuth
 * @description AuthContext에 접근하기 위한 커스텀 훅.
 *              반드시 <AuthProvider> 내부의 컴포넌트에서만 호출해야 한다.
 *
 * @returns {{ user, isAuthenticated, isLoading, login, logout, checkAuth, updateUser }}
 *          AuthContext에서 제공하는 모든 상태값과 함수
 *
 * @throws {Error} <AuthProvider> 외부에서 호출 시 에러를 던져 개발 중 실수를 방지함
 *
 * @example
 *   const { user, isAuthenticated, logout } = useAuth();
 *   if (!isAuthenticated) return <LoginPage />;
 */
export const useAuth = () => {
  // useContext로 AuthContext의 현재 값을 가져옴
  const context = useContext(AuthContext);
  // context가 undefined이면 AuthProvider 밖에서 사용된 것이므로 에러 throw
  if (context === undefined) {
    throw new Error('useAuth는 반드시 AuthProvider 안에서 사용해야 합니다.');
  }
  return context;
};
