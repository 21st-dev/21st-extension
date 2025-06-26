export type IDE = 'VSCODE' | 'WINDSURF' | 'CURSOR' | 'UNKNOWN';

export function getIDEFromAppName(appName: string | undefined): IDE {
  if (!appName) return 'UNKNOWN';

  const appNameLower = appName.toLowerCase();
  if (appNameLower.includes('windsurf')) {
    return 'WINDSURF';
  } else if (appNameLower.includes('cursor')) {
    return 'CURSOR';
  } else if (appNameLower.includes('visual studio code')) {
    return 'VSCODE';
  }
  return 'UNKNOWN';
}

export function getIDEDisplayName(ide: IDE): string {
  switch (ide) {
    case 'WINDSURF':
      return 'Windsurf';
    case 'CURSOR':
      return 'Cursor';
    case 'VSCODE':
      return 'VS Code';
    case 'UNKNOWN':
    default:
      return 'IDE';
  }
}

export function getIDENameFromAppName(appName: string | undefined): string {
  const ide = getIDEFromAppName(appName);
  return getIDEDisplayName(ide);
}
