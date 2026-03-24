import type { MenuItemConstructorOptions, NativeImage } from 'electron';
import { app, Menu, Tray } from 'electron';
import { BADGE_CLEAR_DELAY_MS, getTrayIcon, PLATFORM } from './util/constants';
import { showAboutWindow } from './about';
import { saveSettings, settings } from './persistence/settings';
import { isRunOnStartup, setRunOnStartup } from './util/startup';
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

export function createTray(trayCallbacks: TrayCallbacks): void {
  log.info('Creating tray');
  callbacks = trayCallbacks;

  iconNormal = getTrayIcon(false);
  if (PLATFORM !== 'darwin') {
    iconBadge = getTrayIcon(true);
  }
  tray = new Tray(iconNormal);
  tray.setToolTip(`${app.name} v${app.getVersion()}`);
  tray.setContextMenu(buildMenu());

  tray.on('click', () => {
    callbacks!.toggleWindow();
  });

  log.info('Tray created');
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

function showBadge(show: boolean) {
  if (show) {
    log.info('Badge on');
    hasBadge = true;
    if (PLATFORM === 'darwin') {
      app.dock?.setBadge('●');
    } else {
      tray!.setImage(iconBadge!);
    }
  } else {
    log.info('Badge off');
    hasBadge = false;
    if (PLATFORM === 'darwin') {
      app.dock?.setBadge('');
    } else {
      tray!.setImage(iconNormal!);
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
    {
      label: 'Minimize to tray',
      type: 'checkbox',
      checked: settings.minimize_to_tray,
      click: toggleSetting('minimize_to_tray')
    },
    {
      label: 'Close to tray',
      type: 'checkbox',
      checked: settings.close_to_tray,
      click: toggleSetting('close_to_tray')
    },
    { type: 'separator' },
    {
      label: 'Run on startup',
      type: 'checkbox',
      checked: isRunOnStartup(),
      click: () => {
        setRunOnStartup(!isRunOnStartup());
        refreshMenu();
      }
    },
    {
      label: 'Start minimized',
      type: 'checkbox',
      checked: settings.start_minimized,
      click: toggleSetting('start_minimized')
    },
    {
      label: 'Check for updates',
      type: 'checkbox',
      checked: settings.check_for_updates,
      click: toggleSetting('check_for_updates')
    },
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

function toggleSetting(key: keyof typeof settings): () => void {
  return () => {
    settings[key] = !settings[key];
    saveSettings();
    refreshMenu();
  };
}

function refreshMenu(): void {
  tray!.setContextMenu(buildMenu());
}
