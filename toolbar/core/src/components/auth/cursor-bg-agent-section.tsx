import { useCursorBgAgent } from '@/hooks/use-cursor-bg-agent';
import { cn } from '@/utils';
import { SelectNative } from '@/components/ui/select';
import { useState, useCallback, useEffect } from 'preact/hooks';

interface CursorBgAgentSectionProps {
  className?: string;
}

export function CursorBgAgentSection({ className }: CursorBgAgentSectionProps) {
  const { apiKey, setApiKey, getRepositories, isConfigured } =
    useCursorBgAgent();
  const [inputValue, setInputValue] = useState(apiKey || '');
  const [repositories, setRepositories] = useState<
    Array<{ owner: string; name: string; repository: string }>
  >([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [manualRepo, setManualRepo] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [reposLoaded, setReposLoaded] = useState(false); // Flag to prevent duplicate loads

  // Sync input value with hook state when API key changes
  useEffect(() => {
    setInputValue(apiKey || '');
  }, [apiKey]);

  // Load repositories when API key is configured (only once per session)
  useEffect(() => {
    if (isConfigured && apiKey && !reposLoaded && !loadingRepos) {
      console.log('🔄 Loading repositories for the first time...');
      setLoadingRepos(true);
      getRepositories()
        .then((repos) => {
          console.log('✅ Repositories loaded:', repos.length);
          setRepositories(repos);
          setReposLoaded(true); // Mark as loaded

          // Auto-select first repo if none selected (only once)
          const storedRepo = localStorage.getItem('cursor_selected_repository');
          if (repos.length > 0 && !storedRepo) {
            setSelectedRepo(repos[0].repository);
            localStorage.setItem(
              'cursor_selected_repository',
              repos[0].repository,
            );
            setShowManualInput(false);
          } else if (repos.length === 0) {
            // No repositories available, show manual input
            setShowManualInput(true);
            const storedManual = localStorage.getItem(
              'cursor_manual_repository',
            );
            if (storedManual) {
              setManualRepo(storedManual);
              setSelectedRepo(storedManual);
            }
          }
        })
        .catch((error) => {
          console.error('Failed to load repositories:', error);
          setRepositories([]);
          setShowManualInput(true);
          setReposLoaded(true); // Still mark as loaded to prevent retries
        })
        .finally(() => {
          setLoadingRepos(false);
        });
    } else if (!isConfigured) {
      // Reset when not configured
      setRepositories([]);
      setSelectedRepo('');
      setShowManualInput(false);
      setReposLoaded(false);
    }
  }, [isConfigured, apiKey, getRepositories, reposLoaded, loadingRepos]);

  // Load selected repo and manual repo from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('cursor_selected_repository');
    const storedManual = localStorage.getItem('cursor_manual_repository');

    if (stored) {
      setSelectedRepo(stored);
    }

    if (storedManual) {
      setManualRepo(storedManual);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: Event) => {
      // Stop event propagation to prevent toolbar from intercepting
      e.stopPropagation();

      const value = (e.target as HTMLInputElement).value;
      setInputValue(value);

      // Auto-save on input change
      if (value.trim()) {
        setApiKey(value.trim());
      }
    },
    [setApiKey],
  );

  const handleInputClick = useCallback((e: Event) => {
    e.stopPropagation();
  }, []);

  const handleInputFocus = useCallback((e: Event) => {
    e.stopPropagation();
  }, []);

  const handleInputKeyDown = useCallback((e: KeyboardEvent) => {
    e.stopPropagation();

    // Allow normal input behavior but prevent toolbar shortcuts
    if (e.key === 'Escape') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  const openCursorSettings = useCallback(() => {
    window.open('https://cursor.com/', '_blank');
  }, []);

  const handleRepoChange = useCallback((e: Event) => {
    e.stopPropagation();
    const value = (e.target as HTMLSelectElement).value;
    setSelectedRepo(value);
    localStorage.setItem('cursor_selected_repository', value);
  }, []);

  const handleManualRepoChange = useCallback((e: Event) => {
    e.stopPropagation();
    const value = (e.target as HTMLInputElement).value;
    setManualRepo(value);

    // Auto-save manual repo URL
    if (value.trim() && value.includes('github.com')) {
      setSelectedRepo(value.trim());
      localStorage.setItem('cursor_selected_repository', value.trim());
      localStorage.setItem('cursor_manual_repository', value.trim());
    }
  }, []);

  const handleManualRepoClick = useCallback((e: Event) => {
    e.stopPropagation();
  }, []);

  const handleManualRepoFocus = useCallback((e: Event) => {
    e.stopPropagation();
  }, []);

  const handleManualRepoKeyDown = useCallback((e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  return (
    <div className={cn('space-y-3', className)}>
      {/* API Key Configuration */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <span className="font-medium text-foreground text-sm">
            Cursor Background Agent
          </span>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Get API key from{' '}
            <button
              type="button"
              onClick={openCursorSettings}
              className="border-none bg-transparent p-0 text-blue-600 underline hover:text-blue-700"
            >
              cursor.com
            </button>{' '}
            → Settings → Integrations
          </p>
        </div>
        <div className="w-48 flex-shrink-0">
          <input
            type="password"
            placeholder="Paste API key here"
            value={inputValue}
            onChange={handleInputChange}
            onClick={handleInputClick}
            onFocus={handleInputFocus}
            onKeyDown={handleInputKeyDown}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            autoComplete="off"
            tabIndex={0}
            data-cursor-api-input="true"
          />
        </div>
      </div>

      {/* Repository Selection (only shown when API key is configured) */}
      {isConfigured && (
        <div className="flex items-center justify-between gap-4 border-border border-t pt-2">
          <div className="flex-1">
            <span className="font-medium text-foreground text-sm">
              Target Repository
            </span>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {loadingRepos
                ? 'Loading repositories...'
                : repositories.length > 0
                  ? 'Choose which repository to create background tasks in'
                  : 'Enter GitHub repository URL (rate limited: 1/min, 30/hour)'}
            </p>
          </div>
          <div className="w-48 flex-shrink-0">
            {loadingRepos ? (
              <div className="w-full rounded-md border border-input bg-background px-3 py-2 text-muted-foreground text-sm">
                Loading...
              </div>
            ) : repositories.length > 0 ? (
              <SelectNative
                value={selectedRepo}
                onChange={handleRepoChange}
                className="text-sm"
                data-cursor-api-input="true"
              >
                {repositories.map((repo) => (
                  <option key={repo.repository} value={repo.repository}>
                    {repo.owner}/{repo.name}
                  </option>
                ))}
              </SelectNative>
            ) : (
              /* Manual repository input when no repos available */
              <input
                type="text"
                placeholder="https://github.com/user/repo"
                value={manualRepo}
                onChange={handleManualRepoChange}
                onClick={handleManualRepoClick}
                onFocus={handleManualRepoFocus}
                onKeyDown={handleManualRepoKeyDown}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                autoComplete="off"
                data-cursor-api-input="true"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
