/**
 * @file SnapHeader.jsx
 * @description 모바일 전용 상단 헤더 컴포넌트.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [역할 및 아키텍처에서의 위치]
 *   - ResponsiveLayout.jsx에서 sticky top-0으로 렌더링됨.
 *   - 데스크톱에서도 DOM에는 존재하지만 GlobalNav 아래에 위치하며,
 *     GlobalNav가 주 내비게이션 역할을 맡으므로 모바일 중심 헤더로 설계됨.
 *   - 높이 60px의 수평 바: 좌측 여백 / 중앙 로고 / 우측 알림 아이콘.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [레이아웃 구조]
 *
 *   ┌─────────────────────────────────────────┐  ← 높이 60px, 흰색 배경, 하단 구분선
 *   │  [빈 공간 40px]  SNAP  [🔔 (배지)]     │
 *   │  ← 좌측 더미   ← 중앙  ← 우측 알림 버튼 │
 *   └─────────────────────────────────────────┘
 *
 *   중앙 "SNAP" 텍스트는 홈(/) 링크.
 *   우측 알림 버튼은 로그인 상태일 때만 표시됨.
 *   비로그인 상태에서는 우측도 빈 40px 더미 공간으로 채워 로고가 항상 중앙에 위치.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [알림 카운트 배지]
 *   - unreadCount > 0일 때만 벨 아이콘 우상단에 원형 배지 표시.
 *   - 카운트가 9를 초과하면 '9+'로 표시 (한 자리 이상 넘치는 것을 방지).
 *   - 배지 스타일: 최소 너비 16px, 높이 16px, 검정 배경, 흰색 텍스트, 9px.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [알림 카운트 폴링(Polling)]
 *   - isAuthenticated가 true일 때 notificationService.getUnreadCount()를 호출.
 *   - 최초 마운트 시 1회 즉시 호출 후, 30초(30,000ms) 간격으로 반복 호출.
 *   - isAuthenticated가 false이면 폴링을 시작하지 않고 즉시 return.
 *   - 컴포넌트 언마운트 또는 isAuthenticated 변경 시 clearInterval로 타이머 정리.
 *   - 네트워크 오류 발생 시 에러를 무시(try/catch)하고 카운트 유지.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [State 변수]
 *   - unreadCount : number — 읽지 않은 알림의 개수.
 *                            초기값 0. 폴링 성공 시마다 갱신됨.
 *                            로그아웃 상태에서는 갱신되지 않음.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [사용하는 훅 및 서비스]
 *   - useNavigate         : 알림 버튼 클릭 시 /notifications 페이지로 이동
 *   - useAuth             : isAuthenticated(로그인 여부) 접근
 *   - notificationService : getUnreadCount() API 호출로 미읽음 수 조회
 *   - useState            : unreadCount 상태 관리
 *   - useEffect           : 컴포넌트 마운트·인증 상태 변경 시 폴링 설정
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [Props]
 *   없음 (필요한 모든 데이터를 훅·서비스에서 자체 조회)
 */
import React, { useEffect, useState } from 'react';
// 프로그래매틱 내비게이션 (알림 버튼 클릭 → /notifications 이동)
import { Link, useNavigate } from 'react-router-dom';
// 알림 벨 아이콘
import { Bell } from 'lucide-react';
// 로그인 여부 확인용 인증 컨텍스트
import { useAuth } from '@/context/AuthContext';
// 미읽음 알림 수 조회 API 서비스
import { notificationService } from '@/api/notificationService';

/**
 * @component SnapHeader
 * @description 모바일 화면 상단에 sticky 고정되는 헤더.
 *              "SNAP" 로고(홈 링크)와 알림 벨 아이콘(미읽음 배지 포함)으로 구성됨.
 */
