import path from 'path';

export const APP_NAME = 'Messenger Desktop';
export const MESSENGER_URL = 'https://www.facebook.com/messages';
export const PARTITION = 'persist:messenger';
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
