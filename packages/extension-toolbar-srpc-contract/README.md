# @21st-extension/extension-toolbar-srpc-contract

[![npm version](https://img.shields.io/npm/v/@21st-extension/extension-toolbar-srpc-contract.svg)](https://www.npmjs.com/package/@21st-extension/extension-toolbar-srpc-contract)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

A communication contract between the stagewise VS Code extension and the stagewise toolbar.

## What is this package?

This package defines the communication protocol between the stagewise VS Code extension and the stagewise toolbar using a schema-validated RPC (Remote Procedure Call) system. It serves as the central contract that ensures type-safe, reliable communication between these two components.

## Features

- **Type-Safe Communication**: Uses Zod schemas to validate all messages at runtime
- **Bi-directional Communication**: Enables both the extension and toolbar to call methods on each other
- **Discovery Mechanism**: Provides utilities for the toolbar to discover the running extension
- **Automatic Reconnection**: Handles connection management and reconnection
- **Progress Updates**: Supports sending progress updates during long-running operations

## Key Components

- **Contract Definition**: Defines the available methods, their parameters, and return types
- **Connection Management**: Handles port discovery and ping protocols
- **Bridge Creation**: Utilities to create server and client bridges

## Usage

### Installation

```bash
npm install @21st-extension/extension-toolbar-srpc-contract
```

### Basic Usage

```typescript
// Extension (server) side
import { getExtensionBridge } from '@21st-extension/extension-toolbar-srpc-contract';
import http from 'node:http';

const httpServer = http.createServer();
const bridge = getExtensionBridge(httpServer);

bridge.register({
  triggerAgentPrompt: async (request, { sendUpdate }) => {
    // Implementation
  }
});

// Toolbar (client) side
import { getToolbarBridge } from '@21st-extension/extension-toolbar-srpc-contract';

const bridge = getToolbarBridge('ws://localhost:5746');
await bridge.connect();

// Call methods on the extension
const result = await bridge.call.triggerAgentPrompt({
  prompt: 'Make this button green'
});
```

## Related Packages

- [@21st-extension/toolbar](https://www.npmjs.com/package/@21st-extension/toolbar): The toolbar component for your web app
- [@21st-extension/srpc](https://www.npmjs.com/package/@21st-extension/srpc): The underlying RPC framework

## License

AGPL-3.0-only