import { EventName as EventNameContract } from '@21st-extension/extension-toolbar-srpc-contract';
import { createHash } from 'node:crypto';
import { PostHog } from 'posthog-node';
import * as vscode from 'vscode';
import { EnvironmentInfo } from './environment-info';
import { VScodeContext } from './vscode-context';

export { EventNameContract as EventName };

// Note: The API key should be your actual PostHog API key
const SALT = '21st-extension';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private context = VScodeContext.getInstance();

  private client: PostHog | null = null;

  private constructor() {
    // private constructor to enforce singleton pattern
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public initialize(): void {
    const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
    const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://eu.i.posthog.com';

    if (POSTHOG_API_KEY) {
      console.log('[AnalyticsService] Initializing client');
      this.client = new PostHog(POSTHOG_API_KEY, {
        host: POSTHOG_HOST,
        disableGeoip: true,
      });
    } else {
      console.log('[AnalyticsService] No API key found');
    }
  }

  private hashId(id: string): string {
    return createHash('sha256')
      .update(id + SALT)
      .digest('hex');
  }

  private async getVersions() {
    const environmentInfo = EnvironmentInfo.getInstance();
    return {
      extensionVersion: environmentInfo.getExtensionVersion(),
      toolbarVersion: environmentInfo.getToolbarInstalledVersion() || 'unknown',
    };
  }

  private isAnalyticsEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('21st-extension');
    return config.get<boolean>('telemetry.enabled', true);
  }

  public async trackEvent(
    eventName: EventNameContract,
    properties?: Record<string, any>,
  ): Promise<void> {
    if (!this.isAnalyticsEnabled()) {
      return;
    }

    console.log('[Analytics] Tracking event:', eventName);

    try {
      const machineId = vscode.env.machineId;
      const { extensionVersion, toolbarVersion } = await this.getVersions();

      const eventData = {
        distinctId: this.hashId(machineId),
        event: eventName,
        properties: {
          ...properties,
          vscodeVersion: vscode.version,
          appName: vscode.env.appName,
          extensionVersion,
          toolbarVersion,
          platform: process.platform,
        },
      };

      if (this.client) {
        await this.client.capture(eventData);
      }

      // Enhanced debug logging
      if (this.context.isDevelopmentMode()) {
        console.log(
          '[Analytics] Event data:',
          JSON.stringify(eventData, null, 2),
        );
      }
    } catch (error) {
      if (this.context.isDevelopmentMode()) {
        console.error('[Analytics] Error sending event to PostHog:', error);
      }
    }
  }

  public shutdown(): Promise<void> {
    return this.client?.shutdown() ?? Promise.resolve();
  }

  public trackTelemetryStateChange(enabled: boolean): void {
    if (!this.client) {
      return;
    }
    this.performTrackTelemetryStateChange(enabled);
  }

  private async performTrackTelemetryStateChange(
    enabled: boolean,
  ): Promise<void> {
    try {
      const machineId = vscode.env.machineId;
      const eventName = enabled ? 'telemetry_enabled' : 'telemetry_disabled';
      const { extensionVersion, toolbarVersion } = await this.getVersions();

      const eventData = {
        distinctId: this.hashId(machineId),
        event: eventName,
        properties: {
          vscodeVersion: vscode.version,
          appName: vscode.env.appName,
          extensionVersion,
          toolbarVersion,
          platform: process.platform,
        },
      };

      await this.client?.capture(eventData);

      if (this.context.isDevelopmentMode()) {
        console.log(
          '[Analytics] Telemetry state change event data:',
          JSON.stringify(eventData, null, 2),
        );
      }
    } catch (error) {
      if (this.context.isDevelopmentMode()) {
        console.error(
          '[Analytics] Error tracking telemetry state change:',
          error,
        );
      }
    }
  }
}
