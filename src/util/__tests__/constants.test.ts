import path from 'path';

const mockNativeImage = { createFromPath: jest.fn((p: string) => ({ path: p })) };
jest.mock('electron', () => ({ nativeImage: mockNativeImage }));

describe('getWindowIcon', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    jest.resetModules();
  });

  it('returns .ico path on win32', () => {
    const { getWindowIcon, ICONS_DIR } = loadWithPlatform('win32');
    expect(getWindowIcon()).toBe(path.join(ICONS_DIR, 'icon.ico'));
  });

  it('returns .icns path on darwin', () => {
    const { getWindowIcon, ICONS_DIR } = loadWithPlatform('darwin');
    expect(getWindowIcon()).toBe(path.join(ICONS_DIR, 'icon.icns'));
  });

  it('returns .png path on linux', () => {
    const { getWindowIcon, ICONS_DIR } = loadWithPlatform('linux');
    expect(getWindowIcon()).toBe(path.join(ICONS_DIR, 'icon.png'));
  });

  it('returns .png path for unknown platforms', () => {
    const { getWindowIcon, ICONS_DIR } = loadWithPlatform('freebsd');
    expect(getWindowIcon()).toBe(path.join(ICONS_DIR, 'icon.png'));
  });

  function loadWithPlatform(platform: string) {
    Object.defineProperty(process, 'platform', { value: platform });
    return require('../constants') as typeof import('../constants');
  }
});

describe('getTrayIcon', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    jest.resetModules();
    mockNativeImage.createFromPath.mockClear();
  });

  it('returns mac.png on darwin (normal)', () => {
    const { getTrayIcon, TRAY_ICON_DIR } = loadWithPlatform('darwin');
    getTrayIcon(false);
    expect(mockNativeImage.createFromPath).toHaveBeenCalledWith(path.join(TRAY_ICON_DIR, 'mac.png'));
  });

  it('throws on darwin when badge is requested', () => {
    const { getTrayIcon } = loadWithPlatform('darwin');
    expect(() => getTrayIcon(true)).toThrow('Badge icons are not supported on macOS');
  });

  it('returns normal.png on linux', () => {
    const { getTrayIcon, TRAY_ICON_DIR } = loadWithPlatform('linux');
    getTrayIcon(false);
    expect(mockNativeImage.createFromPath).toHaveBeenCalledWith(path.join(TRAY_ICON_DIR, 'normal.png'));
  });

  it('returns badge.png on linux', () => {
    const { getTrayIcon, TRAY_ICON_DIR } = loadWithPlatform('linux');
    getTrayIcon(true);
    expect(mockNativeImage.createFromPath).toHaveBeenCalledWith(path.join(TRAY_ICON_DIR, 'badge.png'));
  });

  it('returns normal.png on win32', () => {
    const { getTrayIcon, TRAY_ICON_DIR } = loadWithPlatform('win32');
    getTrayIcon(false);
    expect(mockNativeImage.createFromPath).toHaveBeenCalledWith(path.join(TRAY_ICON_DIR, 'normal.png'));
  });

  it('returns badge.png on win32', () => {
    const { getTrayIcon, TRAY_ICON_DIR } = loadWithPlatform('win32');
    getTrayIcon(true);
    expect(mockNativeImage.createFromPath).toHaveBeenCalledWith(path.join(TRAY_ICON_DIR, 'badge.png'));
  });

  function loadWithPlatform(platform: string) {
    Object.defineProperty(process, 'platform', { value: platform });
    return require('../constants') as typeof import('../constants');
  }
});
