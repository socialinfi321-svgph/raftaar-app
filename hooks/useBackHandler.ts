
import { useEffect, useRef } from 'react';

/**
 * Custom hook to intercept the native back button (popstate event).
 * Uses a ref for the handler to prevent effect re-execution on every render.
 * 
 * @param handler Function to execute when back button is pressed. Return true to trap (prevent default).
 * @param active Condition to activate the interceptor.
 */
export const useBackHandler = (handler: () => boolean, active: boolean = true) => {
  // Use a ref to store the latest handler. 
  // This allows the handler to access current state (like timers/counters) 
  // without triggering the useEffect cleanup/setup cycle on every render.
  const handlerRef = useRef(handler);

  // Update the ref whenever the handler function changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!active) return;

    // Push a dummy state to create a history entry to "pop"
    // This effectively creates a "trap" for the back button
    const pushState = () => {
      window.history.pushState(null, '', window.location.href);
    };

    pushState();

    const handlePopState = (event: PopStateEvent) => {
      // The user pressed Back, so the browser has already popped the state.
      // We run the handler to see if the component wants to handle this action internally.
      const shouldPreventDefault = handlerRef.current();

      if (shouldPreventDefault) {
        // If handled locally (e.g., closing a modal step), we need to 
        // push the state AGAIN to restore the "trap" for the next back press.
        pushState();
      } else {
        // If not handled, we let the browser's back action stand.
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [active]); // Dependency only on 'active' state
};
