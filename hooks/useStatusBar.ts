import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically manages the Status Bar color (PWA Theme Color) based on the current route and theme.
 */
export const useStatusBar = (theme: 'light' | 'dark' = 'light') => {
  const location = useLocation();

  useEffect(() => {
    // Light Mode: White background (#ffffff)
    // Dark Mode: Dark Slate (#0fa0fa) wait we need Slate 950 which is #020617
    const themeColor = theme === 'dark' ? '#0f172a' : '#ffffff'; // slightly lighter slate for dark mode sometimes

    // Apply the meta tag
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', themeColor);
    
    // Fallback for Safari dynamic status bar
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(appleMeta);
    }
    appleMeta.setAttribute('content', theme === 'dark' ? 'black' : 'default');

    // Attempt to set Capacitor/Cordova StatusBar if available
    try {
        const win = window as any;
        if (win.Capacitor && win.Capacitor.Plugins && win.Capacitor.Plugins.StatusBar) {
            win.Capacitor.Plugins.StatusBar.setStyle({ style: theme === 'dark' ? 'DARK' : 'LIGHT' });
            win.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: themeColor });
        }
    } catch(e) {}
    
  }, [location, theme]);
};