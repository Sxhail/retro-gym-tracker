import { useRouter } from 'expo-router';
import { useRef } from 'react';

/**
 * Enhanced navigation hook with smooth transitions and performance optimizations
 */
export function useSmoothNavigation() {
  const router = useRouter();
  const lastNavigationTime = useRef(0);
  const navigationCooldown = 200; // Minimum time between navigations

  const navigate = (path: string, options?: { replace?: boolean }) => {
    const now = Date.now();
    
    // Prevent rapid navigation that can cause glitches
    if (now - lastNavigationTime.current < navigationCooldown) {
      return;
    }
    
    lastNavigationTime.current = now;
    
    // Use requestAnimationFrame to ensure smooth transitions
    requestAnimationFrame(() => {
      if (options?.replace) {
        router.replace(path);
      } else {
        router.push(path);
      }
    });
  };

  const navigateWithFeedback = (path: string, onStart?: () => void, onComplete?: () => void) => {
    onStart?.();
    
    // Add a small delay to let any visual feedback complete
    setTimeout(() => {
      navigate(path);
      onComplete?.();
    }, 100);
  };

  return {
    navigate,
    navigateWithFeedback,
    router,
  };
}
