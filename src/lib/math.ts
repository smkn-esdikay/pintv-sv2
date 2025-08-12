/**
 * ------------------------------- CRYPT -------------------------------
 */

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



/**
 * ------------------------------- TIME -------------------------------
 */
export function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}


export const formatSecondsArray = (secondsArray: number[]): string => {
  return secondsArray.map(formatSeconds).join(', ');
}

