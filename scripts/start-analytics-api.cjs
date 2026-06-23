const path = require('node:path');
const fs = require('node:fs');

const bundledServerPath = path.join(__dirname, '../analytics/server.cjs');
const localServerPath = path.join(__dirname, 'server.cjs');
const serverModulePath = fs.existsSync(bundledServerPath) ? bundledServerPath : localServerPath;
const { DEFAULT_HOST, DEFAULT_PORT, startAnalyticsServer } = require(serverModulePath);

const host = process.env.HOST || DEFAULT_HOST;
const port = Number(process.env.PORT || DEFAULT_PORT);
const dbPath = process.env.ANALYTICS_DB_PATH || path.join(process.cwd(), 'tmp', 'analytics.sqlite');
let analyticsServer = null;

function shutdown() {
  if (!analyticsServer) {
    process.exit(0);
    return;
  }

  analyticsServer.close()
    .catch(() => {})
    .finally(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startAnalyticsServer({ host, port, dbPath })
  .then((server) => {
    analyticsServer = server;
  })
  .catch((error) => {
    console.error('Failed to start analytics API server:', error);
    process.exit(1);
  });
