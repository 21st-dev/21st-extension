import { useState, useEffect, useCallback } from 'preact/hooks';
import { AuthService } from '@/services/auth-service';
import { useAuthStatus } from './use-auth';

// Типы для букмарков на основе API документации
export interface BookmarkComponent {
  id: number;
  name: string;
  component_slug: string;
  username: string;
  display_name: string;
  image_url?: string;
}

export interface BookmarkUser {
  id: string;
  username: string;
  display_name: string;
  image_url?: string;
}

export interface Bookmark {
  id: number;
  name: string;
  demo_slug: string;
  preview_url?: string;
  video_url?: string;
  created_at: string;
  updated_at: string;
  bookmarks_count: number;
  view_count: number;
  component: BookmarkComponent;
  user: BookmarkUser;
  bookmarked_at: string;
}

export interface BookmarksResponse {
  success: boolean;
  bookmarks: Bookmark[];
  count: number;
}

interface UseBookmarksReturn {
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBookmarks(): UseBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStatus();

  const fetchBookmarks = useCallback(async () => {
    if (!isAuthenticated) {
      setBookmarks([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data: BookmarksResponse = await AuthService.getUserBookmarks();

      if (data.success) {
        setBookmarks(data.bookmarks);
      } else {
        setError('Failed to fetch bookmarks');
        setBookmarks([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch bookmarks',
      );
      setBookmarks([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch bookmarks when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchBookmarks();
    } else {
      setBookmarks([]);
      setError(null);
    }
  }, [isAuthenticated, fetchBookmarks]);

  return {
    bookmarks,
    isLoading,
    error,
    refetch: fetchBookmarks,
  };
}
