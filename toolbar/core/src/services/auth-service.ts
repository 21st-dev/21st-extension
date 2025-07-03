import { TWENTY_FIRST_URL } from '@/constants';
import { ToolbarAPIError } from '@/types/auth';
import type {
  AuthTokens,
  UserInfo,
  UsageInfo,
  ProjectInfo,
  ProjectStatus,
  ProjectStatusResponse,
  ProjectsListResponse,
} from '@/types/auth';

export class AuthService {
  private static readonly STORAGE_KEY = '21st_auth_tokens';
  private static readonly USER_DATA_KEY = '21st_user_data';
  private static readonly PROJECTS_DATA_KEY = '21st_projects_data';
  private static readonly PROJECTS_FALLBACK_KEY = '21st_projects_fallback';
  private static readonly API_BASE_URL = `${TWENTY_FIRST_URL}/api/toolbar`;
  private static readonly USER_DATA_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private static readonly PROJECTS_DATA_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds
  private static readonly PROJECTS_FALLBACK_TTL = 24 * 60 * 60 * 1000; // 24 hours for fallback

  // Token management
  static saveTokens(tokens: AuthTokens): void {
    try {
      localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to save auth tokens:', error);
    }
  }

  static getTokens(): AuthTokens | null {
    try {
      const stored = localStorage.getItem(AuthService.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get auth tokens:', error);
      return null;
    }
  }

  static clearTokens(): void {
    try {
      localStorage.removeItem(AuthService.STORAGE_KEY);
      AuthService.clearUserData(); // Also clear cached user data
      // Don't aggressively clear projects data - keep for better UX
      // AuthService.clearProjectsData();
    } catch (error) {
      console.error('Failed to clear auth tokens:', error);
    }
  }

  static isTokenValid(tokens: AuthTokens): boolean {
    return new Date(tokens.expiresAt) > new Date();
  }

  // User data caching
  static saveUserData(userData: { user: UserInfo; usage: UsageInfo }): void {
    try {
      const dataToStore = {
        ...userData,
        cachedAt: Date.now(),
      };
      localStorage.setItem(
        AuthService.USER_DATA_KEY,
        JSON.stringify(dataToStore),
      );
    } catch (error) {
      console.error('Failed to save user data:', error);
    }
  }

  static getCachedUserData(): { user: UserInfo; usage: UsageInfo } | null {
    try {
      const stored = localStorage.getItem(AuthService.USER_DATA_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);
      const isExpired = Date.now() - data.cachedAt > AuthService.USER_DATA_TTL;

      if (isExpired) {
        localStorage.removeItem(AuthService.USER_DATA_KEY);
        return null;
      }

      return { user: data.user, usage: data.usage };
    } catch (error) {
      console.error('Failed to get cached user data:', error);
      return null;
    }
  }

  static getCachedUserDataWithTimestamp(): {
    user: UserInfo;
    usage: UsageInfo;
    cachedAt: number;
  } | null {
    try {
      const stored = localStorage.getItem(AuthService.USER_DATA_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);
      return {
        user: data.user,
        usage: data.usage,
        cachedAt: data.cachedAt,
      };
    } catch (error) {
      console.error('Failed to get cached user data with timestamp:', error);
      return null;
    }
  }

  static clearUserData(): void {
    try {
      localStorage.removeItem(AuthService.USER_DATA_KEY);
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }

  // Projects data caching
  static saveProjectsData(projects: ProjectInfo[]): void {
    try {
      const dataToStore = {
        projects,
        cachedAt: Date.now(),
      };
      localStorage.setItem(
        AuthService.PROJECTS_DATA_KEY,
        JSON.stringify(dataToStore),
      );

      // Also save to fallback cache for longer persistence
      AuthService.saveFallbackProjectsData(projects);
    } catch (error) {
      console.error('Failed to save projects data:', error);
    }
  }

  // Fallback projects cache for longer persistence
  static saveFallbackProjectsData(projects: ProjectInfo[]): void {
    try {
      const dataToStore = {
        projects,
        cachedAt: Date.now(),
      };
      localStorage.setItem(
        AuthService.PROJECTS_FALLBACK_KEY,
        JSON.stringify(dataToStore),
      );
    } catch (error) {
      console.error('Failed to save fallback projects data:', error);
    }
  }

  static getCachedProjectsData(): ProjectInfo[] | null {
    try {
      const stored = localStorage.getItem(AuthService.PROJECTS_DATA_KEY);
      if (!stored) {
        // Try fallback cache if main cache is empty
        return AuthService.getFallbackProjectsData();
      }

      const data = JSON.parse(stored);
      const isExpired =
        Date.now() - data.cachedAt > AuthService.PROJECTS_DATA_TTL;

      if (isExpired) {
        localStorage.removeItem(AuthService.PROJECTS_DATA_KEY);
        // Return fallback cache instead of null
        return AuthService.getFallbackProjectsData();
      }

      return data.projects;
    } catch (error) {
      console.error('Failed to get cached projects data:', error);
      // Try fallback cache on error
      return AuthService.getFallbackProjectsData();
    }
  }

  static getCachedProjectsDataWithTimestamp(): {
    projects: ProjectInfo[];
    cachedAt: number;
  } | null {
    try {
      const stored = localStorage.getItem(AuthService.PROJECTS_DATA_KEY);
      if (!stored) {
        const fallback = AuthService.getFallbackProjectsData();
        if (fallback) {
          // Return fallback with old timestamp to trigger refetch
          return { projects: fallback, cachedAt: 0 };
        }
        return null;
      }

      const data = JSON.parse(stored);
      return { projects: data.projects, cachedAt: data.cachedAt };
    } catch (error) {
      console.error(
        'Failed to get cached projects data with timestamp:',
        error,
      );
      return null;
    }
  }

  static getFallbackProjectsData(): ProjectInfo[] | null {
    try {
      const stored = localStorage.getItem(AuthService.PROJECTS_FALLBACK_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);
      const isExpired =
        Date.now() - data.cachedAt > AuthService.PROJECTS_FALLBACK_TTL;

      if (isExpired) {
        localStorage.removeItem(AuthService.PROJECTS_FALLBACK_KEY);
        return null;
      }

      return data.projects;
    } catch (error) {
      console.error('Failed to get fallback projects data:', error);
      return null;
    }
  }

  static clearProjectsData(): void {
    try {
      localStorage.removeItem(AuthService.PROJECTS_DATA_KEY);
      // Don't clear fallback cache - keep for better UX
      // localStorage.removeItem(AuthService.PROJECTS_FALLBACK_KEY);
    } catch (error) {
      console.error('Failed to clear projects data:', error);
    }
  }

  static clearAllProjectsData(): void {
    try {
      localStorage.removeItem(AuthService.PROJECTS_DATA_KEY);
      localStorage.removeItem(AuthService.PROJECTS_FALLBACK_KEY);
    } catch (error) {
      console.error('Failed to clear all projects data:', error);
    }
  }

  // Refresh token if needed
  static async refreshTokenIfNeeded(): Promise<string | null> {
    const tokens = AuthService.getTokens();

    if (!tokens) {
      return null;
    }

    if (AuthService.isTokenValid(tokens)) {
      return tokens.token;
    }

    try {
      const response = await fetch(`${AuthService.API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refresh_token: tokens.refreshToken,
        }),
      });

      if (response.ok) {
        const newTokens = await response.json();
        AuthService.saveTokens(newTokens);
        return newTokens.token;
      }

      // If refresh failed - clear tokens
      AuthService.clearTokens();
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      AuthService.clearTokens();
      return null;
    }
  }

  // Auth window management
  static openAuthWindow(): Promise<AuthTokens> {
    return new Promise((resolve, reject) => {
      const authUrl = `${TWENTY_FIRST_URL}/toolbar/auth`;
      const popup = window.open(authUrl, 'auth', 'width=500,height=600');

      if (!popup) {
        reject(new Error('Failed to open auth window. Please allow popups.'));
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        // Security check - ensure message is from current API origin
        try {
          const expectedOrigin = new URL(TWENTY_FIRST_URL).origin;
          if (event.origin !== expectedOrigin) {
            return;
          }
        } catch (error) {
          console.warn('Invalid TWENTY_FIRST_URL:', TWENTY_FIRST_URL);
          return;
        }

        if (event.data.type === 'TOOLBAR_AUTH_SUCCESS') {
          const { token, refreshToken, expiresAt } = event.data;
          const tokens: AuthTokens = { token, refreshToken, expiresAt };

          window.removeEventListener('message', handleMessage);
          popup.close();

          resolve(tokens);
        } else if (event.data.type === 'TOOLBAR_AUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          popup.close();

          reject(new Error(event.data.error || 'Authentication failed'));
        }
      };

      const handlePopupClosed = () => {
        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            window.removeEventListener('message', handleMessage);
            reject(new Error('Authentication cancelled'));
          }
        }, 1000);
      };

      window.addEventListener('message', handleMessage);
      handlePopupClosed();
    });
  }

  // API requests with authentication
  private static async authenticatedFetch(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = await AuthService.refreshTokenIfNeeded();

    if (!token) {
      throw new ToolbarAPIError('UNAUTHENTICATED', 'Not authenticated');
    }

    const response = await fetch(`${AuthService.API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ToolbarAPIError(
        errorData.code || 'API_ERROR',
        errorData.error || `HTTP ${response.status}`,
        response.status,
        errorData,
      );
    }

    return response;
  }

  // User info
  static async getUserInfo(): Promise<{ user: UserInfo; usage: UsageInfo }> {
    const response = await AuthService.authenticatedFetch('/user/info');
    const userData = await response.json();

    // Cache the user data for faster subsequent loads
    AuthService.saveUserData(userData);

    return userData;
  }

  // Project creation
  static async createProject(
    message: string,
    currentUrl?: string,
    selectedElements?: HTMLElement[],
    selectedComponents?: any[],
  ): Promise<ProjectInfo> {
    const body = {
      message,
      source: 'toolbar',
      currentUrl,
      selectedElementsCount: selectedElements?.length || 0,
      selectedComponentsCount: selectedComponents?.length || 0,
    };

    const response = await AuthService.authenticatedFetch('/projects/create', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const result = await response.json();
    return result.project;
  }

  // Project status tracking
  static async getProjectStatus(projectId: string): Promise<ProjectStatusResponse> {
    const response = await AuthService.authenticatedFetch(
      `/projects/${projectId}/status`,
    );
    const result: ProjectStatusResponse = await response.json();
    return result;
  }

  // Get user projects list
  static async getUserProjects(): Promise<ProjectInfo[]> {
    const response = await AuthService.authenticatedFetch('/projects');
    const result: ProjectsListResponse = await response.json();

    // Cache the projects data for faster subsequent loads
    AuthService.saveProjectsData(result.projects);

    return result.projects;
  }

  // Get cached projects or fetch from API
  static async getUserProjectsCached(): Promise<ProjectInfo[]> {
    try {
      // First try to get cached projects
      const cachedProjects = AuthService.getCachedProjectsData();
      if (cachedProjects) {
        return cachedProjects;
      }

      // If no cache, fetch from API
      return await AuthService.getUserProjects();
    } catch (error) {
      console.error('Failed to get user projects:', error);
      // If API call fails, try to return cached data even if expired
      const cachedProjects = AuthService.getCachedProjectsData();
      return cachedProjects || [];
    }
  }

  // Get user bookmarks
  static async getUserBookmarks(): Promise<any> {
    const response = await AuthService.authenticatedFetch('/bookmarks');
    const result = await response.json();
    return result;
  }

  // Check authentication status (with caching)
  static async checkAuthStatus(): Promise<{
    user: UserInfo;
    usage: UsageInfo;
  } | null> {
    try {
      const tokens = AuthService.getTokens();
      if (!tokens || !AuthService.isTokenValid(tokens)) {
        return null;
      }

      // Check if we have recent cached data
      const cachedData = AuthService.getCachedUserData();
      if (cachedData) {
        return cachedData;
      }

      // If no cache, fetch from API
      return await AuthService.getUserInfo();
    } catch (error) {
      console.error('Auth status check failed:', error);
      // If API call fails, clear tokens and cache
      AuthService.clearTokens();
      return null;
    }
  }

  // Fast auth check - only validates local token without API call
  static checkAuthStatusLocal(): { tokens: AuthTokens } | null {
    try {
      const tokens = AuthService.getTokens();
      if (!tokens || !AuthService.isTokenValid(tokens)) {
        return null;
      }

      return { tokens };
    } catch (error) {
      console.error('Local auth check failed:', error);
      return null;
    }
  }
}

// Error handler for UI
export class ErrorHandler {
  static handle(error: ToolbarAPIError): void {
    switch (error.code) {
      case 'USAGE_LIMIT_EXCEEDED':
        ErrorHandler.showUpgradeNotification();
        break;
      case 'UNAUTHENTICATED':
        ErrorHandler.showAuthRequiredNotification();
        break;
      case 'NETWORK_ERROR':
        ErrorHandler.showRetryNotification();
        break;
      default:
        ErrorHandler.showGenericError(error.message);
    }
  }

  private static showUpgradeNotification(): void {
    ErrorHandler.showNotification(
      'Usage limit exceeded. Please upgrade your plan.',
      `${TWENTY_FIRST_URL}/pricing`,
    );
  }

  private static showAuthRequiredNotification(): void {
    ErrorHandler.showNotification(
      'Please sign in to your 21st.dev account to continue.',
      null,
    );
  }

  private static showRetryNotification(): void {
    ErrorHandler.showNotification(
      'Network error. Please check your connection and try again.',
      null,
    );
  }

  private static showGenericError(message: string): void {
    ErrorHandler.showNotification(message, null);
  }

  private static showNotification(
    message: string,
    actionUrl?: string | null,
  ): void {
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      const notification = new Notification('21st.dev Toolbar', {
        body: message,
        icon: '/21st-icon.png',
      });

      if (actionUrl) {
        notification.onclick = () => window.open(actionUrl, '_blank');
      }
    } else {
      // Fallback to console for now - in real app would show in-app notification
      console.warn(`21st.dev Toolbar: ${message}`);
    }
  }
}
