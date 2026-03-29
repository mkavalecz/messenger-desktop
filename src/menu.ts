import { saveSettings, settings } from './persistence/settings';
import { app, Menu, MenuItemConstructorOptions } from 'electron';
import { PLATFORM } from './util/constants';
import { isRunOnStartup, setRunOnStartup } from './util/startup';
import { checkForUpdates } from './util/updater';
import { showAboutWindow } from './about';

const listeners = new Set<() => void>();

let hasRegisteredMenuRefresh = false;

// On macOS the global app menu lives outside any window. Keep the custom
// Settings menu there while Windows/Linux continue to use only the tray menu.
export function setupMacApplicationMenu(): void {
  const menuTemplate: MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        {
          label: 'About',
          click: () => {
            showAboutWindow();
          }
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Settings',
      submenu: buildMenuItems()
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
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  if (!hasRegisteredMenuRefresh) {
    registerMenuRefreshListener(setupMacApplicationMenu);
    hasRegisteredMenuRefresh = true;
  }
}

export function buildMenuItems(): MenuItemConstructorOptions[] {
  let items: MenuItemConstructorOptions[] = [
    {
      label: 'Show notifications',
      type: 'checkbox',
      checked: settings.show_notifications,
      click: toggleSetting('show_notifications')
    },
    { type: 'separator' }
  ];

  if (PLATFORM === 'darwin') {
    const trayRequired = settings.minimize_to_tray || settings.close_to_tray;
    items.push({
      label: 'Show menu bar icon',
      type: 'checkbox',
      checked: settings.show_tray_icon,
      enabled: !trayRequired,
      click: toggleSetting('show_tray_icon')
    });
  }

  items = items.concat([
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
      label: 'Check for updates on startup',
      type: 'checkbox',
      checked: settings.check_for_updates,
      click: toggleSetting('check_for_updates')
    },
    {
      label: 'Check for updates now',
      click: () => {
        void checkForUpdates(true);
      }
    }
  ]);

  return items;
}

export function registerMenuRefreshListener(listener: () => void): void {
  listeners.add(listener);
}

export function refreshMenu(): void {
  for (const listener of listeners) {
    listener();
  }
}

function toggleSetting(key: keyof typeof settings): () => void {
  return () => {
    settings[key] = !settings[key];
    saveSettings();
    refreshMenu();
  };
}
