import path from 'path';
import { app, BrowserWindow, Menu, session, shell } from 'electron';
import { getWindowIcon, IS_DEBUG, IS_WAYLAND, MESSENGER_URL, PARTITION, PLATFORM } from './util/constants';
import { setupMacApplicationMenu } from './menu';
import { isInternalUrl, setupNavigationGuard } from './util/navigation';
import { settings } from './persistence/settings';
import { loadWindowState, saveBounds, saveWindowState, windowState } from './persistence/windowState';
import { createLogger } from './util/logging';
import { resetNotificationLock, setupWindowNotifications } from './util/notification';
import { hideDockIcon, showDockIcon } from './dock';

export interface AppCallbacks {
  isQuitting: () => boolean;
  onTitleUpdate: (title: string) => void;
}

const log = createLogger('window');

let mainWindow: BrowserWindow | null = null;

export function showWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  showDockIcon();
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (windowState.maximized) {
    mainWindow.maximize();
  }
  mainWindow.show();
  if (IS_WAYLAND && !windowState.maximized) {
    // After hide()/show() on Wayland, Electron restores the window using its cached position
    // (from getBounds(), which returns unreliable values on Wayland). This causes a mismatch
    // between Electron's internal position and where the compositor actually placed the window,
    // making dragging jump. Re-centering syncs both sides, so the grab offset is correct.
    mainWindow.center();
  }
  mainWindow.focus();
  resetNotificationLock(mainWindow.getTitle());
}

export function toggleWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    mainWindow.hide();
    hideDockIcon();
  } else {
    showWindow();
  }
}

export function createMainWindow(appCallbacks: AppCallbacks): void {
  loadWindowState();

  log.info('Creating main window in', `${windowState.width}x${windowState.height}`);

  if (PLATFORM === 'darwin') {
    setupMacApplicationMenu();
  } else {
    Menu.setApplicationMenu(null);
  }

  mainWindow = new BrowserWindow({
    // On Wayland, absolute coordinates are managed by the compositor; setting them causes
    // the window to jump when the user first drags it.
    ...(!IS_WAYLAND && { x: windowState.x, y: windowState.y }),
    width: windowState.width,
    height: windowState.height,
    minWidth: 640,
    minHeight: 360,
    show: false,
    icon: getWindowIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      session: session.fromPartition(PARTITION)
    }
  });

  setupWindow(mainWindow, appCallbacks.onTitleUpdate);
  setupWindowEvents(mainWindow, appCallbacks.isQuitting);
  setupBoundsTracking(mainWindow);

  log.info('Loading', MESSENGER_URL);
  void mainWindow.loadURL(MESSENGER_URL);

  if (IS_DEBUG) {
    mainWindow.webContents.openDevTools();
  }

  if (!settings.start_minimized) {
    if (windowState.maximized) {
      mainWindow.maximize();
    }
    mainWindow.show();
    showDockIcon();
    log.info('Window shown');
  } else {
    hideDockIcon();
    log.info('Start minimized, window hidden');
  }
}

// Configures menu, permissions, navigation restrictions, and notifications for the window
function setupWindow(browserWindow: BrowserWindow, onTitleUpdate: (title: string) => void): void {
  session.fromPartition(PARTITION).setSpellCheckerEnabled(settings.spell_check);

  session.fromPartition(PARTITION).setPermissionRequestHandler((_wc, permission, callback) => {
    log.info('Permission request:', permission);
    callback(permission !== 'notifications');
  });

  browserWindow.setMenuBarVisibility(false);
  setupNavigationGuard(browserWindow, true);

  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { show: false } };
    }
    log.debug('Redirecting external popup to system browser:', url);
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  browserWindow.webContents.on('did-create-window', (popupWindow) => {
    popupWindow.setMenuBarVisibility(false);
    setupNavigationGuard(popupWindow, false);
    popupWindow.webContents.on('did-navigate', (_e, url) => {
      if (isInternalUrl(url)) {
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
    if (!isQuitting() && settings.show_tray_icon && settings.close_to_tray) {
      log.info('Close intercepted, hiding to tray');
      e.preventDefault();
      browserWindow.hide();
      hideDockIcon();
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
    if (settings.show_tray_icon && settings.minimize_to_tray) {
      log.info('Minimize intercepted, hiding to tray');
      browserWindow.hide();
      hideDockIcon();
    }
  });
}

// Tracks window size and position for persistence across restarts.
// Uses end-of-gesture events on Windows/macOS; debounces on Linux, which lacks them.
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
