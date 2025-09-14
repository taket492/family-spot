// Performance testing utilities
import React from 'react';

export interface PerformanceTest {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceTester {
  private tests: Map<string, PerformanceTest> = new Map();
  private results: PerformanceTest[] = [];

  startTest(name: string, metadata?: Record<string, any>): void {
    const test: PerformanceTest = {
      name,
      startTime: performance.now(),
      metadata
    };
    this.tests.set(name, test);
  }

  endTest(name: string): PerformanceTest | null {
    const test = this.tests.get(name);
    if (!test) {
      console.warn(`Test "${name}" not found`);
      return null;
    }

    test.endTime = performance.now();
    test.duration = test.endTime - test.startTime;

    this.results.push(test);
    this.tests.delete(name);

    console.log(`[Performance] ${name}: ${test.duration.toFixed(2)}ms`);
    return test;
  }

  getResults(): PerformanceTest[] {
    return this.results;
  }

  getSummary(): { avgDuration: number; totalTests: number; slowestTest?: PerformanceTest } {
    if (this.results.length === 0) {
      return { avgDuration: 0, totalTests: 0 };
    }

    const totalDuration = this.results.reduce((sum, test) => sum + (test.duration || 0), 0);
    const avgDuration = totalDuration / this.results.length;
    const slowestTest = this.results.reduce((slowest, test) =>
      (test.duration || 0) > (slowest?.duration || 0) ? test : slowest
    );

    return {
      avgDuration,
      totalTests: this.results.length,
      slowestTest
    };
  }

  clear(): void {
    this.tests.clear();
    this.results = [];
  }
}

export const performanceTester = new PerformanceTester();

// Common performance test scenarios
export const testScenarios = {
  // Test page load time
  pageLoad: (pageName: string) => {
    performanceTester.startTest(`page-load-${pageName}`, { type: 'page-load', page: pageName });

    return () => performanceTester.endTest(`page-load-${pageName}`);
  },

  // Test API response time
  apiCall: (endpoint: string) => {
    performanceTester.startTest(`api-${endpoint}`, { type: 'api-call', endpoint });

    return () => performanceTester.endTest(`api-${endpoint}`);
  },

  // Test component render time
  componentRender: (componentName: string) => {
    performanceTester.startTest(`render-${componentName}`, { type: 'component-render', component: componentName });

    return () => performanceTester.endTest(`render-${componentName}`);
  },

  // Test cache performance
  cacheOperation: (operation: string, key: string) => {
    performanceTester.startTest(`cache-${operation}-${key}`, { type: 'cache', operation, key });

    return () => performanceTester.endTest(`cache-${operation}-${key}`);
  },

  // Test optimistic update performance
  optimisticUpdate: (action: string) => {
    performanceTester.startTest(`optimistic-${action}`, { type: 'optimistic-update', action });

    return () => performanceTester.endTest(`optimistic-${action}`);
  }
};

// React Hook for performance tracking
export function usePerformanceTest(testName: string) {
  const startTest = (metadata?: Record<string, any>) => {
    performanceTester.startTest(testName, metadata);
  };

  const endTest = () => {
    return performanceTester.endTest(testName);
  };

  return { startTest, endTest };
}

// HOC for measuring component performance
export function withPerformanceTracking<T extends {}>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: T) {
    const endTest = testScenarios.componentRender(componentName);

    React.useEffect(() => {
      endTest();
    }, [endTest]);

    return React.createElement(Component, props);
  };
}

// Benchmark function
export async function runBenchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations: number = 10
): Promise<{ avgTime: number; minTime: number; maxTime: number; iterations: number }> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log(`[Benchmark] ${name}:`);
  console.log(`  Average: ${avgTime.toFixed(2)}ms`);
  console.log(`  Min: ${minTime.toFixed(2)}ms`);
  console.log(`  Max: ${maxTime.toFixed(2)}ms`);
  console.log(`  Iterations: ${iterations}`);

  return { avgTime, minTime, maxTime, iterations };
}

// Performance monitoring for production
export function startPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Monitor Core Web Vitals
  if ('web-vital' in window) {
    // @ts-ignore
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log);
      getFID(console.log);
      getFCP(console.log);
      getLCP(console.log);
      getTTFB(console.log);
    });
  }

  // Monitor navigation timing
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          console.log('[Performance] Navigation timing:', {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            load: navEntry.loadEventEnd - navEntry.loadEventStart,
            firstPaint: navEntry.responseEnd - navEntry.fetchStart,
            ttfb: navEntry.responseStart - navEntry.requestStart
          });
        }
      });
    });

    observer.observe({ entryTypes: ['navigation'] });
  }
}