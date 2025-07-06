import * as vscode from 'vscode';

export type IDE = 'VSCODE' | 'WINDSURF' | 'CURSOR' | 'TRAE' | 'UNKNOWN';

export function getCurrentIDE(): IDE {
  if (vscode.env.appName.toLowerCase().includes('windsurf')) {
    return 'WINDSURF';
  } else if (vscode.env.appName.toLowerCase().includes('cursor')) {
    return 'CURSOR';
  } else if (vscode.env.appName.toLowerCase().includes('visual studio code')) {
    return 'VSCODE';
  } else if (vscode.env.appName.toLowerCase().includes('trae')) {
    return 'TRAE';
  }
  return 'UNKNOWN';
}
