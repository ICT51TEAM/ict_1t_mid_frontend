/**
 * @file AlertContext.jsx
 * @description 앱 전역 커스텀 알림(Alert) 및 확인(Confirm) 모달을 관리하는 React Context 모듈.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
// lucide-react에서 모달 타입별 아이콘 임포트:
//   AlertCircle  → 'alert' 타입 (빨간색 경고)
//   CheckCircle2 → 'success' 타입 (초록색 성공)
//   Info         → 'info' 타입 (파란색 안내/확인)
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

// ─── Context 생성 ──────────────────────────────────────────────────────────────
const AlertContext = createContext(); // AlertContext: 알림 기능을 담는 React Context 객체.

// ─── AlertProvider 컴포넌트 ───────────────────────────────────────────────────
export function AlertProvider({ children }) {
    // ── State: 모달의 전체 상태를 하나의 객체로 관리 ─────────────────────────
    // 단일 객체로 관리해 여러 setState 호출 없이 원자적으로 모달 상태를 전환할 수 있음.
    const [alert, setAlert] = useState({
        isOpen: false,    // 초기에는 모달이 닫혀 있음
        title: '',        // 제목 (기본값 빈 문자열)
        message: '',      // 메시지 (기본값 빈 문자열)
        type: 'alert',    // 기본 타입: 빨간 경고 아이콘
        onConfirm: null,  // 확인 콜백 없음 = 단순 알림 모드
        onCancel: null,      // 추가: 취소 시 실행할 콜백
        confirmText: '확인',  // 추가: 확인 버튼 텍스트 커스텀
        cancelText: '취소',   // 추가: 취소 버튼 텍스트 커스텀
    });

    // ── 함수: closeAlert ──────────────────────────────────────────────────────
    const closeAlert = useCallback(() => {
        setAlert(prev => ({ ...prev, isOpen: false, onConfirm: null }));
        //지연 후 초기화
        setTimeout(() => {
            setAlert(prev => ({ ...prev, onConfirm: null, onCancel: null }));
        }, 200);
    }, []);

    // ── 함수: showAlert ───────────────────────────────────────────────────────
    const showAlert = useCallback((message, title = '알림', type = 'alert') => {
        setAlert({
            isOpen: true, message, title: title || '알림', type: type || 'info',
            onConfirm: null, onCancel: null, confirmText: '확인'
        });
    }, []);

    // ── 함수: showConfirm ─────────────────────────────────────────────────────
    const showConfirm = useCallback(({
        message, onConfirm, onCancel, title = '확인', type = 'info', confirmText = '확인', cancelText = '취소' }) => {
        setAlert({ isOpen: true, message, title: title || '확인', type: type || 'info', onConfirm, onCancel, confirmText, cancelText });
    }, []);

    // ── 함수: handleConfirm ───────────────────────────────────────────────────
    const handleConfirm = () => {
        // onConfirm 콜백이 있으면 실행 (사용자가 확인에 동의한 경우)
        if (alert.onConfirm) {
            alert.onConfirm();
        }
        // 콜백 실행 여부와 무관하게 항상 모달 닫기
        closeAlert();
    };

    // ── 함수: handleonCancel ───────────────────────────────────────────────────
    const handleonCancel = () => {
        // onCancle콜백이 있으면 실행 (사용자가 취소에 동의한 경우)
        if (alert.onCancel) {
            alert.onCancel();
        }
        // 콜백 실행 여부와 무관하게 항상 모달 닫기
        closeAlert();
    };

    // ─── JSX 렌더링 ────────────────────────────────────────────────────────────
    // AlertContext.Provider: 하위 컴포넌트에 showAlert, showConfirm, closeAlert를 제공.
    // children 다음에 모달 UI를 직접 렌더링하므로 호출 측에서 별도 마운트 불필요.
    return (
        <AlertContext.Provider value={{ showAlert, showConfirm, closeAlert }}>
            {/* children: Provider로 감싼 앱의 나머지 컴포넌트 트리 */}
            {children}

            {/* ── 모달 렌더링 영역: isOpen이 true일 때만 표시됨 ── */}
            {alert.isOpen && (
                // 전체화면 고정 오버레이 컨테이너: z-index 9999로 모든 요소 위에 렌더링
                <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6">
                    {/* 반투명 블러 배경: 클릭 시 closeAlert() 호출로 모달 닫힘 */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeAlert} />

                    {/* 모달 카드 패널: 최대 너비 320px, 둥근 모서리, 진입 애니메이션 */}
                    <div className="relative bg-white dark:bg-gray-900 w-full max-w-[320px] rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        {/* 모달 내용 전체를 세로로 중앙 정렬 */}
                        <div className="flex flex-col items-center text-center">

                            {/* ── 아이콘 영역: type에 따라 다른 아이콘과 색상 표시 ── */}
                            <div className="mb-4">
                                {/* success 타입: 초록색 체크 아이콘 (성공, 완료 알림) */}
                                {alert.type === 'success' && <CheckCircle2 className="w-12 h-12 text-green-500" />}
                                {/* info 타입: 파란색 정보 아이콘 (확인 요청, 안내) */}
                                {alert.type === 'info' && <Info className="w-12 h-12 text-blue-500" />}
                                {/* alert 타입: 빨간색 경고 아이콘 (오류, 경고) */}
                                {alert.type === 'alert' && <AlertCircle className="w-12 h-12 text-red-500" />}
                            </div>

                            {/* ── 제목 텍스트 ── */}
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                                {alert.title}
                            </h3>
                            {/* ── 메시지 텍스트: whitespace-pre-line으로 \n 줄바꿈 지원 ── */}
                            <p className="text-gray-500 dark:text-gray-400 text-sm break-keep mb-6 whitespace-pre-line leading-relaxed">
                                {alert.message}
                            </p>

                            {/* ── 버튼 영역 ── */}
                            <div className="flex w-full gap-3">
                                {/* [취소] 버튼: onConfirm이 있을 때만 렌더링 (Confirm 모달일 때) */}
                                {alert.onConfirm && (
                                    <button
                                        type="button"
                                        onClick={handleonCancel}
                                        className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl active:scale-95 transition-transform"
                                    >
                                        {alert.cancelText || '취소'}
                                    </button>
                                )}
                                {/* [확인] 버튼: 항상 표시. 클릭 시 handleConfirm() 실행 */}
                                {/* showAlert의 경우 콜백 없이 모달만 닫히고,
                                    showConfirm의 경우 onConfirm 콜백 실행 후 모달 닫힘 */}
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    className="flex-1 py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl active:scale-95 transition-transform"
                                >
                                    {alert.confirmText || '확인'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AlertContext.Provider>
    );
}

// ─── 커스텀 훅: useAlert ──────────────────────────────────────────────────────
/**
 * @hook useAlert
 * @description AlertContext에 접근하기 위한 커스텀 훅.
 *              반드시 <AlertProvider> 내부의 컴포넌트에서만 호출해야 한다.
 *
 * @returns {{ showAlert, showConfirm, closeAlert }}
 *   - showAlert   : (message, title?, type?) => void — 단순 알림 표시
 *   - showConfirm : (message, onConfirm, title?) => void — 확인/취소 모달 표시
 *   - closeAlert  : () => void — 현재 열린 모달 닫기
 *
 * @throws {Error} <AlertProvider> 외부에서 호출 시 에러를 던져 개발 중 실수를 방지함
 *
 * @example
 *   const { showAlert, showConfirm } = useAlert();
 *   showAlert('오류가 발생했습니다.', '오류', 'alert');
 *   showConfirm('정말 삭제하시겠습니까?', () => handleDelete());
 */
export const useAlert = () => {
    // useContext로 AlertContext의 현재 값을 가져옴
    const context = useContext(AlertContext);
    // context가 falsy이면 AlertProvider 밖에서 사용된 것이므로 에러 throw
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};
