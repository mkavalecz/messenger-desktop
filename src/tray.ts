import type { MenuItemConstructorOptions, NativeImage } from 'electron';
import { app, Menu, nativeImage, Tray } from 'electron';
import { TRAY_ICON_PATH } from './util/constants';
import { saveSettings, settings } from './persistence/settings';
import { isRunOnStartup, setRunOnStartup } from './util/startup';
import { makeBadgeIcon } from './util/badge';
import { createLogger } from './util/logging';

export interface TrayCallbacks {
  showWindow: () => void;
  toggleWindow: () => void;
}

const log = createLogger('tray');

const BADGE_CLEAR_DELAY_MS = 1500;

let tray: Tray | null = null;
let iconNormal: NativeImage | null = null;
let iconBadge: NativeImage | null = null;
let hasBadge = false;
let badgeTimer: NodeJS.Timeout | null = null;
let callbacks: TrayCallbacks | null = null;

export function createTray(trayCallbacks: TrayCallbacks): void {
  log.info('Creating tray');
  callbacks = trayCallbacks;

  iconNormal = nativeImage.createFromPath(TRAY_ICON_PATH);
  iconBadge = makeBadgeIcon(iconNormal);

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
      log.info('Badge on');
      hasBadge = true;
      tray!.setImage(iconBadge!);
    }
  } else if (hasBadge && badgeTimer === null) {
    badgeTimer = setTimeout(() => {
      log.info('Badge off');
      badgeTimer = null;
      hasBadge = false;
      tray!.setImage(iconNormal!);
    }, BADGE_CLEAR_DELAY_MS);
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
