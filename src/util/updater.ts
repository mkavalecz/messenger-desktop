import { app, net, Notification, shell } from 'electron';
import { GITHUB_RELEASES_API_URL, GITHUB_RELEASES_URL } from './constants';
import { createLogger } from './logging';

const log = createLogger('updater');

// Held at module scope to prevent garbage collection before the notification renders.
let updateNotification: Notification | null = null;

export async function checkForUpdates(): Promise<void> {
  try {
    log.info('Checking for updates');
    const response = await net.fetch(GITHUB_RELEASES_API_URL);
    if (!response.ok) {
      log.warn('Update check failed with status:', String(response.status));
      return;
    }
    const data = (await response.json()) as { tag_name: string };
    const latestVersion = data.tag_name;
    const currentVersion = app.getVersion();

    if (isNewerVersion(latestVersion, currentVersion)) {
      log.info(`Update available: ${latestVersion} (current: ${currentVersion})`);
      showUpdateNotification(latestVersion);
    } else {
      log.info(`App is up to date (${currentVersion})`);
    }
  } catch (e) {
    log.warn('Update check failed:', e instanceof Error ? e.message : e);
  }
}

function showUpdateNotification(version: string): void {
  if (!Notification.isSupported()) {
    log.warn('Notifications are not supported on this platform');
    return;
  }
  updateNotification = new Notification({
    title: `Version ${version} is available`,
    body: 'Click here to download'
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
