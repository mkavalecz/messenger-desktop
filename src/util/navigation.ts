import { BrowserWindow, ipcMain, shell } from 'electron';
import { createLogger } from './logging';
import { INTERNAL_URL_RULES } from './constants';

const log = createLogger('navigation');

// Injected into the page's JS world on every dom-ready to block external navigation.
// Uses a capture-phase click listener that fires before React sees the click, so
// stopImmediatePropagation prevents React's router from ever processing it.
const NAVIGATION_GUARD_SCRIPT = `(function() {
  const INTERNAL_URL_RULES = ${JSON.stringify(INTERNAL_URL_RULES)};
  function isInternal(url) {
    try {
      const absoluteUrl = new URL(url, location.href).href;
      return INTERNAL_URL_RULES.some((rule) => {
        if(rule.fullMatch) {
          return absoluteUrl === rule.url;
        }
        return absoluteUrl?.startsWith(rule.url);
      });
    } catch {
      return false;
    }
  }

  document.addEventListener('click', function(event) {
    const link = event.target.closest('a[href]');
    if (!link) {
      return;
    }
    if (!isInternal(link.href)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.electronAPI.openExternal(link.href);
    }
  }, true);
})();`;

// Handles open-external IPC messages sent by the renderer via the preload bridge.
ipcMain.on('open-external', (_e, url: string) => {
  log.info('Opening external URL from renderer:', url);
  void shell.openExternal(url);
});

// Attaches navigation guards to a WebContents instance.
// For the main window the renderer-side guard script is also injected on every dom-ready
// this requires the preload to be loaded on that window.
export function setupNavigationGuard(browserWindow: BrowserWindow, isMainWindow: boolean): void {
  const blockExternal = (e: Electron.Event, url: string): void => {
    if (!isInternalUrl(url)) {
      log.info('Redirecting external URL to system browser:', url);
      e.preventDefault();
      if (!isMainWindow) {
        browserWindow?.destroy();
      }
      void shell.openExternal(url);
    }
  };

  browserWindow?.webContents.on('will-navigate', blockExternal);
  browserWindow?.webContents.on('will-redirect', blockExternal);

  if (isMainWindow) {
    browserWindow?.webContents.on('dom-ready', () => {
      void browserWindow.webContents.executeJavaScript(NAVIGATION_GUARD_SCRIPT);
    });
  }
}

// Returns true if the URL belongs to Messenger.
export function isInternalUrl(url: string) {
  return INTERNAL_URL_RULES.some((rule) => {
    if (rule.fullMatch) {
      return url === rule.url;
    }
    return url?.startsWith(rule.url);
  });
}
