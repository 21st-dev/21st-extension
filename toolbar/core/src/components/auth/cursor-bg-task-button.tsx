import { Button } from '@/components/ui/button';
import { useCursorBgAgent } from '@/hooks/use-cursor-bg-agent';
import { detectRepository } from '@/utils/repository-detector';
import { cn } from '@/utils';
import { Loader, CheckCircle, AlertCircle, Send, Terminal } from 'lucide-react';
import { useMemo, useState, useCallback } from 'preact/hooks';

interface CursorBgTaskButtonProps {
  message?: string;
  currentUrl?: string;
  selectedElements?: HTMLElement[];
  selectedComponents?: any[];
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'link';
  size?: 'icon' | 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export function CursorBgTaskButton({
  message = 'Create component based on current page',
  currentUrl,
  selectedElements,
  selectedComponents,
  className,
  variant = 'primary',
  size = 'md',
  showProgress = true,
}: CursorBgTaskButtonProps) {
  const { isConfigured, sendToBackgroundAgent } = useCursorBgAgent();
  const [isLoading, setIsLoading] = useState(false);
  const [lastTaskStatus, setLastTaskStatus] = useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (!isConfigured) {
      // This button should only be visible when configured, but just in case
      return;
    }

    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setLastTaskStatus('sending');
    setError(null);

    try {
      // Get repository information
      const repoInfo = detectRepository();

      // Prepare context according to Cursor Background Agents API
      const context = {
        repository: repoInfo.repository, // Direct repository field, not in source
        model: 'claude-4-sonnet-thinking', // Use latest model with thinking
        ref: repoInfo.ref,
        target: {
          branchName: `cursor/${Date.now()}`, // Generate unique branch name
          createPr: true,
        },
      };

      // Send to Cursor Background Agent (remove @bg prefix as it's handled by API)
      const agent = await sendToBackgroundAgent(message, context);

      console.log('Background agent created:', agent);

      // Show success notification and open task
      if (agent) {
        // Show browser notification if supported
        if (Notification.permission === 'granted') {
          new Notification('Cursor Background Task Created', {
            body: `Task "${agent.name || 'Background Task'}" created successfully!`,
            icon: '/21st-icon.png',
          });
        }

        // Open created task in new tab/window with slight delay
        setTimeout(() => {
          if (agent.target && agent.target.url) {
            console.log('Opening Cursor task:', agent.target.url);
            window.open(agent.target.url, '_blank', 'noopener,noreferrer');
          } else if (agent.id) {
            // Fallback: construct URL based on agent ID
            const taskUrl = `https://cursor.com/agents?id=${agent.id}`;
            console.log('Opening Cursor task (fallback):', taskUrl);
            window.open(taskUrl, '_blank', 'noopener,noreferrer');
          }
        }, 500); // Small delay for better UX
      }

      setLastTaskStatus('success');

      // Reset to idle after showing success briefly
      setTimeout(() => {
        setLastTaskStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('Failed to create Cursor background task:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create background task',
      );
      setLastTaskStatus('error');

      // Reset to idle after showing error briefly
      setTimeout(() => {
        setLastTaskStatus('idle');
        setError(null);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  }, [
    isConfigured,
    isLoading,
    message,
    currentUrl,
    selectedElements,
    selectedComponents,
    sendToBackgroundAgent,
  ]);

  const buttonContent = useMemo(() => {
    if (lastTaskStatus === 'sending' || isLoading) {
      return {
        icon: Loader,
        text: 'Sending to Cursor...',
        description: 'Creating background task',
      };
    }

    if (lastTaskStatus === 'success') {
      return {
        icon: CheckCircle,
        text: 'Task Created!',
        description: 'Background task sent to Cursor',
      };
    }

    if (lastTaskStatus === 'error') {
      return {
        icon: AlertCircle,
        text: 'Try again',
        description: error || 'Failed to create task',
      };
    }

    return {
      icon: Terminal,
      text: '⚡ Create bg task',
      description: 'Send task to Cursor Background Agent',
    };
  }, [lastTaskStatus, isLoading, error]);

  const buttonVariant = useMemo(() => {
    if (lastTaskStatus === 'success') return 'primary';
    if (lastTaskStatus === 'error') return 'secondary';
    return variant;
  }, [lastTaskStatus, variant]);

  const buttonClassName = useMemo(() => {
    return cn(
      'relative transition-all duration-200',
      lastTaskStatus === 'success' &&
        'border-green-500 bg-green-500 text-white hover:bg-green-600',
      lastTaskStatus === 'error' &&
        'border-red-300 text-red-600 hover:bg-red-50',
      isLoading && 'cursor-wait',
      className,
    );
  }, [lastTaskStatus, isLoading, className]);

  // Don't render if not configured
  if (!isConfigured) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        variant={buttonVariant}
        size={size}
        onClick={handleClick}
        disabled={isLoading}
        className={buttonClassName}
      >
        <buttonContent.icon
          className={cn(
            'mr-2 h-4 w-4',
            (lastTaskStatus === 'sending' || isLoading) && 'animate-spin',
          )}
        />
        {buttonContent.text}

        {lastTaskStatus === 'success' && <Send className="ml-2 h-4 w-4" />}
      </Button>

      {/* Progress and status info */}
      {showProgress && (lastTaskStatus !== 'idle' || error) && (
        <div className="space-y-1">
          {/* Description */}
          <p
            className={cn(
              'text-xs',
              lastTaskStatus === 'error'
                ? 'text-red-600'
                : 'text-muted-foreground',
            )}
          >
            {buttonContent.description}
          </p>

          {/* Success message */}
          {lastTaskStatus === 'success' && (
            <p className="text-green-600 text-xs">
              Task created! Opening in new tab... Check Cursor IDE for progress.
            </p>
          )}

          {/* Error actions */}
          {lastTaskStatus === 'error' && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClick}
                className="h-6 text-xs"
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simplified version for toolbar integration
export function CursorBgTaskIcon({
  className,
  ...props
}: Omit<CursorBgTaskButtonProps, 'showProgress'>) {
  return (
    <CursorBgTaskButton
      {...props}
      showProgress={false}
      size="sm"
      variant="ghost"
      className={cn('h-8 w-8 p-0', className)}
    />
  );
}
