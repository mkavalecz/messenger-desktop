import { app, net, Notification, shell } from 'electron';
import { GITHUB_RELEASES_API_URL, GITHUB_RELEASES_URL } from './constants';
import { createLogger } from './logging';

const log = createLogger('updater');

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
  const notification = new Notification({
    title: 'Update available',
    body: `Version ${version} is available — click here to download`
  });
  notification.on('click', () => {
    void shell.openExternal(GITHUB_RELEASES_URL);
  });
  notification.show();
}

function isNewerVersion(latestVersion: string, currentVersion: string): boolean {
  const parse = (v: string): number[] => v.replace(/^v/, '').split('.').map(Number);
  const [latestMajor, latestMinor, latestPatch] = parse(latestVersion);
  const [currentMajor, currentMinor, currentPatch] = parse(currentVersion);
  if (latestMajor !== currentMajor) return latestMajor > currentMajor;
  if (latestMinor !== currentMinor) return latestMinor > currentMinor;
  return latestPatch > currentPatch;
}
