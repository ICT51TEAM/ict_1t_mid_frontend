/**
 * @file App.jsx
 * @description 애플리케이션의 루트 컴포넌트. React Router의 모든 라우트를 정의한다.
 *
 * [역할]
 *   - 앱의 전체 라우팅 구조를 단일 파일에서 관리
 *   - 인증 보호가 필요한 라우트를 <ProtectedRoute>로 감싸 미인증 사용자 접근 차단
 *   - 앱 초기화 시 localStorage에서 다크 모드 설정을 복원
 *
 * [useEffect: 다크 모드 초기화]
 *   - 마운트 시 1회 실행 (의존성 배열 [])
 *   - localStorage.getItem('darkMode') === 'true'이면
 *     → document.documentElement.classList.add('dark'): Tailwind dark 모드 활성화
 *   - 그 외 (false, null, 미설정)이면
 *     → document.documentElement.classList.remove('dark'): 라이트 모드 유지
 *   - 이 설정은 SettingsPage의 toggleDarkMode()에 의해 변경되며,
 *     App 마운트 시 이전 설정을 복원하여 새로고침 후에도 모드가 유지됨.
 *
 * [라우트 구조]
 *
 * [공개 라우트 (인증 불필요)]
 *   /                      → SnapFeedPage     (메인 피드, 공개 접근 가능)
 *   /snap/:id              → SnapDetailPage   (Snap 상세, 공개 접근 가능)
 *   /login                 → LoginPage        (로그인)
 *   /signup                → SignupPage       (회원가입)
 *   /verify-email          → EmailVerificationPage (이메일 인증)
 *   /forgot-password       → ForgotPasswordPage  (비밀번호 찾기)
 *   /reset-password        → ResetPasswordPage   (비밀번호 재설정)
 *   /finance               → FssPage          (금융 정보, ProtectedRoute 없음)
 *   /auth/kakao/callback   → KakaoCallback    (카카오 OAuth2 콜백 처리)
 *
 * [보호 라우트 (ProtectedRoute 필요, 미인증 시 /login 리다이렉트)]
 *   /today                 → TodayPage        (오늘의 스냅)
 *   /ranking               → RankingPage      (랭킹 피드)
 *   /following             → FollowingPage    (팔로잉 피드)
 *   /snap/:id/edit         → EditPostPage     (게시글 편집)
 *   /profile               → ProfilePage      (내 프로필)
 *   /profile/edit          → EditProfilePage  (프로필 편집)
 *   /settings              → SettingsPage     (설정 메인)
 *   /settings/change-password → ChangePasswordPage (비밀번호 변경)
 *   /settings/delete-account  → DeleteAccountPage  (계정 탈퇴)
 *   /settings/notifications   → NotificationSettingsPage (알림 설정)
 *   /settings/qna          → QnaPage          (Q&A 게시판)
 *   /friends               → FriendsPage      (글벗 목록)
 *   /add-friend            → AddFriendPage    (글벗 추가)
 *   /friend/:friendId      → FriendProfilePage (글벗 프로필)
 *   /badges                → BadgesPage       (뱃지/달개 목록)
 *   /badges/info           → BadgeInfoPage    (뱃지 안내)
 *   /badges/ranking        → BadgeRankingPage (뱃지 랭킹)
 *   /create                → CreatePage       (게시글 작성)
 *   /create-photo-album    → CreatePhotoAlbumPage (포토앨범 작성)
 *   /notifications         → NotificationsPage (알림 목록)
 *
 * [폴백 라우트]
 *   *                      → Navigate to /    (정의되지 않은 모든 경로를 메인으로 리다이렉트)
 *
 * [ProtectedRoute 동작 요약]
 *   - isLoading=true: 세션 복원 중 → 스피너 표시 (섣부른 리다이렉트 방지)
 *   - isAuthenticated=false: 미인증 → /login 리다이렉트 (state.requireAuth=true 포함)
 *   - isAuthenticated=true: 인증 완료 → children 렌더링
 *
 * [참고]
 *   - AuthProvider, AlertProvider 등 Context 프로바이더는 main.jsx 또는 상위에서 제공됨
 *   - App은 <Routes>만 반환하므로 BrowserRouter는 상위에서 wrapping되어야 함
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// Feed
import SnapFeedPage from '@/pages/feed/SnapFeedPage';
import TodayPage from '@/pages/feed/TodayPage';
import RankingPage from '@/pages/feed/RankingPage';
import FollowingPage from '@/pages/feed/FollowingPage';
import SnapDetailPage from '@/pages/feed/SnapDetailPage';
// Auth
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import EditProfilePage from '@/pages/profile/EditProfilePage';
import SettingsPage from '@/pages/settings/SettingsPage';
import ChangePasswordPage from '@/pages/settings/ChangePasswordPage';
import DeleteAccountPage from '@/pages/settings/DeleteAccountPage';
import QnaPage from '@/pages/settings/QnaPage';
import FriendsPage from '@/pages/friends/FriendsPage';
import AddFriendPage from '@/pages/friends/AddFriendPage';
import FriendProfilePage from '@/pages/friends/FriendProfilePage';
import BadgesPage from '@/pages/badges/BadgesPage';
import BadgeRankingPage from '@/pages/badges/BadgeRankingPage';
import BadgeInfoPage from '@/pages/badges/BadgeInfoPage';
import CreatePage from '@/pages/write/CreatePage';
import NotificationsPage from '@/pages/notifications/NotificationsPage';
import FssPage from '@/pages/fss/FssPage';
import EmailVerificationPage from '@/pages/auth/EmailVerificationPage';
import EditPostPage from '@/pages/write/EditPostPage';
import KakaoCallback from '@/pages/auth/KakaoCallback';
import CreatePhotoAlbumPage from '@/pages/write/CreatePhotoAlbumPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useEffect } from 'react';

export default function App() {
    // -------------------------------------------------------------------------
    // [useEffect: 다크 모드 초기화]
    // -------------------------------------------------------------------------

    /**
     * 앱 마운트 시 localStorage에 저장된 다크 모드 설정을 복원.
     *
     * SettingsPage의 toggleDarkMode()에서 localStorage.setItem('darkMode', 'true'/'false')를
     * 저장하면, 새로고침 이후 이 useEffect에서 해당 설정을 다시 적용한다.
     *
     * 동작:
     *   - localStorage의 'darkMode' 값이 'true' 문자열이면:
     *       document.documentElement.classList.add('dark')
     *       → Tailwind의 dark: 접두사 CSS 모두 활성화
     *   - 그 외 (false, null, 미설정 포함):
     *       document.documentElement.classList.remove('dark')
     *       → 라이트 모드 유지
     *
     * 의존성 배열: [] → 마운트 시 1회만 실행
     */
    useEffect(() => {
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    // -------------------------------------------------------------------------
    // [JSX 렌더링: 라우트 정의]
    // -------------------------------------------------------------------------

    return (
        <Routes>
            {/* ================================================================
                [공개 라우트] 인증 없이 누구나 접근 가능한 페이지들
            ================================================================ */}

            {/* 메인 피드: 앱의 기본 진입점. 로그인 없이도 Snap 목록 조회 가능 */}
            <Route path="/" element={<SnapFeedPage />} />

            {/* 이메일 인증: 회원가입 후 이메일 링크로 접근하는 페이지 */}
            <Route path="/verify-email" element={<EmailVerificationPage />} />

            {/* 오늘의 스냅 / 랭킹 / 팔로잉 피드: ProtectedRoute로 보호 */}
            <Route path="/today" element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />
            <Route path="/ranking" element={<ProtectedRoute><RankingPage /></ProtectedRoute>} />
            <Route path="/following" element={<ProtectedRoute><FollowingPage /></ProtectedRoute>} />

            {/* Snap 상세 페이지: 공개 (URL 공유 가능) */}
            <Route path="/snap/:id" element={<SnapDetailPage />} />
            {/* Snap 편집 페이지: 본인 게시글만 편집 가능 → ProtectedRoute로 보호 */}
            <Route path="/snap/:id/edit" element={<ProtectedRoute><EditPostPage /></ProtectedRoute>} />

            {/* 인증 페이지들: 공개 접근 (미로그인 상태에서 사용) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ================================================================
                [보호 라우트] ProtectedRoute로 감싸진 페이지들
                미인증 사용자가 접근 시 /login으로 리다이렉트됨
                (state: { from: 현재경로, requireAuth: true })
            ================================================================ */}
            {/* Protected Routes */}

            {/* 프로필: 내 프로필 조회 및 편집 */}
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />

            {/* 설정 메인 및 하위 페이지들 */}
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/settings/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
            <Route path="/settings/delete-account" element={<ProtectedRoute><DeleteAccountPage /></ProtectedRoute>} />
            <Route path="/settings/qna" element={<ProtectedRoute><QnaPage /></ProtectedRoute>} />

            {/* 글벗(친구) 관련 페이지들 */}
            <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
            <Route path="/add-friend" element={<ProtectedRoute><AddFriendPage /></ProtectedRoute>} />
            {/* :friendId 파라미터: 조회할 글벗의 사용자 ID */}
            <Route path="/friend/:friendId" element={<ProtectedRoute><FriendProfilePage /></ProtectedRoute>} />

            {/* 뱃지(달개) 관련 페이지들 */}
            <Route path="/badges" element={<ProtectedRoute><BadgesPage /></ProtectedRoute>} />
            <Route path="/badges/info" element={<ProtectedRoute><BadgeInfoPage /></ProtectedRoute>} />
            <Route path="/badges/ranking" element={<ProtectedRoute><BadgeRankingPage /></ProtectedRoute>} />

            {/* 게시글 작성: 일반 작성(/create) 및 포토앨범 작성(/create-photo-album) */}
            <Route path="/create" element={<ProtectedRoute><CreatePage /></ProtectedRoute>} />
            <Route path="/create-photo-album" element={<ProtectedRoute><CreatePhotoAlbumPage /></ProtectedRoute>} />

            {/* 알림 목록 */}
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

            {/* ================================================================
                [기타 공개 라우트]
            ================================================================ */}

            {/* 금융 정보 페이지 (FssPage): ProtectedRoute 없음 (로그인 불필요) */}
            <Route path="/finance" element={<FssPage />} />

            {/* 카카오 OAuth2 콜백: 카카오 로그인 완료 후 리다이렉트되는 URL
                카카오 인증 서버가 code 파라미터와 함께 이 경로로 리다이렉트함 */}
            <Route path="/auth/kakao/callback" element={<KakaoCallback />} />

            {/* ================================================================
                [폴백 라우트]
                정의되지 않은 모든 경로(*)를 메인 페이지(/)로 리다이렉트
                replace: 히스토리 스택에서 알 수 없는 경로를 대체
            ================================================================ */}
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
