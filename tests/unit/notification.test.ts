import { EventEmitter } from 'events';
import type { BrowserWindow } from 'electron';

type MockWindowInstance = EventEmitter & {
  currentTitle: string;
  focused: boolean;
  visible: boolean;
  webContents: EventEmitter;
  isFocused: jest.Mock<boolean, []>;
  isVisible: jest.Mock<boolean, []>;
  getTitle: jest.Mock<string, []>;
};

type MockNotificationInstance = EventEmitter & {
  options: { title: string; body: string };
  show: jest.Mock<void, []>;
};

describe('notifications', () => {
  const notificationInstances: MockNotificationInstance[] = [];
  const showWindowMock = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    notificationInstances.length = 0;
    showWindowMock.mockReset();

    jest.doMock('electron', () => {
      const NotificationMock = jest.fn().mockImplementation((options: { title: string; body: string }) => {
        const instance: MockNotificationInstance = Object.assign(new EventEmitter(), {
          options,
          show: jest.fn()
        });
        notificationInstances.push(instance);
        return instance;
      });
      (NotificationMock as unknown as { isSupported: () => boolean }).isSupported = () => true;

      return {
        Notification: NotificationMock,
        app: { getName: () => 'Messenger Desktop' }
      };
    });

    jest.doMock('../../src/util/constants', () => ({
      PLATFORM: 'darwin'
    }));

    jest.doMock('../../src/persistence/settings', () => ({
      settings: { show_notifications: true }
    }));
  });

  function loadNotificationModule() {
    return require('../../src/notification') as typeof import('../../src/notification');
  }

  function createMockWindow(): MockWindowInstance {
    const instance = Object.assign(new EventEmitter(), {
      currentTitle: '',
      focused: false,
      visible: true,
      webContents: new EventEmitter(),
      isFocused: jest.fn<boolean, []>(),
      isVisible: jest.fn<boolean, []>(),
      getTitle: jest.fn<string, []>()
    }) as MockWindowInstance;
    instance.isFocused.mockImplementation(() => instance.focused);
    instance.isVisible.mockImplementation(() => instance.visible);
    instance.getTitle.mockImplementation(() => instance.currentTitle);
    return instance;
  }

  function setup() {
    const { setupWindowNotifications } = loadNotificationModule();
    const window = createMockWindow();
    setupWindowNotifications(window as unknown as BrowserWindow, showWindowMock);
    return window;
  }

  function emitTitle(window: MockWindowInstance, title: string) {
    window.currentTitle = title;
    window.webContents.emit('page-title-updated', {}, title);
  }

  it('show only one notification for a single unread session', () => {
    const window = setup();
    window.focused = false;

    emitTitle(window, 'Messenger');
    emitTitle(window, '(1) Messenger');
    emitTitle(window, '(1) Alice sent a message');
    emitTitle(window, '(2) Messenger');
    emitTitle(window, '(2) Alice sent a message');

    expect(notificationInstances).toHaveLength(1);
    expect(notificationInstances[0].show).toHaveBeenCalledTimes(1);
    expect(notificationInstances[0].options).toEqual({
      title: 'Messenger Desktop',
      body: 'New message arrived'
    });
  });

  it('call the show-window callback when the notification is clicked', () => {
    const window = setup();
    window.focused = false;

    emitTitle(window, 'Messenger');
    emitTitle(window, '(1) Messenger');

    expect(notificationInstances).toHaveLength(1);
    notificationInstances[0].emit('click');

    expect(showWindowMock).toHaveBeenCalledTimes(1);
  });

  it('re-arm notifications only after the app is focused', () => {
    const window = setup();
    window.focused = false;

    emitTitle(window, 'Messenger');
    emitTitle(window, '(1) Messenger');
    emitTitle(window, '(2) Messenger');

    expect(notificationInstances).toHaveLength(1);

    window.currentTitle = '(2) Messenger';
    window.focused = true;
    window.emit('focus');

    window.focused = false;
    emitTitle(window, '(3) Messenger');

    expect(notificationInstances).toHaveLength(2);
    expect(notificationInstances[1].show).toHaveBeenCalledTimes(1);
  });
});
