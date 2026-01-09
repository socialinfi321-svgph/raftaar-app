
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically manages the Status Bar color (PWA Theme Color) based on the current route.
 * 
 * - All Pages -> Dark Background (#020617) -> White Icons
 */
export const useStatusBar = () => {
  const location = useLocation();

  useEffect(() => {
    // Default to Dark Slate (White Text/Icons) for the entire app now
    let themeColor = '#020617'; 

    // Apply the meta tag
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', themeColor);
    
  }, [location]);
};
