import { BrowserWindow, shell } from 'electron';
import { createLogger } from './logging';

const log = createLogger('navigation');

// Attaches will-navigate and will-redirect guards to a WebContents instance,
// sending any non-Facebook navigation to the system browser instead.
export function setupNavigationGuard(browserWindow?: BrowserWindow): void {
  const blockExternal = (e: Electron.Event, url: string): void => {
    if (!isAllowedHost(url)) {
      log.info('Redirecting external URL to system browser:', url);
      e.preventDefault();
      browserWindow?.destroy();
      void shell.openExternal(url);
    }
  };

  browserWindow?.webContents.on('will-navigate', blockExternal);
  browserWindow?.webContents.on('will-redirect', blockExternal);
}

// Returns true if the URL belongs to a Facebook or Messenger domain.
// l.facebook.com is excluded as it is a link redirect shim that always
// navigates to an external destination.
export function isAllowedHost(url: string): boolean {
  try {
    // needed for calls to work
    if (url === 'about:blank') {
      return true;
    }
    const { hostname } = new URL(url);
    return (
      hostname === 'facebook.com' ||
      (hostname.endsWith('.facebook.com') && hostname !== 'l.facebook.com') ||
      hostname === 'messenger.com' ||
      hostname.endsWith('.messenger.com')
    );
  } catch {
    return false;
  }
}
