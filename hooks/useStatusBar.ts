
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically manages the Status Bar color (PWA Theme Color) based on the current route.
 * 
 * - Light Pages (Home, Practice, Exam) -> White Background (#ffffff) -> Black Icons
 * - Dark Pages (Leaderboard/Rewards) -> Dark Background (#020617) -> White Icons
 */
export const useStatusBar = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    
    // Default to White (Black Text/Icons)
    let themeColor = '#ffffff'; 

    // List of Dark Routes (White Text/Icons)
    const darkRoutes = ['/rewards'];

    if (darkRoutes.includes(path)) {
      themeColor = '#020617'; // slate-950
    }

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
