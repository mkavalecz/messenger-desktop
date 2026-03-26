import fs from 'fs';
import os from 'os';
import path from 'path';

describe('settings', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'messenger-settings-test-'));
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
    return require('../../../src/persistence/settings') as typeof import('../../../src/persistence/settings');
  }

  const DEFAULTS = {
    show_notifications: true,
    minimize_to_tray: true,
    close_to_tray: true,
    start_minimized: false,
    check_for_updates: true
  };

  describe('loadSettings', () => {
    it('preserves all defaults when the file is missing', () => {
      const { loadSettings, settings } = loadModule();
      loadSettings();
      expect(settings).toMatchObject(DEFAULTS);
    });

    it('writes defaults to disk when the file is missing', () => {
      const { loadSettings } = loadModule();
      loadSettings();
      const saved = JSON.parse(fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf8'));
      expect(saved).toMatchObject(DEFAULTS);
    });

    it('preserves defaults when the file is corrupt', () => {
      fs.writeFileSync(path.join(tmpDir, 'settings.json'), 'not valid json');
      const { loadSettings, settings } = loadModule();
      loadSettings();
      expect(settings).toMatchObject(DEFAULTS);
    });

    it('loads all settings from a valid file', () => {
      const saved = { show_notifications: false, minimize_to_tray: false, close_to_tray: false, start_minimized: true, check_for_updates: false };
      fs.writeFileSync(path.join(tmpDir, 'settings.json'), JSON.stringify(saved));
      const { loadSettings, settings } = loadModule();
      loadSettings();
      expect(settings).toMatchObject(saved);
    });

    it('merges partial settings over defaults', () => {
      fs.writeFileSync(path.join(tmpDir, 'settings.json'), JSON.stringify({ start_minimized: true }));
      const { loadSettings, settings } = loadModule();
      loadSettings();
      expect(settings.start_minimized).toBe(true);
      expect(settings.show_notifications).toBe(true);
    });
  });

  describe('saveSettings', () => {
    it('writes the current settings object to disk', () => {
      const { saveSettings, settings } = loadModule();
      settings.start_minimized = true;
      settings.show_notifications = false;
      saveSettings();
      const saved = JSON.parse(fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf8'));
      expect(saved.start_minimized).toBe(true);
      expect(saved.show_notifications).toBe(false);
    });
  });
});
