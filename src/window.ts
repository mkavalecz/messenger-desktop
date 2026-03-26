import { app, BrowserWindow, Menu, session, shell } from 'electron';
import { getWindowIcon, MESSENGER_URL, PARTITION, PLATFORM } from './util/constants';
import { isAllowedHost, setupNavigationGuard } from './util/navigation';
import { settings } from './persistence/settings';
import { loadWindowState, saveBounds, saveWindowState, windowState } from './persistence/windowState';
import { createLogger } from './util/logging';
import { resetNotificationLock, setupWindowNotifications } from './notification';

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
  resetNotificationLock(mainWindow.getTitle());
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

  setupWindow(mainWindow, appCallbacks.onTitleUpdate);
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

// Configures menu, permissions, navigation restrictions, and notifications for the window
function setupWindow(browserWindow: BrowserWindow, onTitleUpdate: (title: string) => void): void {
  session.fromPartition(PARTITION).setPermissionRequestHandler((_wc, permission, callback) => {
    log.info('Permission request:', permission);
    callback(true);
  });

  browserWindow.setMenuBarVisibility(false);
  setupNavigationGuard(browserWindow);

  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedHost(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { show: false } };
    }
    log.info('Redirecting external popup to system browser:', url);
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  browserWindow.webContents.on('did-create-window', (popupWindow) => {
    popupWindow.setMenuBarVisibility(false);
    setupNavigationGuard(popupWindow);
    popupWindow.webContents.on('did-navigate', (_e, url) => {
      if (isAllowedHost(url)) {
        popupWindow.show();
      }
    });
  });

  browserWindow.webContents.on('page-title-updated', (_e, title) => {
    onTitleUpdate(title);
  });

  setupWindowNotifications(browserWindow, showWindow);
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
