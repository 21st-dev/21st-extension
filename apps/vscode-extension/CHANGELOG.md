# 21st.dev Extension

## 0.5.6

### Patch Changes

- Added dark theme support for VS Code Extension
- Enhanced integration with system theme preferences
- Improved visual accessibility in low-light environments

## 0.5.1

### Patch Changes

- Renamed all components from `StagewiseToolbar` to `TwentyFirstToolbar` for consistency with 21st.dev branding
- Updated all user-facing messages and documentation to use "21st.dev Extension" and "21st.dev Toolbar" instead of "stagewise"
- Maintained backward compatibility for existing integrations
- Added runtime error tracking and display in chat context
- Added new success state with visual feedback for completed actions
- Enhanced CMD + . hotkey to open inspector even when text input has started
- Added ability to remove attached elements, components, and errors using Backspace when input is empty
- New loading states

## 0.5.0

### Major Changes

- **BREAKING**: Forked from stagewise-io/stagewise project
- Integrated 21st.dev branding and Magic Chat functionality
- Rebranded extension as "21st.dev Extension" 
- Added Magic Chat integration for enhanced AI interactions
- Updated all package names to use `@21st-extension/` scope

## 0.5.2

### Patch Changes

- e147977: Give users improved situational recommendations for actions
- d0db97c: Fix service architecture in codebase to prevent race-conditions etc.
- a8d2b4b: Add stagewise integration recommendation for new web projects

## 0.5.1

### Minor Changes

- a1e0027: Add update recommendations for outdated toolbar packages

## 0.5.1

### Patch Changes

- 263c871: Add roo-code and cline support
- 2e121ac: Updated the README to clarify how framework-specific packages are named
- 1b6e4a2: Fix package dependency parser in order to report correct toolbar version
- Updated dependencies [2e121ac]
  - @21st-extension/extension-toolbar-srpc-contract@0.1.3

## 0.5.0

### Minor Changes

- 49f75c9: Add a getting started onboarding flow

### Patch Changes

- 02bd300: Adding a window-select-hint when multiple windows are selected
- d0fca4b: Add information about extension and toolbar version to telemetry
- Updated dependencies [02bd300]
  - @21st-extension/extension-toolbar-srpc-contract@0.1.2

## 0.4.4

### Patch Changes

- d3a6569: Refactor application structure
- 0c81ec9: Improved toolbar setup prompt
- bef562d: Changed branding slogan
  - @21st-extension/extension-toolbar-srpc-contract@0.1.1

## 0.4.3

### Patch Changes

- 8f6f8ec: Implement GitHub Copilot support

## 0.4.2

### Patch Changes

- 56e2bea: Don't crash when analytics can't be configured
- 3d8613e: Update the README agent list

## 0.4.1

### Patch Changes

- c9cafe7: Include pseudonymized telemetry collection

## 0.4.0

### Minor Changes

- bde4944: Add images, files, mode and model properties to the srpc contract and agent call dispatches
- f4b085d: Add session management and connection state

### Patch Changes

- 0092794: Update license and copyright notices
- 3b637e8: Update README.md to include multiple-window-caveat
- 1575df4: Renaming variables to improve clarity.
- 79e11fa: Align versions to match 0.3
- 92407bd: Update license field in readme.
- Updated dependencies [bde4944]
- Updated dependencies [79e11fa]
- Updated dependencies [0092794]
- Updated dependencies [f4b085d]
- Updated dependencies [1575df4]
- Updated dependencies [058d70b]
- Updated dependencies [79e11fa]
  - @21st-extension/extension-toolbar-srpc-contract@0.1.0

## 0.4.0-alpha.2

### Minor Changes

- f4b085d: Add session management and connection state

### Patch Changes

- Updated dependencies [f4b085d]
  - @21st-extension/extension-toolbar-srpc-contract@0.1.0-alpha.1

## 0.3.1-alpha.1

### Patch Changes

- 92407bd: Update license field in readme.

## 0.3.1-alpha.0

### Patch Changes

- 3b637e8: Update README.md to include multiple-window-caveat

## 0.3.0-alpha.0

### Minor Changes

- bde4944: Add images, files, mode and model properties to the srpc contract and agent call dispatches

### Patch Changes

- 1575df4: Renaming variables to improve clarity.
- 79e11fa: Align versions to match 0.3
- Updated dependencies [bde4944]
- Updated dependencies [79e11fa]
- Updated dependencies [1575df4]
- Updated dependencies [058d70b]
- Updated dependencies [79e11fa]
  - @21st-extension/extension-toolbar-srpc-contract@0.1.0-alpha.0

## 0.2.2

### Patch Changes

- 4337bd6: Remove mcp.json update, since mcp tools are not supported yet

## 0.2.1

### Patch Changes

- b74c54f: Improving the toolbar auto-setup prompt

## 0.2.0

### Minor Changes

- 278ae2a: Implement support for the windsurf IDE.
