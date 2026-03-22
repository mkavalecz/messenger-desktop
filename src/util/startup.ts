import { app } from 'electron';
import { createLogger } from './logging';

const log = createLogger('startup');

export function isRunOnStartup(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}

export function setRunOnStartup(enabled: boolean): void {
  log.info(enabled ? 'Enabling run on startup' : 'Disabling run on startup');
  app.setLoginItemSettings({ openAtLogin: enabled });
}
