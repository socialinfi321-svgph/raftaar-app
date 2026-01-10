import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically manages the Status Bar color (PWA Theme Color) based on the current route and theme.
 */
export const useStatusBar = (theme: 'light' | 'dark' = 'light') => {
  const location = useLocation();

  useEffect(() => {
    // Light Mode: White background (#ffffff)
    // Dark Mode: Dark Slate (#020617)
    const themeColor = theme === 'dark' ? '#020617' : '#ffffff';

    // Apply the meta tag
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', themeColor);
    
  }, [location, theme]);
};