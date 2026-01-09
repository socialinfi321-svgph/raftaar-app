
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from './useTheme';

/**
 * Automatically manages the Status Bar color (PWA Theme Color) based on the current route and theme.
 */
export const useStatusBar = () => {
  const location = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    // Light Mode: #f8fafc (Slate-50), Dark Mode: #020617 (Slate-950)
    let themeColor = theme === 'dark' ? '#020617' : '#f8fafc';
    
    // You can add specific overrides for routes here if needed
    // if (location.pathname === '/some-colored-header') themeColor = '#...';

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