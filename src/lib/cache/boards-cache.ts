/**
 * In-memory client-side cache for boards summary data.
 * Enables instant (0ms) render on back-navigation between board view and /boards
 * following the stale-while-revalidate pattern.
 */

export interface CachedBoard {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
  link_count?: number;
  role?: string;
  thumbnails?: string[];
  members?: string[];
}

interface CacheEntry {
  boards: CachedBoard[];
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();

// Cache validity window: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getBoardsCache(userId: string): CachedBoard[] | null {
  if (typeof window === 'undefined' || !userId) return null;

  // 1. Fast in-memory lookup
  const entry = memoryCache.get(userId);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.boards;
  }

  // 2. Fallback to sessionStorage for cross-navigation retention
  try {
    const raw = window.sessionStorage.getItem(`memeboard:boards:${userId}`);
    if (raw) {
      const parsed: CacheEntry = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.boards) && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        memoryCache.set(userId, parsed);
        return parsed.boards;
      }
    }
  } catch {
    // Ignore storage errors (e.g. private browsing restrictions)
  }

  return null;
}

export function setBoardsCache(userId: string, boards: CachedBoard[]): void {
  if (typeof window === 'undefined' || !userId) return;

  const entry: CacheEntry = {
    boards,
    timestamp: Date.now(),
  };

  memoryCache.set(userId, entry);

  try {
    window.sessionStorage.setItem(`memeboard:boards:${userId}`, JSON.stringify(entry));
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

export function invalidateBoardsCache(userId?: string): void {
  if (typeof window === 'undefined') return;

  if (userId) {
    memoryCache.delete(userId);
    try {
      window.sessionStorage.removeItem(`memeboard:boards:${userId}`);
    } catch {}
  } else {
    memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith('memeboard:boards:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
    } catch {}
  }
}
