const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { serveNcmApi } = require('NeteaseCloudMusicApi');

const API_PORT = 3000;
const isDev = !app.isPackaged;

let apiServer = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Jasmine Music Player',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173/music-player/');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  try {
    const result = await serveNcmApi({ port: API_PORT, host: '127.0.0.1' });
    apiServer = result.server;
  } catch (e) {
    console.error('Failed to start Netease API server:', e);
  }
  createWindow();
});

// IPC: Download audio in main process (bypasses CORS)
ipcMain.handle('download-audio', async (_event, { songId, url }) => {
  const httpModule = url.startsWith('https') ? require('https') : require('http');
  return new Promise((resolve, reject) => {
    httpModule.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        const redirectModule = res.headers.location.startsWith('https') ? require('https') : require('http');
        redirectModule.get(res.headers.location, (redirectRes) => {
          const chunks = [];
          redirectRes.on('data', (chunk) => chunks.push(chunk));
          redirectRes.on('end', () => resolve({
            songId,
            data: Buffer.concat(chunks),
            mimeType: redirectRes.headers['content-type'] || 'audio/mpeg',
          }));
        }).on('error', reject);
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        songId,
        data: Buffer.concat(chunks),
        mimeType: res.headers['content-type'] || 'audio/mpeg',
      }));
    }).on('error', reject);
  });
});

app.on('window-all-closed', () => {
  if (apiServer && apiServer.close) apiServer.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
