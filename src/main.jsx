/**
 * @file main.jsx
 * @description 앱의 진입점(Entry Point). React 앱을 DOM에 마운트하고
 *              전역 Provider 계층 구조를 설정한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [역할]
 *   - index.html의 <div id="root"> 요소에 React 앱 전체를 렌더링한다.
 *   - 앱 전역에서 사용되는 Context Provider들을 올바른 순서로 중첩한다.
 *   - 전역 CSS(index.css)를 import해 Tailwind 유틸리티 클래스 및 커스텀
 *     CSS 변수, 폰트 설정이 앱 전체에 적용되도록 한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [Provider 중첩 순서 및 이유]
 *
 *   <StrictMode>               ← React 개발 모드 검사 (프로덕션에서는 무시됨)
 *     <AuthProvider>           ← 인증 상태 (가장 바깥 = 가장 먼저 초기화)
 *       <AlertProvider>        ← 전역 알림/확인 모달
 *         <BrowserRouter>      ← URL 라우팅
 *           <App />            ← 실제 앱 컴포넌트 트리 (라우트 정의 포함)
 *         </BrowserRouter>
 *       </AlertProvider>
 *     </AuthProvider>
 *   </StrictMode>
 *
 *   순서가 중요한 이유:
 *   1. AuthProvider가 가장 바깥에 위치해야 하는 이유:
 *      - AlertProvider, BrowserRouter, App 모두 인증 상태를 사용할 수 있어야 함.
 *      - 특히 App 내부의 라우트 가드(PrivateRoute 등)가 useAuth()를 호출하므로
 *        BrowserRouter보다 바깥에 있어야 함.
 *   2. AlertProvider가 BrowserRouter보다 바깥에 위치하는 이유:
 *      - 라우트 컴포넌트(페이지들)에서 useAlert()를 호출하므로
 *        라우터보다 먼저 초기화되어야 함.
 *      - AlertProvider 내부의 모달 UI가 어떤 라우트에서도 올바르게 표시됨.
 *   3. BrowserRouter가 가장 안쪽(App 직접 부모)에 위치하는 이유:
 *      - App.jsx 내부의 <Routes>, <Route>, <Link>, useNavigate() 등이
 *        BrowserRouter 컨텍스트를 필요로 함.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [StrictMode]
 *   - 개발 모드에서 컴포넌트를 두 번 렌더링해 순수하지 않은 렌더링 감지.
 *   - 오래된 API 사용 경고.
 *   - useEffect가 두 번 실행되는 것처럼 보일 수 있으나 이는 개발 전용 동작.
 *   - 프로덕션 빌드에서는 StrictMode가 아무런 추가 동작을 하지 않음.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [createRoot]
 *   - React 18의 동시성(Concurrent) 렌더링 모드를 활성화하는 API.
 *   - document.getElementById('root'): index.html의 <div id="root"> 요소를 선택.
 *   - .render(): 해당 요소에 React 컴포넌트 트리를 마운트.
 */

// React 18 동시성 렌더링 모드 진입점
import { StrictMode } from 'react';
// createRoot: React 18 방식으로 DOM 루트에 앱을 마운트하는 함수
import { createRoot } from 'react-dom/client';
// BrowserRouter: HTML5 History API 기반 클라이언트 사이드 라우팅 Provider
import { BrowserRouter } from 'react-router-dom';
// 전역 CSS: Tailwind 디렉티브(@tailwind base/components/utilities),
// CSS 변수(--color-mw-white 등), 커스텀 폰트 설정 포함
import './index.css';
// 앱의 최상위 컴포넌트: 라우트 정의(<Routes>), 레이아웃 적용 포함
import App from './App.jsx';
// 인증 상태(user, isAuthenticated, isLoading) 전역 제공 Provider
import { AuthProvider } from './context/AuthContext';
// 커스텀 알림/확인 모달 전역 제공 Provider
import { AlertProvider } from './context/AlertContext';

// ─── 앱 마운트 ────────────────────────────────────────────────────────────────
// document.getElementById('root'): public/index.html의 <div id="root">를 선택.
// createRoot(container): 해당 DOM 노드를 React 18 동시성 모드 루트로 등록.
// .render(<JSX>): Provider 계층 구조를 포함한 전체 앱 트리를 렌더링.
createRoot(document.getElementById('root')).render(
  /**
 * [Provider 중첩 순서 및 이유 - 수정본]
 *
 * <StrictMode>
 *  <BrowserRouter>      ← URL 라우팅 (최상단 배치: 하위 모든 곳에서 navigate 사용 가능)
 *   <AuthProvider>      ← 인증 상태 (BrowserRouter 내부이므로 인증 실패 시 바로 navigate 가능)
 *     <AlertProvider>   ← 전역 알림/확인 모달
 *        <App />        ← 실제 앱 컴포넌트 트리
 *      </AlertProvider>
 *    </AuthProvider>
 *  </BrowserRouter>
 * </StrictMode>
 *
 * 순서가 중요한 이유:
 * 1. BrowserRouter가 최상단인 이유:
 * - AuthProvider 내부의 checkAuth()나 logout()에서 비인증 사용자를 
 * /login으로 보내기 위해 useNavigate()를 사용하므로 가장 먼저 초기화되어야 함.
 * 2. AuthProvider가 AlertProvider보다 위에 있는 이유:
 * - 알림창(Alert)을 띄우기 전에 인증 체크가 먼저 선행되어야 하며,
 * 인증 만료 알림 등을 처리할 때 Auth 상태에 의존할 수 있음.
 * 3. AlertProvider가 App 위에 있는 이유:
 * - App 내부의 모든 페이지 컴포넌트에서 useAlert()를 호출하여 
 * 어느 경로에서든 일관된 모달 UI를 띄우기 위함.
 */
  <StrictMode>
    <BrowserRouter>
      {/* 중요: AuthProvider 내부에서 useNavigate()를 사용하므로 
          반드시 BrowserRouter의 자식으로 위치해야 합니다. 
      */}
      <AuthProvider>
        <AlertProvider>
          <App />
        </AlertProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
