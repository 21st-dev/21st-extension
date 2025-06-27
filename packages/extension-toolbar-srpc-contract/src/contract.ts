import { createBridgeContract } from '@21st-extension/srpc';
import { z } from 'zod';

// The toolbar needs to implement a discovery-mechanism to check if the extension is running and find the correct port
// The extension also needs to implement a discovery-mechanism to find the correct toolbar.
export const DEFAULT_PORT = 5746; // This is the default port for the extension's RPC and MCP servers; if occupied, the extension will take the next available port (5747, 5748, etc., up to 5756
export const PING_ENDPOINT = '/ping/stagewise'; // Will be used by the toolbar to check if the extension is running and find the correct port
export const PING_RESPONSE = '21st-extension'; // The response to the ping request

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
