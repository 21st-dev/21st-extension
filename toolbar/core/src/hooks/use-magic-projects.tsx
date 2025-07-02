import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthService, ErrorHandler } from '@/services/auth-service';
import { useAuth } from './use-auth';
import { MagicProjectStatus, ToolbarAPIError } from '@/types/auth';
import type {
  MagicProjectState,
  ProjectInfo,
  ProjectStatus,
  ProjectStatusResponse,
} from '@/types/auth';

interface UseMagicProjectsReturn extends MagicProjectState {
  // Actions
  createProject: (
    message: string,
    currentUrl?: string,
    selectedElements?: HTMLElement[],
    selectedComponents?: any[],
  ) => Promise<void>;

  // State management
  clearProject: () => void;
  clearError: () => void;

  // Projects list
  userProjects: ProjectInfo[];
  isLoadingProjects: boolean;
  isRefreshing: boolean;
  refetchProjects: () => Promise<void>;
}

// Hook для отслеживания статуса одного проекта через TanStack Query
function useProjectStatus(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['projectStatus', projectId],
    queryFn: () => (projectId ? AuthService.getProjectStatus(projectId) : null),
    enabled: enabled && !!projectId,
    refetchInterval: 5000, // Простой polling каждые 5 секунд
    refetchIntervalInBackground: true,
    staleTime: 1000, // Считаем данные устаревшими через 1 секунду
    gcTime: 30000, // Держим в кеше 30 секунд после unmount
    retry: 3,
  });
}

