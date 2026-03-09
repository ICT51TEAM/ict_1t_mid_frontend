/**
 * @file SettingsPage.jsx
 * @route /settings
 * @description 앱 전반의 설정을 관리하는 페이지.
 *
 * [화면 구성]
 *   1. 상단 고정 헤더 - 뒤로가기 버튼 / "설정" 제목
 *   2. 설정 항목 그룹 목록 (settingItems 배열 기반):
 *      - 계정 설정: 비밀번호 변경 / 계정 탈퇴
 *      - 알림 및 표시: 알림 설정 / 다크 모드 토글
 *      - 지원 및 정책: 서비스 이용약관 / 개인정보 처리방침 / Q&A 게시판
 *   3. 로그아웃 버튼 (빨간 텍스트, 전체 너비)
 *   4. 팝업 레이어 (popup.isOpen=true일 때):
 *      - 서비스 이용약관(terms) 또는 개인정보 처리방침(privacy) 내용을 바텀시트 모달로 표시
 *      - 배경 클릭 또는 X 버튼으로 닫기
 *      - CLOSE 버튼으로 닫기
 *
 * [상태 변수]
 *   @state {object}  popup         - 팝업 제어 객체
 *       popup.isOpen  {boolean}    - 팝업 표시 여부 (true: 표시, false: 숨김)
 *       popup.type    {string|null} - 팝업 콘텐츠 종류 ('terms' | 'privacy' | null)
 *   @state {boolean} isDarkMode    - 현재 다크 모드 활성화 여부
 *       초기값: localStorage의 'darkMode' 키가 'true'면 true, 그 외 false
 *       (lazy initializer 사용: 최초 렌더 시 1회만 localStorage 읽기)
 *
 * [settingItems 배열 구조]
 *   각 그룹 객체: { title: string, items: Array }
 *   각 항목 객체:
 *     - 일반 네비게이션 항목: { icon, text, path }
 *         → 클릭 시 navigate(path) 호출
 *     - 커스텀 클릭 항목:   { icon, text, onClick }
 *         → 클릭 시 onClick 함수 호출 (팝업 열기 등)
 *     - 토글 항목:          { icon, text, isToggle: true, value, onToggle }
 *         → 행 전체 클릭 또는 우측 토글 스위치 클릭으로 onToggle 호출
 *         → 토글 스위치: value=true이면 검정 배경 + 우측 이동한 흰 원
 *
 * [주요 동작]
 *   toggleDarkMode:
 *     1. isDarkMode 상태 반전
 *     2. localStorage.setItem('darkMode', 'true' | 'false') 저장
 *     3. document.documentElement.classList.add/remove('dark') → Tailwind dark 모드 즉시 전환
 *
 *   handleLogout:
 *     1. window.confirm('로그아웃 하시겠습니까?') → 확인 클릭 시
 *     2. navigate('/login') → 로그인 페이지로 이동
 *     (실제 토큰/세션 무효화 로직은 미구현 - AuthContext logout 호출 없음)
 *
 *   팝업 열기: setPopup({ isOpen: true, type: 'terms' | 'privacy' })
 *   팝업 닫기: setPopup({ isOpen: false, type: null })
 *             배경 오버레이 클릭, X 버튼, CLOSE 버튼 모두 동일 동작
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft, ChevronRight, LogOut, Shield, Trash2, Bell, Smartphone, FileText, X, HelpCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/api/userService';

export default function SettingsPage() {
    const navigate = useNavigate();

    // -------------------------------------------------------------------------
    // [상태 변수 선언]
    // -------------------------------------------------------------------------

    /**
     * popup: 약관/개인정보 처리방침 팝업 제어 상태.
     * - isOpen=false, type=null: 팝업 숨김 (기본 상태)
     * - isOpen=true, type='terms': 서비스 이용약관 팝업 표시
     * - isOpen=true, type='privacy': 개인정보 처리방침 팝업 표시
     * 팝업 열기: setPopup({ isOpen: true, type: '...' })
     * 팝업 닫기: setPopup({ isOpen: false, type: null })
     */
    const [popup, setPopup] = useState({ isOpen: false, type: null });

    /**
     * isDarkMode: 현재 다크 모드 활성화 여부.
     * lazy initializer: 컴포넌트 최초 렌더링 시 localStorage에서 'darkMode' 값을 읽어 초기화.
     * - 'true' 문자열이면 true, 그 외 모든 값은 false.
     * 변경 시 toggleDarkMode()에서 localStorage와 document.documentElement 클래스 동기화.
     */
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

    // -------------------------------------------------------------------------
    // [핸들러 함수]
    // -------------------------------------------------------------------------

    /**
     * toggleDarkMode: 다크 모드 ON/OFF 토글 함수.
     *
     * 동작 순서:
     *   1. newMode = !isDarkMode (현재 상태 반전)
     *   2. setIsDarkMode(newMode): React 상태 업데이트 (토글 UI 즉시 반영)
     *   3. localStorage.setItem('darkMode', 'true' | 'false'): 새로고침 후에도 설정 유지
     *   4. newMode=true → document.documentElement.classList.add('dark')
     *      newMode=false → document.documentElement.classList.remove('dark')
     *      Tailwind CSS의 class 기반 dark 모드 전략에 따라 루트 요소에 'dark' 클래스 추가/제거.
     *      이 클래스가 있으면 모든 dark:* CSS가 활성화됨.
     */
    const toggleDarkMode = () => {
        // TODO: [1] newMode = !isDarkMode (현재 상태 반전)
        // TODO: [2] setIsDarkMode(newMode): React 상태 업데이트 (토글 UI 즉시 반영)
        // TODO: [3] localStorage.setItem('darkMode', String(newMode)): 새로고침 후에도 설정 유지
        // TODO: [4] newMode=true → document.documentElement.classList.add('dark')
        //           newMode=false → document.documentElement.classList.remove('dark')
        // 힌트: Tailwind CSS의 class 기반 dark 모드 전략에 따라
        //       루트 요소에 'dark' 클래스를 추가/제거해야 dark:* CSS가 활성화됩니다.
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        localStorage.setItem('darkMode', String(newMode));
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    /**
     * handleLogout: 로그아웃 처리 함수.
     *
     * [구현상의 문제점 & 학습 포인트]
     * 현재 이 함수는 단순 페이지 이동(`navigate`)만 수행하고 있습니다.
     * 백엔드가 연동된 실제 환경에서는 브라우저의 전역 인증 상태(AuthContext)를 초기화하고, 
     * 저장된 토큰(JWT 등)을 삭제하는 로직이 반드시 선행되어야 합니다.
     *
     * [실제 구현 시 추가 작업]:
     * 1. 상단에서 `const { logout } = useAuth();` 를 호출하여 로그아웃 함수를 가져옵니다.
     * 2. navigate 호출 직전에 `logout();`을 실행하여 세션을 안전하게 종료합니다.
     *
     * 동작:
     *   1. window.confirm('로그아웃 하시겠습니까?'): 브라우저 확인 다이얼로그 표시
     *   2. 확인(OK) 클릭 시 → navigate('/login'): 로그인 페이지로 이동
     *   3. 취소 클릭 시 → 아무 동작 없음
     */
    const { logout } = useAuth();

    const handleLogout = () => {
        if (window.confirm('로그아웃 하시겠습니까?')) {
            // TODO: 실제 서비스 운영 시 AuthContext의 logout() 함수를 호출하여 
            //       localStorage의 토큰을 삭제하고 전역 인증 상태를 null로 초기화해야 함.
            logout();
            navigate('/login');
        }
    };

    // -------------------------------------------------------------------------
    // [설정 항목 배열 정의]
    // -------------------------------------------------------------------------

    /**
     * settingItems: 화면에 렌더링할 설정 그룹 배열.
     * 구조: [{ title: string, items: Array<항목객체> }, ...]
     *
     * 항목 객체 유형:
     *   A. 네비게이션 항목 (path 있음):
     *      { icon: JSX, text: string, path: string }
     *      → 클릭 시 navigate(path) 호출
     *
     *   B. 커스텀 클릭 항목 (onClick 있음):
     *      { icon: JSX, text: string, onClick: function }
     *      → 클릭 시 onClick() 호출 (예: 팝업 열기)
     *
     *   C. 토글 항목 (isToggle: true):
     *      { icon: JSX, text: string, isToggle: true, value: boolean, onToggle: function }
     *      → value: 토글 현재 상태 (켜짐/꺼짐)
     *      → onToggle: 토글 클릭 시 호출할 함수
     *      → 행 우측에 커스텀 토글 스위치 버튼을 별도로 렌더링
     *
     * 그룹 구성:
     *   [0] 계정 설정:
     *       - 비밀번호 변경 → /settings/change-password
     *       - 계정 탈퇴 → /settings/delete-account
     *   [1] 알림 및 표시:
     *       - 알림 설정 → /settings/notifications
     *       - 다크 모드 (토글) → toggleDarkMode
     *   [2] 지원 및 정책:
     *       - 서비스 이용약관 → setPopup({ isOpen: true, type: 'terms' })
     *       - 개인정보 처리방침 → setPopup({ isOpen: true, type: 'privacy' })
     *       - Q&A 게시판 → /settings/qna
     */

    const [isNotificationEnabled, setIsNotificationEnabled] = useState(null);

    useEffect(() => {
        userService.getSettings().then(data => {
            setIsNotificationEnabled(data.notificationEnabled ?? true);
        }).catch(() => {});
    }, []);

    const toggleNotification = async () => {
        const newVal = !isNotificationEnabled;
        setIsNotificationEnabled(newVal);
        localStorage.setItem('notificationEnabled', String(newVal));
        try {
            await userService.updateSettings({
                notificationEnabled: newVal,
                showVisitorCount: false,
                labFeaturesEnabled: false,
                bgmUrl: null,
                themeColor: null,
            });
        } catch(e) {
            console.warn('알림 설정 저장 실패', e);
        }
    };
    const settingItems = [
        {
            title: '계정 설정', items: [
                { icon: <Shield size={20} />, text: '비밀번호 변경', path: '/settings/change-password' },
                { icon: <Trash2 size={20} />, text: '계정 탈퇴', path: '/settings/delete-account' },
            ]
        },
        {
            title: '알림 및 표시', items: [
                ...(isNotificationEnabled !== null ? [{
                    icon: <Bell size={20} />,
                    text: '알림',
                    isToggle: true,
                    value: isNotificationEnabled,
                    onToggle: toggleNotification
                }] : []),
                {
                    icon: <Smartphone size={20} />,
                    text: '다크 모드',
                    isToggle: true,
                    value: isDarkMode,
                    onToggle: toggleDarkMode
                },
            ]
        },
        {
            title: '지원 및 정책', items: [
                { icon: <FileText size={20} />, text: '서비스 이용약관', onClick: () => setPopup({ isOpen: true, type: 'terms' }) },
                { icon: <Shield size={20} />, text: '개인정보 처리방침', onClick: () => setPopup({ isOpen: true, type: 'privacy' }) },
                { icon: <HelpCircle size={20} />, text: 'Q&A 게시판', path: '/settings/qna' },
            ]
        },
    ];

    // -------------------------------------------------------------------------
    // [JSX 렌더링]
    // -------------------------------------------------------------------------

    return (
        <ResponsiveLayout showTabs={false}>
            {/* 전체 페이지 컨테이너: 배경색 라이트(#f9f9fa) / 다크(#101215), 300ms 전환 애니메이션 */}
            <div className="flex flex-col min-h-screen bg-[#f9f9fa] dark:bg-[#101215] text-black dark:text-white transition-colors duration-300">

                {/* ============================================================
                    [섹션 1] 상단 고정 헤더
                    - 좌: ArrowLeft 버튼 → navigate(-1) (이전 페이지로)
                    - 중: "설정" 제목
                    - 우: 빈 div(w-10)로 제목을 중앙 정렬하기 위한 더미 공간
                    - sticky top-0 z-40: 스크롤 시 최상단에 고정
                ============================================================ */}
                <div className="flex items-center justify-between h-14 px-4 bg-white dark:bg-[#1c1f24] border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 z-40 transition-colors duration-300">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="font-bold text-[16px]">설정</h1>
                    {/* 제목 중앙 정렬을 위한 더미 우측 공간 */}
                    <div className="w-10"></div>
                </div>

                {/* ============================================================
                    [섹션 2] 설정 항목 그룹 목록
                    - settingItems 배열을 map으로 순회하여 그룹별 렌더링
                    - 각 그룹:
                        h2: 그룹 제목 (회색 소문자 스타일)
                        div: 흰색 카드 배경에 항목 목록
                    - 각 항목 렌더링 규칙:
                        항목 전체 행: flex items-center justify-between
                        좌측: 아이콘(회색) + 텍스트
                        우측: 토글 아닌 경우 → ChevronRight 아이콘
                              토글인 경우 → 커스텀 토글 스위치 버튼
                    - 클릭 동작 결정 우선순위:
                        item.isToggle → item.onToggle
                        item.onClick  → item.onClick
                        그 외          → () => navigate(item.path)
                ============================================================ */}
                <div className="flex flex-col gap-6 py-6 pb-24">
                    {settingItems.map((group, idx) => (
                        <div key={idx} className="flex flex-col">
                            {/* 그룹 제목: 대문자 회색 소형 텍스트 */}
                            <h2 className="px-5 mb-2 text-[12px] font-bold text-[#a3b0c1] uppercase tracking-wider">{group.title}</h2>
                            <div className="bg-white dark:bg-[#1c1f24] border-y border-[#f3f3f3] dark:border-[#292e35] transition-colors duration-300">
                                {group.items.map((item, iIdx) => (
                                    <div
                                        key={iIdx}
                                        className="w-full flex items-center justify-between px-5 py-4 border-b last:border-b-0 border-[#f3f3f3] dark:border-[#292e35]"
                                    >
                                        {/* 항목 버튼 영역 (아이콘 + 텍스트 + 우측 화살표) */}
                                        <button
                                            onClick={item.isToggle ? item.onToggle : (item.onClick || (() => navigate(item.path)))}
                                            className="flex-1 flex items-center justify-between hover:opacity-70 transition-opacity"
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* 아이콘: 회색(라이트)/짙은회색(다크) */}
                                                <span className="text-gray-500 dark:text-gray-400">{item.icon}</span>
                                                <span className="text-[14px] font-medium">{item.text}</span>
                                            </div>
                                            {/* 토글 항목이 아닌 경우에만 우측 화살표(ChevronRight) 표시 */}
                                            {!item.isToggle && <ChevronRight size={18} className="text-[#ccd3db] dark:text-gray-600" />}
                                        </button>

                                        {/* 토글 스위치: isToggle=true인 항목에만 렌더링
                                            - 전체 너비 44px, 높이 24px, 완전 둥근(rounded-full) 배경
                                            - 활성(value=true): 배경 검정(라이트) / 흰색(다크)
                                            - 비활성(value=false): 배경 회색
                                            - 내부 흰 원: 활성 시 translate-x-[20px] (우측 이동)
                                              비활성 시 translate-x-0 (좌측 위치)
                                            - 300ms 부드러운 전환 애니메이션 */}
                                        {item.isToggle && (
                                            <button
                                                onClick={item.onToggle}
                                                className={`relative w-[44px] h-[24px] rounded-full ${item.value ? 'bg-black dark:bg-white' : 'bg-[#e5e5e5] dark:bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] rounded-full ${item.value ? 'translate-x-[20px] bg-white dark:bg-[#1c1f24]' : 'translate-x-0 bg-white'}`} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* ============================================================
                        [섹션 3] 로그아웃 버튼
                        - 전체 너비, 빨간 텍스트, 테두리 박스 형태
                        - 클릭 시 handleLogout() 호출 → window.confirm 확인 후 /login 이동
                        - hover: 연한 빨간 배경 (red-50 / dark: red-900/10)
                    ============================================================ */}
                    <div className="mt-4 px-4">
                        <button
                            onClick={handleLogout}
                            className="w-full h-12 bg-white dark:bg-[#1c1f24] border border-[#e5e5e5] dark:border-[#292e35] rounded-[4px] flex items-center justify-center gap-2 text-red-500 font-bold text-[14px] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                            <LogOut size={18} />
                            로그아웃
                        </button>
                    </div>
                </div>
            </div>

            {/* ================================================================
                [섹션 4] 약관/개인정보 팝업 레이어 (popup.isOpen=true일 때만 렌더링)
                구조:
                  - 고정 위치(fixed inset-0) 풀스크린 컨테이너 (z-[100])
                  - 배경 오버레이: 반투명 검정 + blur
                    → 클릭 시 setPopup({ isOpen: false, type: null })으로 닫기
                  - 모달 카드: 중앙 정렬, max-w-2xl, 최대 높이 85vh (내부 스크롤)
                    → fade-in + zoom-in-95 애니메이션
                  모달 내부 구조:
                    [헤더] 제목 (Terms of Use / Privacy Policy) + X 닫기 버튼
                    [본문] 스크롤 가능 영역
                      - type='terms': 서비스 이용약관 (3개 조항: 목적, 용어의 정의, 회원의 의무)
                      - type='privacy': 개인정보 처리방침 (3개 항목: 수집 정보, 이용, 보유기간)
                    [푸터] CLOSE 버튼 → 팝업 닫기
            ================================================================ */}
            {/* Layer Popup */}
            {popup.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* 배경 오버레이: 클릭 시 팝업 닫기 */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setPopup({ isOpen: false, type: null })}
                    />
                    {/* 모달 카드 */}
                    <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f3f3f3] bg-white text-black">
                            {/* 팝업 타입에 따라 제목 변경 */}
                            <h2 className="text-[18px] font-black italic tracking-tighter uppercase">
                                {popup.type === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
                            </h2>
                            {/* X 닫기 버튼: 클릭 시 팝업 닫기 */}
                            <button
                                onClick={() => setPopup({ isOpen: false, type: null })}
                                className="w-10 h-10 flex items-center justify-center bg-[#f3f3f3] rounded-full hover:bg-black hover:text-white transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content: 스크롤 가능한 본문 영역 */}
                        <div className="p-6 md:p-10 overflow-y-auto w-full scrollbar-hide">
                            <div className="prose prose-sm text-[#424a54] max-w-none">
                                {/* 팝업 메인 제목 */}
                                <p className="font-black text-[18px] text-black mb-8 leading-tight italic tracking-tighter">
                                    {popup.type === 'terms' ? 'MUSINSA SNAP 서비스 이용약관' : '개인정보 처리방침 안내'}
                                </p>

                                {popup.type === 'terms' ? (
                                    /* 서비스 이용약관 본문 (type='terms')
                                       - 최종 수정일 표시
                                       - 제 1조: 목적 (서비스 이용 권리/의무 규정)
                                       - 제 2조: 용어의 정의 (SNAP 서비스 정의)
                                       - 제 3조: 회원의 의무 (저작권, 에티켓, 게시물 삭제 정책) */
                                    <div className="space-y-10 text-[14px] leading-relaxed">
                                        <div className="text-[#7b8b9e] font-medium italic underline underline-offset-4 mb-10">최종 수정일: 2026년 3월 3일</div>

                                        <section>
                                            <h3 className="text-black font-black italic tracking-widest uppercase text-[15px] mb-4 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-black rotate-45" /> 제 1 조 (목적)
                                            </h3>
                                            <p>본 약관은 무신사(이하 '회사')가 제공하는 SNAP 서비스 및 관련 제반 서비스의 이용과 관련하여 회사와 회원간의 권리, 의무 및 책임사항 등을 규정함을 목적으로 합니다.</p>
                                        </section>

                                        <section>
                                            <h3 className="text-black font-black italic tracking-widest uppercase text-[15px] mb-4 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-black rotate-45" /> 제 2 조 (용어의 정의)
                                            </h3>
                                            <p>'SNAP 서비스'라 함은 회원이 사진, 동영상 등 스타일 콘텐츠를 게시하고 다른 회원과 공유하며 소통할 수 있는 스타일링 커뮤니티 서비스를 의미합니다.</p>
                                        </section>

                                        <section>
                                            <h3 className="text-black font-black italic tracking-widest uppercase text-[15px] mb-4 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-black rotate-45" /> 제 3 조 (회원의 의무)
                                            </h3>
                                            <p>회원은 타인의 저작권을 침해하는 게시물을 게시해서는 안 되며, 서비스 내 소통 에티켓을 준수하여야 합니다. 부적절한 게시물은 운영 정책에 따라 삭제될 수 있습니다.</p>
                                        </section>
                                    </div>
                                ) : (
                                    /* 개인정보 처리방침 본문 (type='privacy')
                                       - 1. 수집하는 개인정보: 필수항목(아이디, 이메일, 프로필 사진), 선택항목(신체 사이즈)
                                       - 2. 개인정보의 이용: 회원 식별, 맞춤 추천, 서비스 개선, 통계 분석
                                       - 3. 정보의 보유 기간: 탈퇴 시 즉시 파기, 법령에 의한 예외 */
                                    <div className="space-y-10 text-[14px] leading-relaxed">
                                        <div className="text-[#0078ff] font-bold italic tracking-tighter mb-10">당신의 소중한 스타일과 개인정보를 투명하게 관리합니다.</div>

                                        <section>
                                            <h3 className="text-black font-black italic tracking-widest uppercase text-[15px] mb-4 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-black rotate-45" /> 1. 수집하는 개인정보
                                            </h3>
                                            <p className="mb-3">회사는 서비스 제공을 위해 최소한의 개인정보를 수집하고 있습니다.</p>
                                            <ul className="list-disc pl-5 space-y-2 opacity-80 font-medium">
                                                <li>필수항목: 미니홈피명(아이디), 이메일, 프로필 사진</li>
                                                <li>선택항목: 신체 사이즈(키, 몸무게 - 스타일 추천용)</li>
                                            </ul>
                                        </section>

                                        <section>
                                            <h3 className="text-black font-black italic tracking-widest uppercase text-[15px] mb-4 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-black rotate-45" /> 2. 개인정보의 이용
                                            </h3>
                                            <p>수집된 정보는 회원 식별, 맞춤형 콘텐츠 추천, 서비스 질 개선 및 통계 분석을 목적으로만 사용됩니다.</p>
                                        </section>

                                        <section>
                                            <h3 className="text-black font-black italic tracking-widest uppercase text-[15px] mb-4 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-black rotate-45" /> 3. 정보의 보유 기간
                                            </h3>
                                            <p>회원 탈퇴 시 또는 수집 목적이 달성된 경우 지체 없이 파기하는 것을 원칙으로 합니다. 단, 법령에 의하여 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.</p>
                                        </section>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer: CLOSE 버튼 */}
                        <div className="px-6 py-6 border-t border-[#f3f3f3] bg-[#fafafa]">
                            <button
                                onClick={() => setPopup({ isOpen: false, type: null })}
                                className="w-full h-14 bg-black text-white font-black italic tracking-[2px] uppercase text-[15px] rounded-2xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ResponsiveLayout>
    );
}

