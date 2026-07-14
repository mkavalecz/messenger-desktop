import { contextBridge, ipcRenderer } from 'electron';

export interface ScreenShareSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
}

contextBridge.exposeInMainWorld('screenSharePicker', {
  getSources: (): Promise<ScreenShareSource[]> => ipcRenderer.invoke('screen-share-picker:get-sources'),
  select: (id: string): void => ipcRenderer.send('screen-share-picker:select', id),
  cancel: (): void => ipcRenderer.send('screen-share-picker:cancel')
});
