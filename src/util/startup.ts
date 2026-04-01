import fs from 'fs';
import os from 'os';
import path from 'path';
import { app } from 'electron';
import { APP_NAME, PLATFORM } from './constants';
import { createLogger } from './logging';

const log = createLogger('startup');

function getAutostartDesktopPath(): string {
  return path.join(os.homedir(), '.config', 'autostart', 'messenger-desktop.desktop');
}

function buildDesktopEntry(): string {
  return [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${APP_NAME}`,
    `Exec=${process.execPath}`,
    'X-GNOME-Autostart-enabled=true',
    'Hidden=false',
    'NoDisplay=false',
    `Comment=Start ${APP_NAME} on login`,
  ].join('\n') + '\n';
}

export function isRunOnStartup(): boolean {
  if (PLATFORM === 'linux') {
    return fs.existsSync(getAutostartDesktopPath());
  }
  return app.getLoginItemSettings().openAtLogin;
}

export function setRunOnStartup(enabled: boolean): void {
  log.info(enabled ? 'Enabling run on startup' : 'Disabling run on startup');
  if (PLATFORM === 'linux') {
    const desktopPath = getAutostartDesktopPath();
    if (enabled) {
      fs.mkdirSync(path.dirname(desktopPath), { recursive: true });
      fs.writeFileSync(desktopPath, buildDesktopEntry(), 'utf8');
    } else {
      if (fs.existsSync(desktopPath)) {
        fs.unlinkSync(desktopPath);
      }
    }
    return;
  }
  app.setLoginItemSettings({ openAtLogin: enabled });
}
