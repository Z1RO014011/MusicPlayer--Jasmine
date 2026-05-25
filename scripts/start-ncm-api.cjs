const Module = require('module');

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'pac-proxy-agent') {
    return {
      PacProxyAgent: class PacProxyAgent {
        constructor() {
          throw new Error('PAC proxy is not supported by the local music API launcher.');
        }
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { serveNcmApi } = require('NeteaseCloudMusicApi/server');

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';

serveNcmApi({ port, host }).catch((error) => {
  console.error('Failed to start Netease API server:', error);
  process.exit(1);
});
