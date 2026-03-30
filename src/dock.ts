import { PLATFORM } from './util/constants';
import { settings } from './persistence/settings';
import { app } from 'electron';

export function showDockIcon(): void {
  if (PLATFORM !== 'darwin') {
    return;
  }

  void app.dock?.show();
}

export function hideDockIcon(): void {
  if (PLATFORM !== 'darwin' || !settings.show_tray_icon) {
    return;
  }

  app.dock?.hide();
}
