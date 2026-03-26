import type { MenuItemConstructorOptions } from 'electron';
import { saveSettings, settings } from './persistence/settings';
import { refreshMenus } from './menuRefresh';
import { PLATFORM } from './util/constants';
import { isRunOnStartup, setRunOnStartup } from './util/startup';
import { checkForUpdates } from './util/updater';

export function buildPreferenceMenuItems(): MenuItemConstructorOptions[] {
  const items: MenuItemConstructorOptions[] = [
    {
      label: 'Show notifications',
      type: 'checkbox',
      checked: settings.show_notifications,
      click: toggleSetting('show_notifications')
    },
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
        refreshMenus();
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
        void checkForUpdates({ interactive: true });
      }
    }
  ];

  if (PLATFORM === 'darwin') {
    items.splice(1, 0,
      { type: 'separator' },
      {
        label: 'Show menu bar icon',
        type: 'checkbox',
        checked: settings.show_tray_icon,
        click: toggleSetting('show_tray_icon')
      }
    );
  } else {
    items.splice(1, 0, { type: 'separator' });
  }

  return items;
}

function toggleSetting(key: keyof typeof settings): () => void {
  return () => {
    settings[key] = !settings[key];
    saveSettings();
    refreshMenus();
  };
}
