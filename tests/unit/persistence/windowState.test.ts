import fs from 'fs';
import os from 'os';
import path from 'path';
import type { BrowserWindow } from 'electron';

describe('windowState', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'messenger-windowstate-test-'));
    jest.resetModules();
    jest.doMock('electron', () => ({ app: { getPath: jest.fn().mockReturnValue(tmpDir) } }));
    jest.doMock('../../../src/util/logging', () => ({
      createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })
    }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  function loadModule() {
    return require('../../../src/persistence/windowState') as typeof import('../../../src/persistence/windowState');
  }

  function mockWindow(overrides: { destroyed?: boolean; minimized?: boolean; maximized?: boolean; bounds?: { x: number; y: number; width: number; height: number } }): BrowserWindow {
    return {
      isDestroyed: jest.fn().mockReturnValue(overrides.destroyed ?? false),
      isMinimized: jest.fn().mockReturnValue(overrides.minimized ?? false),
      isMaximized: jest.fn().mockReturnValue(overrides.maximized ?? false),
      getBounds: jest.fn().mockReturnValue(overrides.bounds ?? { x: 100, y: 200, width: 800, height: 600 })
    } as unknown as BrowserWindow;
  }

  const DEFAULTS = { width: 1280, height: 720, maximized: false };

  describe('loadWindowState', () => {
    it('preserves defaults when the file is missing', () => {
      const { loadWindowState, windowState } = loadModule();
      loadWindowState();
      expect(windowState).toMatchObject(DEFAULTS);
    });

    it('writes defaults to disk when the file is missing', () => {
      const { loadWindowState } = loadModule();
      loadWindowState();
      const saved = JSON.parse(fs.readFileSync(path.join(tmpDir, 'window-state.json'), 'utf8'));
      expect(saved).toMatchObject(DEFAULTS);
    });

    it('preserves defaults when the file is corrupt', () => {
      fs.writeFileSync(path.join(tmpDir, 'window-state.json'), 'not valid json');
      const { loadWindowState, windowState } = loadModule();
      loadWindowState();
      expect(windowState).toMatchObject(DEFAULTS);
    });

    it('restores saved window state', () => {
      const saved = { x: 50, y: 75, width: 1920, height: 1080, maximized: true };
      fs.writeFileSync(path.join(tmpDir, 'window-state.json'), JSON.stringify(saved));
      const { loadWindowState, windowState } = loadModule();
      loadWindowState();
      expect(windowState).toMatchObject(saved);
    });
  });

  describe('saveBounds', () => {
    it('saves bounds for a normal visible window', () => {
      const { saveBounds, windowState } = loadModule();
      const bounds = { x: 10, y: 20, width: 900, height: 700 };
      saveBounds(mockWindow({ bounds }));
      expect(windowState).toMatchObject(bounds);
    });

    it('skips saving when the window is destroyed', () => {
      const { saveBounds, windowState } = loadModule();
      const originalWidth = windowState.width;
      saveBounds(mockWindow({ destroyed: true }));
      expect(windowState.width).toBe(originalWidth);
    });

    it('skips saving when the window is minimized', () => {
      const { saveBounds, windowState } = loadModule();
      const originalWidth = windowState.width;
      saveBounds(mockWindow({ minimized: true }));
      expect(windowState.width).toBe(originalWidth);
    });

    it('skips saving when the window is maximized', () => {
      const { saveBounds, windowState } = loadModule();
      const originalWidth = windowState.width;
      saveBounds(mockWindow({ maximized: true }));
      expect(windowState.width).toBe(originalWidth);
    });
  });
});
