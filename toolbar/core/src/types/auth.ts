export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  displayName?: string;
}

export interface UsageInfo {
  current: number;
  limit: number;
  remaining: number;
}

export enum AuthStatus {
  LOADING = 'loading',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  ERROR = 'error',
}

export interface AuthState {
  status: AuthStatus;
  user?: UserInfo;
  usage?: UsageInfo;
  tokens?: AuthTokens;
  error?: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  url: string;
  created_at: string;
  status?: 'ready' | 'loading' | 'generating' | 'completed' | 'error';
  is_mcp?: boolean;
}

export interface ProjectsListResponse {
  success: boolean;
  projects: ProjectInfo[];
  count: number;
}

export interface ProjectStatus {
  total: number;
  completed: number;
  errors: number;
  loading: number;
  isCompleted: boolean;
  hasErrors: boolean;
  isInProgress: boolean;
}

export interface ProjectStatusResponse {
  project: {
    id: string;
    url: string;
  };
  status: ProjectStatus;
}

export enum MagicProjectStatus {
  IDLE = 'idle',
  CREATING = 'creating',
  TRACKING = 'tracking',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface MagicProjectState {
  status: MagicProjectStatus;
  currentProject?: ProjectInfo;
  projectStatus?: ProjectStatus;
  project?: { id: string; url: string };
  progress?: number;
  error?: string;
}

export class ToolbarAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public details?: any,
  ) {
    super(message);
    this.name = 'ToolbarAPIError';
  }
}
