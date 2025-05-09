import { safeMap, safeFilter, ensureArray, hasNonEmptyArrayProp } from '../utils/arraySafetyUtils';

/**
 * Tests for array safety utility functions
 */

describe('safeMap', () => {
  test('maps over valid arrays', () => {
    expect(safeMap([1, 2, 3], (num: number) => num * 2)).toEqual([2, 4, 6]);
  });
  
  test('returns empty array for null input', () => {
    expect(safeMap<number, number>(null, (num: number) => num * 2)).toEqual([]);
  });
  
  test('returns empty array for undefined input', () => {
    expect(safeMap<number, number>(undefined, (num: number) => num * 2)).toEqual([]);
  });
});

describe('safeFilter', () => {
  test('filters valid arrays', () => {
    expect(safeFilter([1, 2, 3, 4], (num: number) => num % 2 === 0)).toEqual([2, 4]);
  });
  
  test('returns empty array for null input', () => {
    expect(safeFilter<number>(null, (num: number) => num % 2 === 0)).toEqual([]);
  });
});

describe('ensureArray', () => {
  test('returns the original array for array inputs', () => {
    expect(ensureArray([1, 2, 3])).toEqual([1, 2, 3]);
  });
  
  test('wraps non-array values in an array', () => {
    expect(ensureArray('test')).toEqual(['test']);
    expect(ensureArray(123)).toEqual([123]);
  });
});

describe('hasNonEmptyArrayProp', () => {
  test('returns true for objects with non-empty array properties', () => {
    expect(hasNonEmptyArrayProp({ items: [1, 2, 3] }, 'items')).toBe(true);
  });
  
  test('returns false for null object', () => {
    expect(hasNonEmptyArrayProp(null, 'items')).toBe(false);
  });
}); 