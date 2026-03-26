import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../util/logging';
import { readJsonFile } from './persistence';

export interface Settings {
  show_notifications: boolean;
  minimize_to_tray: boolean;
  close_to_tray: boolean;
  start_minimized: boolean;
  check_for_updates: boolean;
}

const log = createLogger('settings');

export const settings: Settings = {
  show_notifications: true,
  minimize_to_tray: true,
  close_to_tray: true,
  start_minimized: false,
  check_for_updates: true
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
