import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically detects the background color at the top of the screen
 * and manages the Status Bar color (PWA & Capacitor) to ensure contrast.
 */
export const useStatusBar = (theme: 'light' | 'dark' = 'light') => {
  const location = useLocation();

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const updateStatusBar = () => {
      // Find the element at the top of the screen (typically status bar area)
      const parseRGB = (colorStr: string) => {
        const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          return { r: parseInt(rgbMatch[1], 10), g: parseInt(rgbMatch[2], 10), b: parseInt(rgbMatch[3], 10) };
        }
        return null;
      };

      // Traverse up to find a non-transparent background
      let el = document.elementFromPoint(window.innerWidth / 2, 10) as HTMLElement | null;
      let bgColor = null;
      while (el && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          bgColor = parseRGB(bg);
          if (bgColor) break;
        }
        el = el.parentElement;
      }
      
      // Fallback to body background
      if (!bgColor) {
        const bodyStyle = window.getComputedStyle(document.body);
        bgColor = parseRGB(bodyStyle.backgroundColor) || (theme === 'dark' ? { r: 15, g: 23, b: 42 } : { r: 255, g: 255, b: 255 });
      }

      // Calculate relative luminance formula (sRGB)
      const luminance = (0.299 * bgColor.r + 0.587 * bgColor.g + 0.114 * bgColor.b) / 255;
      const isLightBackground = luminance > 0.5;

      const themeColorHex = `#${(1 << 24 | bgColor.r << 16 | bgColor.g << 8 | bgColor.b).toString(16).slice(1)}`;

      // Apply the meta tag for Chrome/PWAs
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', themeColorHex);

      // Force color-scheme to let WebView/Browser know if it should use dark or light system UI icons
      let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
      if (!colorSchemeMeta) {
        colorSchemeMeta = document.createElement('meta');
        colorSchemeMeta.setAttribute('name', 'color-scheme');
        document.head.appendChild(colorSchemeMeta);
      }
      colorSchemeMeta.setAttribute('content', isLightBackground ? 'light' : 'dark');
      
      // Fallback for Safari dynamic status bar
      let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (!appleMeta) {
        appleMeta = document.createElement('meta');
        appleMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
        document.head.appendChild(appleMeta);
      }
      // Safari requires 'black-translucent' or 'default'. Dark backgrounds standard is 'black-translucent' or 'black'
      appleMeta.setAttribute('content', isLightBackground ? 'default' : 'black-translucent');

      // Attempt to set native StatusBar (Capacitor) for edge-to-edge transparency and correct icon visibility
      try {
          const win = window as any;
          if (win.Capacitor && win.Capacitor.Plugins && win.Capacitor.Plugins.StatusBar) {
              // Android edge-to-edge: overlay webview and make background transparent
              try { win.Capacitor.Plugins.StatusBar.setOverlaysWebView({ overlay: true }); } catch (e) {}
              
              // In Capacitor, 'LIGHT' style means the status bar background is light (so text should be dark)
              // 'DARK' style means the status bar background is dark (so text should be light)
              win.Capacitor.Plugins.StatusBar.setStyle({ style: isLightBackground ? 'LIGHT' : 'DARK' });
              
              // Let the background bleed through
              try { win.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: '#00000000' }); } catch (e) {}
          }
      } catch(e) {}
    };

    // Delay slightly to let the new route render its background
    timeout = setTimeout(updateStatusBar, 100);

    // Watch for DOM changes (like theme toggles or dynamic modals)
    const observer = new MutationObserver(() => {
      // Debounce updates
      clearTimeout(timeout);
      timeout = setTimeout(updateStatusBar, 50);
    });
    
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['class', 'style'] });

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [location, theme]);
};