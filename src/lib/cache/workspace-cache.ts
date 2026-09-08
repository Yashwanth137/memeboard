/**
 * Client-side in-memory and sessionStorage cache for WorkspaceLayout data
 * (user session, profile info, and sidebar boards).
 * Eliminates redundant /api/me/profile and auth round-trips on every page navigation.
 */

export interface SidebarBoardItem {
  id: string;
  name: string;
  slug: string;
}

export interface CachedWorkspace {
  user: any;
  profile: any;
  boards: SidebarBoardItem[];
  timestamp: number;
}

let memoryWorkspace: CachedWorkspace | null = null;
const WORKSPACE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getWorkspaceCache(): CachedWorkspace | null {
  if (typeof window === 'undefined') return null;

  if (memoryWorkspace && Date.now() - memoryWorkspace.timestamp < WORKSPACE_TTL_MS) {
    return memoryWorkspace;
  }

  try {
    const raw = window.sessionStorage.getItem('memeboard:workspace');
    if (raw) {
      const parsed: CachedWorkspace = JSON.parse(raw);
      if (parsed && parsed.user && Date.now() - parsed.timestamp < WORKSPACE_TTL_MS) {
        memoryWorkspace = parsed;
        return parsed;
      }
    }
  } catch {}

  return null;
}

export function setWorkspaceCache(data: {
  user: any;
  profile: any;
  boards: SidebarBoardItem[];
}): void {
  if (typeof window === 'undefined') return;

  const entry: CachedWorkspace = {
    ...data,
    timestamp: Date.now(),
  };
  memoryWorkspace = entry;

  try {
    window.sessionStorage.setItem('memeboard:workspace', JSON.stringify(entry));
  } catch {}
}

export function invalidateWorkspaceCache(): void {
  if (typeof window === 'undefined') return;
  memoryWorkspace = null;
  try {
    window.sessionStorage.removeItem('memeboard:workspace');
  } catch {}
}

let inFlightWorkspaceFetch: Promise<CachedWorkspace | null> | null = null;

export async function fetchWorkspaceDataWithCache(
  supabase: any,
  forceRefresh = false
): Promise<CachedWorkspace | null> {
  const cached = getWorkspaceCache();
  if (!forceRefresh && cached && Date.now() - cached.timestamp < 120000) {
    return cached;
  }

  if (inFlightWorkspaceFetch && !forceRefresh) {
    return inFlightWorkspaceFetch;
  }

  inFlightWorkspaceFetch = (async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) return null;

      let prof: any = null;
      try {
        const res = await fetch('/api/me/profile');
        if (res.ok) {
          const json = await res.json();
          prof = json.profile;
        }
      } catch (e) {
        console.error('Could not fetch profile via /api/me/profile:', e);
      }

      // Resilient fallback to safe public_profiles if /api/me/profile is unreachable
      if (!prof) {
        try {
          const { data: publicProf } = await supabase
            .from('public_profiles')
            .select('id, username, created_at')
            .eq('id', currentUser.id)
            .maybeSingle();
          if (publicProf) {
            prof = publicProf;
          }
        } catch (e) {
          console.error('Could not fetch fallback public_profile:', e);
        }
      }

      // Fetch user's boards for the sidebar
      const { data: memberRows } = await supabase
        .from('board_members')
        .select('boards ( id, name, slug )')
        .eq('user_id', currentUser.id);

      const boardList: SidebarBoardItem[] = [];
      if (memberRows) {
        memberRows.forEach((row: any) => {
          if (row.boards) {
            boardList.push({
              id: row.boards.id,
              name: row.boards.name,
              slug: row.boards.slug,
            });
          }
        });
      }

      const result: CachedWorkspace = {
        user: currentUser,
        profile: prof,
        boards: boardList,
        timestamp: Date.now(),
      };

      setWorkspaceCache(result);
      return result;
    } catch (err) {
      console.error('Error fetching workspace data:', err);
      return null;
    } finally {
      inFlightWorkspaceFetch = null;
    }
  })();

  return inFlightWorkspaceFetch;
}
