// Location photos are bundled locally in public/places/ (downloaded from Wikipedia / Wikimedia Commons,
// free licenses; see Credits and each property's source link). File name = wiki title with non [A-Za-z0-9_-] -> '_'.
export function usePhoto(title?: string, _width = 320): string | null {
  return title ? `/places/${title.replace(/[^A-Za-z0-9_-]/g, '_')}.jpg` : null;
}

export const wikiUrl = (title: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
