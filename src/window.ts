import { app, BrowserWindow, Menu, session, shell, WebContents } from 'electron';
import { getWindowIcon, MESSENGER_URL, PARTITION, PLATFORM } from './util/constants';
import { settings } from './persistence/settings';
import { loadWindowState, saveBounds, saveWindowState, windowState } from './persistence/windowState';
import { createLogger } from './util/logging';

export interface AppCallbacks {
  isQuitting: () => boolean;
  onTitleUpdate: (title: string) => void;
}

const log = createLogger('window');

// Suppress the default Electron menu on Windows/Linux before the app is ready.
// macOS gets a custom menu via setupMacAppMenu() inside createMainWindow().
if (PLATFORM !== 'darwin') {
  Menu.setApplicationMenu(null);
}

let mainWindow: BrowserWindow | null = null;

export function showWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (windowState.maximized) {
    mainWindow.maximize();
  }
  mainWindow.show();
  mainWindow.focus();
}

export function toggleWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    mainWindow.hide();
  } else {
    showWindow();
  }
}

export function createMainWindow(appCallbacks: AppCallbacks): void {
  loadWindowState();

  log.info('Creating main window in', `${windowState.width}x${windowState.height}`);

  if (PLATFORM === 'darwin') {
    setupMacAppMenu();
  }

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 640,
    minHeight: 360,
    show: false,
    icon: getWindowIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      session: session.fromPartition(PARTITION)
    }
  });

  // Hide the window-level menu bar on Windows/Linux; on macOS the global app
  // menu is handled separately above and this call has no effect.
  mainWindow.setMenuBarVisibility(false);

  setupWebContents(mainWindow.webContents, appCallbacks.onTitleUpdate);
  setupWindowEvents(mainWindow, appCallbacks.isQuitting);
  setupBoundsTracking(mainWindow);

  log.info('Loading', MESSENGER_URL);
  void mainWindow.loadURL(MESSENGER_URL);

  if (!settings.start_minimized) {
    if (windowState.maximized) {
      mainWindow.maximize();
    }
    mainWindow.show();
    log.info('Window shown');
  } else {
    log.info('Start minimized, window hidden');
  }
}

// Configures permissions, navigation restrictions, and title updates for the
// web contents hosting the Messenger page.
function setupWebContents(webContents: WebContents, onTitleUpdate: (title: string) => void): void {
  session.fromPartition(PARTITION).setPermissionRequestHandler((_wc, permission, callback) => {
    log.info('Permission request:', permission);
    callback(true);
  });

  webContents.on('will-navigate', (e, url) => {
    if (!isAllowedHost(url)) {
      log.info('Redirecting external navigation to system browser:', url);
      e.preventDefault();
      void shell.openExternal(url);
    }
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank' || isAllowedHost(url)) {
      return { action: 'allow' };
    }
    log.info('Redirecting external popup to system browser:', url);
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  webContents.on('page-title-updated', (_e, title) => {
    onTitleUpdate(title);
  });
}

// Wires up close and minimize events to respect tray settings.
function setupWindowEvents(browserWindow: BrowserWindow, isQuitting: () => boolean): void {
  browserWindow.on('close', (e) => {
    if (!isQuitting() && settings.close_to_tray) {
      log.info('Close intercepted, hiding to tray');
      e.preventDefault();
      browserWindow.hide();
    } else {
      log.info('Closing window, saving state');
      saveBounds(browserWindow);
      saveWindowState();
      if (!isQuitting()) {
        app.quit();
      }
    }
  });

  browserWindow.on('minimize', () => {
    if (settings.minimize_to_tray) {
      log.info('Minimize intercepted, hiding to tray');
      browserWindow.hide();
    }
  });
}

// Tracks window size and position for persistence across restarts.
// Uses end-of-gesture events on Windows/macOS; debounces on Linux which lacks them.
function setupBoundsTracking(browserWindow: BrowserWindow): void {
  browserWindow.on('maximize', () => {
    windowState.maximized = true;
    saveWindowState();
  });

  browserWindow.on('unmaximize', () => {
    windowState.maximized = false;
    saveBounds(browserWindow);
  });

  if (PLATFORM === 'linux') {
    let boundsTimer: NodeJS.Timeout | null = null;
    const debouncedSaveBounds = () => {
      if (boundsTimer !== null) {
        clearTimeout(boundsTimer);
      }
      boundsTimer = setTimeout(() => {
        saveBounds(browserWindow);
      }, 500);
    };
    browserWindow.on('resize', debouncedSaveBounds);
    browserWindow.on('move', debouncedSaveBounds);
  } else {
    browserWindow.on('resized', () => {
      saveBounds(browserWindow);
    });
    browserWindow.on('moved', () => {
      saveBounds(browserWindow);
    });
  }
}

// Returns true if the URL belongs to a Facebook or Messenger domain.
function isAllowedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === 'facebook.com' ||
      hostname.endsWith('.facebook.com') ||
      hostname === 'messenger.com' ||
      hostname.endsWith('.messenger.com')
    );
  } catch {
    return false;
  }
}

// On macOS the global app menu lives outside any window. Set a minimal one so
// that standard keyboard shortcuts (Cmd+C/V/X/A/Z) work inside the web view.
function setupMacAppMenu(): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: app.name,
        submenu: [{ role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      }
    ])
  );
}
