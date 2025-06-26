import { createSRPCClientBridge } from '@21st-extension/srpc/client';
import { contract } from './contract';

export function getToolbarBridge(url: string) {
  return createSRPCClientBridge(url, contract);
}
