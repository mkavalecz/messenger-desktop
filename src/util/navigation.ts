import { BrowserWindow, shell } from 'electron';
import { createLogger } from './logging';
import { MESSENGER_URL } from './constants';

const log = createLogger('navigation');

// Attaches will-navigate and will-redirect guards to a WebContents instance,
// sending any non-Facebook navigation to the system browser instead.
export function setupNavigationGuard(browserWindow: BrowserWindow, destroyWindow: boolean): void {
  const blockExternal = (e: Electron.Event, url: string): void => {
    if (!isAllowedHost(url)) {
      log.info('Redirecting external URL to system browser:', url);
      e.preventDefault();
      if (destroyWindow) {
        browserWindow?.destroy();
      }
      void shell.openExternal(url);
    }
  };

  browserWindow?.webContents.on('will-navigate', blockExternal);
  browserWindow?.webContents.on('will-redirect', blockExternal);
}

// Returns true if the URL belongs to Messenger.
export function isAllowedHost(url: string): boolean {
  return url === 'about:blank' || url?.startsWith(MESSENGER_URL);
}
