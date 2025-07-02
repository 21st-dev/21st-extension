import { PluginProvider } from '@/hooks/use-plugins';
import type { ToolbarConfig } from '../config';
import { ChatStateProvider } from '@/hooks/use-chat-state';
import type { ComponentChildren } from 'preact';
import { SRPCBridgeProvider } from '@/hooks/use-srpc-bridge';
import { VSCodeProvider } from '@/hooks/use-vscode';
import { ConfigProvider } from '@/hooks/use-config';
import { AuthProvider } from '@/hooks/use-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (
          error instanceof Error &&
          error.message.includes('UNAUTHENTICATED')
        ) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      // Force deduplication
      refetchOnReconnect: false,
      notifyOnChangeProps: ['data', 'error'],
    },
  },
});



export function ContextProviders({
  children,
  config,
}: {
  children?: ComponentChildren;
  config?: ToolbarConfig;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider config={config}>
        <VSCodeProvider>
          <SRPCBridgeProvider>
            <AuthProvider>
              <PluginProvider>
                <ChatStateProvider>{children}</ChatStateProvider>
              </PluginProvider>
            </AuthProvider>
          </SRPCBridgeProvider>
        </VSCodeProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
