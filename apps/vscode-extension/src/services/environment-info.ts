import { compareVersions as compareVersionsUtil } from 'src/utils/lock-file-parsers/version-comparator';
import * as vscode from 'vscode';
import { AnalyticsService, EventName } from './analytics-service';
import { RegistryService } from './registry-service';
import { WorkspaceService } from './workspace-service';

export class EnvironmentInfo {
  private static instance: EnvironmentInfo;
  private toolbarInstalled = false;
  private toolbarInstalledVersion: string | null = null;
  private latestToolbarVersion: string | null = null;
  private latestExtensionVersion: string | null = null;
  private workspaceLoaded = false;
  private toolbarInstallations: Array<{ version: string; path: string }> = [];
  private webAppWorkspace = false;
  private readonly workspaceService = WorkspaceService.getInstance();
  private readonly registryService = RegistryService.getInstance();
  private analyticsService: AnalyticsService = AnalyticsService.getInstance();

  private constructor() {}

  public static getInstance() {
    if (!EnvironmentInfo.instance) {
      EnvironmentInfo.instance = new EnvironmentInfo();
    }
    return EnvironmentInfo.instance;
  }

  public async initialize() {
    try {
      // Set up workspace change listeners
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.refreshState()
          .then(() => {
            if (this.webAppWorkspace) {
              this.analyticsService.trackEvent(
                EventName.OPENED_WEB_APP_WORKSPACE,
              );
            }
          })
          .catch((error) => {
            console.error('Error refreshing environment state:', error);
          });
      });

      await this.refreshState();
      // Output all collected information to the console logs
      console.log('[EnvironmentInfo] Initialized:', {
        toolbarInstalled: this.toolbarInstalled,
        toolbarInstalledVersion: this.toolbarInstalledVersion,
        latestToolbarVersion: this.latestToolbarVersion,
        latestExtensionVersion: this.latestExtensionVersion,
        webAppWorkspace: this.webAppWorkspace,
      });

      if (this.webAppWorkspace) {
        this.analyticsService.trackEvent(EventName.OPENED_WEB_APP_WORKSPACE);
      }
    } catch (error) {
      console.error('Error initializing EnvironmentInfo:', error);
    }
  }

  private async refreshState() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    this.workspaceLoaded = !!workspaceFolders;
    if (!this.workspaceLoaded) {
      this.toolbarInstalled = false;
      this.toolbarInstalledVersion = null;
      this.toolbarInstallations = [];
      this.webAppWorkspace = false;
      console.log('[EnvironmentInfo] No workspace loaded');
      return;
    }

    console.log('[EnvironmentInfo] Refreshing state for workspace...');
    const [toolbarInstallations, isWebApp, latestToolbar, latestExtension] =
      await Promise.all([
        this.workspaceService.getToolbarInstallations(),
        this.workspaceService.isWebAppWorkspace(),
        this.registryService.getLatestToolbarVersion(),
        this.registryService.getLatestExtensionVersion(),
      ]);

    console.log('[EnvironmentInfo] Received data:', {
      toolbarInstallations,
      isWebApp,
      latestToolbar,
      latestExtension,
    });

    this.toolbarInstallations = toolbarInstallations;
    this.toolbarInstalled = this.toolbarInstallations.length > 0;
    this.toolbarInstalledVersion = this.getOldestToolbarVersion(
      this.toolbarInstallations,
    );
    this.webAppWorkspace = isWebApp;
    this.latestToolbarVersion = latestToolbar;
    this.latestExtensionVersion = latestExtension;

    console.log('[EnvironmentInfo] Final state:', {
      toolbarInstalled: this.toolbarInstalled,
      toolbarInstalledVersion: this.toolbarInstalledVersion,
      latestToolbarVersion: this.latestToolbarVersion,
      webAppWorkspace: this.webAppWorkspace,
    });
  }

  private getOldestToolbarVersion(
    installations: Array<{ version: string; path: string }>,
  ): string | null {
    if (installations.length === 0) {
      return null;
    }

    return installations.reduce((oldest, current) => {
      if (!oldest?.version) {
        return current;
      }
      return this.compareVersions(current.version, oldest.version) < 0
        ? current
        : oldest;
    }).version;
  }

  public getExtensionVersion(): string {
    try {
      const extension = vscode.extensions.getExtension(
        '21st-dev.21st-extension',
      );
      if (!extension) {
        console.warn('21st.dev Extension not found');
        return 'unknown';
      }

      const version = extension.packageJSON?.version;
      if (!version) {
        console.warn('Extension version not found in package.json');
        return 'unknown';
      }

      return version;
    } catch (error) {
      console.error('Error getting extension version:', error);
      return 'unknown';
    }
  }

  public getToolbarInstalled(): boolean {
    return this.toolbarInstalled;
  }

  public getToolbarInstalledVersion(): string | null {
    return this.toolbarInstalledVersion;
  }

  public getLatestAvailableToolbarVersion(): string | null {
    return this.latestToolbarVersion;
  }

  public getWorkspaceLoaded(): boolean {
    return this.workspaceLoaded;
  }

  public getToolbarInstallations(): Array<{ version: string; path: string }> {
    return [...this.toolbarInstallations];
  }

  public getLatestAvailableExtensionVersion(): string | null {
    return this.latestExtensionVersion;
  }

  public get isWebAppWorkspace(): boolean {
    return this.webAppWorkspace;
  }

  private compareVersions(
    version1: string | undefined | null,
    version2: string | undefined | null,
  ): number {
    try {
      // Handle undefined, null, or empty strings
      if (!version1 || !version2) {
        return 0;
      }

      if (version1 === 'dev' || version2 === 'dev') {
        return 0;
      }

      return compareVersionsUtil(version1, version2);
    } catch (error) {
      console.error('Error comparing versions:', error);
      // Return 0 (equal) as a safe default
      return 0;
    }
  }
}
