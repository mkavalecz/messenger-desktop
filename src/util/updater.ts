import { app, dialog, net, Notification, shell } from 'electron';
import { GITHUB_RELEASES_API_URL, GITHUB_RELEASES_URL, PLATFORM } from './constants';
import { createLogger } from './logging';

const log = createLogger('updater');

// Held at module scope to prevent garbage collection before the notification renders.
let updateNotification: Notification | null = null;

export async function checkForUpdates(interactive: boolean = false): Promise<void> {
  try {
    log.info('Checking for updates');
    const response = await net.fetch(GITHUB_RELEASES_API_URL);
    if (!response.ok) {
      log.warn('Update check failed with status:', String(response.status));
      if (interactive) {
        await showUpdateErrorDialog('The update server returned an unexpected response.');
      }
      return;
    }
    const data = (await response.json()) as { tag_name: unknown };
    const latestVersion = data.tag_name;
    if (typeof latestVersion !== 'string' || latestVersion === '') {
      log.warn('Update check returned unexpected data:', String(latestVersion));
      if (interactive) {
        await showUpdateErrorDialog('The update server returned unexpected data.');
      }
      return;
    }
    const currentVersion = app.getVersion();

    if (isNewerVersion(latestVersion, currentVersion)) {
      log.info(`Update available: ${latestVersion} (current: ${currentVersion})`);
      if (interactive) {
        await showUpdateAvailableDialog(latestVersion);
      } else {
        showUpdateNotification(latestVersion);
      }
    } else {
      log.info(`App is up to date (${currentVersion})`);
      if (interactive) {
        await showNoUpdatesAvailableDialog(currentVersion);
      }
    }
  } catch (e) {
    log.warn('Update check failed:', e instanceof Error ? e.message : e);
    if (interactive) {
      await showUpdateErrorDialog('Unable to check for updates right now. Please try again later.');
    }
  }
}

async function showNoUpdatesAvailableDialog(currentVersion: string): Promise<void> {
  await dialog.showMessageBox({
    type: 'info',
    title: 'No updates available',
    message: 'Messenger Desktop is up to date.',
    detail: `You are using version ${currentVersion}.`
  });
}

async function showUpdateAvailableDialog(version: string): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'Update available',
    message: `Version ${version} is available.`,
    detail: 'Open the latest release page to download it.',
    buttons: ['Open download page', 'Later'],
    defaultId: 0,
    cancelId: 1
  });

  if (result.response === 0) {
    void shell.openExternal(GITHUB_RELEASES_URL);
  }
}

async function showUpdateErrorDialog(details: string): Promise<void> {
  await dialog.showMessageBox({
    type: 'error',
    title: 'Update check failed',
    message: 'Unable to check for updates.',
    detail: details
  });
}

function showUpdateNotification(version: string): void {
  if (!Notification.isSupported()) {
    log.warn('Notifications are not supported on this platform');
    return;
  }
  log.info('Showing update notification');
  updateNotification = new Notification({
    title: `Version ${version} is available`,
    body: 'Click here to download'
  });
  updateNotification.on('show', () => {
    log.info('Update notification shown');
  });
  updateNotification.on('failed', (_event, error) => {
    log.warn('Update notification failed:', error);
    if (PLATFORM === 'darwin') {
      log.warn('Check System Settings > Notifications > Messenger Desktop');
    }
  });
  updateNotification.on('click', () => {
    void shell.openExternal(GITHUB_RELEASES_URL);
  });
  updateNotification.show();
}

function isNewerVersion(latestVersion: string, currentVersion: string): boolean {
  const [latestMajor, latestMinor, latestPatch] = parseVersion(latestVersion);
  const [currentMajor, currentMinor, currentPatch] = parseVersion(currentVersion);

  if (latestMajor !== currentMajor) {
    return latestMajor > currentMajor;
  }

  if (latestMinor !== currentMinor) {
    return latestMinor > currentMinor;
  }

  return latestPatch > currentPatch;
}

function parseVersion(versionString: string): number[] {
  return versionString.replace(/^v/, '').split('.').map(Number);
}