export default function SnapHeader() {
    // ── 훅: 프로그래매틱 내비게이션 ────────────────────────────────────────────
    // 알림 버튼 클릭 시 /notifications 페이지로 이동하는 데 사용
    const navigate = useNavigate();

    // ── 컨텍스트: 로그인 여부 ─────────────────────────────────────────────────
    // isAuthenticated: true이면 알림 버튼 표시 + 폴링 시작, false이면 둘 다 비활성
    const { isAuthenticated } = useAuth();

    // ── State: 미읽음 알림 수 ─────────────────────────────────────────────────
    // 0이면 배지 숨김, 1 이상이면 벨 아이콘 우상단에 카운트 배지 표시.
    // 9 초과 시 JSX에서 '9+'로 표시됨.
    const [unreadCount, setUnreadCount] = useState(0);

    // ── useEffect: 알림 카운트 폴링 설정 ─────────────────────────────────────
    /**
     * [실행 시점] isAuthenticated 값이 변경될 때마다 재실행
     *             (컴포넌트 최초 마운트 포함)
     *
     * [하는 일]
     *   1. isAuthenticated가 false이면 아무것도 하지 않고 즉시 종료
     *   2. fetchUnread 함수를 정의:
     *      - notificationService.getUnreadCount() API 호출
     *      - 응답의 count 값으로 unreadCount 상태 갱신
     *      - 오류 발생 시 조용히 무시 (UX에 영향 최소화)
     *   3. fetchUnread를 즉시 1회 호출 (최초 마운트 시 바로 카운트 표시)
     *   4. setInterval로 30초마다 fetchUnread 반복 호출 등록
     *
     * [정리(cleanup)]
     *   - 컴포넌트 언마운트 또는 isAuthenticated 변경 시:
     *     clearInterval(interval)로 폴링 타이머를 해제해 메모리 누수 방지
     */
    useEffect(() => {
        // TODO: setInterval로 30초마다 notificationService.getUnreadCount() 호출해
        //       setUnreadCount() 업데이트, 클린업에서 clearInterval 호출
        // 힌트: isAuthenticated가 false이면 즉시 return
        //       fetchUnread 비동기 함수 안에서 try/catch로 data?.count ?? 0 처리
        //       fetchUnread()를 즉시 1회 호출 후 setInterval(fetchUnread, 30000) 등록
        //       return () => clearInterval(interval) 로 클린업
    }, [isAuthenticated]);

    // ─── JSX 렌더링 ────────────────────────────────────────────────────────────
    return (
        // ── SnapHeader 외곽 컨테이너 ──────────────────────────────────────────
        // justify-between: 좌·중·우 세 요소를 양 끝 정렬
        // h-[60px]: 헤더 고정 높이
        // bg-white dark:bg-[#1c1f24]: 라이트/다크 배경색
        // border-b: 하단 얇은 구분선으로 컨텐츠와 분리
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1c1f24] h-[60px] border-b border-[#f3f3f3] dark:border-[#292e35]">

            {/* ── 좌측 더미 공간 ────────────────────────────────────────────────
                40px 고정 너비의 빈 div.
                우측 알림 버튼과 동일한 크기로 로고를 항상 시각적 중앙에 배치하기 위한 균형추. */}
            <div className="w-10" />

            {/* ── 중앙: SNAP 로고 (홈 링크) ────────────────────────────────────
                클릭 시 "/" 경로(피드 페이지)로 이동.
                스타일: 3xl 크기, 최대 굵기(font-black), 이탤릭, 자간 좁음(tracking-tighter) */}
            <Link to="/" className="text-3xl font-black tracking-tighter text-black dark:text-[#e5e5e5] italic">
                SNAP
            </Link>

            {/* ── 우측: 알림 버튼 or 더미 공간 (로그인 상태에 따라 분기) ─────── */}
            {isAuthenticated ? (
                // ── 로그인 상태: 알림 벨 버튼 표시 ──────────────────────────
                // 클릭 시 /notifications 페이지로 이동
                // relative: 미읽음 카운트 배지(absolute)의 기준 부모
                <button
                    onClick={() => navigate('/notifications')}
                    className="relative w-10 h-10 flex items-center justify-center text-black dark:text-[#e5e5e5] hover:opacity-60 transition-opacity"
                >
                    {/* 벨 아이콘: 22px 크기, strokeWidth 2 */}
                    <Bell size={22} strokeWidth={2} />

                    {/* ── 미읽음 카운트 배지: unreadCount > 0일 때만 표시 ──────
                        absolute: 벨 아이콘 우상단에 겹쳐 표시 (top-1 right-1)
                        min-w-[16px] h-4: 숫자가 1자리든 2자리든 최소 크기 유지
                        bg-black: 검정 배경 원형 배지
                        text-[9px]: 매우 작은 글씨로 숫자 표시
                        px-[3px]: 숫자 양쪽 최소 패딩으로 배지 모양 유지 */}
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-black dark:bg-[#292e35] text-[#e5e5e5] text-[9px] font-black rounded-full flex items-center justify-center px-[3px]">
                            {/* 9 초과 시 '9+'로 표시해 배지가 너무 넓어지는 것을 방지 */}
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            ) : (
                // ── 비로그인 상태: 우측 더미 공간 ────────────────────────────
                // 알림 버튼과 동일한 40px 너비의 빈 div로 로고의 중앙 위치를 유지
                <div className="w-10" />
            )}
        </div>
    );
}
