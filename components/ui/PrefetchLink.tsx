import { ReactNode, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { cache } from '@/lib/advancedCache';

interface PrefetchLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  prefetchOnHover?: boolean;
  prefetchOnVisible?: boolean;
  cacheData?: boolean;
  cacheKey?: string;
  [key: string]: any;
}

export function PrefetchLink({
  href,
  children,
  className,
  prefetchOnHover = true,
  prefetchOnVisible = false,
  cacheData = false,
  cacheKey,
  ...props
}: PrefetchLinkProps) {
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const prefetchedRef = useRef(false);

  // Prefetch function
  const prefetchData = useCallback(async () => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;

    try {
      // Prefetch the page
      await router.prefetch(href);

      // Optionally prefetch and cache API data
      if (cacheData && cacheKey) {
        // Extract family ID from href if it's a family page
        const familyIdMatch = href.match(/\/families\/([^\/]+)/);
        if (familyIdMatch) {
          const familyId = familyIdMatch[1];

          // Prefetch family data
          const familyResponse = await fetch(`/api/families/${familyId}?includeMembers=true`);
          if (familyResponse.ok) {
            const familyData = await familyResponse.json();
            await cache.set(`family-${familyId}-details`, familyData, {
              ttl: 300000, // 5 minutes
              staleWhileRevalidate: 60000 // 1 minute
            });
          }

          // If it's a visits page, prefetch visits data too
          if (href.includes('/visits')) {
            const visitsResponse = await fetch(`/api/families/${familyId}/visits`);
            if (visitsResponse.ok) {
              const visitsData = await visitsResponse.json();
              await cache.set(`family-${familyId}-visits`, visitsData, {
                ttl: 120000, // 2 minutes
                staleWhileRevalidate: 30000 // 30 seconds
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  }, [router, href, cacheData, cacheKey]);

  // Intersection Observer for visible prefetching
  useEffect(() => {
    if (!prefetchOnVisible || !linkRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            prefetchData();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(linkRef.current);

    return () => observer.disconnect();
  }, [prefetchOnVisible, prefetchData]);

  // Hover handlers
  const handleMouseEnter = () => {
    if (prefetchOnHover) {
      prefetchData();
    }
  };

  return (
    <Link href={href} {...props}>
      <a
        ref={linkRef}
        className={className}
        onMouseEnter={handleMouseEnter}
      >
        {children}
      </a>
    </Link>
  );
}

// Specialized family link with automatic caching
export function FamilyLink({
  familyId,
  page = '',
  children,
  ...props
}: {
  familyId: string;
  page?: string;
  children: ReactNode;
} & Omit<PrefetchLinkProps, 'href' | 'cacheData' | 'cacheKey'>) {
  const href = `/families/${familyId}${page}`;

  return (
    <PrefetchLink
      href={href}
      cacheData={true}
      cacheKey={`family-${familyId}`}
      {...props}
    >
      {children}
    </PrefetchLink>
  );
}

// Navigation prefetch component for common routes
export function NavPrefetch() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch common routes on app load
    const commonRoutes = ['/', '/families', '/auth/signin'];

    commonRoutes.forEach((route) => {
      if (route !== router.pathname) {
        router.prefetch(route);
      }
    });
  }, [router]);

  return null;
}