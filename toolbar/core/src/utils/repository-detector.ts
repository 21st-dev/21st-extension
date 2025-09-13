/**
 * Utility functions for detecting repository information from the current context
 */

interface RepositoryInfo {
  repository: string;
  ref: string;
}

/**
 * Try to detect repository information from various sources
 */
export function detectRepository(): RepositoryInfo {
  // Try to get from URL patterns (GitHub, GitLab, etc.)
  const repoFromUrl = detectRepositoryFromUrl();
  if (repoFromUrl) {
    return repoFromUrl;
  }

  // Try to get from localStorage or other sources
  const repoFromStorage = detectRepositoryFromStorage();
  if (repoFromStorage) {
    return repoFromStorage;
  }

  // Default fallback - user will need to configure this
  return {
    repository: 'https://github.com/user/repo', // Placeholder
    ref: 'main',
  };
}

/**
 * Detect repository from current URL patterns
 */
function detectRepositoryFromUrl(): RepositoryInfo | null {
  const currentUrl = window.location.href;

  // GitHub Pages pattern: username.github.io/repo-name
  const githubPagesMatch = currentUrl.match(
    /https?:\/\/([^.]+)\.github\.io\/([^/]+)/,
  );
  if (githubPagesMatch) {
    const [, username, repo] = githubPagesMatch;
    return {
      repository: `https://github.com/${username}/${repo}`,
      ref: 'main',
    };
  }

  // Vercel deployment pattern: app-name-hash.vercel.app
  const vercelMatch = currentUrl.match(
    /https?:\/\/([^-]+)(-[^.]+)?\.vercel\.app/,
  );
  if (vercelMatch) {
    const [, appName] = vercelMatch;
    // This is a guess - user might need to configure the actual repo
    return {
      repository: `https://github.com/user/${appName}`, // Placeholder
      ref: 'main',
    };
  }

  // Netlify deployment pattern: app-name.netlify.app
  const netlifyMatch = currentUrl.match(/https?:\/\/([^.]+)\.netlify\.app/);
  if (netlifyMatch) {
    const [, appName] = netlifyMatch;
    return {
      repository: `https://github.com/user/${appName}`, // Placeholder
      ref: 'main',
    };
  }

  // Local development patterns
  if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
    // Try to detect from common dev server ports and project names
    const localhostMatch = currentUrl.match(/https?:\/\/localhost:(\d+)/);
    if (localhostMatch) {
      // Common development setup - try to infer from page title or other indicators
      const projectName =
        document.title.toLowerCase().replace(/\s+/g, '-') || 'my-project';
      return {
        repository: `https://github.com/user/${projectName}`, // Placeholder
        ref: 'main',
      };
    }
  }

  return null;
}

/**
 * Try to detect repository from localStorage or other storage
 */
function detectRepositoryFromStorage(): RepositoryInfo | null {
  try {
    // Check if there's any repository information stored
    const storedRepo = localStorage.getItem('cursor_bg_repository');
    if (storedRepo) {
      const parsed = JSON.parse(storedRepo);
      if (parsed.repository && parsed.ref) {
        return parsed;
      }
    }

    // Try to get from VSCode-specific storage (if available)
    const vscodeWorkspace = localStorage.getItem('vscode_workspace');
    if (vscodeWorkspace) {
      const workspace = JSON.parse(vscodeWorkspace);
      if (workspace.repository) {
        return {
          repository: workspace.repository,
          ref: workspace.ref || 'main',
        };
      }
    }
  } catch (error) {
    console.warn('Failed to detect repository from storage:', error);
  }

  return null;
}

/**
 * Save repository information for future use
 */
export function saveRepositoryInfo(repo: RepositoryInfo): void {
  try {
    localStorage.setItem('cursor_bg_repository', JSON.stringify(repo));
  } catch (error) {
    console.warn('Failed to save repository info:', error);
  }
}

/**
 * Clear saved repository information
 */
export function clearRepositoryInfo(): void {
  try {
    localStorage.removeItem('cursor_bg_repository');
  } catch (error) {
    console.warn('Failed to clear repository info:', error);
  }
}
