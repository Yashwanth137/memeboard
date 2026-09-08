import test from 'node:test';
import assert from 'node:assert';

// Mock window and sessionStorage for Node.js environment
const storage = new Map();
globalThis.window = {
  sessionStorage: {
    getItem: (k) => storage.get(k) || null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear(),
    key: (i) => Array.from(storage.keys())[i] || null,
    get length() {
      return storage.size;
    },
  },
};

const {
  getBoardsCache,
  setBoardsCache,
  invalidateBoardsCache,
} = await import('../src/lib/cache/boards-cache.ts');

test('Boards Cache: set and get returns cached boards immediately', () => {
  const userId = 'user-123';
  const mockBoards = [
    {
      id: 'board-1',
      name: 'Memes',
      slug: 'memes',
      owner_id: userId,
      created_at: new Date().toISOString(),
      member_count: 3,
      link_count: 12,
      thumbnails: ['https://example.com/thumb.jpg'],
      members: ['alice', 'bob'],
    },
  ];

  setBoardsCache(userId, mockBoards);
  const retrieved = getBoardsCache(userId);

  assert.deepStrictEqual(retrieved, mockBoards);
});

test('Boards Cache: returns null for nonexistent or unauthenticated user', () => {
  assert.strictEqual(getBoardsCache('nonexistent-user'), null);
  assert.strictEqual(getBoardsCache(''), null);
});

test('Boards Cache: invalidateBoardsCache purges user cache', () => {
  const userId = 'user-456';
  const mockBoards = [
    {
      id: 'board-2',
      name: 'Gaming',
      slug: 'gaming',
      owner_id: userId,
      created_at: new Date().toISOString(),
    },
  ];

  setBoardsCache(userId, mockBoards);
  assert.notStrictEqual(getBoardsCache(userId), null);

  invalidateBoardsCache(userId);
  assert.strictEqual(getBoardsCache(userId), null);
});

test('Boards Cache: global invalidateBoardsCache clears all user caches', () => {
  setBoardsCache('user-a', [{ id: 'b-a', name: 'A', slug: 'a', owner_id: 'user-a', created_at: '' }]);
  setBoardsCache('user-b', [{ id: 'b-b', name: 'B', slug: 'b', owner_id: 'user-b', created_at: '' }]);

  assert.notStrictEqual(getBoardsCache('user-a'), null);
  assert.notStrictEqual(getBoardsCache('user-b'), null);

  invalidateBoardsCache();

  assert.strictEqual(getBoardsCache('user-a'), null);
  assert.strictEqual(getBoardsCache('user-b'), null);
});
