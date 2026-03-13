import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { albumService } from '@/api/albumService';
import AlbumPhotoLayout, { getAlbumId, sortAlbumPhotos } from './AlbumPhotoLayout';
import { getSavedAlbumLayout } from '@/utils/albumLayoutStore';

const hasLayoutData = (album) => Array.isArray(album?.photos) && album.photos.length > 0 && Boolean(album?.layoutType);

export default function AlbumPreviewLink({
  album,
  to,
  containerClassName = '',
  linkClassName = '',
  mediaClassName = '',
  imageClassName = '',
  preferThumb = false,
  children,
  skipFetch = false,
}) {
  const albumId = getAlbumId(album);
  const [detail, setDetail] = useState(null);
  const shouldFetchDetail = !skipFetch && Boolean(albumId) && !hasLayoutData(album);

  useEffect(() => {
    if (!shouldFetchDetail) return undefined;

    let cancelled = false;

    albumService.getAlbumDetail(albumId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [albumId, shouldFetchDetail]);

  const savedLayoutType = getSavedAlbumLayout(albumId);
  const resolvedLayoutType = savedLayoutType ?? detail?.layoutType ?? album?.layoutType;
  const resolvedPhotos = sortAlbumPhotos(detail?.photos?.length ? detail.photos : album?.photos || []);
  const fallbackImageUrl = album?.thumbUrl ?? album?.imageUrl;
  const target = to ?? `/snap/${albumId}`;

  return (
    <div className={containerClassName}>
      <Link to={target} className={linkClassName}>
        <div className={`relative h-full w-full overflow-hidden ${mediaClassName}`.trim()}>
          <AlbumPhotoLayout
            photos={resolvedPhotos}
            layoutType={resolvedLayoutType}
            fallbackImageUrl={fallbackImageUrl}
            imageClassName={imageClassName}
            preferThumb={preferThumb}
          />
          {children}
        </div>
      </Link>
    </div>
  );
}
