const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  apiPort: 3000,
  downloadAudio: (songId, url) => ipcRenderer.invoke('download-audio', { songId, url }),
});
