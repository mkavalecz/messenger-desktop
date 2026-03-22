import path from 'path';

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../constants') as typeof import('../constants');
  }
});
