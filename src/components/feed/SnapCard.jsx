/**
 * @file SnapCard.jsx
 * @description 피드(메인 페이지)의 Masonry(벽돌쌓기) 레이아웃에서 사용되는
 *              단일 Snap(게시글) 이미지 카드 컴포넌트.
 *
 * [역할]
 *   snap 데이터를 받아 이미지를 표시하고, 클릭 시 해당 Snap 상세 페이지로 이동.
 *   이미지의 세로 비율을 유지하며(h-auto), 열 내에서 자연스럽게 배치됨(Masonry 레이아웃).
 *
 * [Props]
 *   @prop {object} snap           - 표시할 Snap(게시글) 데이터 객체
 *       snap.id       {number|string} - Snap 고유 ID (링크 URL 생성에 사용)
 *       snap.imageUrl {string}        - 이미지 경로 (상대 또는 절대 경로)
 *                                       getImageUrl()로 정규화하여 표시
 *                                       로드 실패 시 DEFAULT_POST_IMAGE 폴백 적용
 *
 * [라우팅]
 *   - <Link to={`/snap/${snap.id}`}>: 클릭 시 Snap 상세 페이지로 SPA 이동
 *   - 전체 카드 영역이 링크 영역 (이미지 전체 클릭 가능)
 *
 * [이미지 처리]
 *   - getImageUrl(snap.imageUrl):
 *       상대 경로(예: 'uploads/img.jpg') → '/uploads/img.jpg' (Vite 프록시 처리 가능)
 *       http:// 또는 / 시작 URL → 그대로 사용
 *       null/undefined → null 반환 → || DEFAULT_POST_IMAGE 폴백 적용
 *   - loading="lazy": 뷰포트 밖의 이미지는 나중에 로드 (성능 최적화)
 *   - onError: 이미지 로드 실패 시 DEFAULT_POST_IMAGE(회색 플레이스홀더 SVG)로 교체
 *              onerror=null 처리로 무한 오류 루프 방지
 *
 * [hover 효과]
 *   - 부모 div: group 클래스 적용
 *   - img: group-hover:scale-105 → hover 시 5% 확대 (700ms duration 부드러운 확대)
 *   - overflow-hidden(Link): 이미지 확대 시 카드 영역 밖으로 넘치지 않도록 클리핑
 *
 * [Masonry 레이아웃 관련]
 *   - break-inside-avoid: CSS columns 레이아웃에서 카드가 열 사이에서 잘리지 않도록 방지
 *   - mb-2: 카드 간 하단 여백 8px
 *   - h-auto: 이미지 원본 비율을 유지하며 높이 자동 조정
 *
 * [상태]
 *   없음 (순수 표시 컴포넌트, 상태 없음)
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_POST_IMAGE, getImageUrl } from '@/utils/imageUtils';

export default function SnapCard({ snap }) {
    return (
        /*
         * 카드 컨테이너:
         *   - relative: 자식 요소의 절대 위치 기준점
         *   - break-inside-avoid: Masonry(columns) 레이아웃에서 카드가 열 사이에 잘리지 않도록
         *   - mb-2: 카드 하단 여백 8px
         *   - group: 자식의 group-hover 클래스 활성화를 위한 Tailwind group 지시자
         */
        <div className="relative break-inside-avoid mb-2 group">
            {/*
             * Link: /snap/:id 로 SPA 이동 (전체 카드 클릭 가능 영역)
             *   - block relative w-full h-auto: 이미지 원본 비율 유지
             *   - overflow-hidden: hover 확대 시 카드 밖으로 이미지가 넘치지 않도록 클리핑
             *   - rounded-[4px]: 살짝 둥근 모서리
             *   - bg-[#fafafa] / dark:bg-[#1c1f24]: 이미지 로드 전 배경색 (플레이스홀더 효과)
             */}
            <Link to={`/snap/${snap.id}`} className="block relative w-full h-auto overflow-hidden rounded-[4px] bg-[#fafafa] dark:bg-[#1c1f24] transition-colors">
                {/*
                 * 이미지:
                 *   - src: getImageUrl()로 경로 정규화, 실패 시 DEFAULT_POST_IMAGE
                 *   - alt: 스크린 리더를 위한 대체 텍스트 (Snap ID 포함)
                 *   - w-full h-auto object-cover: 너비 100%, 높이 비율 유지
                 *   - transition-transform duration-700: 700ms 부드러운 확대 애니메이션
                 *   - group-hover:scale-105: 부모(group) hover 시 5% 확대
                 *   - loading="lazy": 뷰포트 밖 이미지 지연 로드로 초기 로딩 성능 향상
                 *   - onError: 이미지 404 등 로드 실패 시 DEFAULT_POST_IMAGE로 교체
                 *              e.currentTarget.onerror=null: 폴백 이미지도 실패할 경우 무한 루프 방지
                 */}
                <img
                    src={getImageUrl(snap.imageUrl) || DEFAULT_POST_IMAGE}
                    alt={`Snap ${snap.id}`}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_POST_IMAGE; }}
                />
            </Link>
        </div>
    );
}
