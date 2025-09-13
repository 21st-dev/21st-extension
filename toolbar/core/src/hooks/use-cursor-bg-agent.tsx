import { useState, useEffect, useCallback } from 'preact/hooks';

interface CursorBgAgentState {
  apiKey: string | null;
  isConfigured: boolean;
  selectedRepository?: string;
}

interface BackgroundAgentContext {
  repository?: string;
  ref?: string;
  model?: string;
  attachments?: any[];
  target?: {
    branchName?: string;
    createPr?: boolean;
  };
  webhook?: {
    url: string;
    secret: string;
  };
}

interface BackgroundAgent {
  id: string;
  name: string;
  status: 'CREATING' | 'RUNNING' | 'FINISHED' | 'ERROR' | 'EXPIRED';
  source: {
    repository: string;
    ref: string;
  };
  target: {
    url: string;
    branchName?: string;
    prUrl?: string;
  };
  createdAt: string;
  summary?: string;
}

interface GitHubRepository {
  owner: string;
  name: string;
  repository: string;
}

interface CursorBgAgentHook extends CursorBgAgentState {
  setApiKey: (apiKey: string) => void;
  clearApiKey: () => void;
  sendToBackgroundAgent: (
    prompt: string,
    context?: BackgroundAgentContext,
  ) => Promise<BackgroundAgent>;
  getAgents: () => Promise<BackgroundAgent[]>;
  getAgentStatus: (agentId: string) => Promise<BackgroundAgent>;
  getAgentConversation: (agentId: string) => Promise<any>;
  getRepositories: () => Promise<GitHubRepository[]>;
  getSelectedRepository: () => string | null;
}

const CURSOR_API_KEY_STORAGE = 'cursor_bg_agent_api_key';
const CURSOR_API_BASE_URL = 'http://localhost:3001/api/cursor'; // Proxy through backend

