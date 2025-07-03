import { Button } from '@/components/ui/button';
import { TWENTY_FIRST_URL } from '@/constants';
import { useMagicProjects } from '@/hooks/use-magic-projects';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/utils';
import { ArrowUpRight, Loader, ChevronDown } from 'lucide-react';
import { useMemo, useState, useEffect } from 'preact/hooks';
import type { ProjectInfo } from '@/types/auth';

interface MagicStatusBarProps {
  className?: string;
}

function ProjectSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex-1">
        <div className="h-3 w-24 animate-pulse rounded-[2px] bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <div className="h-3 w-12 animate-pulse rounded-[2px] bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-3 w-3 animate-pulse rounded-[2px] bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}

function ProjectItem({
  project,
  progress,
}: {
  project: ProjectInfo;
  progress?: number;
}) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    const diffInHours = diffInMinutes / 60;

    if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getStatusText = (status?: string, progress?: number) => {
    switch (status) {
      case 'completed':
        return 'Done';
      case 'ready':
        return 'Ready';
      case 'generating':
      case 'loading':
        return progress !== null && progress !== undefined && progress > 0
          ? `${progress}%`
          : 'Initializing';
      case 'error':
        // Treat error as still building - don't show error to user
        return 'Initializing';
      default:
        return status || 'Unknown';
    }
  };

  const getProjectActionText = (project: ProjectInfo) => {
    switch (project.status) {
      case 'generating':
      case 'loading':
        return (
          <span className="flex items-center gap-1.5">
            <span>Initializing</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {project.name}
            </span>
          </span>
        );
      case 'completed':
      case 'ready':
        return `Created "${project.name}"`;
      case 'error':
        // Treat error as still building - don't show failure
        return (
          <span className="flex items-center gap-1.5">
            <span>Initializing</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {project.name}
            </span>
          </span>
        );
      default:
        return `Processing "${project.name}"`;
    }
  };

  const shouldShowStatus = () => {
    const now = new Date();
    const createdAt = new Date(project.created_at);
    const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    return diffInMinutes < 5;
  };

  const shouldShowTime = () => {
    // Don't show time for projects that are still generating/loading/in progress
    return (
      project.status !== 'generating' &&
      project.status !== 'loading' &&
      !isProjectInProgress()
    );
  };

  const isProjectInProgress = () => {
    if (!project.status) return false;

    // Project is in progress if it's generating, loading, or was created within last 5 minutes and not completed
    const now = new Date();
    const createdAt = new Date(project.created_at);
    const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    const isRecent = diffInMinutes <= 5;
    const isActiveStatus =
      project.status === 'generating' || project.status === 'loading';

    return (
      isActiveStatus ||
      (isRecent && project.status !== 'completed' && project.status !== 'ready')
    );
  };

  const handleOpenProject = (e?: Event) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newWindow = window.open(project.url, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.focus();
    }
  };

  return (
    <div
      className="flex cursor-pointer items-center justify-between gap-1 rounded px-1 py-1 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
      onClick={(e) => handleOpenProject(e)}
    >
      <div className="min-w-0 flex-1">
        <span className="block max-w-[160px] truncate text-foreground text-xs">
          {project.name}
        </span>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {shouldShowTime() && (
          <span className="text-muted-foreground text-xs">
            {formatDate(project.created_at)}
          </span>
        )}
        {shouldShowStatus() && (
          <span className="text-muted-foreground text-xs">
            {getStatusText(project.status, progress)}
          </span>
        )}
        <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  );
}

