import type { BrowserWindow } from 'electron';
import fs from 'fs';
import { createLogger } from '../util/logging';
import { readJsonFile } from './persistence';
import { getWindowStateFile, IS_WAYLAND } from '../util/constants';

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
  log.info('Loading from', getWindowStateFile());

  const result = readJsonFile<WindowState>(getWindowStateFile());

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
  try {
    log.info('Saving to', getWindowStateFile());
    fs.writeFileSync(getWindowStateFile(), JSON.stringify(windowState, null, 2));
    log.info('Saved successfully');
  } catch (e) {
    log.error('Failed to save:', e instanceof Error ? e.message : e);
  }
}

export function saveBounds(browserWindow: BrowserWindow): void {
  if (browserWindow.isDestroyed() || browserWindow.isMinimized() || browserWindow.isMaximized()) {
    return;
  }
  const { x, y, width, height } = browserWindow.getBounds();
  // On Wayland, absolute window coordinates are unreliable — skip them to avoid
  // the window jumping to a wrong position on next launch or during drag.
  if (IS_WAYLAND) {
    windowState.width = width;
    windowState.height = height;
  } else {
    Object.assign(windowState, { x, y, width, height });
  }
  saveWindowState();
}
