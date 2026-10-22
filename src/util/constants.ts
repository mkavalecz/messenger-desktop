import path from 'path';
import { app, nativeImage } from 'electron';

// noinspection JSDeprecatedSymbols
export const PLATFORM = process.platform;
export const IS_DEBUG = process.argv.includes('--debug-mode');
export const IS_WAYLAND =
  PLATFORM === 'linux' && (process.env.WAYLAND_DISPLAY !== undefined || process.env.XDG_SESSION_TYPE === 'wayland');

export const APP_NAME = 'Messenger Desktop';
export const APP_ID = 'io.github.mkavalecz.messenger-desktop';
export const PARTITION = 'persist:messenger';

export const MESSENGER_URL = 'https://www.messenger.com';
export const ALLOWED_DOMAINS = ['www.facebook.com', 'www.messenger.com'];

const ALLOWED_DOMAINS_PATTERN = `(?:${ALLOWED_DOMAINS.map(escapeRegExp).join('|')})`;

// Note: these are serialized into the renderer-side navigation guard via their source/flags,
// so avoid the `g`/`y` flags (stateful lastIndex) and keep them self-contained.
export const INTERNAL_URL_PATTERNS: RegExp[] = [
  /^about:blank$/,

  new RegExp(`^${escapeRegExp(MESSENGER_URL)}(?:[/?#]|$)`),

  allowedPath('groupcall'),
  allowedPath('login'),
  allowedPath('two_step_verification'),
  allowedPath('two_factor'),
  allowedPath('checkpoint'),
  allowedPath('privacy/consent'),
  allowedPath('messenger_media'),

  /^(?:blob|data|javascript|wss?):/
];

export const BADGE_CLEAR_DELAY_MS = 2000;

export const LOG_ROTATION_SIZE_BYTES = 300 * 1024;
export const LOG_ROTATION_MAX_FILES = 4;

export const GITHUB_REPO = 'mkavalecz/messenger-desktop';
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
export const GITHUB_RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export const ICONS_DIR = path.join(__dirname, '..', '..', 'icons');
export const TRAY_ICON_DIR = path.join(ICONS_DIR, 'tray');
export const ABOUT_HTML_PATH = path.join(__dirname, '..', '..', 'assets', 'about.html');
export const SCREEN_SHARE_PICKER_HTML_PATH = path.join(__dirname, '..', '..', 'assets', 'screen-share-picker.html');

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Matches the given path (and anything after it) under any of the allowed domains.
function allowedPath(path: string): RegExp {
  return new RegExp(`^https://${ALLOWED_DOMAINS_PATTERN}/${escapeRegExp(path)}`);
}

export function getUserDataDir(): string {
  return app.getPath('userData');
}
export function getWindowStateFile(): string {
  return path.join(getUserDataDir(), 'window-state.json');
}
export function getSettingsFile(): string {
  return path.join(getUserDataDir(), 'settings.json');
}
export function getLogsDir(): string {
  return app.getPath('logs');
}
export function getLogFile(): string {
  return path.join(getLogsDir(), 'app.log');
}

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
