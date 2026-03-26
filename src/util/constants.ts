import path from 'path';
import { nativeImage } from 'electron';

// noinspection JSDeprecatedSymbols
export const PLATFORM = process.platform;

export const APP_NAME = 'Messenger Desktop';
export const APP_ID = 'io.github.mkavalecz.messenger-desktop';

export const MESSENGER_URL = 'https://www.facebook.com/messages';
export const CALL_URL = 'https://www.facebook.com/groupcall';
export const PARTITION = 'persist:messenger';

export const BADGE_CLEAR_DELAY_MS = 2000;
export const UPDATE_CHECK_DELAY_MS = 10_000;

export const LOG_ROTATION_SIZE_BYTES = 300 * 1024;
export const LOG_ROTATION_MAX_FILES = 4;

export const GITHUB_REPO = 'mkavalecz/messenger-desktop';
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
export const GITHUB_RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export const ICONS_DIR = path.join(__dirname, '..', '..', 'icons');
export const TRAY_ICON_DIR = path.join(ICONS_DIR, 'tray');
export const ABOUT_HTML_PATH = path.join(__dirname, '..', '..', 'assets', 'about.html');

export function getWindowIcon(): string {
  if (PLATFORM === 'win32') {
    return path.join(ICONS_DIR, 'icon.ico');
  }
  if (PLATFORM === 'darwin') {
    return path.join(ICONS_DIR, 'icon.icns');
  }
  return path.join(ICONS_DIR, 'icon.png');
}

export function getTrayIcon(isBadge: boolean): Electron.NativeImage {
  if (PLATFORM === 'darwin') {
    if (isBadge) {
      throw new Error('Badge icons are not supported on macOS');
    }
    return nativeImage.createFromPath(path.join(TRAY_ICON_DIR, 'mac.png'));
  }

  return nativeImage.createFromPath(path.join(TRAY_ICON_DIR, isBadge ? 'badge.png' : 'normal.png'));
}
