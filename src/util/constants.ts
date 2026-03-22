import path from 'path';

export const APP_NAME = 'Messenger Desktop';
export const MESSENGER_URL = 'https://www.facebook.com/messages';
export const PARTITION = 'persist:messenger';
export const LOG_ROTATION_SIZE_BYTES = 300 * 1024;
export const LOG_ROTATION_MAX_FILES = 4;
export const GITHUB_REPO = 'mkavalecz/messenger-desktop';
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
export const GITHUB_RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const ICONS_DIR = path.join(__dirname, '..', '..', 'icons');
export const TRAY_ICON_PATH = path.join(ICONS_DIR, 'tray.png');

// noinspection JSDeprecatedSymbols
export const PLATFORM = process.platform;

export function getWindowIcon(): string {
  if (PLATFORM === 'win32') {
    return path.join(ICONS_DIR, 'icon.ico');
  }
  if (PLATFORM === 'darwin') {
    return path.join(ICONS_DIR, 'icon.icns');
  }
  return path.join(ICONS_DIR, 'icon.png');
}
