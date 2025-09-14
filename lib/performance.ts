// Performance monitoring and analytics

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url?: string;
  additionalData?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observer: PerformanceObserver | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObserver();
      this.trackWebVitals();
    }
  }

  private initializeObserver() {
    try {
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric({
            name: entry.name,
            value: entry.duration || entry.startTime,
            timestamp: Date.now(),
            url: window.location.pathname,
            additionalData: {
              entryType: entry.entryType,
              detail: entry
            }
          });
        });
      });

      this.observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  private trackWebVitals() {
    // Track Core Web Vitals
    if (typeof window !== 'undefined') {
      // LCP - Largest Contentful Paint
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          timestamp: Date.now(),
          url: window.location.pathname
        });
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // FID - First Input Delay
      new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry: any) => {
          this.recordMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            timestamp: Date.now(),
            url: window.location.pathname
          });
        });
      }).observe({ entryTypes: ['first-input'] });

      // CLS - Cumulative Layout Shift
      let clsValue = 0;
      new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordMetric({
          name: 'CLS',
          value: clsValue,
          timestamp: Date.now(),
          url: window.location.pathname
        });
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }

  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log important metrics in development
    if (process.env.NODE_ENV === 'development') {
      if (['LCP', 'FID', 'CLS'].includes(metric.name)) {
        console.log(`[Performance] ${metric.name}: ${metric.value.toFixed(2)}ms`);
      }
    }
  }

  // Track custom timing
  startTiming(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      this.recordMetric({
        name,
        value: endTime - startTime,
        timestamp: Date.now(),
        url: window.location.pathname
      });
    };
  }

  // Track API call performance
  trackApiCall<T>(url: string, promise: Promise<T>): Promise<T> {
    const startTime = performance.now();

    return promise
      .then((result) => {
        const endTime = performance.now();
        this.recordMetric({
          name: 'API_CALL',
          value: endTime - startTime,
          timestamp: Date.now(),
          url: window.location.pathname,
          additionalData: {
            apiUrl: url,
            success: true
          }
        });
        return result;
      })
      .catch((error) => {
        const endTime = performance.now();
        this.recordMetric({
          name: 'API_CALL',
          value: endTime - startTime,
          timestamp: Date.now(),
          url: window.location.pathname,
          additionalData: {
            apiUrl: url,
            success: false,
            error: error.message
          }
        });
        throw error;
      });
  }

  // Get performance summary
  getSummary() {
    const summary: Record<string, { avg: number; count: number; latest: number }> = {};

    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = { avg: 0, count: 0, latest: 0 };
      }

      summary[metric.name].count++;
      summary[metric.name].latest = metric.value;
      summary[metric.name].avg =
        (summary[metric.name].avg * (summary[metric.name].count - 1) + metric.value) /
        summary[metric.name].count;
    });

    return summary;
  }

  // Clear metrics
  clear() {
    this.metrics = [];
  }

  // Send metrics to analytics (optional)
  async sendMetrics() {
    if (this.metrics.length === 0) return;

    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: this.metrics,
          url: window.location.pathname,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      });

      this.clear();
    } catch (error) {
      console.warn('Failed to send performance metrics:', error);
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const endTiming = performanceMonitor.startTiming(name);

  try {
    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => endTiming());
    } else {
      endTiming();
      return result;
    }
  } catch (error) {
    endTiming();
    throw error;
  }
}

// React hook for performance tracking
export function usePerformanceTracking(componentName: string) {
  const trackRender = () => {
    performanceMonitor.recordMetric({
      name: 'COMPONENT_RENDER',
      value: performance.now(),
      timestamp: Date.now(),
      additionalData: { component: componentName }
    });
  };

  const trackInteraction = (interactionName: string) => {
    return performanceMonitor.startTiming(`${componentName}_${interactionName}`);
  };

  return { trackRender, trackInteraction };
}