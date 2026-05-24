const { serveNcmApi } = require('NeteaseCloudMusicApi');

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';

serveNcmApi({ port, host }).catch((error) => {
  console.error('Failed to start Netease API server:', error);
  process.exit(1);
});
