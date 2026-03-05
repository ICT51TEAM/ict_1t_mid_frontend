/**
 * @file FilterBar.jsx
 * @description 피드 페이지 상단에 표시되는 수평 스크롤 가능한 필터 칩(chip) 바 컴포넌트.
 *
 * [역할]
 *   사용자가 피드에서 원하는 조건의 Snap을 필터링할 수 있는 UI를 제공하기 위한 컴포넌트.
 *   현재는 정적(Static) UI만 구현된 상태이며, 실제 필터링 기능은 미구현 (향후 개발 예정).
 *
 * [현재 상태]
 *   - 버튼 클릭 시 아무 동작 없음 (onClick 핸들러 없음)
 *   - 선택/비선택 상태 없음 (활성 칩 스타일 없음)
 *   - 서버 API 호출 없음
 *   - 모든 칩은 단순 시각적 표시 목적
 *
 * [필터 칩 목록 (filters 배열)]
 *   순서 및 구성:
 *   [0] 필터 아이콘 버튼 (SlidersHorizontal 아이콘, 텍스트 없음)
 *       → 향후 전체 필터 패널 열기용 버튼으로 활용 예정
 *   [1] 남         - 남성 스타일 필터
 *   [2] 여         - 여성 스타일 필터
 *   [3] 유형       - 스타일 유형 필터 (hasDropdown: true)
 *   [4] 계절       - 계절별 필터 (hasDropdown: true)
 *   [5] 스타일     - 스타일 카테고리 필터 (hasDropdown: true)
 *   [6] 키/몸무게  - 신체 사이즈 필터 (hasDropdown: true)
 *   [7] TPO        - Time/Place/Occasion 상황별 필터 (hasDropdown: true)
 *   [8] 카테고리   - 의류 카테고리 필터 (hasDropdown: true)
 *   [9] 브랜드     - 브랜드별 필터 (hasDropdown: true)
 *
 * [filters 배열 항목 구조]
 *   { label: string, icon?: JSX, hasDropdown?: boolean }
 *   - label:       버튼에 표시할 텍스트 (없으면 빈 문자열)
 *   - icon:        버튼 텍스트 앞에 표시할 아이콘 JSX (선택적)
 *   - hasDropdown: true이면 버튼 우측에 ChevronDown 아이콘 표시
 *                  향후 드롭다운 메뉴 연결 예정임을 표시
 *
 * [UI 레이아웃]
 *   - 전체 너비 흰색 배경 + 하단 구분선(border-b border-[#f3f3f3])
 *   - 내부 flex 컨테이너: overflow-x-auto scrollbar-hide px-4 py-3 gap-2
 *       → 칩이 화면 너비를 초과하면 수평 스크롤 가능
 *       → scrollbar-hide: 스크롤바를 숨겨 깔끔한 UI 유지
 *       → flex-shrink-0 (각 칩): 칩이 압축되지 않도록 최소 크기 유지
 *   - 각 칩 버튼 스타일:
 *       whitespace-nowrap: 텍스트 줄바꿈 방지 (한 줄 유지)
 *       px-3 py-1.5: 좌우 12px, 상하 6px 패딩
 *       border border-[#e5e5e5]: 연한 회색 테두리
 *       rounded-[4px]: 살짝 둥근 모서리
 *       text-[13px] text-[#424a54]: 작은 어두운 회색 텍스트
 *       hover:bg-gray-50: hover 시 연한 회색 배경
 *
 * [Props]
 *   없음 (정적 컴포넌트, props 없음)
 *
 * [상태]
 *   없음 (순수 표시 컴포넌트)
 */
import React from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

