// utils/getLocale.js

export function getLocale(pathname, fallback = 'th') {
  if (!pathname || typeof pathname !== 'string') return fallback;
  const segments = pathname.split('/');
  // สมมติ /suweb/th/xxxx => [ '', 'suweb', 'th', ... ]
  return segments[2] || fallback;
}