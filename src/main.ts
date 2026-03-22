import { app } from 'electron';
import { APP_NAME } from './util/constants';
import { loadSettings, settings } from './persistence/settings';
import { createTray, updateBadge } from './tray';
import { createMainWindow, showWindow, toggleWindow } from './window';
import { createLogger } from './util/logging';
import { checkForUpdates } from './util/updater';

app.setName(APP_NAME);

const log = createLogger('main');

let isQuitting = false;

if (!app.requestSingleInstanceLock()) {
  log.info('Another instance is already running, quitting');
  app.quit();
} else {
  app.on('second-instance', () => {
    log.info('Second instance attempted, focusing existing window');
    showWindow();
  });

  void app.whenReady().then(() => {
    log.info('App ready, starting up');

    loadSettings();

    createTray({ showWindow, toggleWindow });

    createMainWindow({
      isQuitting: () => isQuitting,
      onTitleUpdate: updateBadge
    });

    log.info('Startup complete');

    if (settings.check_for_updates) {
      void checkForUpdates();
    }
  });
}

// Keep the app alive when all windows are closed (lives in tray).
app.on('window-all-closed', () => {});

app.on('before-quit', () => {
  log.info('Before quit');
  isQuitting = true;
});
