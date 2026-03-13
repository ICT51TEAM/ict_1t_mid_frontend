import React from 'react';
import { DEFAULT_POST_IMAGE, getImageUrl } from '@/utils/imageUtils';

const MAX_PHOTOS = 4;

export const getAlbumId = (album) => album?.albumId ?? album?.id;

export const normalizeLayoutType = (layoutType, photoCount = 0) => {
  const normalized = String(layoutType || '').toUpperCase();

  if (!normalized) {
    if (photoCount >= 4) return 'grid';
    if (photoCount >= 2) return 'horizontal-two';
    return 'single';
  }

  if (normalized.includes('VERTICAL') || normalized.includes('GRID_3') || normalized.includes('TWIN_V')) {
    return 'vertical-two';
  }

  if (normalized.includes('GRID_4') || normalized.includes('QUAD') || normalized === 'GRID') {
    return 'grid';
  }

  if (normalized.includes('HORIZONTAL') || normalized.includes('GRID_2') || normalized.includes('TWIN_H')) {
    return 'horizontal-two';
  }

  if (normalized.includes('SINGLE')) {
    return 'single';
  }

  if (normalized === '4') return 'grid';
  if (normalized === '3') return 'vertical-two';
  if (normalized === '2') return 'horizontal-two';

  return 'single';
};

export const sortAlbumPhotos = (photos = []) =>
  [...photos]
    .filter(Boolean)
    .sort((a, b) => (a?.slotIndex ?? 0) - (b?.slotIndex ?? 0))
    .slice(0, MAX_PHOTOS);

const resolvePhotoUrl = (photo, preferThumb) => {
  if (typeof photo === 'string') {
    return getImageUrl(photo) || DEFAULT_POST_IMAGE;
  }

  const preferredUrl = preferThumb ? photo?.thumbUrl || photo?.photoUrl : photo?.photoUrl || photo?.thumbUrl;
  return getImageUrl(preferredUrl) || DEFAULT_POST_IMAGE;
};

const getGridTemplateClass = (layoutType, photoCount) => {
  switch (normalizeLayoutType(layoutType, photoCount)) {
    case 'horizontal-two':
      return photoCount >= 3 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2';
    case 'vertical-two':
      return photoCount >= 3 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-1 grid-rows-2';
    case 'grid':
      return photoCount <= 1 ? 'grid-cols-1' : 'grid-cols-2 grid-rows-2';
    case 'single':
    default:
      return 'grid-cols-1';
  }
};

const getCellSpanClass = (layoutType, photoCount, index) => {
  const normalized = normalizeLayoutType(layoutType, photoCount);

  if (normalized === 'horizontal-two' && photoCount >= 3 && index === 0) {
    return 'col-span-2';
  }

  if (normalized === 'vertical-two' && photoCount >= 3 && index === 0) {
    return 'row-span-2';
  }

  return '';
};

export default function AlbumPhotoLayout({
  photos = [],
  layoutType,
  fallbackImageUrl,
  className = '',
  imageClassName = '',
  preferThumb = false,
}) {
  const normalizedPhotos = sortAlbumPhotos(photos);
  const renderPhotos = normalizedPhotos.length > 0
    ? normalizedPhotos
    : [{ photoUrl: fallbackImageUrl, thumbUrl: fallbackImageUrl, slotIndex: 0 }];
  const gridClass = getGridTemplateClass(layoutType, renderPhotos.length);

  return (
    <div className={`relative grid h-full w-full overflow-hidden bg-[#f3f3f3] dark:bg-[#1c1f24] ${gridClass} gap-1 ${className}`.trim()}>
      {renderPhotos.map((photo, index) => (
        <div
          key={photo?.photoId ?? photo?.slotIndex ?? index}
          className={`relative h-full min-h-0 overflow-hidden ${getCellSpanClass(layoutType, renderPhotos.length, index)}`.trim()}
        >
          <img
            src={resolvePhotoUrl(photo, preferThumb)}
            alt=""
            className={`h-full w-full object-cover ${imageClassName}`.trim()}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_POST_IMAGE;
            }}
          />
        </div>
      ))}
    </div>
  );
}