export function useCursorBgAgent(): CursorBgAgentHook {
  // Initialize state immediately from localStorage to prevent race conditions
  const [state, setState] = useState<CursorBgAgentState>(() => {
    try {
      const storedApiKey = localStorage.getItem(CURSOR_API_KEY_STORAGE);
      if (storedApiKey?.trim()) {
        return {
          apiKey: storedApiKey,
          isConfigured: true,
        };
      }
    } catch (error) {
      console.error('Failed to load Cursor API key during init:', error);
    }

    return {
      apiKey: null,
      isConfigured: false,
    };
  });

  // Request notification permissions once when hook initializes
  useEffect(() => {
    if (state.isConfigured && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('✅ Notification permission granted');
        }
      });
    }
  }, [state.isConfigured]);

  // Listen for storage changes to sync across components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CURSOR_API_KEY_STORAGE) {
        const newValue = e.newValue;
        if (newValue?.trim()) {
          setState({
            apiKey: newValue,
            isConfigured: true,
          });
        } else {
          setState({
            apiKey: null,
            isConfigured: false,
          });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setApiKey = useCallback((apiKey: string) => {
    try {
      const trimmedKey = apiKey.trim();
      if (trimmedKey) {
        localStorage.setItem(CURSOR_API_KEY_STORAGE, trimmedKey);
        setState({
          apiKey: trimmedKey,
          isConfigured: true,
        });
      }
    } catch (error) {
      console.error('Failed to save Cursor API key:', error);
    }
  }, []);

  const clearApiKey = useCallback(() => {
    try {
      localStorage.removeItem(CURSOR_API_KEY_STORAGE);
      setState({
        apiKey: null,
        isConfigured: false,
      });
    } catch (error) {
      console.error('Failed to clear Cursor API key:', error);
    }
  }, []);

  const sendToBackgroundAgent = useCallback(
    async (
      prompt: string,
      context?: BackgroundAgentContext,
    ): Promise<BackgroundAgent> => {
      if (!state.apiKey) {
        throw new Error('Cursor API key is not configured');
      }

      try {
        // Build request body according to Cursor API documentation
        // Fixed structure based on working example
        const requestBody = {
          prompt: {
            text: prompt,
          },
          repository: context?.repository || 'https://github.com/user/repo',
          // Optional fields
          ...(context?.model && { model: context.model }),
          ...(context?.ref && { ref: context.ref }),
          ...(context?.target && { target: context.target }),
          ...(context?.webhook && { webhook: context.webhook }),
        };

        console.log('🚀 Creating Cursor Background Agent...'); // Debug log

        const response = await fetch(`${CURSOR_API_BASE_URL}/agents`, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.apiKey}`,
            'User-Agent': '21st-extension-toolbar/1.0',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Cursor API request failed: ${response.status} ${errorText}`,
          );
        }

        const result = await response.json();
        console.log('Background agent created successfully:', result);

        return result; // Return the agent info (id, name, status, etc.)
      } catch (error) {
        console.error('Failed to send to Cursor Background Agent:', error);

        // Add more specific error handling
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error(
            'Network error: Unable to connect to Cursor API. Check your internet connection and try again.',
          );
        }

        throw error;
      }
    },
    [state.apiKey],
  );

  // Get list of background agents
  const getAgents = useCallback(async (): Promise<BackgroundAgent[]> => {
    if (!state.apiKey) {
      throw new Error('Cursor API key is not configured');
    }

    try {
      const response = await fetch(`${CURSOR_API_BASE_URL}/agents`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${state.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to get agents: ${response.status} ${errorText}`,
        );
      }

      const result = await response.json();
      return result.agents || [];
    } catch (error) {
      console.error('Failed to get background agents:', error);
      throw error;
    }
  }, [state.apiKey]);

  // Get status of specific agent
  const getAgentStatus = useCallback(
    async (agentId: string): Promise<BackgroundAgent> => {
      if (!state.apiKey) {
        throw new Error('Cursor API key is not configured');
      }

      try {
        const response = await fetch(
          `${CURSOR_API_BASE_URL}/agents/${agentId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${state.apiKey}`,
            },
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to get agent status: ${response.status} ${errorText}`,
          );
        }

        return await response.json();
      } catch (error) {
        console.error('Failed to get agent status:', error);
        throw error;
      }
    },
    [state.apiKey],
  );

  // Get agent conversation
  const getAgentConversation = useCallback(
    async (agentId: string) => {
      if (!state.apiKey) {
        throw new Error('Cursor API key is not configured');
      }

      try {
        const response = await fetch(
          `${CURSOR_API_BASE_URL}/agents/${agentId}/conversation`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${state.apiKey}`,
            },
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to get agent conversation: ${response.status} ${errorText}`,
          );
        }

        return await response.json();
      } catch (error) {
        console.error('Failed to get agent conversation:', error);
        throw error;
      }
    },
    [state.apiKey],
  );

  // Get list of available GitHub repositories
  const getRepositories = useCallback(async (): Promise<GitHubRepository[]> => {
    if (!state.apiKey) {
      throw new Error('Cursor API key is not configured');
    }

    try {
      const response = await fetch(`${CURSOR_API_BASE_URL}/repositories`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${state.apiKey}`,
        },
      });

      // Handle 204 No Content (empty repositories list)
      if (response.status === 204) {
        console.log('No repositories available (204 No Content)');
        return [];
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to get repositories: ${response.status} ${errorText}`,
        );
      }

      const result = await response.json();
      return result.repositories || [];
    } catch (error) {
      console.error('Failed to get repositories:', error);
      throw error;
    }
  }, [state.apiKey]);

  // Get currently selected repository
  const getSelectedRepository = useCallback(() => {
    try {
      return localStorage.getItem('cursor_selected_repository');
    } catch (error) {
      console.error('Failed to get selected repository:', error);
      return null;
    }
  }, []);

  return {
    ...state,
    setApiKey,
    clearApiKey,
    sendToBackgroundAgent,
    getAgents,
    getAgentStatus,
    getAgentConversation,
    getRepositories,
    getSelectedRepository,
  };
}
