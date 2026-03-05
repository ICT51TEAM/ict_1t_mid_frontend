/**
 * @file AlertContext.jsx
 * @description 앱 전역 커스텀 알림(Alert) 및 확인(Confirm) 모달을 관리하는 React Context 모듈.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [역할 및 아키텍처에서의 위치]
 *   - 브라우저 기본 alert()·confirm() 대화상자를 대체하는 커스텀 모달 시스템.
 *   - main.jsx에서 <AlertProvider>로 감싸져 앱 전역에서 사용 가능.
 *   - Provider 순서: AuthProvider > AlertProvider > BrowserRouter > App
 *   - 모달 UI를 Provider 내부에서 직접 렌더링하므로, 호출 컴포넌트가 별도로
 *     모달 JSX를 포함할 필요 없이 함수만 호출하면 된다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [State 변수: alert 객체]
 *   alert: {
 *     isOpen   : boolean        — 모달 표시 여부. true이면 오버레이+모달이 렌더링됨.
 *     title    : string         — 모달 상단에 표시되는 제목 텍스트.
 *     message  : string         — 모달 본문 메시지. 줄바꿈(\n) 지원.
 *     type     : 'alert'        — 빨간 아이콘 (AlertCircle). 경고·오류용.
 *              | 'success'      — 초록 아이콘 (CheckCircle2). 성공 알림용.
 *              | 'info'         — 파란 아이콘 (Info). 일반 안내·확인 요청용.
 *     onConfirm: function|null  — null이면 단순 알림(버튼 1개),
 *                                 함수이면 확인/취소 2버튼 Confirm 모달.
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [제공하는 Context 값 (value shape)]
 *   {
 *     showAlert   : function — 단순 알림 모달 표시 (확인 버튼 1개)
 *     showConfirm : function — 확인/취소 2버튼 모달 표시
 *     closeAlert  : function — 모달 강제 닫기
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [모달 UI 구조]
 *   fixed 전체화면 오버레이 (z-index: 9999)
 *   └─ 반투명 블러 배경 (클릭 시 닫힘)
 *   └─ 흰색 카드 패널 (최대 너비 320px, 둥근 모서리)
 *       ├─ 아이콘 영역 (type에 따라 색상 변경)
 *       ├─ 제목 텍스트
 *       ├─ 메시지 텍스트
 *       └─ 버튼 영역
 *           ├─ [취소] 버튼 (onConfirm이 있을 때만 표시)
 *           └─ [확인] 버튼 (항상 표시)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [Export]
 *   - AlertProvider : 알림 상태와 모달 UI를 제공하는 Context Provider 컴포넌트
 *   - useAlert      : AlertContext에 접근하기 위한 커스텀 훅
 */
import React, { createContext, useContext, useState } from 'react';
// lucide-react에서 모달 타입별 아이콘 임포트:
//   AlertCircle  → 'alert' 타입 (빨간색 경고)
//   CheckCircle2 → 'success' 타입 (초록색 성공)
//   Info         → 'info' 타입 (파란색 안내/확인)
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

// ─── Context 생성 ──────────────────────────────────────────────────────────────
// AlertContext: 알림 기능을 담는 React Context 객체.
// 초기값 없이 생성. Provider 없이 사용하면 useAlert()에서 에러를 던짐.
const AlertContext = createContext();

// ─── AlertProvider 컴포넌트 ───────────────────────────────────────────────────
/**
 * @component AlertProvider
 * @description 전역 알림/확인 모달 상태를 관리하고, 실제 모달 UI를 렌더링한다.
 *              하위 컴포넌트는 useAlert() 훅을 통해 showAlert/showConfirm을 호출하면 됨.
 *
 * @param {React.ReactNode} children - Provider가 감쌀 자식 컴포넌트 트리
 */
