/**
 * @file NotificationsPage.jsx
 * @route /notifications
 * @description 현재 로그인한 사용자의 알림 목록을 표시하고, 전체 읽음 처리를 할 수 있는 페이지.
 *
 * [화면 구성]
 *   1. 상단 고정 헤더 - 뒤로가기(ArrowLeft) / "알림" 제목 / "모두 읽음" 버튼
 *   2. 알림 목록:
 *      - 각 알림 항목: 타입 아이콘 + 메시지 + 날짜 + 미읽음 파란 점
 *      - 미읽음 항목: bg-blue-50/30 (라이트) / bg-blue-900/10 (다크) 배경 강조
 *      - 항목 우측: 미읽음이면 파란 점(w-1.5 h-1.5 bg-blue-500 rounded-full) 표시
 *   3. 빈 상태: notifications.length===0 → "알림이 없습니다." 텍스트
 *
 * [상태 변수]
 *   @state {Array} notifications - 알림 항목 배열.
 *       각 항목 구조 (서버 응답 기반):
 *         { id, type, message, createdAt, isRead }
 *         - id:        알림 고유 식별자
 *         - type:      알림 유형 문자열 ('LIKE' | 'COMMENT' | 'FOLLOW' | 기타)
 *         - message:   알림 표시 메시지 텍스트
 *         - createdAt: 알림 생성 시각 (서버 응답 형식 그대로 표시)
 *         - isRead:    읽음 여부 (false이면 파란 배경 + 파란 점 표시)
 *       초기값: [] → useEffect에서 API 응답으로 채워짐
 *
 * [useEffect: 알림 목록 로드]
 *   - 마운트 시 1회 실행 (의존성 배열 [])
 *   - loadNotifications()를 호출하여 서버에서 알림 목록 조회
 *   - loadNotifications는 별도 함수로 분리 → handleReadAll에서도 재사용 가능
 *
 * [loadNotifications 함수]
 *   - notificationService.getAll() 호출 → GET /api/notifications
 *   - 성공: setNotifications(data)
 *   - 실패: console.error (알림 목록 비어 있는 상태 유지)
 *
 * [handleReadAll: 전체 읽음 처리]
 *   - showConfirm('모든 알림을 읽음 처리하시겠습니까?', callback, '모두 읽음') 호출
 *     AlertContext의 showConfirm 사용 (브라우저 기본 confirm 대신 커스텀 다이얼로그)
 *   - 확인 시 callback 실행:
 *       1. notificationService.markAllAsRead() → PUT /api/notifications/read-all
 *       2. loadNotifications() 재호출 → 목록 새로고침 (isRead 값 갱신)
 *       3. showAlert('모든 알림이 읽음 처리되었습니다.', '알림')
 *   - 실패 시: showAlert('알림 처리에 실패했습니다.')
 *
 * [getIcon: 알림 타입별 아이콘 반환 함수]
 *   @param {string} type - 알림 유형 문자열
 *   @returns {JSX.Element} 해당 유형의 lucide-react 아이콘
 *
 *   타입별 아이콘 매핑:
 *     'LIKE'    → Heart (빨간색, fill 적용)     - 좋아요 알림
 *     'COMMENT' → MessageCircle (파란색, fill)  - 댓글 알림
 *     'FOLLOW'  → UserPlus (초록색)             - 팔로우/글벗 요청 알림
 *     기타      → Bell (회색)                   - 시스템 알림 등
 *
 * [미읽음 알림 시각적 구분]
 *   - isRead=false: 행 전체 배경색 bg-blue-50/30 (라이트) / dark:bg-blue-900/10 (다크)
 *   - isRead=false: 행 우측에 파란 점(w-1.5 h-1.5 bg-blue-500 rounded-full) 표시
 *   - isRead=true:  기본 배경, 파란 점 없음
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus } from 'lucide-react';
import { notificationService } from '@/api/notificationService';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';

export default function NotificationsPage() {
    const navigate = useNavigate();

    // AlertContext: 커스텀 알림/확인 다이얼로그 함수 (브라우저 기본 alert/confirm 대체)
    // showAlert(message, title): 단순 알림 다이얼로그 표시
    // showConfirm(message, callback, confirmText): 확인/취소 다이얼로그 표시
    const { showAlert, showConfirm } = useAlert();
    const { triggerNotiRefresh } = useAuth();


    // -------------------------------------------------------------------------
    // [상태 변수 선언]
    // -------------------------------------------------------------------------

    /**
     * notifications: 서버에서 로드한 알림 항목 배열.
     * 초기값: [] → useEffect 내 loadNotifications()로 채워짐.
     * 각 항목: { id, type, message, createdAt, isRead }
     * handleReadAll 후 loadNotifications() 재호출로 isRead 값이 갱신됨.
     */
    const [notifications, setNotifications] = useState([]);


    // -------------------------------------------------------------------------
    // [데이터 로드 함수]
    // -------------------------------------------------------------------------

    /**
     * loadNotifications: 서버에서 알림 목록을 조회하여 상태 업데이트.
     * useEffect와 handleReadAll 모두에서 재사용하기 위해 별도 함수로 분리.
     *
     * API: notificationService.getAll() → GET /api/notifications
     * 성공: setNotifications(data) - 알림 배열로 상태 업데이트
     * 실패: console.error - notifications는 이전 값(또는 빈 배열) 유지
     */
    const loadNotifications = async () => {
        // TODO: [1] notificationService.getAll() 호출 → GET /api/notifications
        // TODO: [2] 성공 시 setNotifications(data)
        // TODO: [3] 실패 시 console.error(error) (notifications는 이전 값 유지)
        // 힌트: try-catch 구조 사용
        try {
            const data = await notificationService.getAll();
            const mapped = Array.isArray(data) ? data.map(n => ({
                ...n,
                isRead: n.isRead ?? n.read ?? false
            })) : [];
            console.log('[notifications] 불러오기:', mapped.length, '개');
            setNotifications(mapped);
        } catch (error) {
            console.error('[notifications] 불러오기 실패:', error);
        }
    };

    // -------------------------------------------------------------------------
    // [useEffect: 초기 알림 로드]
    // -------------------------------------------------------------------------

    /**
     * 마운트 시 1회 실행하여 알림 목록을 초기 로드.
     * loadNotifications()를 즉시 호출.
     * 의존성 배열: [] → 마운트 시 1회만 실행
     */
    useEffect(() => {
        loadNotifications();
    }, [notiRefreshTag]);

    // -------------------------------------------------------------------------
    // [추가된 핸들러 함수: 개별 알림 읽음 처리]
    // -------------------------------------------------------------------------
    /**
     * handleReadOne: 특정 알림 하나를 클릭했을 때 읽음 처리하는 함수.
     * * @param {number|string} notiId - 클릭한 알림의 고유 ID
     * @param {boolean} isRead - 현재 읽음 상태
     * * 동작:
     * 1. 이미 읽은(isRead === true) 상태라면 함수 종료.
     * 2. notificationService.markAsRead(notiId) 호출 (PUT /api/notifications/{id}/read)
     * 3. 성공 시: 
     * - UI에서 해당 알림의 isRead를 true로 즉시 업데이트 (setNotifications)
     * - 전역 알림 상태 갱신을 위해 triggerNotiRefresh() 호출 (선택 사항)
     */
    const handleReadOne = async (notiId, isRead) => {
        if (isRead) return; // 이미 읽은 알림은 요청하지 않음

        try {
            // 서버에 개별 읽음 처리 요청 (서비스 메서드명은 프로젝트 구조에 따라 markAsRead 등으로 상정)
            await notificationService.markAsRead(notiId);

            // 로컬 상태 업데이트: 목록을 순회하며 클릭한 ID만 isRead를 true로 변경
            setNotifications(prev =>
                prev.map(noti => noti.id === notiId ? { ...noti, isRead: true } : noti)
            );

            // 전역 알림 배지 숫자 등을 갱신하기 위해 AuthContext 등의 함수 호출
            if (triggerNotiRefresh) triggerNotiRefresh();
        } catch (error) {
            console.error('알림 읽음 처리 실패:', error);
        }
    };

    // -------------------------------------------------------------------------
    // [핸들러 함수]
    // -------------------------------------------------------------------------

    /**
     * handleReadAll: 모든 알림을 읽음 처리하는 함수.
     *
     * 동작 순서:
     *   1. showConfirm 호출: '모든 알림을 읽음 처리하시겠습니까?' 다이얼로그 표시
     *      - 확인 버튼 텍스트: '모두 읽음'
     *   2. 사용자가 확인 클릭 시 async callback 실행:
     *      a. notificationService.markAllAsRead() → 실제 서비스 메서드명: markAllRead()
     *         PUT /api/notifications/read-all
     *         서버에서 현재 사용자의 모든 알림 isRead=true로 변경
     *      b. loadNotifications(): 서버에서 갱신된 알림 목록 재조회
     *         → 화면의 파란 배경과 파란 점이 사라짐
     *      c. showAlert('모든 알림이 읽음 처리되었습니다.', '알림')
     *   3. 실패 시: showAlert('알림 처리에 실패했습니다.')
     */
    const handleReadAll = () => {
        // TODO: [1] showConfirm 호출: ('모든 알림을 읽음 처리하시겠습니까?', callback, '모두 읽음')
        // TODO: [2] callback(async 함수) 내에서:
        //           a. notificationService.markAllAsRead() 호출
        //              → PUT /api/notifications/read-all
        //           b. loadNotifications() 재호출 → 목록 새로고침
        //           c. showAlert('모든 알림이 읽음 처리되었습니다.', '알림')
        // TODO: [3] catch 블록에서 showAlert('알림 처리에 실패했습니다.')
        // 힌트: showConfirm(message, async () => { ... }, confirmButtonText) 형태로 호출
        showConfirm({
            message: '모든 알림을 읽음 처리하시겠습니까?',
            confirmText: '모두 읽음',
            onConfirm: async () => {
                try {
                    await notificationService.markAllRead();
                    console.log('[notifications] 전체 읽음 처리 성공');
                    await loadNotifications();
                    if (triggerNotiRefresh) triggerNotiRefresh();
                    showAlert('모든 알림이 읽음 처리되었습니다.', '알림', 'success');
                } catch (e) {
                    showAlert('알림 처리에 실패했습니다.');
                }
            }
        });
    };

    // -------------------------------------------------------------------------
    // [유틸리티 함수]
    // -------------------------------------------------------------------------

    /**
     * getIcon: 알림 타입에 따른 아이콘 JSX를 반환하는 함수.
     *
     * @param {string} type - 알림 유형 ('LIKE' | 'COMMENT' | 'FOLLOW' | 기타)
     * @returns {JSX.Element} 해당 유형의 lucide-react 아이콘 엘리먼트
     *
     * 타입별 반환 아이콘:
     *   'LIKE'    → Heart (size=18, 빨간색 fill)    - 내 게시글에 좋아요
     *   'COMMENT' → MessageCircle (size=18, 파란색 fill) - 내 게시글에 댓글
     *   'FOLLOW'  → UserPlus (size=18, 초록색)      - 글벗 요청/수락
     *   default   → Bell (size=18, 회색)            - 시스템/기타 알림
     */
    const getIcon = (type) => {
        switch (type) {
            case 'LIKE': return <Heart size={18} className="text-red-500 fill-red-500" />;
            case 'COMMENT': return <MessageCircle size={18} className="text-blue-500 fill-blue-500" />;
            case 'FOLLOW': return <UserPlus size={18} className="text-green-500" />;
            default: return <Bell size={18} className="text-gray-400" />;
        }
    };

    // -------------------------------------------------------------------------
    // [JSX 렌더링]
    // -------------------------------------------------------------------------

    return (
        <ResponsiveLayout showTabs={false}>
            {/* 전체 페이지 컨테이너 */}
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#101215] text-black dark:text-[#e5e5e5]">

                {/* ============================================================
                    [섹션 1] 상단 고정 헤더
                    - 좌: ArrowLeft 버튼 → navigate(-1)
                    - 중: "알림" 제목
                    - 우: "모두 읽음" 버튼 → handleReadAll() 호출
                          회색 텍스트, active 시 투명도 감소
                    - sticky top-0 z-10: 스크롤 시 최상단 고정
                ============================================================ */}
                <div className="flex items-center justify-between h-14 px-4 border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 bg-white dark:bg-[#1c1f24] z-10">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="font-bold text-[16px]">알림</h1>
                    {/* 전체 읽음 버튼: handleReadAll() → showConfirm → markAllAsRead */}
                    <button onClick={handleReadAll} className="text-[13px] font-bold text-[#7b8b9e] px-2 active:opacity-50">
                        모두 읽음
                    </button>
                </div>

                {/* ============================================================
                    [섹션 2] 알림 목록 / 빈 상태

                    [알림 항목 렌더링] (notifications.length > 0)
                    각 항목(noti) 구조:
                      - 배경: isRead=false → bg-blue-50/30 (라이트) / dark:bg-blue-900/10 (다크)
                               isRead=true  → 기본 배경 (별도 색 없음)
                      - 좌측: getIcon(noti.type) → 알림 유형별 아이콘 (mt-1로 텍스트 상단 정렬)
                      - 중앙: noti.message (14px 줄간격 relaxed)
                               noti.createdAt (11px 회색 대문자)
                      - 우측: isRead=false → 파란 점(w-1.5 h-1.5 bg-blue-500 rounded-full, mt-2)
                               isRead=true  → 파란 점 없음

                    [빈 상태] (notifications.length === 0)
                      "알림이 없습니다." 텍스트 (중앙 정렬, 회색)
                ============================================================ */}
                <div className="flex flex-col">
                    {notifications.length > 0 ? (
                        notifications.map(noti => (
                            <div
                                key={noti.id}
                                // [수정] 클릭 시 handleReadOne 호출 이벤트 추가
                                onClick={() => handleReadOne(noti.id, noti.isRead)}
                                // 미읽음 항목: 파란 배경 강조 및 cursor-pointer 적용
                                className={`flex items-start gap-4 px-6 py-5 border-b border-[#f3f3f3] dark:border-[#292e35] transition-colors ${!noti.isRead
                                    ? 'bg-blue-50/30 dark:bg-blue-900/10 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                                    : 'bg-transparent'
                                    }`}
                            >
                                <div className="mt-1">{getIcon(noti.type)}</div>
                                <div className="flex-1 flex flex-col gap-1">
                                    <p className="text-[14px] leading-relaxed">
                                        {noti.message}
                                    </p>
                                    <span className="text-[11px] text-[#a3b0c1] font-bold uppercase tracking-tight">{noti.createdAt}</span>
                                </div>
                                {!noti.isRead && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>}
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center text-[#a3b0c1] text-[14px]">알림이 없습니다.</div>
                    )}
                </div>
            </div>
        </ResponsiveLayout>
    );
}