export default function FilterBar() {
    /**
     * filters: 화면에 렌더링할 필터 칩 항목 배열.
     *
     * 항목 구조:
     *   { label: string, icon?: JSX.Element, hasDropdown?: boolean }
     *   - label:       칩에 표시할 텍스트 (아이콘 전용 칩은 '' 빈 문자열)
     *   - icon:        칩 좌측에 표시할 아이콘 (선택적, SlidersHorizontal 등)
     *   - hasDropdown: true이면 칩 우측에 ChevronDown 아이콘 추가
     *
     * 첫 번째 항목(SlidersHorizontal 아이콘):
     *   전체 필터 설정 진입점 역할을 할 예정 (현재 미구현)
     *
     * hasDropdown=true 항목들:
     *   유형, 계절, 스타일, 키/몸무게, TPO, 카테고리, 브랜드
     *   향후 각각 드롭다운 메뉴 또는 필터 모달과 연결될 예정
     */
    const filters = [
        { label: '', icon: <SlidersHorizontal size={16} /> },  // 전체 필터 아이콘 버튼
        { label: '남' },                                        // 남성 스타일 필터
        { label: '여' },                                        // 여성 스타일 필터
        { label: '유형', hasDropdown: true },                   // 스타일 유형 드롭다운
        { label: '계절', hasDropdown: true },                   // 계절별 드롭다운
        { label: '스타일', hasDropdown: true },                 // 스타일 카테고리 드롭다운
        { label: '키/몸무게', hasDropdown: true },              // 신체 사이즈 드롭다운
        { label: 'TPO', hasDropdown: true },                    // 상황(Time/Place/Occasion) 드롭다운
        { label: '카테고리', hasDropdown: true },               // 의류 카테고리 드롭다운
        { label: '브랜드', hasDropdown: true },                 // 브랜드 드롭다운
    ];

    return (
        /*
         * 외부 컨테이너:
         *   - w-full bg-white: 전체 너비 흰색 배경
         *   - border-b border-[#f3f3f3]: 하단 구분선 (피드 콘텐츠와 시각적 분리)
         */
        <div className="w-full bg-white border-b border-[#f3f3f3]">
            {/*
             * 칩 스크롤 컨테이너:
             *   - flex: 칩들을 가로로 배치
             *   - overflow-x-auto: 칩이 넘칠 경우 수평 스크롤 활성화
             *   - scrollbar-hide: 스크롤바를 숨겨 깔끔한 UI 유지 (Tailwind 플러그인 필요)
             *   - px-4 py-3: 좌우 16px, 상하 12px 패딩
             *   - gap-2: 칩 사이 8px 간격
             */}
            <div className="flex overflow-x-auto scrollbar-hide px-4 py-3 gap-2">
                {filters.map((f, idx) => (
                    /*
                     * 각 필터 칩 버튼:
                     *   - key={idx}: 배열 인덱스를 key로 사용 (항목이 정적이라 안전)
                     *   - flex items-center justify-center: 아이콘+텍스트 수직 중앙 정렬
                     *   - whitespace-nowrap: 텍스트 줄바꿈 방지 (한 줄 유지)
                     *   - px-3 py-1.5: 패딩 설정
                     *   - border border-[#e5e5e5]: 연한 회색 테두리
                     *   - rounded-[4px]: 살짝 둥근 모서리
                     *   - text-[13px] text-[#424a54]: 소형 어두운 회색 텍스트
                     *   - hover:bg-gray-50: hover 시 연한 회색 배경 강조
                     *   - flex-shrink-0: 칩이 컨테이너에 의해 압축되지 않도록
                     *   - onClick: 없음 (현재 미구현, 정적 UI)
                     */
                    <button
                        key={idx}
                        className="flex items-center justify-center whitespace-nowrap px-3 py-1.5 border border-[#e5e5e5] rounded-[4px] text-[13px] text-[#424a54] hover:bg-gray-50 flex-shrink-0"
                    >
                        {/* 아이콘: f.icon이 있으면 텍스트 앞에 표시, mr-1로 텍스트와 간격 */}
                        {f.icon && <span className="mr-1">{f.icon}</span>}
                        {/* 텍스트 레이블: f.label이 있을 때만 표시 */}
                        {f.label && <span>{f.label}</span>}
                        {/* 드롭다운 화살표: hasDropdown=true일 때만 표시, 연한 회색 */}
                        {f.hasDropdown && <ChevronDown size={14} className="ml-1 text-[#a3b0c1]" />}
                    </button>
                ))}
            </div>
        </div>
    );
}
