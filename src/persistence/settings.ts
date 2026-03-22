import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../util/logging';
import { readJsonFile } from './persistence';

export interface Settings {
  start_minimized: boolean;
  minimize_to_tray: boolean;
  close_to_tray: boolean;
}

const log = createLogger('settings');

export const settings: Settings = {
  start_minimized: false,
  minimize_to_tray: true,
  close_to_tray: true
};

export function loadSettings(): void {
  const filePath = settingsPath();
  log.info('Loading from', filePath);

  const result = readJsonFile<Settings>(filePath);
  if (result.status === 'missing') {
    log.info('Settings file not found, saving defaults');
    saveSettings();
  } else if (result.status === 'corrupt') {
    log.warn('Failed to parse settings, saving defaults. File contents were:', result.rawContent);
    saveSettings();
  } else {
    Object.assign(settings, result.data);
    log.info('Loaded successfully');
  }
}

export function saveSettings(): void {
  const filePath = settingsPath();
  try {
    log.info('Saving to', filePath);
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
    log.info('Saved successfully');
  } catch (e) {
    log.error('Failed to save:', e instanceof Error ? e.message : e);
  }
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}
