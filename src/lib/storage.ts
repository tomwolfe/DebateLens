/**
 * Safe localStorage utility to handle QuotaExceededError and ensure data integrity.
 */
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return defaultValue;
      return JSON.parse(saved) as T;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error(`localStorage quota exceeded for key "${key}". Attempting to clear old data.`);
        // Simple strategy: clear the key if it's too big, or you could implement more complex pruning
        // For this app, we might want to prune the oldest transcripts
      } else {
        console.error(`Error writing to localStorage key "${key}":`, error);
      }
      return false;
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
};

/**
 * Prunes transcripts to keep the list size manageable and prevent storage issues.
 */
export function pruneTranscripts<T>(transcripts: T[], limit: number = 100): T[] {
  if (transcripts.length <= limit) return transcripts;
  return transcripts.slice(-limit);
}
