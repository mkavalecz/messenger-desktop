import { BrowserWindow, Notification, app } from 'electron';
import { settings } from './persistence/settings';
import { createLogger } from './util/logging';
import { PLATFORM } from './util/constants';

const log = createLogger('notification');

let lastUnreadCount = 0;
let messageNotification: Notification | null = null;
let hasUnreadStateInitialized = false;
let notificationsLockedUntilFocus = false;

export function resetNotificationLock(currentTitle: string): void {
  notificationsLockedUntilFocus = false;
  lastUnreadCount = parseUnreadCount(currentTitle);
}

export function setupWindowNotifications(browserWindow: BrowserWindow, onShowWindow: () => void): void {
  browserWindow.webContents.on('page-title-updated', (_e, title) => {
    const unreadCount = parseUnreadCount(title);

    if (!hasUnreadStateInitialized) {
      hasUnreadStateInitialized = true;
      lastUnreadCount = unreadCount;
      return;
    }

    if ((PLATFORM !== 'darwin' && browserWindow.isVisible()) || browserWindow.isFocused()) {
      lastUnreadCount = unreadCount;
      notificationsLockedUntilFocus = false;
      return;
    }

    if (notificationsLockedUntilFocus) {
      lastUnreadCount = unreadCount;
      return;
    }

    const shouldNotify = unreadCount > lastUnreadCount;
    if (shouldNotify) {
      showMessageNotification(onShowWindow);
      notificationsLockedUntilFocus = true;
    }

    lastUnreadCount = unreadCount;
  });

  browserWindow.on('focus', () => {
    notificationsLockedUntilFocus = false;
    lastUnreadCount = parseUnreadCount(browserWindow.getTitle());
  });
}

function parseUnreadCount(title: string): number {
  const match = title.match(/^\((\d+)\)/);
  return match ? parseInt(match[1], 10) : 0;
}

function showMessageNotification(onShowWindow: () => void): void {
  if (!settings.show_notifications) {
    return;
  }
  if (!Notification.isSupported()) {
    log.warn('Notifications are not supported on this platform');
    return;
  }
  messageNotification?.removeAllListeners();
  messageNotification = new Notification({
    title: app.getName(),
    body: 'New message arrived'
  });

  messageNotification.on('click', () => {
    onShowWindow();
  });

  messageNotification.show();
}
