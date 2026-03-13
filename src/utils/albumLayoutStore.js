const STORAGE_KEY = 'albumLayoutOverrides';

const readLayoutMap = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeLayoutMap = (layoutMap) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutMap));
  } catch {
    return;
  }
};

export const getSavedAlbumLayout = (albumId) => {
  if (albumId == null) return null;

  const layoutMap = readLayoutMap();
  return layoutMap[String(albumId)] ?? null;
};

export const saveAlbumLayout = (albumId, layoutType) => {
  if (albumId == null || !layoutType) return;

  const layoutMap = readLayoutMap();
  layoutMap[String(albumId)] = layoutType;
  writeLayoutMap(layoutMap);
};
