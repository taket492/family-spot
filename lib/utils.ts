import { cleanImageArray } from './imageUtils';

export function safeParseArray(json: unknown): string[] {
  try {
    const v = JSON.parse(String(json ?? '[]'));
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

// Specialized function for parsing image arrays with validation
export function safeParseImageArray(json: unknown): string[] {
  return cleanImageArray(typeof json === 'string' ? json : String(json ?? '[]'));
}