export function AlertProvider({ children }) {
    // ── State: 모달의 전체 상태를 하나의 객체로 관리 ─────────────────────────
    // 단일 객체로 관리해 여러 setState 호출 없이 원자적으로 모달 상태를 전환할 수 있음.
    const [alert, setAlert] = useState({
        isOpen: false,    // 초기에는 모달이 닫혀 있음
        title: '',        // 제목 (기본값 빈 문자열)
        message: '',      // 메시지 (기본값 빈 문자열)
        type: 'alert',    // 기본 타입: 빨간 경고 아이콘
        onConfirm: null,  // 확인 콜백 없음 = 단순 알림 모드
    });

    // ── 함수: closeAlert ──────────────────────────────────────────────────────
    /**
     * @function closeAlert
     * @description 모달을 닫는다. isOpen만 false로 변경하고 나머지 필드는 유지.
     *              (다음 showAlert/showConfirm 호출 전까지 이전 내용이 남아있어도
     *               isOpen=false이면 렌더링되지 않으므로 문제없음)
     *
     * 호출 시점:
     *   - 배경(오버레이) 클릭
     *   - [취소] 버튼 클릭
     *   - [확인] 버튼 클릭 (handleConfirm 내부에서 호출)
     */
    const closeAlert = () => {
        // TODO: setAlert(prev => ({...prev, isOpen: false, onConfirm: null})) 호출
    };

    // ── 함수: showAlert ───────────────────────────────────────────────────────
    /**
     * @function showAlert
     * @description 단순 알림 모달을 표시한다. [확인] 버튼 1개만 렌더링됨.
     *              브라우저 기본 alert()의 커스텀 대체재.
     *
     * @param {string} message        - 모달에 표시할 메시지 내용 (필수)
     * @param {string} [title='알림'] - 모달 제목 (기본값: '알림')
     * @param {string} [type='alert'] - 아이콘 타입: 'alert'(빨강) | 'success'(초록) | 'info'(파랑)
     *
     * @example
     *   showAlert('저장에 실패했습니다.', '오류', 'alert');
     *   showAlert('성공적으로 저장되었습니다.', '완료', 'success');
     */
    const showAlert = (message, title = '알림', type = 'alert') => {
        // TODO: setAlert({ isOpen:true, message, title: title||'알림', type: type||'info', onConfirm: null }) 호출
    };

    // ── 함수: showConfirm ─────────────────────────────────────────────────────
    /**
     * @function showConfirm
     * @description 확인/취소 2버튼 모달을 표시한다.
     *              브라우저 기본 confirm()의 커스텀 대체재.
     *              사용자가 [확인]을 누르면 onConfirm 콜백이 실행됨.
     *
     * @param {string}   message          - 모달에 표시할 질문/메시지
     * @param {function} onConfirm        - [확인] 버튼 클릭 시 실행할 콜백 함수
     * @param {string}   [title='확인']   - 모달 제목 (기본값: '확인')
     *
     * 주의: type은 항상 'info'(파란 아이콘)로 고정됨 (확인 요청은 정보 성격)
     *
     * @example
     *   showConfirm('게시물을 삭제하시겠습니까?', () => deletePost(postId), '삭제 확인');
     */
    const showConfirm = (message, onConfirm, title = '확인') => {
        // TODO: setAlert({ isOpen:true, message, title: title||'확인', type:'info', onConfirm }) 호출
    };

    // ── 함수: handleConfirm ───────────────────────────────────────────────────
    /**
     * @function handleConfirm
     * @description [확인] 버튼 클릭 시 실행되는 내부 핸들러.
     *              onConfirm 콜백이 있으면 먼저 실행하고, 항상 모달을 닫는다.
     *
     * 동작 순서:
     *   1. alert.onConfirm이 존재하면 실행 (showConfirm으로 열린 경우)
     *   2. closeAlert()로 모달 닫기
     *
     * 주의: 이 함수는 AlertContext의 value에는 포함되지 않고 내부적으로만 사용됨.
     */
    const handleConfirm = () => {
        // onConfirm 콜백이 있으면 실행 (사용자가 확인에 동의한 경우)
        if (alert.onConfirm) {
            alert.onConfirm();
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
                                        onClick={closeAlert}
                                        className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl active:scale-95 transition-transform"
                                    >
                                        취소
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
                                    확인
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
