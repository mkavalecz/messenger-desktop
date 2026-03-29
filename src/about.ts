import { app, BrowserWindow, shell } from 'electron';
import { ABOUT_HTML_PATH } from './util/constants';
import { createLogger } from './util/logging';

const log = createLogger('about');

let aboutWindow: BrowserWindow | null = null;

export function showAboutWindow(): void {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus();
    return;
  }

  aboutWindow = new BrowserWindow({
    width: 360,
    height: 270,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: `About ${app.getName()}`,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  aboutWindow.setMenuBarVisibility(false);

  void aboutWindow.loadFile(ABOUT_HTML_PATH, {
    query: { version: app.getVersion() }
  });

  aboutWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  aboutWindow.webContents.on('will-navigate', (e, url) => {
    e.preventDefault();
    void shell.openExternal(url);
  });

  aboutWindow.on('closed', () => {
    aboutWindow = null;
  });

  log.info('About window opened');
}
