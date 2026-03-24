/**
 * @file RankSnapCard.jsx
 * @description 랭킹 페이지에서 순위와 함께 Snap 이미지를 표시하는 카드 컴포넌트.
 *              순위 번호 오버레이와 로컬 좋아요 토글 버튼이 포함된다.
 *
 * [역할]
 *   랭킹 목록(RankingPage 등)에서 순위가 있는 Snap을 표시할 때 사용.
 *   일반 SnapCard와 달리 좌상단 순위 번호와 우하단 하트 버튼이 이미지 위에 오버레이됨.
 *
 * [Props]
 *   @prop {object} snap         - 표시할 Snap 데이터 객체
 *       snap.id       {number|string} - Snap 고유 ID (링크 URL /snap/:id 생성에 사용)
 *       snap.imageUrl {string}        - 이미지 URL
 *                                       ※ getImageUrl() 정규화 없이 직접 사용
 *                                          (백엔드가 절대 URL을 반환한다고 가정)
 *       snap.isLiked  {boolean}       - 현재 사용자의 초기 좋아요 여부 (서버 기반)
 *   @prop {number} rank         - 표시할 순위 번호 (1, 2, 3, ...)
 *
 * [상태 변수]
 *   @state {boolean} liked - 현재 좋아요 상태.
 *       초기값: snap.isLiked (서버에서 받은 초기 좋아요 여부)
 *       토글: 하트 버튼 클릭 시 setLiked(!liked)
 *       ※ 중요: 이 상태는 로컬(프론트엔드)에만 반영됨.
 *               백엔드 좋아요 API 호출 없음 → 페이지 새로고침 시 초기화됨.
 *
 * [UI 구성]
 *   카드 컨테이너:
 *     - break-inside-avoid: Masonry 레이아웃에서 카드 열 분할 방지
 *     - mb-1: 카드 하단 여백 4px (SnapCard의 mb-2보다 좁음)
 *
 *   Link (/snap/:id):
 *     - 전체 카드 영역이 클릭 가능 (이미지 클릭 → 상세 페이지 이동)
 *     - overflow-hidden: 이미지가 카드 밖으로 넘치지 않도록
 *
 *   이미지:
 *     - w-full h-[250px]: 고정 높이 250px (SnapCard의 h-auto와 다름, 일정한 높이 유지)
 *     - object-cover: 이미지 비율을 유지하며 250px 높이 채움
 *     - loading="lazy": 지연 로드
 *     - ※ onError 폴백 없음 (SnapCard와 차이점)
 *
 *   순위 번호 오버레이 (좌상단):
 *     - absolute top-2 left-2: 이미지 좌상단에 위치
 *     - bg-white text-black: 흰 배경 검정 텍스트
 *     - font-bold text-[12px] px-[6px] py-[2px] rounded-sm
 *     - mix-blend-screen: 이미지와 블렌딩하여 이미지 색상에 따라 자연스럽게 어우러짐
 *     - drop-shadow-sm: 가독성을 위한 그림자
 *
 *   하트(좋아요) 버튼 (우하단):
 *     - absolute bottom-2 right-2: 이미지 우하단에 위치
 *     - text-white drop-shadow-md: 흰색 아이콘, 그림자로 가독성 확보
 *     - onClick: e.preventDefault() (Link 클릭 전파 차단) + setLiked(!liked) 토글
 *       e.preventDefault()가 필요한 이유: 버튼이 Link 내부에 있어서 클릭 시
 *       Link의 페이지 이동이 함께 발생하는 것을 막기 위함.
 *     - Heart 아이콘:
 *         liked=true:  fill='white', stroke='none' (채워진 흰 하트)
 *         liked=false: fill='transparent', stroke='currentColor' (빈 흰 하트 테두리)
 *     - aria-label="Like": 접근성 레이블
 *
 * [SnapCard와의 차이점]
 *   | 항목          | SnapCard         | RankSnapCard         |
 *   |---------------|------------------|----------------------|
 *   | 이미지 높이   | h-auto (비율 유지)| h-[250px] (고정)     |
 *   | 순위 오버레이 | 없음             | 좌상단 순위 번호     |
 *   | 좋아요 버튼   | 없음             | 우하단 하트 토글     |
 *   | 이미지 URL    | getImageUrl() 사용| 직접 사용 (정규화 X) |
 *   | onError 폴백  | 있음             | 없음                 |
 *   | hover 확대    | scale-105        | 없음                 |
 *   | 좋아요 저장   | 없음             | 로컬 전용 (서버 미연동)|
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { getImageUrl, DEFAULT_POST_IMAGE } from '@/utils/imageUtils';

export default function RankSnapCard({ snap, rank }) {
    // -------------------------------------------------------------------------
    // [상태 변수 선언]
    // -------------------------------------------------------------------------

    /**
     * liked: 현재 좋아요 상태.
     * 초기값: snap.isLiked (서버에서 받은 초기 좋아요 여부).
     * 하트 버튼 클릭 시 setLiked(!liked)로 로컬에서만 토글.
     * ※ 백엔드 API 호출 없음 → 페이지 이탈 또는 새로고침 시 snap.isLiked 초기값으로 리셋.
     */
    const [liked, setLiked] = useState(snap.isLiked);

    // -------------------------------------------------------------------------
    // [JSX 렌더링]
    // -------------------------------------------------------------------------

    return (
        /*
         * 카드 컨테이너:
         *   - relative: 자식 요소(순위 번호, 하트 버튼)의 절대 위치 기준점
         *   - break-inside-avoid: Masonry(columns) 레이아웃에서 열 분할 방지
         *   - mb-1: 카드 하단 여백 4px
         */
        <div className="relative break-inside-avoid mb-1">
            {/*
             * Link: /snap/:id 로 SPA 이동
             *   - block relative w-full h-auto: 블록 요소, 이미지 비율 컨테이너
             *   - overflow-hidden: 이미지가 카드 밖으로 넘치지 않도록 클리핑
             */}
            <Link to={`/snap/${snap.id}`} className="block relative w-full h-auto overflow-hidden">
                {/*
                 * 이미지:
                 *   - src: snap.imageUrl 직접 사용 (getImageUrl 미사용, 백엔드 절대 URL 가정)
                 *   - w-full h-[250px]: 너비 100%, 고정 높이 250px
                 *   - object-cover: 250px 높이를 채우며 이미지 비율 유지 (잘릴 수 있음)
                 *   - loading="lazy": 뷰포트 밖 이미지 지연 로드
                 *   - ※ onError 폴백 없음 (이미지 로드 실패 시 깨진 이미지 표시될 수 있음)
                 */}
                <img
                    src={getImageUrl(snap.imageUrl) || DEFAULT_POST_IMAGE}
                    alt={`Snap ${snap.id}`}
                    className="w-full h-[250px] object-cover"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_POST_IMAGE; }}
                />

                {/*
                 * 순위 번호 오버레이 (좌상단):
                 *   - absolute top-2 left-2: 이미지 좌상단 기준 8px 안쪽
                 *   - bg-white text-black: 흰 배경 + 검정 텍스트
                 *   - font-bold text-[12px] px-[6px] py-[2px]: 작은 볼드 텍스트, 좁은 패딩
                 *   - rounded-sm: 약간 둥근 모서리
                 *   - mix-blend-screen: 이미지와 블렌딩 모드 적용 (밝은 이미지에서 자연스러움)
                 *   - drop-shadow-sm: 어두운 이미지에서도 가독성 유지
                 *   표시 값: rank prop (숫자, 예: 1, 2, 3)
                 */}
                <div className="absolute top-2 left-2 bg-white text-black font-bold text-[12px] px-[6px] py-[2px] rounded-sm mix-blend-screen drop-shadow-sm">
                    {rank}
                </div>

                {/*
                 * 하트(좋아요) 버튼 영역 (우하단):
                 *   - absolute bottom-2 right-2: 이미지 우하단 기준 8px 안쪽
                 *   - text-white drop-shadow-md: 흰색 아이콘, 그림자로 이미지 위 가독성 확보
                 */}
                <div className="absolute bottom-2 right-2 text-white drop-shadow-md">
                    <button
                        onClick={(e) => {
                            // e.preventDefault(): Link의 페이지 이동 이벤트 차단
                            // (버튼이 Link 내부에 있어서 클릭 시 Link 이동이 함께 발생하는 것 방지)
                            e.preventDefault();
                            // 좋아요 상태 로컬 토글 (서버 API 호출 없음)
                            setLiked(!liked);
                        }}
                        aria-label="Like"
                        className="p-1"
                    >
                        {/*
                         * Heart 아이콘:
                         *   liked=true:  fill='white' + stroke='none' → 채워진 흰 하트
                         *   liked=false: fill='transparent' + stroke='currentColor' → 빈 하트 테두리
                         *   strokeWidth=2: 테두리 두께 2px
                         */}
                        <Heart size={20} fill={liked ? 'white' : 'transparent'} stroke={liked ? 'none' : 'currentColor'} strokeWidth={2} />
                    </button>
                </div>
            </Link>
        </div>
    );
}
