import { createBridgeContract } from '@21st-extension/srpc';
import { z } from 'zod';

// The toolbar needs to implement a discovery-mechanism to check if the extension is running and find the correct port
// The extension also needs to implement a discovery-mechanism to find the correct toolbar.
export const DEFAULT_PORT = 5746; // This is the default port for the extension's RPC and MCP servers; if occupied, the extension will take the next available port (5747, 5748, etc., up to 5756
export const PING_ENDPOINT = '/ping/stagewise'; // Will be used by the toolbar to check if the extension is running and find the correct port
export const PING_RESPONSE = '21st-extension'; // The response to the ping request

// EventName enum for analytics tracking - matches the enum in analytics-service.ts
export enum EventName {
  EXTENSION_ACTIVATED = 'extension_activated',
  ACTIVATION_ERROR = 'activation_error',

  OPENED_WEB_APP_WORKSPACE = 'opened_web_app_workspace',

  GETTING_STARTED_PANEL_SHOWN = 'getting_started_panel_shown',
  GETTING_STARTED_PANEL_MANUAL_SHOW = 'getting_started_panel_manual_show',
  INTERACTED_WITH_GETTING_STARTED_PANEL = 'interacted_with_getting_started_panel',
  DISMISSED_GETTING_STARTED_PANEL = 'dismissed_getting_started_panel',
  CLICKED_SETUP_TOOLBAR_IN_GETTING_STARTED_PANEL = 'clicked_setup_toolbar_in_getting_started_panel',
  CLICKED_OPEN_DOCS_IN_GETTING_STARTED_PANEL = 'clicked_open_docs_in_getting_started_panel',

  POST_SETUP_FEEDBACK = 'post_setup_feedback',

  TOOLBAR_AUTO_SETUP_STARTED = 'toolbar_auto_setup_started',

  TOOLBAR_CONNECTED = 'toolbar_connected',

  AGENT_PROMPT_TRIGGERED = 'agent_prompt_triggered',
  OPEN_EXTERNAL_URL = 'open_external_url',

  SHOW_TOOLBAR_UPDATE_NOTIFICATION = 'show_toolbar_update_notification',
  TOOLBAR_UPDATE_NOTIFICATION_AUTO_UPDATE = 'toolbar_update_notification_auto_update',
  TOOLBAR_UPDATE_NOTIFICATION_IGNORED = 'toolbar_update_notification_ignored',
  TOOLBAR_UPDATE_NOTIFICATION_DISMISSED = 'toolbar_update_notification_dismissed',

  SHOW_TOOLBAR_INTEGRATION_NOTIFICATION = 'show_toolbar_integration_notification',
  TOOLBAR_INTEGRATION_NOTIFICATION_IGNORE = 'toolbar_integration_notification_ignore',
  TOOLBAR_INTEGRATION_NOTIFICATION_DISMISSED = 'toolbar_integration_notification_dismissed',

  TOOLBAR_AUTO_UPDATE_PROMPT_SENT = 'toolbar_auto_update_prompt_sent',

  MAGIC_CHAT_TRIGGERED = 'magic_chat_triggered',
  COMPONENTS_SEARCH_TRIGGERED = 'components_search_triggered',
  COMPONENT_SELECTED = 'component_selected',
  AGENT_PROMPT_TRIGGERED_WITH_COMPONENT = 'agent_prompt_triggered_with_component',
}

// Create Zod schema from enum values
export const EventNameSchema = z.enum(
  Object.values(EventName) as [string, ...string[]],
);

export const contract = createBridgeContract({
  server: {
    getSessionInfo: {
      request: z.object({}),
      response: z.object({
        sessionId: z.string().optional(),
        appName: z
          .string()
          .describe('The name of the application, e.g. "VS Code" or "Cursor"'),
        displayName: z
          .string()
          .describe('Human-readable window identifier for UI display'),
        port: z
          .number()
          .describe('Port number this VS Code instance is running on'),
      }),
      update: z.object({}),
    },
    triggerAgentPrompt: {
      request: z.object({
        sessionId: z.string().optional(),
        prompt: z.string(),
        model: z
          .string()
          .optional()
          .describe('The model to use for the agent prompt'),
        files: z
          .array(z.string())
          .optional()
          .describe('Link project files to the agent prompt'),
        mode: z
          .enum(['agent', 'ask', 'manual'])
          .optional()
          .describe('The mode to use for the agent prompt'),
        images: z
          .array(z.string())
          .optional()
          .describe('Upload files like images, videos, etc.'),
      }),
      response: z.object({
        sessionId: z.string().optional(),
        result: z.object({
          success: z.boolean(),
          error: z.string().optional(),
          errorCode: z.enum(['session_mismatch']).optional(),
          output: z.string().optional(),
        }),
      }),
      update: z.object({
        sessionId: z.string().optional(),
        updateText: z.string(),
      }),
    },
    openExternal: {
      request: z.object({
        url: z.string().url().describe('The URL to open externally'),
        sessionId: z.string().optional().describe('Session ID for validation'),
      }),
      response: z.object({
        sessionId: z.string().optional(),
        result: z.object({
          success: z.boolean(),
          error: z.string().optional(),
          errorCode: z
            .enum(['session_mismatch', 'invalid_url', 'open_failed'])
            .optional(),
        }),
      }),
      update: z.object({}),
    },
    trackEvent: {
      request: z.object({
        sessionId: z.string().optional().describe('Session ID for validation'),
        eventName: EventNameSchema.describe(
          'The analytics event name to track',
        ),
        properties: z
          .record(z.any())
          .optional()
          .describe('Additional properties to include with the event'),
      }),
      response: z.object({
        sessionId: z.string().optional(),
        result: z.object({
          success: z.boolean(),
          error: z.string().optional(),
          errorCode: z.enum(['session_mismatch']).optional(),
        }),
      }),
      update: z.object({}),
    },
  },
});

export type PromptRequest = z.infer<
  typeof contract.server.triggerAgentPrompt.request
>;

export type VSCodeContext = z.infer<
  typeof contract.server.getSessionInfo.response
>;

export type OpenExternalRequest = z.infer<
  typeof contract.server.openExternal.request
>;

export type OpenExternalResponse = z.infer<
  typeof contract.server.openExternal.response
>;

export type TrackEventRequest = z.infer<
  typeof contract.server.trackEvent.request
>;

export type TrackEventResponse = z.infer<
  typeof contract.server.trackEvent.response
>;

export type EventNameType = z.infer<typeof EventNameSchema>;