export function useMagicProjects(): UseMagicProjectsReturn {
  const { status: authStatus } = useAuth();
  const queryClient = useQueryClient();

  const [magicState, setMagicState] = useState<MagicProjectState>({
    status: MagicProjectStatus.IDLE,
  });

  // Query for user projects - ONLY if no valid cache
  const {
    data: queryProjects,
    isLoading: isLoadingProjects,
    isFetching: isRefreshing,
    refetch: refetchProjects,
    error: projectsError,
  } = useQuery({
    queryKey: ['userProjects'],
    queryFn: () => AuthService.getUserProjects(),
    enabled:
      authStatus === 'authenticated' && !AuthService.getCachedProjectsData(), // ТОЛЬКО если нет кэша
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

  // Use cache first, then query data - cache is always most up-to-date
  const userProjects =
    AuthService.getCachedProjectsData() || queryProjects || [];

  // Update magic state helper
  const updateMagicState = useCallback(
    (updates: Partial<MagicProjectState>) => {
      setMagicState((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  // Clear project state
  const clearProject = useCallback(() => {
    // TanStack Query polling will stop automatically when enabled becomes false
    updateMagicState({
      status: MagicProjectStatus.IDLE,
      currentProject: undefined,
      projectStatus: undefined,
      progress: undefined,
      error: undefined,
    });
  }, [updateMagicState]);

  // Clear error
  const clearError = useCallback(() => {
    updateMagicState({ error: undefined });
  }, [updateMagicState]);

  // Show notification helper
  const showNotification = useCallback(
    (message: string, actionUrl?: string) => {
      if (Notification.permission === 'granted') {
        const notification = new Notification('21st.dev Magic', {
          body: message,
          icon: '/21st-icon.png',
        });

        if (actionUrl) {
          notification.onclick = () => window.open(actionUrl, '_blank');
        }
      }
    },
    [],
  );

  // Получение статуса проекта через TanStack Query (автоматический polling)
  const shouldTrackProject =
    magicState.status === MagicProjectStatus.TRACKING &&
    magicState.currentProject?.id;

  const projectStatusQuery = useProjectStatus(
    magicState.currentProject?.id || null,
    !!shouldTrackProject,
  );

  // Обработка обновлений статуса проекта
  useEffect(() => {
    if (!projectStatusQuery.data || !magicState.currentProject) return;

    const statusResponse = projectStatusQuery.data;

    // Calculate progress with proper validation
    let progress = 0;
    if (
      statusResponse.status.total > 0 &&
      typeof statusResponse.status.completed === 'number' &&
      typeof statusResponse.status.total === 'number'
    ) {
      progress = Math.round(
        (statusResponse.status.completed / statusResponse.status.total) * 100,
      );
      progress = Math.max(0, Math.min(100, progress));
    }

    // Update magic state with current progress
    updateMagicState({
      status: statusResponse.status.isCompleted
        ? MagicProjectStatus.COMPLETED
        : MagicProjectStatus.TRACKING,
      projectStatus: statusResponse.status,
      project: statusResponse.project,
      progress,
    });

    // Update the project in cache with current status
    const cachedProjects = AuthService.getCachedProjectsData();
    if (cachedProjects) {
      const updatedProjects = cachedProjects.map((p) =>
        p.id === statusResponse.project.id
          ? {
              ...p,
              status: statusResponse.status.isCompleted
                ? ('completed' as const)
                : statusResponse.status.isInProgress
                  ? ('generating' as const)
                  : statusResponse.status.hasErrors
                    ? ('error' as const)
                    : ('loading' as const),
            }
          : p,
      );
      AuthService.saveProjectsData(updatedProjects);
      queryClient.invalidateQueries({ queryKey: ['userProjects'] });
    }

    // Handle completion
    if (statusResponse.status.isCompleted) {
      showNotification(
        'Your Magic project is ready!',
        statusResponse.project?.url,
      );

      // Reset to idle after showing completion briefly
      setTimeout(() => {
        updateMagicState({
          status: MagicProjectStatus.IDLE,
          currentProject: undefined,
          projectStatus: undefined,
          project: undefined,
          progress: undefined,
        });
      }, 2000);
    }
  }, [
    projectStatusQuery.data,
    magicState.currentProject,
    updateMagicState,
    queryClient,
    showNotification,
  ]);

  // Resume polling for projects that are still generating after page reload
  // TODO: Переписать на TanStack Query когда будет время
  const hasRunPollingSetup = useRef(false);

  useEffect(() => {
    // Only run once when component mounts and has data
    if (
      hasRunPollingSetup.current ||
      authStatus !== 'authenticated' ||
      userProjects.length === 0
    ) {
      return;
    }

    hasRunPollingSetup.current = true;

    const inProgressProjects = userProjects.filter(
      (project) =>
        project.status === 'generating' || project.status === 'loading',
    );

    // Check if projects are recent (within 5 minutes) and still worth polling
    inProgressProjects.forEach((project) => {
      const now = new Date();
      const createdAt = new Date(project.created_at);
      const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      // Only resume polling if project is less than 5 minutes old
      if (diffInMinutes <= 5) {
        // Set up tracking state for the most recent project only
        const isCurrentProject =
          !magicState.currentProject &&
          inProgressProjects[0]?.id === project.id;

        if (isCurrentProject) {
          updateMagicState({
            status: MagicProjectStatus.TRACKING,
            currentProject: project,
            progress: 0,
          });
        }
      } else {
        // Project is too old (>5min), mark as completed

        // Update project status to completed in cache
        const cachedProjects = AuthService.getCachedProjectsData();
        if (cachedProjects) {
          const updatedProjects = cachedProjects.map((p) =>
            p.id === project.id ? { ...p, status: 'completed' as const } : p,
          );
          AuthService.saveProjectsData(updatedProjects);
          queryClient.invalidateQueries({ queryKey: ['userProjects'] });
        }
      }
    });
  }, [authStatus, userProjects.length]); // Minimal dependencies

  // Create project
  const createProject = useCallback(
    async (
      message: string,
      currentUrl?: string,
      selectedElements?: HTMLElement[],
      selectedComponents?: any[],
    ) => {
      // Check authentication
      if (authStatus !== 'authenticated') {
        return;
      }

      // Check if already creating
      if (
        magicState.status === MagicProjectStatus.CREATING ||
        magicState.status === MagicProjectStatus.TRACKING
      ) {
        return;
      }

      updateMagicState({
        status: MagicProjectStatus.CREATING,
        error: undefined,
        progress: undefined,
      });

      try {
        const project = await AuthService.createProject(
          message,
          currentUrl,
          selectedElements,
          selectedComponents,
        );

        // Immediately add project to cache as "generating" for instant display
        const newProjectInCache: ProjectInfo = {
          id: project.id,
          name: project.name,
          url: project.url,
          created_at: project.created_at,
          status: 'generating' as const,
          is_mcp: project.is_mcp,
        };

        const cachedProjects = AuthService.getCachedProjectsData() || [];
        // Avoid duplicates - check if project already exists
        const projectExists = cachedProjects.some((p) => p.id === project.id);
        const updatedProjects = projectExists
          ? cachedProjects.map((p) =>
              p.id === project.id ? newProjectInCache : p,
            )
          : [newProjectInCache, ...cachedProjects];

        AuthService.saveProjectsData(updatedProjects);

        // Force React Query to re-read from cache immediately
        queryClient.invalidateQueries({ queryKey: ['userProjects'] });

        // Set up tracking state - TanStack Query will handle the rest
        updateMagicState({
          status: MagicProjectStatus.TRACKING,
          currentProject: project,
          progress: 0,
        });
      } catch (error) {
        console.error('Project creation failed:', error);

        // Reset to idle state instead of showing error
        updateMagicState({
          status: MagicProjectStatus.IDLE,
        });

        if (error instanceof ToolbarAPIError) {
          ErrorHandler.handle(error);
        }
      }
    },
    [authStatus, magicState.status, updateMagicState, queryClient],
  );

  return {
    ...magicState,
    createProject,
    clearProject,
    clearError,
    userProjects,
    isLoadingProjects,
    isRefreshing,
    refetchProjects: async () => {
      await refetchProjects();
    },
  };
}

// useMagicProjectStatus was removed to prevent duplicate API calls
// Use useMagicProjects directly and destructure what you need:
// const { status, progress, error } = useMagicProjects();
// const isActive = status !== 'idle';
