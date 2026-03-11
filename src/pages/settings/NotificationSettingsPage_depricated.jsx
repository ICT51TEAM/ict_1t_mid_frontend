/**
 * @file NotificationSettingsPage.jsx
 * @route /settings/notifications
 * @description 사용자의 알림 수신 설정을 ON/OFF할 수 있는 페이지.
 *
 * [화면 구성]
 *   1. 상단 고정 헤더 - 뒤로가기 버튼(ArrowLeft) / "알림 설정" 제목
 *   2. 알림 설정 섹션 목록 (settingSections 배열 기반):
 *      [커뮤니티 알림]
 *        - 글벗 요청: 새로운 글벗(친구) 요청 시 알림
 *        - 글벗 수락: 내가 보낸 글벗 요청이 수락됐을 때 알림
 *        - 달개 알림: 새 뱃지(달개)를 획득했을 때 알림
 *      [시스템 및 공지]
 *        - 시스템 공지: 서비스 점검, 업데이트 등 주요 안내
 *   3. 하단 안내 문구: 기기별 설정 차이 및 마케팅 수신 동의 안내
 *
 * [상태 변수]
 *   @state {object|null} settings - 알림 설정 상태 객체
 *       settings.friendRequest  {boolean} - 글벗 요청 알림 (ON/OFF)
 *       settings.friendAccept   {boolean} - 글벗 수락 알림 (ON/OFF)
 *       settings.badge          {boolean} - 달개(뱃지) 알림 (ON/OFF)
 *       settings.system         {boolean} - 시스템 공지 알림 (ON/OFF)
 *       초기값: null → useEffect에서 API 로드 또는 기본값(모두 true)으로 설정됨
 *       null 상태일 때 → 로딩 스피너 화면 표시 (조기 반환)
 *
 * [useEffect: 알림 설정 로드]
 *   - 마운트 시 1회 실행
 *   - notificationService.getSettings 함수가 존재하는지 먼저 확인
 *     (typeof notificationService.getSettings === 'function')
 *   - 존재하면: getSettings() 호출 → API 응답으로 settings 설정
 *   - 존재하지 않거나 에러 발생 시:
 *     → 기본값 { friendRequest: true, friendAccept: true, badge: true, system: true } 사용
 *     → 백엔드 미구현 상황에서도 페이지가 정상 작동하도록 폴백 처리
 *
 * [toggleSetting: 낙관적 업데이트(Optimistic Update) 패턴]
 *   @param {string} key - 변경할 설정 키 ('friendRequest' | 'friendAccept' | 'badge' | 'system')
 *
 *   동작 순서:
 *   1. 새 설정 객체 생성: { ...settings, [key]: !settings[key] } (해당 키만 반전)
 *   2. setSettings(newSettings): UI를 즉시 업데이트 (API 응답을 기다리지 않음)
 *      → 사용자는 토글을 클릭하는 즉시 화면 변화를 확인할 수 있음 (반응성 향상)
 *   3. notificationService.updateSettings가 존재하면 API 호출
 *   4. API 실패 시: console.warn만 출력, UI 롤백 없음
 *      → 이미 프론트엔드 상태는 변경됨 (서버와 불일치 가능성 있음)
 *
 * [settingSections 배열 구조]
 *   [{ title: string, items: [{ key, label, desc }, ...] }, ...]
 *   - key:   settings 객체의 키 ('friendRequest' | 'friendAccept' | 'badge' | 'system')
 *   - label: 토글 항목의 표시 이름 (예: '글벗 요청')
 *   - desc:  해당 알림의 설명 문구 (소형 회색 텍스트)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { ArrowLeft } from 'lucide-react';
import { notificationService } from '@/api/notificationService';

export default function NotificationSettingsPage() {
    const navigate = useNavigate();

    // -------------------------------------------------------------------------
    // [상태 변수 선언]
    // -------------------------------------------------------------------------

    /**
     * settings: 알림 설정 ON/OFF 상태 객체.
     * - null: 아직 로드되지 않은 초기 상태 → 조기 반환으로 로딩 화면 표시
     * - object: API 응답 또는 기본값으로 채워진 상태 → 설정 화면 표시
     * 각 키는 settingSections에 정의된 토글 항목과 1:1 대응.
     */
    const [settings, setSettings] = useState(null);

    // -------------------------------------------------------------------------
    // [useEffect: 알림 설정 초기 로드]
    // -------------------------------------------------------------------------

    /**
     * 마운트 시 1회 실행하여 서버에서 현재 알림 설정값을 가져옴.
     *
     * 방어적 코딩:
     *   - notificationService에 getSettings 함수가 없을 수 있음
     *     (API 미구현 상황 대비)
     *   - typeof 검사로 함수 존재 여부를 먼저 확인
     *   - 없거나 에러 발생 시 → catch 블록에서 기본값(모두 true) 적용
     *
     * 성공 시: setSettings(API 응답 데이터)
     * 실패 시: setSettings({ friendRequest: true, friendAccept: true, badge: true, system: true })
     *   → 모든 알림이 기본적으로 켜진 상태로 폴백
     *
     * 의존성 배열: [] (빈 배열) → 마운트 시 1회만 실행
     */
    useEffect(() => {
        const load = async () => {
            // TODO: [1] try 블록에서 notificationService.getSettings 함수가 존재하는지 확인
            //           typeof notificationService.getSettings === 'function' 여부로 분기
            // TODO: [2] 존재하면 await notificationService.getSettings() 호출 후 setSettings(data)
            // TODO: [3] 존재하지 않으면 throw new Error('getSettings not implemented')
            // TODO: [4] catch 블록에서 기본값으로 폴백:
            //           setSettings({ friendRequest: true, friendAccept: true, badge: true, system: true })
            // 힌트: 이 패턴은 백엔드 미구현 시에도 페이지가 정상 작동하도록 방어적 코딩한 것입니다.
            try {
                if(typeof notificationService.getSettings === 'function'){
                    const settings = await notificationService.getSettings();
                    setSettings(settings);
                }else{
                    throw new Error('getSettings not implemented');
                }
            }catch(e){
                console.warn('getSettings failed',e);
                setSettings({friendRequest:true,friendAccept:true,badge:true,system:true});
            }
        };
        load();
    }, []);

    // -------------------------------------------------------------------------
    // [핸들러 함수]
    // -------------------------------------------------------------------------

    /**
     * toggleSetting: 특정 알림 설정 키의 ON/OFF를 전환하는 함수.
     *
     * @param {string} key - 변경할 설정 키
     *   가능한 값: 'friendRequest' | 'friendAccept' | 'badge' | 'system'
     *
     * 낙관적 업데이트(Optimistic Update) 패턴:
     *   1. 새 설정 객체 계산: 기존 settings 복사 후 해당 key의 boolean 값을 반전
     *   2. setSettings(newSettings): API 응답을 기다리지 않고 즉시 UI 업데이트
     *      → 사용자는 토글 클릭 즉시 화면 변화를 확인 (UX 반응성 향상)
     *   3. notificationService.updateSettings 함수가 존재하면:
     *      → updateSettings(newSettings) 호출하여 서버에 변경 사항 저장
     *   4. API 호출 실패 시:
     *      → console.warn으로 경고만 출력
     *      → UI 상태는 이미 변경된 채로 유지 (롤백 없음)
     *      → 서버와 프론트엔드 상태 불일치 가능성 있음
     */
    const toggleSetting = async (key) => {
        // TODO: [낙관적 업데이트 패턴]
        // TODO: [1] newSettings = { ...settings, [key]: !settings[key] } 계산
        //           (기존 settings 복사 후 해당 key의 boolean 값만 반전)
        // TODO: [2] setSettings(newSettings): API 응답을 기다리지 않고 즉시 UI 업데이트
        //           → 사용자는 토글 클릭 즉시 화면 변화를 확인 (UX 반응성 향상)
        // TODO: [3] try 블록에서 notificationService.updateSettings 함수가 존재하면
        //           await notificationService.updateSettings(newSettings) 호출
        // TODO: [4] catch 블록에서 console.warn만 출력 (UI 롤백 없음)
        // 힌트: 낙관적 업데이트는 먼저 UI를 변경하고 나중에 서버에 저장하는 패턴입니다.
        newSettings = {...settings,[key]:!settings[key]};
        setSettings(newSettings);
        try{
            if(typeof notificationService.updateSettings === 'function'){
                await notificationService.updateSettings(newSettings);
            }
        }catch(e){
            console.warn('updateSettings failed',e);
        }
    };

    // -------------------------------------------------------------------------
    // [조기 반환: 로딩 상태]
    // -------------------------------------------------------------------------

    // settings가 null이면(아직 로드 중) 로딩 텍스트 표시
    if (!settings) return <ResponsiveLayout showTabs={false}><div className="p-10 text-center uppercase font-black italic tracking-widest text-[#ccd3db] animate-pulse">Loading SNAP...</div></ResponsiveLayout>;

    // -------------------------------------------------------------------------
    // [설정 섹션 배열 정의]
    // -------------------------------------------------------------------------

    /**
     * settingSections: 화면에 렌더링할 알림 설정 그룹 배열.
     *
     * 구조: [{ title: string, items: Array<항목객체> }, ...]
     * 항목 객체: { key: string, label: string, desc: string }
     *   - key:   settings 객체의 키 (토글 상태값 조회 및 변경에 사용)
     *   - label: 화면에 표시할 알림 항목 이름 (굵은 검정 텍스트)
     *   - desc:  항목 아래 표시되는 설명 (소형 회색 텍스트)
     *
     * 그룹 구성:
     *   [0] 커뮤니티 알림:
     *       friendRequest - 글벗 요청 (새로운 친구 요청 수신 알림)
     *       friendAccept  - 글벗 수락 (보낸 친구 요청 수락 알림)
     *       badge         - 달개 알림 (새 뱃지 획득 알림, '달개' = 앱 내 뱃지 명칭)
     *   [1] 시스템 및 공지:
     *       system        - 시스템 공지 (점검, 업데이트 등 공지 알림)
     */
    const settingSections = [
        {
            title: '커뮤니티 알림',
            items: [
                { key: 'friendRequest', label: '글벗 요청', desc: '새로운 글벗 요청이 올 때 알림을 받습니다.' },
                { key: 'friendAccept', label: '글벗 수락', desc: '내 글벗 요청이 수락되었을 때 알림을 받습니다.' },
                { key: 'badge', label: '달개 알림', desc: '새로운 달개를 획득했을 때 알림을 받습니다.' },
            ]
        },
        {
            title: '시스템 및 공지',
            items: [
                { key: 'system', label: '시스템 공지', desc: '서비스 점검, 업데이트 등 주요 안내 사항을 받습니다.' },
            ]
        }
    ];

    // -------------------------------------------------------------------------
    // [JSX 렌더링]
    // -------------------------------------------------------------------------

    return (
        <ResponsiveLayout showTabs={false}>
            {/* 전체 페이지 컨테이너: 배경색 #f9f9fa(라이트) / #101215(다크) */}
            <div className="flex flex-col min-h-screen bg-[#f9f9fa] dark:bg-[#101215] text-black dark:text-[#e5e5e5]">

                {/* ============================================================
                    [섹션 1] 상단 고정 헤더
                    - 좌: ArrowLeft 버튼 → navigate(-1) (이전 페이지로)
                    - 중: "알림 설정" 제목
                    - 우: 빈 div(w-10)로 제목 중앙 정렬을 위한 균형 맞춤
                    - sticky top-0 z-40: 스크롤 시 최상단에 고정
                ============================================================ */}
                {/* Header */}
                <div className="flex items-center justify-between h-14 px-4 bg-white dark:bg-[#1c1f24] border-b border-[#e5e5e5] dark:border-[#292e35] sticky top-0 z-40">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="font-bold text-[16px]">알림 설정</h1>
                    {/* 제목 중앙 정렬을 위한 더미 우측 공간 */}
                    <div className="w-10"></div>
                </div>

                {/* ============================================================
                    [섹션 2] 알림 설정 섹션 목록
                    - settingSections 배열을 map으로 순회하여 그룹별 렌더링
                    - 각 그룹:
                        h2: 그룹 제목 (이탤릭 대문자 회색 소형 텍스트)
                        div: 흰색 카드 배경에 항목 목록 (구분선으로 분리)
                    - 각 항목:
                        좌측: label(굵은 검정) + desc(소형 회색) 세로 배치
                        우측: 토글 스위치 버튼
                    - 토글 스위치 디자인:
                        전체: 50px × 28px 완전 둥근(rounded-full) 배경
                        활성(ON):  배경 검정(라이트) / #e5e5e5(다크)
                        비활성(OFF): 배경 #e5e5e5(라이트) / #292e35(다크)
                        내부 원(22px): 흰색(라이트) / #101215(다크), 그림자 있음
                        활성 시 translate-x-[22px] (우측 이동), 300ms 애니메이션
                    - 클릭 시 toggleSetting(item.key) 호출
                ============================================================ */}
                <div className="flex flex-col gap-8 py-8">
                    {settingSections.map((section, idx) => (
                        <div key={idx} className="flex flex-col">
                            {/* 그룹 제목: 이탤릭 대문자 회색 소형 텍스트 */}
                            <h2 className="px-6 mb-3 text-[12px] font-black italic tracking-widest text-[#a3b0c1] uppercase">{section.title}</h2>
                            <div className="bg-white dark:bg-[#1c1f24] border-y border-[#f3f3f3] dark:border-[#292e35] divide-y divide-[#f3f3f3] dark:divide-[#292e35]">
                                {section.items.map((item) => (
                                    <div key={item.key} className="flex items-center justify-between px-6 py-5">
                                        {/* 항목 설명 영역: 레이블 + 설명 텍스트 세로 배치 */}
                                        <div className="flex flex-col gap-1 pr-6">
                                            {/* 알림 항목 이름 (굵은 검정) */}
                                            <span className="text-[15px] font-bold text-black dark:text-[#e5e5e5]">{item.label}</span>
                                            {/* 알림 설명 (소형 회색) */}
                                            <span className="text-[12px] text-[#7b8b9e] font-medium leading-tight">{item.desc}</span>
                                        </div>
                                        {/* 토글 스위치 버튼: 클릭 시 toggleSetting(item.key) 호출 */}
                                        <button
                                            onClick={() => toggleSetting(item.key)}
                                            className={`relative w-[50px] h-[28px] rounded-full transition-all duration-300 flex-shrink-0 ${settings[item.key] ? 'bg-black dark:bg-[#e5e5e5]' : 'bg-[#e5e5e5] dark:bg-[#292e35]'}`}
                                        >
                                            {/* 내부 원: 켜짐 → 우측(translate-x-[22px]), 꺼짐 → 좌측(translate-x-0) */}
                                            <div className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] bg-white dark:bg-[#101215] rounded-full shadow-md transition-all duration-300 ${settings[item.key] ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* ============================================================
                        [섹션 3] 하단 안내 문구
                        - 기기별로 설정이 다를 수 있다는 안내
                        - 마케팅 수신 동의 시 이벤트/혜택 안내
                        - 소형(11px) 연한 회색 텍스트, 줄간격 relaxed
                    ============================================================ */}
                    <div className="px-6 mt-4">
                        <p className="text-[11px] text-[#ccd3db] font-medium leading-relaxed">
                            * 알림 설정은 기기별로 다르게 설정될 수 있습니다.<br />
                            * 마케팅 정보 수신 동의 시 이벤트 및 맞춤 혜택 정보를 받으실 수 있습니다.
                        </p>
                    </div>
                </div>
            </div>
        </ResponsiveLayout>
    );
}
