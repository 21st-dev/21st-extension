import { exec } from 'child_process';

export function openUrl(url: string) {
  let opener: string;

  switch (process.platform) {
    case 'darwin':
      opener = 'open';
      break;
    case 'win32':
      opener = 'start';
      break;
    default:
      opener = 'xdg-open';
      break;
  }

  return exec(`${opener} ${url}`);
}
