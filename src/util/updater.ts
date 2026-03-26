import { app, dialog, net, Notification, shell } from 'electron';
import { GITHUB_RELEASES_API_URL, GITHUB_RELEASES_URL, PLATFORM, UPDATE_CHECK_DELAY_MS } from './constants';
import { createLogger } from './logging';

const log = createLogger('updater');

// Held at module scope to prevent garbage collection before the notification renders.
let updateNotification: Notification | null = null;

export interface CheckForUpdatesOptions {
  interactive?: boolean;
}

export async function checkForUpdates(options: CheckForUpdatesOptions = {}): Promise<void> {
  const { interactive = false } = options;

  if (!interactive) {
    await new Promise((resolve) => setTimeout(resolve, UPDATE_CHECK_DELAY_MS));
  }

  try {
    log.info('Checking for updates');
    const response = await net.fetch(GITHUB_RELEASES_API_URL);
    if (!response.ok) {
      log.warn('Update check failed with status:', String(response.status));
      if (interactive) {
        await showUpdateError('The update server returned an unexpected response.');
      }
      return;
    }
    const data = (await response.json()) as { tag_name: string };
    const latestVersion = data.tag_name;
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
        await dialog.showMessageBox({
          type: 'info',
          title: 'No updates available',
          message: 'Messenger Desktop is up to date.',
          detail: `You are using version ${currentVersion}.`
        });
      }
    }
  } catch (e) {
    log.warn('Update check failed:', e instanceof Error ? e.message : e);
    if (interactive) {
      await showUpdateError('Unable to check for updates right now. Please try again later.');
    }
  }
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

async function showUpdateError(detail: string): Promise<void> {
  await dialog.showMessageBox({
    type: 'error',
    title: 'Update check failed',
    message: 'Unable to check for updates.',
    detail
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
