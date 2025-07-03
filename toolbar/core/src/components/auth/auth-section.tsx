import { Button } from '@/components/ui/button';
import { useAuth, useAuthStatus, useUserInfo } from '@/hooks/use-auth';
import { cn } from '@/utils';
import { Loader, AlertCircle } from 'lucide-react';

// Import logo assets
import LogoDark from '../../../assets/21st-logo-dark.svg';
import LogoWhite from '../../../assets/21st-logo-white.svg';

interface AuthSectionProps {
  className?: string;
}

// Logo component that adapts to theme
function TwentyFirstLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center', className)}>
      {/* Light theme logo (hidden in dark mode) */}
      <img src={LogoWhite} alt="21st.dev" className="h-4 w-4 dark:hidden" />
      {/* Dark theme logo (hidden in light mode) */}
      <img
        src={LogoDark}
        alt="21st.dev"
        className="hidden h-4 w-4 dark:block"
      />
    </div>
  );
}

export function AuthSection({ className }: AuthSectionProps) {
  const { signIn, signOut, error } = useAuth();
  const { isAuthenticated, isLoading, isSigningIn, isError } = useAuthStatus();
  const { user, usage } = useUserInfo();

  const handleAuthAction = async () => {
    if (isAuthenticated) {
      signOut();
    } else {
      await signIn();
    }
  };

  const getUsageColor = (current: number, limit: number): string => {
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getUsageText = (current: number, limit: number): string => {
    const remaining = limit - current;
    if (remaining <= 0) return 'Limit reached';
    if (remaining <= 5) return `${remaining} remaining`;
    return `${current}/${limit} used`;
  };

  if (isLoading) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <span className="mb-1 block font-medium text-foreground text-sm">
            Sign in to 21st.dev
          </span>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Checking status...
          </p>
        </div>
        <div className="flex-shrink-0">
          <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-medium text-foreground text-sm">
              21st.dev Account
            </span>
            {isAuthenticated && user && (
              <button
                type="button"
                onClick={signOut}
                className="border-none bg-transparent p-0 font-normal text-muted-foreground text-xs hover:text-foreground"
              >
                Sign out
              </button>
            )}
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {isAuthenticated
              ? 'Signed in.'
              : 'Generate components and view bookmarks.'}
          </p>
        </div>
        <div className="flex-shrink-0">
          {isAuthenticated && user ? (
            <div className="text-right">
              <div className="font-medium text-foreground text-sm">
                {user.displayName || user.name}
              </div>
              {usage && (
                <div
                  className={cn(
                    'text-xs',
                    getUsageColor(usage.current, usage.limit),
                  )}
                >
                  {getUsageText(usage.current, usage.limit)}
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={handleAuthAction}
              disabled={isSigningIn}
              className="h-9 bg-foreground text-background text-sm shadow-black/5 shadow-sm transition-all hover:bg-foreground/90 hover:text-background focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20"
            >
              <div className="flex items-center gap-2">
                {isSigningIn ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <TwentyFirstLogo />
                )}
                <span>{isSigningIn ? 'Signing in...' : 'Sign in'}</span>
              </div>
            </Button>
          )}
        </div>
      </div>

      {isError && error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-2 text-red-700 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-xs">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="ml-auto h-6 text-xs"
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
