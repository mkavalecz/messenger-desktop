import path from 'path';
import { app, BrowserWindow, Menu, session, shell } from 'electron';
import { showAboutWindow } from './about';
import { getWindowIcon, MESSENGER_URL, PARTITION, PLATFORM } from './util/constants';
import { registerMenuRefreshListener } from './menuRefresh';
import { buildPreferenceMenuItems } from './preferencesMenu';
import { isInternalUrl, setupNavigationGuard } from './util/navigation';
import { settings } from './persistence/settings';
import { loadWindowState, saveBounds, saveWindowState, windowState } from './persistence/windowState';
import { createLogger } from './util/logging';
import { resetNotificationLock, setupWindowNotifications } from './notification';

export interface AppCallbacks {
  isQuitting: () => boolean;
  onTitleUpdate: (title: string) => void;
}

const log = createLogger('window');

let mainWindow: BrowserWindow | null = null;
let hasRegisteredAppMenuRefresh = false;

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

  setupApplicationMenu();
  if (!hasRegisteredAppMenuRefresh) {
    registerMenuRefreshListener(setupApplicationMenu);
    hasRegisteredAppMenuRefresh = true;
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
      preload: path.join(__dirname, 'preload.js'),
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

  if (PLATFORM === 'darwin') {
    browserWindow.setMenuBarVisibility(false);
  } else {
    browserWindow.setAutoHideMenuBar(false);
    browserWindow.setMenuBarVisibility(true);
  }
  setupNavigationGuard(browserWindow, true);

  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { show: false } };
    }
    log.info('Redirecting external popup to system browser:', url);
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

// On macOS this becomes the global app menu. On Windows/Linux it appears in the
// window menu bar so the Settings items remain accessible even without a tray icon.
function setupApplicationMenu(): void {
  const template = [] as Electron.MenuItemConstructorOptions[];
  const appSubmenu: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'About',
      click: () => {
        showAboutWindow();
      }
    }
  ];

  const appMenu: Electron.MenuItemConstructorOptions = {
    label: app.name,
    submenu: appSubmenu
  };

  if (PLATFORM === 'darwin') {
    appSubmenu.push(
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' }
    );
  }

  appSubmenu.push(
    { type: 'separator' },
    { role: 'quit' }
  );

  template.push(appMenu);

  template.push(
    {
      label: 'Settings',
      submenu: buildPreferenceMenuItems()
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
  );

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
