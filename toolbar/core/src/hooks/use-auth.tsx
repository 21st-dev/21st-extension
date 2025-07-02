import { createContext, type ComponentChildren } from 'preact';
import {
  useCallback,
  useContext,
  useState,
  useMemo,
  useEffect,
} from 'preact/hooks';
import { useQuery } from '@tanstack/react-query';
import { AuthService, ErrorHandler } from '@/services/auth-service';
import { AuthStatus, ToolbarAPIError } from '@/types/auth';
import type { AuthState, AuthTokens, UserInfo, UsageInfo } from '@/types/auth';

interface AuthContextValue extends AuthState {
  // Auth actions
  signIn: () => Promise<void>;
  signOut: () => void;

  // Loading states
  isSigningIn: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  status: AuthStatus.LOADING,
  signIn: async () => {},
  signOut: () => {},
  isSigningIn: false,
});

interface AuthProviderProps {
  children: ComponentChildren;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | undefined>();

  // Check if user has valid tokens locally - memoized for reactivity
  const [tokenCheckTrigger, setTokenCheckTrigger] = useState(0);
  const hasValidTokens = useMemo(() => {
    const tokens = AuthService.getTokens();
    return !!(tokens && AuthService.isTokenValid(tokens));
  }, [tokenCheckTrigger]);

  // Force recheck tokens when needed
  const recheckTokens = useCallback(() => {
    setTokenCheckTrigger((prev) => prev + 1);
  }, []);

  // Query for user info - ONLY if no valid cache
  const {
    data: queryUserInfo,
    isLoading: isUserInfoLoading,
    error: userInfoError,
    refetch: refetchUserInfo,
  } = useQuery({
    queryKey: ['userInfo'],
    queryFn: () => AuthService.getUserInfo(),
    enabled: hasValidTokens && !AuthService.getCachedUserData(), // ТОЛЬКО если нет кэша
    staleTime: Number.POSITIVE_INFINITY, // Never stale
    gcTime: Number.POSITIVE_INFINITY, // Never garbage collect
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      if (
        error instanceof ToolbarAPIError &&
        error.code === 'UNAUTHENTICATED'
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Use cache first, then query data
  const finalUserInfo = AuthService.getCachedUserData() || queryUserInfo;

  // Determine auth status
  const authStatus = (() => {
    const hasTokens = hasValidTokens;

    if (!hasTokens) {
      return AuthStatus.UNAUTHENTICATED;
    }

    // If we're loading and have no cached data
    if (isUserInfoLoading && !finalUserInfo) {
      return AuthStatus.LOADING;
    }

    if (userInfoError) {
      if (
        userInfoError instanceof ToolbarAPIError &&
        userInfoError.code === 'UNAUTHENTICATED'
      ) {
        return AuthStatus.UNAUTHENTICATED;
      }
      return AuthStatus.ERROR;
    }

    if (finalUserInfo) {
      return AuthStatus.AUTHENTICATED;
    }

    return AuthStatus.LOADING;
  })();

  // Sign in handler
  const signIn = useCallback(async () => {
    setIsSigningIn(true);
    setAuthError(undefined);

    try {
      const tokens = await AuthService.openAuthWindow();
      AuthService.saveTokens(tokens);

      // Force recheck tokens to trigger query
      recheckTokens();

      // Clear any cached data to force fresh fetch
      AuthService.clearUserData();

      // Manually fetch user info after auth
      const userInfo = await AuthService.getUserInfo();
    } catch (error) {
      console.error('Sign in failed:', error);

      if (error instanceof ToolbarAPIError) {
        ErrorHandler.handle(error);
      }

      setAuthError(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setIsSigningIn(false);
    }
  }, [recheckTokens]);

  // Sign out handler
  const signOut = useCallback(() => {
    AuthService.clearTokens();
    AuthService.clearAllProjectsData();
    setAuthError(undefined);

    // Force recheck tokens to trigger query state update
    recheckTokens();
  }, [recheckTokens]);

  // Handle auth errors
  const error =
    authError ||
    (userInfoError instanceof Error ? userInfoError.message : undefined);

  const contextValue: AuthContextValue = useMemo(
    () => ({
      status: authStatus,
      user: finalUserInfo?.user,
      usage: finalUserInfo?.usage,
      tokens: AuthService.getTokens(),
      error,
      signIn,
      signOut,
      isSigningIn,
    }),
    [
      authStatus,
      finalUserInfo?.user,
      finalUserInfo?.usage,
      error,
      signIn,
      signOut,
      isSigningIn,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// Convenience hooks for common use cases
export function useAuthStatus() {
  const { status, isSigningIn } = useAuth();

  return {
    isAuthenticated: status === AuthStatus.AUTHENTICATED,
    isUnauthenticated: status === AuthStatus.UNAUTHENTICATED,
    isLoading: status === AuthStatus.LOADING,
    isError: status === AuthStatus.ERROR,
    isSigningIn,
  };
}

export function useUserInfo() {
  const { user, usage } = useAuth();

  return {
    user,
    usage,
  };
}
