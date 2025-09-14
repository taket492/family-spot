import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { cache } from '@/lib/advancedCache';

interface PrefetchOptions {
  hover?: boolean; // Prefetch on hover
  visible?: boolean; // Prefetch when in viewport
  delay?: number; // Delay before prefetching (ms)
  priority?: 'high' | 'low';
}

export function usePrefetch(
  href: string | null,
  options: PrefetchOptions = {}
) {
  const router = useRouter();
  const prefetchedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const {
    hover = true,
    visible = false,
    delay = 0,
    priority = 'low'
  } = options;

  const prefetchPage = () => {
    if (!href || prefetchedRef.current) return;

    prefetchedRef.current = true;

    // Prefetch the page
    router.prefetch(href, undefined, {
      priority: priority === 'high'
    });

    // Prefetch API data if it's a known pattern
    prefetchApiData(href);
  };

  const prefetchApiData = (path: string) => {
    // Prefetch family data
    if (path.startsWith('/families/') && path !== '/families') {
      const familyId = path.split('/')[2];
      if (familyId && familyId !== '[id]') {
        prefetchFamilyData(familyId);
      }
    }

    // Prefetch spot data
    if (path.startsWith('/spots/') && path !== '/spots') {
      const spotId = path.split('/')[2];
      if (spotId && spotId !== '[id]') {
        prefetchSpotData(spotId);
      }
    }
  };

  const prefetchFamilyData = async (familyId: string) => {
    const cacheKey = `family-${familyId}`;
    const existing = await cache.get(cacheKey);

    if (!existing) {
      cache.getOrRefresh(
        cacheKey,
        () => fetch(`/api/families/${familyId}`).then(res => res.json()),
        {
          ttl: 30000, // 30 seconds
          staleWhileRevalidate: 10000,
          backgroundRefresh: true
        }
      );
    }
  };

  const prefetchSpotData = async (spotId: string) => {
    const cacheKey = `spot-${spotId}`;
    const existing = await cache.get(cacheKey);

    if (!existing) {
      cache.getOrRefresh(
        cacheKey,
        () => fetch(`/api/spots/${spotId}`).then(res => res.json()),
        {
          ttl: 60000, // 1 minute
          staleWhileRevalidate: 30000,
          backgroundRefresh: true
        }
      );
    }
  };

  const handleMouseEnter = () => {
    if (!hover) return;

    if (delay > 0) {
      timeoutRef.current = setTimeout(prefetchPage, delay);
    } else {
      prefetchPage();
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Intersection Observer for visibility-based prefetching
  useEffect(() => {
    if (!visible || !href) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            prefetchPage();
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' }
    );

    // We'll return the observer to be used by the component
    return () => observer.disconnect();
  }, [visible, href]);

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    prefetch: prefetchPage
  };
}

// Enhanced Link component with automatic prefetching
export function useLinkPrefetch(href: string, enabled: boolean = true) {
  const { onMouseEnter, onMouseLeave } = usePrefetch(
    enabled ? href : null,
    { hover: true, delay: 100 }
  );

  return {
    onMouseEnter,
    onMouseLeave
  };
}