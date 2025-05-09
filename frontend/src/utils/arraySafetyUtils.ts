/**
 * Safely maps over an array, handling null and undefined cases
 * @param arr The array to map over
 * @param mapFn The mapping function to apply to each item
 * @returns A new array with the mapping applied, or an empty array if input is not an array
 */
export function safeMap<T, R>(arr: T[] | null | undefined, mapFn: (item: T) => R): R[] {
  return Array.isArray(arr) ? arr.map(mapFn) : [];
}

/**
 * Safely filters an array, handling null and undefined cases
 * @param arr The array to filter
 * @param filterFn The filter function to apply
 * @returns A new filtered array, or an empty array if input is not an array
 */
export function safeFilter<T>(arr: T[] | null | undefined, filterFn: (item: T) => boolean): T[] {
  return Array.isArray(arr) ? arr.filter(filterFn) : [];
}

/**
 * Converts any value to an array if it's not already an array
 * @param value The value to ensure is an array
 * @returns The original array, or a new array containing the value, or an empty array for null/undefined
 */
export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * Checks if an object has a non-empty array property
 * @param obj The object to check
 * @param propName The name of the property to check
 * @returns True if the property exists and is a non-empty array
 */
export function hasNonEmptyArrayProp<T>(obj: T | null | undefined, propName: keyof any): boolean {
  if (!obj) return false;
  const prop = (obj as any)[propName];
  return Array.isArray(prop) && prop.length > 0;
} 