export function MagicStatusBar({ className }: MagicStatusBarProps) {
  const {
    userProjects,
    isLoadingProjects,
    isRefreshing,
    refetchProjects,
    status,
    projectStatus,
    project: currentProject,
  } = useMagicProjects();

  const isActive = status !== 'idle';
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Get auth status
  const { status: authStatus } = useAuth();

  // Helper function to get project action text
  const getProjectActionText = (project: ProjectInfo) => {
    switch (project.status) {
      case 'generating':
      case 'loading':
        return (
          <span className="flex items-center gap-1.5">
            <span>Building</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {project.name}
            </span>
          </span>
        );
      case 'completed':
      case 'ready':
        return (
          <span className="flex items-center gap-1.5">
            <span>Created</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {project.name}
            </span>
          </span>
        );
      case 'error':
        // Treat error as still building - don't show failure
        return (
          <span className="flex items-center gap-1.5">
            <span>Building</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {project.name}
            </span>
          </span>
        );
      default:
        return `Processing "${project.name}"`;
    }
  };

  // Helper function to get status text with progress
  const getStatusText = (project: ProjectInfo) => {
    // Для отладки - принудительно считать проект активным если это последний по созданию проект
    const sorted = [...userProjects].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const isNewestProject = sorted.length > 0 && project.id === sorted[0].id;

    // Get progress from current tracking if this is the actively tracked project
    const isActiveProject =
      (currentProject && project.id === currentProject.id) ||
      project.status === 'generating' ||
      project.status === 'loading';
    let progress: number | null = null;

    // Подход 1: Ищем прогресс в разных местах API ответа
    if (projectStatus) {
      // Попробуем найти данные в разных местах
      let completed = null;
      let total = null;

      // Ищем данные в projectStatus
      if (
        typeof projectStatus.completed === 'number' &&
        typeof projectStatus.total === 'number'
      ) {
        completed = projectStatus.completed;
        total = projectStatus.total;
      }

      if (
        typeof completed === 'number' &&
        typeof total === 'number' &&
        total > 0
      ) {
        progress = Math.round((completed / total) * 100);
        progress = Math.max(0, Math.min(100, progress));
      }
    }

    switch (project.status) {
      case 'completed':
      case 'ready':
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const newWindow = window.open(
                project.url,
                '_blank',
                'noopener,noreferrer',
              );
              if (newWindow) {
                newWindow.focus();
              }
            }}
            data-magic-open-button="true"
            className="h-auto px-2 py-0.5 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Open ⇧⏎
          </Button>
        );
      case 'generating':
      case 'loading':
        return 'Building';
      case 'error':
        // Treat error as still building - don't show error to user
        return 'Initializing';
      default:
        return project.status || 'Unknown';
    }
  };

  // Projects loading is handled by useMagicProjects hook
  // No need to trigger additional loading here to avoid duplicate API calls

  // Refresh projects when expanding
  const handleToggleExpanded = () => {
    if (!isExpanded && authStatus === 'authenticated' && !isLoadingProjects) {
      // Refresh projects when opening
      refetchProjects();
    }
    setIsExpanded(!isExpanded);
  };

  // Show the status bar only if:
  // 1. User has projects (userProjects already includes cache), OR
  // 2. There's active magic generation/tracking
  const shouldShow =
    (authStatus === 'authenticated' && userProjects.length > 0) || isActive;

  // Handle visibility with animation
  useEffect(() => {
    if (shouldShow) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
      setIsExpanded(false);
    }
  }, [shouldShow]);

  if (!shouldShow) {
    return null;
  }

  // Get recent projects for display - userProjects already includes cache
  const displayProjects = userProjects;

  // Handle Shift + Enter to open completed projects (only when text area is empty)
  useEffect(() => {
    let isHandled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only Shift + Enter to open completed projects
      const isShiftEnter =
        event.key === 'Enter' &&
        event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey;

      if (isShiftEnter && !isHandled) {
        // Check if text area is empty
        const textArea = document.querySelector(
          'textarea',
        ) as HTMLTextAreaElement;
        const isTextAreaEmpty = !textArea || textArea.value.trim() === '';

        // Only work when textarea is empty
        if (!isTextAreaEmpty) {
          return;
        }

        // Check if we clicked on a button with magic-open-button attribute to avoid double handling
        const target = event.target as HTMLElement;
        if (target?.closest('[data-magic-open-button]')) {
          return;
        }

        // Find the most recent completed project to open
        const completedProjects = displayProjects
          .filter((p) => p.status === 'completed' || p.status === 'ready')
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
        const completedProject = completedProjects[0];

        if (completedProject) {
          // Set handled flag immediately
          isHandled = true;
          event.preventDefault();
          event.stopPropagation();

          // Clear any existing timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          const newWindow = window.open(
            completedProject.url,
            '_blank',
            'noopener,noreferrer',
          );
          if (newWindow) {
            newWindow.focus();
          }

          // Reset flag after longer delay to prevent rapid double-presses
          timeoutId = setTimeout(() => {
            isHandled = false;
            timeoutId = null;
          }, 1000);
        }
      } else if (isShiftEnter && isHandled) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const hasCompletedProjects = displayProjects.some(
      (p) => p.status === 'completed' || p.status === 'ready',
    );

    if (hasCompletedProjects) {
      document.addEventListener('keydown', handleKeyDown, { capture: true });

      return () => {
        document.removeEventListener('keydown', handleKeyDown, {
          capture: true,
        });
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [displayProjects]);

  // Get the most recent project and check if it's within 10 minutes
  const mostRecentProject = useMemo(() => {
    if (displayProjects.length === 0) return null;

    const sorted = [...displayProjects].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const latest = sorted[0];
    const now = new Date();
    const createdAt = new Date(latest.created_at);
    const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    // Show recent project status if created within 5 minutes
    return diffInMinutes <= 5 ? latest : null;
  }, [displayProjects]);

  const recentProjects = useMemo(() => {
    return [...displayProjects]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 3);
  }, [displayProjects]);

  return (
    <div
      className={cn(
        'pointer-events-auto mx-4 transform rounded-t-lg border-zinc-300 border-t border-r border-l bg-muted transition-all duration-300 ease-out dark:border-zinc-700',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
        className,
      )}
      style={{
        transformOrigin: 'bottom',
      }}
    >
      {/* Main Status Bar */}
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        <div className="flex items-center gap-2">
          <span className="text-foreground text-xs">
            {mostRecentProject && !isExpanded
              ? getProjectActionText(mostRecentProject)
              : displayProjects.length === 0
                ? 'No magic components'
                : `${displayProjects.length} magic component${displayProjects.length === 1 ? '' : 's'}`}
          </span>
          {(isRefreshing ||
            isLoadingProjects ||
            (mostRecentProject &&
              (mostRecentProject.status === 'generating' ||
                mostRecentProject.status === 'loading'))) && (
            <Loader className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="-my-1 flex items-center gap-1">
          {/* Show project status when displaying recent project */}
          {mostRecentProject && !isExpanded && (
            <div className="text-muted-foreground text-xs">
              {getStatusText(mostRecentProject)}
            </div>
          )}



          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleExpanded}
            className="h-4 w-4 p-0 transition-transform duration-200"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Expanded Projects List */}
      <div
        className={cn(
          'overflow-hidden border-zinc-300 border-t dark:border-zinc-700',
          isExpanded ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0',
        )}
        style={{
          transition: isExpanded
            ? 'max-height 200ms ease-out, opacity 200ms ease-out'
            : 'max-height 300ms ease-out, opacity 300ms ease-out',
        }}
      >
        <div className="px-1 py-1">
          {/* Projects List */}
          {isLoadingProjects && recentProjects.length === 0 ? (
            <div className="space-y-1">
              <ProjectSkeleton />
              <ProjectSkeleton />
              <ProjectSkeleton />
            </div>
          ) : recentProjects.length > 0 ? (
            <div className="space-y-1">
              {recentProjects.map((project) => {
                // Get progress for this project if it's currently being tracked
                const isActiveProject =
                  currentProject && project.id === currentProject.id;
                let progress: number | undefined;

                if (
                  isActiveProject &&
                  projectStatus &&
                  typeof projectStatus.completed === 'number' &&
                  typeof projectStatus.total === 'number' &&
                  projectStatus.total > 0
                ) {
                  progress = Math.round(
                    (projectStatus.completed / projectStatus.total) * 100,
                  );
                  // Ensure progress is within valid range
                  progress = Math.max(0, Math.min(100, progress));
                }

                return (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    progress={progress}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-2 text-center text-muted-foreground text-xs">
              No projects found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
