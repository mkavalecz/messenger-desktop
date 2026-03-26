import { EventEmitter } from 'events';

type MockWindowInstance = EventEmitter & {
  currentTitle: string;
  focused: boolean;
  minimized: boolean;
  destroyed: boolean;
  maximized: boolean;
  visible: boolean;
  webContents: EventEmitter & {
    setWindowOpenHandler: jest.Mock;
  };
  loadURL: jest.Mock;
  setMenuBarVisibility: jest.Mock;
  isDestroyed: jest.Mock<boolean, []>;
  isMinimized: jest.Mock<boolean, []>;
  restore: jest.Mock<void, []>;
  maximize: jest.Mock<void, []>;
  show: jest.Mock<void, []>;
  focus: jest.Mock<void, []>;
  hide: jest.Mock<void, []>;
  isVisible: jest.Mock<boolean, []>;
  isFocused: jest.Mock<boolean, []>;
  getTitle: jest.Mock<string, []>;
};

type MockNotificationInstance = EventEmitter & {
  options: { title: string; body: string };
  show: jest.Mock<void, []>;
};

describe('window mac notifications', () => {
  const browserWindowInstances: MockWindowInstance[] = [];
  const notificationInstances: MockNotificationInstance[] = [];
  const appFocusMock = jest.fn();
  const setPermissionRequestHandlerMock = jest.fn();
  const openExternalMock = jest.fn();
  const setApplicationMenuMock = jest.fn();
  const buildFromTemplateMock = jest.fn(() => ({}));
  const loadWindowStateMock = jest.fn();
  const saveBoundsMock = jest.fn();
  const saveWindowStateMock = jest.fn();
  const setupNavigationGuardMock = jest.fn();
  const isAllowedHostMock = jest.fn(() => true);
  const logInfoMock = jest.fn();
  const logWarnMock = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    browserWindowInstances.length = 0;
    notificationInstances.length = 0;
    appFocusMock.mockReset();
    setPermissionRequestHandlerMock.mockReset();
    openExternalMock.mockReset();
    setApplicationMenuMock.mockReset();
    buildFromTemplateMock.mockClear();
    loadWindowStateMock.mockReset();
    saveBoundsMock.mockReset();
    saveWindowStateMock.mockReset();
    setupNavigationGuardMock.mockReset();
    isAllowedHostMock.mockClear();
    logInfoMock.mockReset();
    logWarnMock.mockReset();

    jest.doMock('electron', () => {
      class MockNotification extends EventEmitter {
        options: { title: string; body: string };
        show = jest.fn<void, []>();

        constructor(options: { title: string; body: string }) {
          super();
          this.options = options;
          notificationInstances.push(this as unknown as MockNotificationInstance);
        }

        override removeAllListeners(eventName?: string | symbol): this {
          return super.removeAllListeners(eventName);
        }

        static isSupported(): boolean {
          return true;
        }
      }

      class MockBrowserWindow extends EventEmitter {
        currentTitle = '';
        focused = false;
        minimized = false;
        destroyed = false;
        maximized = false;
        visible = false;
        webContents = Object.assign(new EventEmitter(), {
          setWindowOpenHandler: jest.fn()
        });
        loadURL = jest.fn<void, [string]>();
        setMenuBarVisibility = jest.fn<void, [boolean]>();
        isDestroyed = jest.fn<boolean, []>(() => this.destroyed);
        isMinimized = jest.fn<boolean, []>(() => this.minimized);
        restore = jest.fn<void, []>(() => {
          this.minimized = false;
        });
        maximize = jest.fn<void, []>(() => {
          this.maximized = true;
        });
        show = jest.fn<void, []>(() => {
          this.visible = true;
        });
        focus = jest.fn<void, []>(() => {
          this.focused = true;
          this.emit('focus');
        });
        hide = jest.fn<void, []>(() => {
          this.visible = false;
        });
        isVisible = jest.fn<boolean, []>(() => this.visible);
        isFocused = jest.fn<boolean, []>(() => this.focused);
        getTitle = jest.fn<string, []>(() => this.currentTitle);

        constructor() {
          super();
          browserWindowInstances.push(this as unknown as MockWindowInstance);
        }
      }

      return {
        app: {
          name: 'Messenger Desktop',
          focus: appFocusMock,
          quit: jest.fn()
        },
        BrowserWindow: MockBrowserWindow,
        Menu: {
          setApplicationMenu: setApplicationMenuMock,
          buildFromTemplate: buildFromTemplateMock
        },
        Notification: MockNotification,
        session: {
          fromPartition: jest.fn(() => ({
            setPermissionRequestHandler: setPermissionRequestHandlerMock
          }))
        },
        shell: {
          openExternal: openExternalMock
        }
      };
    });

    jest.doMock('../util/constants', () => ({
      getWindowIcon: jest.fn(() => 'icon.icns'),
      MESSENGER_URL: 'https://www.facebook.com/messages',
      PARTITION: 'persist:messenger',
      PLATFORM: 'darwin'
    }));

    jest.doMock('../util/navigation', () => ({
      isAllowedHost: isAllowedHostMock,
      setupNavigationGuard: setupNavigationGuardMock
    }));

    jest.doMock('../persistence/settings', () => ({
      settings: {
        start_minimized: false,
        close_to_tray: false,
        minimize_to_tray: false
      }
    }));

    jest.doMock('../persistence/windowState', () => ({
      loadWindowState: loadWindowStateMock,
      saveBounds: saveBoundsMock,
      saveWindowState: saveWindowStateMock,
      windowState: {
        x: 10,
        y: 20,
        width: 1200,
        height: 800,
        maximized: false
      }
    }));

    jest.doMock('../util/logging', () => ({
      createLogger: jest.fn(() => ({
        info: logInfoMock,
        warn: logWarnMock
      }))
    }));
  });

  function loadWindowModule() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../window') as typeof import('../window');
  }

  function createWindow() {
    const { createMainWindow } = loadWindowModule();
    createMainWindow({
      isQuitting: () => false,
      onTitleUpdate: jest.fn()
    });
    return browserWindowInstances[0];
  }

  function emitTitle(window: MockWindowInstance, title: string) {
    window.currentTitle = title;
    window.webContents.emit('page-title-updated', {}, title);
  }

  it('shows only one notification for a single unread session', () => {
    const window = createWindow();
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

  it('opens and focuses the app when the notification is clicked', () => {
    const window = createWindow();
    window.focused = false;

    emitTitle(window, 'Messenger');
    emitTitle(window, '(1) Messenger');

    expect(notificationInstances).toHaveLength(1);

    const showCallCountBeforeClick = window.show.mock.calls.length;
    const focusCallCountBeforeClick = window.focus.mock.calls.length;

    notificationInstances[0].emit('click');

    expect(window.show).toHaveBeenCalledTimes(showCallCountBeforeClick + 1);
    expect(window.focus).toHaveBeenCalledTimes(focusCallCountBeforeClick + 1);
    expect(appFocusMock).toHaveBeenCalledTimes(1);
  });

  it('re-arms notifications only after the app is focused', () => {
    const window = createWindow();
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
