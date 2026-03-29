import type { MenuItemConstructorOptions, NativeImage } from 'electron';
import { app, Menu, Tray } from 'electron';
import { BADGE_CLEAR_DELAY_MS, getTrayIcon, PLATFORM } from './util/constants';
import { showAboutWindow } from './about';
import { buildMenuItems, registerMenuRefreshListener } from './menu';
import { settings } from './persistence/settings';
import { createLogger } from './util/logging';

export interface TrayCallbacks {
  showWindow: () => void;
  toggleWindow: () => void;
}

const log = createLogger('tray');

let tray: Tray | null = null;
let iconNormal: NativeImage | null = null;
let iconBadge: NativeImage | null = null;
let hasBadge = false;
let badgeTimer: NodeJS.Timeout | null = null;
let callbacks: TrayCallbacks | null = null;
let hasRegisteredMenuRefresh = false;

export function createTray(trayCallbacks: TrayCallbacks): void {
  log.info('Initializing tray');
  callbacks = trayCallbacks;

  if (iconNormal === null) {
    iconNormal = getTrayIcon(false);
  }
  if (PLATFORM !== 'darwin' && iconBadge === null) {
    iconBadge = getTrayIcon(true);
  }
  if (!hasRegisteredMenuRefresh) {
    registerMenuRefreshListener(syncTray);
    hasRegisteredMenuRefresh = true;
  }

  syncTray();

  log.info('Tray initialized');
}

export function updateBadge(title: string): void {
  const hasUnread = /^\(\d+\)/.test(title) || (title.trim() !== '' && !/messenger|facebook/i.test(title));

  if (hasUnread) {
    if (badgeTimer !== null) {
      clearTimeout(badgeTimer);
      badgeTimer = null;
    }
    if (!hasBadge) {
      showBadge(true);
    }
  } else if (hasBadge && badgeTimer === null) {
    badgeTimer = setTimeout(() => {
      badgeTimer = null;
      showBadge(false);
    }, BADGE_CLEAR_DELAY_MS);
  }
}

function syncTray(): void {
  if (!settings.show_tray_icon) {
    if (tray !== null) {
      log.info('Removing tray');
      tray.destroy();
      tray = null;
    }
    return;
  }

  if (tray === null) {
    log.info('Creating tray');
    tray = new Tray(iconNormal!);
    tray.setToolTip(`${app.getName()} v${app.getVersion()}`);
    tray.on('click', () => {
      callbacks!.toggleWindow();
    });
  }

  tray.setContextMenu(buildMenu());
}

function showBadge(show: boolean) {
  if (show) {
    log.info('Badge on');
    hasBadge = true;
    if (PLATFORM === 'darwin') {
      app.dock?.setBadge('●');
    } else if (tray !== null) {
      tray.setImage(iconBadge!);
    }
  } else {
    log.info('Badge off');
    hasBadge = false;
    if (PLATFORM === 'darwin') {
      app.dock?.setBadge('');
    } else if (tray !== null) {
      tray.setImage(iconNormal!);
    }
  }
}

function buildMenu(): Menu {
  const items: MenuItemConstructorOptions[] = [
    {
      label: 'Show',
      click: () => {
        callbacks!.showWindow();
      }
    },
    { type: 'separator' },
    ...buildMenuItems(),
    { type: 'separator' },
    {
      label: 'About',
      click: () => {
        showAboutWindow();
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ];
  return Menu.buildFromTemplate(items);
}
