import { createSRPCServerBridge } from '@21st-extension/srpc/server';
import type { Server } from 'node:http';
import { contract } from './contract';

export function getExtensionBridge(server: Server) {
  return createSRPCServerBridge(server, contract);
}
