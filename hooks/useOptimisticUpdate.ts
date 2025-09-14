import { useState, useCallback, useRef } from 'react';
import { cache } from '@/lib/advancedCache';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error, rollback: () => void) => void;
  cacheKey?: string;
  revalidate?: boolean;
}

interface OptimisticState<T> {
  data: T | null;
  isLoading: boolean;
  isOptimistic: boolean;
  error: Error | null;
}

export function useOptimisticUpdate<T, P = any>(
  initialData: T | null = null
) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isLoading: false,
    isOptimistic: false,
    error: null,
  });

  const previousDataRef = useRef<T | null>(null);

  const execute = useCallback(async (
    optimisticData: T,
    asyncFn: (params?: P) => Promise<T>,
    params?: P,
    options: OptimisticUpdateOptions<T> = {}
  ) => {
    const { onSuccess, onError, cacheKey, revalidate = true } = options;

    // Store current data for potential rollback
    previousDataRef.current = state.data;

    // Apply optimistic update immediately
    setState(prev => ({
      ...prev,
      data: optimisticData,
      isOptimistic: true,
      isLoading: true,
      error: null,
    }));

    // Update cache optimistically if cache key provided
    if (cacheKey) {
      await cache.set(cacheKey, optimisticData, {
        ttl: 30000,
        staleWhileRevalidate: 10000
      });
    }

    try {
      // Execute the actual async operation
      const result = await asyncFn(params);

      // Update with real data
      setState(prev => ({
        ...prev,
        data: result,
        isOptimistic: false,
        isLoading: false,
        error: null,
      }));

      // Update cache with real data
      if (cacheKey && revalidate) {
        await cache.set(cacheKey, result, {
          ttl: 60000,
          staleWhileRevalidate: 30000
        });
      }

      onSuccess?.(result);
      return result;

    } catch (error) {
      // Rollback to previous state
      const rollback = () => {
        setState(prev => ({
          ...prev,
          data: previousDataRef.current,
          isOptimistic: false,
          isLoading: false,
          error: null,
        }));

        // Rollback cache
        if (cacheKey && previousDataRef.current) {
          cache.set(cacheKey, previousDataRef.current);
        }
      };

      setState(prev => ({
        ...prev,
        data: previousDataRef.current,
        isOptimistic: false,
        isLoading: false,
        error: error as Error,
      }));

      if (onError) {
        onError(error as Error, rollback);
      } else {
        rollback();
      }

      throw error;
    }
  }, [state.data]);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      isLoading: false,
      isOptimistic: false,
      error: null,
    });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({
      ...prev,
      data,
      error: null,
    }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
}

// Specialized hook for list operations
export function useOptimisticList<T extends { id: string }>(
  initialList: T[] = []
) {
  const [state, setState] = useState<OptimisticState<T[]>>({
    data: initialList,
    isLoading: false,
    isOptimistic: false,
    error: null,
  });

  const addItem = useCallback(async (
    item: T,
    asyncFn: (item: T) => Promise<T>,
    options: OptimisticUpdateOptions<T[]> = {}
  ) => {
    const currentList = state.data || [];
    const optimisticList = [...currentList, item];

    setState(prev => ({
      ...prev,
      data: optimisticList,
      isOptimistic: true,
      isLoading: true,
      error: null,
    }));

    try {
      const result = await asyncFn(item);
      const updatedList = currentList.map(i => i.id === item.id ? result : i);

      if (!updatedList.find(i => i.id === result.id)) {
        updatedList.push(result);
      }

      setState(prev => ({
        ...prev,
        data: updatedList,
        isOptimistic: false,
        isLoading: false,
        error: null,
      }));

      options.onSuccess?.(updatedList);
      return result;

    } catch (error) {
      setState(prev => ({
        ...prev,
        data: currentList,
        isOptimistic: false,
        isLoading: false,
        error: error as Error,
      }));

      if (options.onError) {
        options.onError(error as Error, () => {
          setState(prev => ({ ...prev, data: currentList }));
        });
      }

      throw error;
    }
  }, [state.data]);

  const removeItem = useCallback(async (
    id: string,
    asyncFn: (id: string) => Promise<void>,
    options: OptimisticUpdateOptions<T[]> = {}
  ) => {
    const currentList = state.data || [];
    const optimisticList = currentList.filter(item => item.id !== id);

    setState(prev => ({
      ...prev,
      data: optimisticList,
      isOptimistic: true,
      isLoading: true,
      error: null,
    }));

    try {
      await asyncFn(id);

      setState(prev => ({
        ...prev,
        data: optimisticList,
        isOptimistic: false,
        isLoading: false,
        error: null,
      }));

      options.onSuccess?.(optimisticList);

    } catch (error) {
      setState(prev => ({
        ...prev,
        data: currentList,
        isOptimistic: false,
        isLoading: false,
        error: error as Error,
      }));

      if (options.onError) {
        options.onError(error as Error, () => {
          setState(prev => ({ ...prev, data: currentList }));
        });
      }

      throw error;
    }
  }, [state.data]);

  const updateItem = useCallback(async (
    id: string,
    updates: Partial<T>,
    asyncFn: (id: string, updates: Partial<T>) => Promise<T>,
    options: OptimisticUpdateOptions<T[]> = {}
  ) => {
    const currentList = state.data || [];
    const optimisticList = currentList.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );

    setState(prev => ({
      ...prev,
      data: optimisticList,
      isOptimistic: true,
      isLoading: true,
      error: null,
    }));

    try {
      const result = await asyncFn(id, updates);
      const updatedList = currentList.map(item =>
        item.id === id ? result : item
      );

      setState(prev => ({
        ...prev,
        data: updatedList,
        isOptimistic: false,
        isLoading: false,
        error: null,
      }));

      options.onSuccess?.(updatedList);
      return result;

    } catch (error) {
      setState(prev => ({
        ...prev,
        data: currentList,
        isOptimistic: false,
        isLoading: false,
        error: error as Error,
      }));

      if (options.onError) {
        options.onError(error as Error, () => {
          setState(prev => ({ ...prev, data: currentList }));
        });
      }

      throw error;
    }
  }, [state.data]);

  return {
    ...state,
    addItem,
    removeItem,
    updateItem,
    setData: (data: T[]) => setState(prev => ({ ...prev, data })),
  };
}