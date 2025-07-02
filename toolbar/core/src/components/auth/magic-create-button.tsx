import { Button } from '@/components/ui/button';
import { useAuth, useAuthStatus } from '@/hooks/use-auth';
import { useMagicProjects } from '@/hooks/use-magic-projects';
import { cn } from '@/utils';
import {
  Sparkles,
  Loader,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import { useMemo } from 'preact/hooks';

interface MagicCreateButtonProps {
  message?: string;
  currentUrl?: string;
  selectedElements?: HTMLElement[];
  selectedComponents?: any[];
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'link';
  size?: 'icon' | 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export function MagicCreateButton({
  message = 'Create component based on current page',
  currentUrl,
  selectedElements,
  selectedComponents,
  className,
  variant = 'primary',
  size = 'md',
  showProgress = true,
}: MagicCreateButtonProps) {
  const { signIn } = useAuth();
  const { isAuthenticated } = useAuthStatus();
  const {
    createProject,
    clearProject,
    clearError,
    currentProject,
    projectStatus,
    error,
    status,
    progress,
  } = useMagicProjects();

  // Derived state from magic projects
  const isIdle = status === 'idle';
  const isCreating = status === 'creating';
  const isTracking = status === 'tracking';
  const isCompleted = status === 'completed';
  const isError = status === 'error';
  const isActive = status !== 'idle';

  const handleClick = async () => {
    if (!isAuthenticated) {
      await signIn();
      return;
    }

    if (isCompleted) {
      clearProject();
      return;
    }

    if (isError) {
      clearError();
      return;
    }

    if (isIdle) {
      await createProject(
        message,
        currentUrl || window.location.href,
        selectedElements,
        selectedComponents,
      );
    }
  };

  const buttonContent = useMemo(() => {
    if (!isAuthenticated) {
      return {
        icon: LogIn,
        text: 'Sign in for Magic',
        description: 'Connect your 21st.dev account',
      };
    }

    if (isCreating) {
      return {
        icon: Loader,
        text: 'Creating project...',
        description: 'Setting up your Magic project',
      };
    }

    if (isTracking) {
      return {
        icon: Loader,
        text: `Generating (${progress}%)`,
        description: `${projectStatus?.completed || 0}/${projectStatus?.total || 0} variants`,
      };
    }

    if (isCompleted) {
      return {
        icon: CheckCircle,
        text: 'Ready!',
        description: 'Click to view project',
      };
    }

    if (isError) {
      return {
        icon: AlertCircle,
        text: 'Try again',
        description: error || 'Something went wrong',
      };
    }

    return {
      icon: Sparkles,
      text: '✨ Create with Magic',
      description: 'Generate AI-powered components',
    };
  }, [
    isAuthenticated,
    isCreating,
    isTracking,
    isCompleted,
    isError,
    progress,
    projectStatus,
    error,
  ]);

  const buttonVariant = useMemo(() => {
    if (isCompleted) return 'primary';
    if (isError) return 'secondary';
    return variant;
  }, [isCompleted, isError, variant]);

  const buttonClassName = useMemo(() => {
    return cn(
      'relative transition-all duration-200',
      isCompleted &&
        'border-green-500 bg-green-500 text-white hover:bg-green-600',
      isError && 'border-red-300 text-red-600 hover:bg-red-50',
      isActive && !isCompleted && !isError && 'cursor-wait',
      className,
    );
  }, [isCompleted, isError, isActive, className]);

  return (
    <div className="space-y-2">
      <Button
        variant={buttonVariant}
        size={size}
        onClick={handleClick}
        disabled={isActive && !isCompleted}
        className={buttonClassName}
      >
        <buttonContent.icon
          className={cn(
            'mr-2 h-4 w-4',
            (isCreating || (isTracking && !isCompleted)) && 'animate-spin',
          )}
        />
        {buttonContent.text}

        {isCompleted && currentProject && (
          <ExternalLink className="ml-2 h-4 w-4" />
        )}
      </Button>

      {/* Progress and status info */}
      {showProgress && (isActive || isError) && (
        <div className="space-y-1">
          {/* Progress bar for tracking */}
          {isTracking && projectStatus && (
            <div className="w-full">
              <div className="mb-1 flex items-center justify-between text-muted-foreground text-xs">
                <span>Generating variants</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <p
            className={cn(
              'text-xs',
              isError ? 'text-red-600' : 'text-muted-foreground',
            )}
          >
            {buttonContent.description}
          </p>

          {/* Project link when completed */}
          {isCompleted && currentProject && (
            <a
              href={currentProject.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 text-xs transition-colors hover:text-blue-700"
            >
              Open project <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* Error actions */}
          {isError && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="h-6 text-xs"
              >
                Try again
              </Button>
              {!isAuthenticated && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signIn}
                  className="h-6 text-xs"
                >
                  Sign in
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simplified version for toolbar integration
export function MagicCreateIcon({
  className,
  ...props
}: Omit<MagicCreateButtonProps, 'showProgress'>) {
  return (
    <MagicCreateButton
      {...props}
      showProgress={false}
      size="sm"
      variant="ghost"
      className={cn('h-8 w-8 p-0', className)}
    />
  );
}
