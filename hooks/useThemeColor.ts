
import { useEffect } from 'react';

/**
 * Hook to dynamically set the PWA theme color (Status Bar Color).
 * @param color The hex color code (e.g., '#ffffff' for white, '#020617' for dark mode).
 */
export const useThemeColor = (color: string) => {
  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);
  }, [color]);
};
