import React from 'react';
import AlbumPreviewLink from './AlbumPreviewLink';

export default function SnapCard({ snap }) {
  const snapId = snap?.albumId ?? snap?.id;

  return (
    <AlbumPreviewLink
      album={snap}
      to={`/snap/${snapId}`}
      containerClassName="relative break-inside-avoid mb-2"
      linkClassName="group block"
      mediaClassName="aspect-[4/5] rounded-[4px] transition-colors"
      imageClassName="transition-transform duration-700 group-hover:scale-105"
      preferThumb={true}
    />
  );
}
