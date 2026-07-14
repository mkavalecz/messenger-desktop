import path from 'path';
import { BrowserWindow, desktopCapturer, ipcMain } from 'electron';
import { IS_WAYLAND, SCREEN_SHARE_PICKER_HTML_PATH } from './util/constants';
import { createLogger } from './util/logging';

const log = createLogger('screenShare');

const GET_SOURCES_CHANNEL = 'screen-share-picker:get-sources';
const SELECT_CHANNEL = 'screen-share-picker:select';
const CANCEL_CHANNEL = 'screen-share-picker:cancel';

// Shows a modal window listing available screens/windows (with thumbnail previews) and
// resolves with the source the user picked, or null if they canceled or none were available.
// Chromium has no built-in picker in Electron, so this is required for getDisplayMedia() to work.
export async function pickScreenShareSource(
  parentWindow: BrowserWindow
): Promise<Electron.DesktopCapturerSource | null> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 320, height: 180 }
  });

  if (sources.length === 0) {
    log.warn('No screen share sources available');
    return null;
  }

  // On Wayland, PipeWire capture means the xdg-desktop-portal already showed its own
  // native chooser as a side effect of the getSources() call above, and only ever
  // hands back the single source the user picked there. Our own dialog would have
  // nothing left to offer, so skip it and use that source directly.
  if (IS_WAYLAND) {
    log.info('Wayland detected, using portal-selected source directly:', sources[0].name);
    return sources[0];
  }

  return new Promise((resolve) => {
    const pickerWindow = new BrowserWindow({
      width: 1280,
      height: 400,
      parent: parentWindow,
      modal: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: 'Share your screen',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'screenSharePickerPreload.js')
      }
    });

    let settled = false;
    const finish = (source: Electron.DesktopCapturerSource | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      ipcMain.removeHandler(GET_SOURCES_CHANNEL);
      ipcMain.removeListener(SELECT_CHANNEL, onSelect);
      ipcMain.removeListener(CANCEL_CHANNEL, onCancel);
      if (!pickerWindow.isDestroyed()) {
        pickerWindow.destroy();
      }
      resolve(source);
    };

    const onSelect = (_event: Electron.IpcMainEvent, id: string): void => {
      finish(sources.find((source) => source.id === id) ?? null);
    };
    const onCancel = (): void => finish(null);

    ipcMain.handle(GET_SOURCES_CHANNEL, () =>
      sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnailDataUrl: source.thumbnail.toDataURL()
      }))
    );
    ipcMain.on(SELECT_CHANNEL, onSelect);
    ipcMain.on(CANCEL_CHANNEL, onCancel);

    pickerWindow.setMenuBarVisibility(false);
    pickerWindow.on('closed', () => finish(null));

    void pickerWindow.loadFile(SCREEN_SHARE_PICKER_HTML_PATH);
  });
}
