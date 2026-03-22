import type { BrowserWindow } from 'electron';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../util/logging';
import { readJsonFile } from './persistence';

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

const log = createLogger('windowState');

export const windowState: WindowState = { width: 1280, height: 720, maximized: false };

export function loadWindowState(): void {
  const filePath = statePath();
  log.info('Loading from', filePath);

  const result = readJsonFile<WindowState>(filePath);

  if (result.status === 'missing') {
    log.info('Window state file not found, saving defaults');
    saveWindowState();
  } else if (result.status === 'corrupt') {
    log.warn('Failed to parse window state, saving defaults. File contents were:', result.rawContent);
    saveWindowState();
  } else {
    Object.assign(windowState, result.data);
    log.info('Loaded successfully');
  }
}

export function saveWindowState(): void {
  const filePath = statePath();
  try {
    log.info('Saving to', filePath);
    fs.writeFileSync(filePath, JSON.stringify(windowState, null, 2));
    log.info('Saved successfully');
  } catch (e) {
    log.error('Failed to save:', e instanceof Error ? e.message : e);
  }
}

export function saveBounds(browserWindow: BrowserWindow): void {
  if (browserWindow.isDestroyed() || browserWindow.isMinimized() || browserWindow.isMaximized()) {
    return;
  }
  Object.assign(windowState, browserWindow.getBounds());
  saveWindowState();
}

function statePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}
