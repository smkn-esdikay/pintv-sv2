
// generate id (timebased for actions)
export const generateId = () => Date.now().toString(36);


/**
 * Generate a random ID with optional prefix and length
 * @param prefix Optional prefix for the ID
 * @param length Length of the random part (default: 8)
 * @returns A random ID string
 */
export function createId(prefix?: string, length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return prefix ? `${prefix}-${result}` : result;
}

export const randomId = (prefix?: string) => createId(prefix, 12);
