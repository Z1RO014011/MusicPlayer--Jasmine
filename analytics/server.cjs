const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const Database = require('better-sqlite3');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3001;

function ensureDbDirectory(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

function createDatabase(dbPath) {
  ensureDbDirectory(dbPath);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS play_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id TEXT NOT NULL,
      netease_id INTEGER,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL,
      cover_url TEXT,
      cover_color TEXT,
      played_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_play_records_played_at
      ON play_records (played_at DESC);

    CREATE INDEX IF NOT EXISTS idx_play_records_song_id
      ON play_records (song_id);

    CREATE INDEX IF NOT EXISTS idx_play_records_artist
      ON play_records (artist);
  `);
  return db;
}

function withCors(_req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (_req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

function clampPositiveInt(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function toMinutes(totalSeconds) {
  return Math.floor((Number(totalSeconds) || 0) / 60);
}

function toDayKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDailyRows(rows, days) {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const buckets = new Map();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const timestamp = startOfToday - (offset * dayMs);
    const key = toDayKey(timestamp);
    buckets.set(key, {
      date: key,
      playCount: 0,
      totalMinutes: 0,
    });
  }

  for (const row of rows) {
    const key = toDayKey(row.played_at);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.playCount += 1;
    bucket.totalMinutes += toMinutes(row.duration_seconds);
  }

  return Array.from(buckets.values());
}

function validatePlayRecord(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['Invalid request body'] };
  }
  if (!input.songId || typeof input.songId !== 'string') errors.push('songId is required');
  if (!input.title || typeof input.title !== 'string') errors.push('title is required');
  if (!input.artist || typeof input.artist !== 'string') errors.push('artist is required');
  if (typeof input.album !== 'string') errors.push('album is required');
  if (!Number.isFinite(Number(input.durationSeconds)) || Number(input.durationSeconds) < 0) {
    errors.push('durationSeconds must be a non-negative number');
  }
  if (input.source !== 'local' && input.source !== 'online') {
    errors.push('source must be local or online');
  }
  if (!Number.isFinite(Number(input.playedAt))) errors.push('playedAt must be a number');

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      songId: input.songId,
      neteaseId: input.neteaseId == null ? null : Number(input.neteaseId),
      title: input.title,
      artist: input.artist,
      album: input.album,
      durationSeconds: Math.floor(Number(input.durationSeconds)),
      source: input.source,
      coverUrl: typeof input.coverUrl === 'string' ? input.coverUrl : null,
      coverColor: typeof input.coverColor === 'string' ? input.coverColor : null,
      playedAt: Number(input.playedAt),
    },
  };
}

function mapRecordRow(row) {
  return {
    id: row.id,
    songId: row.song_id,
    neteaseId: row.netease_id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    durationSeconds: row.duration_seconds,
    source: row.source,
    coverUrl: row.cover_url,
    coverColor: row.cover_color,
    playedAt: row.played_at,
  };
}

function createAnalyticsStore(db) {
  const insertRecord = db.prepare(`
    INSERT INTO play_records (
      song_id,
      netease_id,
      title,
      artist,
      album,
      duration_seconds,
      source,
      cover_url,
      cover_color,
      played_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const selectRecent = db.prepare(`
    SELECT *
    FROM play_records
    ORDER BY played_at DESC, id DESC
    LIMIT ?
  `);

  const selectSummary = db.prepare(`
    SELECT
      COUNT(*) AS total_plays,
      COALESCE(SUM(duration_seconds), 0) AS total_duration_seconds,
      COUNT(DISTINCT song_id) AS unique_songs,
      COUNT(DISTINCT artist) AS unique_artists
    FROM play_records
  `);

  const selectTopSongs = db.prepare(`
    SELECT
      song_id,
      netease_id,
      title,
      artist,
      album,
      source,
      cover_url,
      cover_color,
      COUNT(*) AS play_count,
      MAX(played_at) AS last_played_at,
      MAX(duration_seconds) AS duration_seconds
    FROM play_records
    GROUP BY song_id, netease_id, title, artist, album, source, cover_url, cover_color
    ORDER BY play_count DESC, last_played_at DESC
    LIMIT ?
  `);

  const selectTopArtists = db.prepare(`
    SELECT
      artist,
      COUNT(*) AS play_count,
      MAX(played_at) AS last_played_at
    FROM play_records
    GROUP BY artist
    ORDER BY play_count DESC, last_played_at DESC
    LIMIT ?
  `);

  const selectDaily = db.prepare(`
    SELECT played_at, duration_seconds
    FROM play_records
    WHERE played_at >= ?
    ORDER BY played_at ASC
  `);

  return {
    insertPlayRecord(input) {
      const validation = validatePlayRecord(input);
      if (!validation.ok) {
        const error = new Error(validation.errors[0]);
        error.statusCode = 400;
        throw error;
      }

      const record = validation.value;
      const result = insertRecord.run(
        record.songId,
        record.neteaseId,
        record.title,
        record.artist,
        record.album,
        record.durationSeconds,
        record.source,
        record.coverUrl,
        record.coverColor,
        record.playedAt,
      );
      return { id: Number(result.lastInsertRowid) };
    },

    getRecentRecords(limitInput) {
      const limit = clampPositiveInt(limitInput, 20, 100);
      return selectRecent.all(limit).map(mapRecordRow);
    },

    getSummary() {
      const row = selectSummary.get();
      return {
        totalPlays: row.total_plays,
        totalMinutes: toMinutes(row.total_duration_seconds),
        uniqueSongs: row.unique_songs,
        uniqueArtists: row.unique_artists,
      };
    },

    getTopSongs(limitInput) {
      const limit = clampPositiveInt(limitInput, 5, 50);
      return selectTopSongs.all(limit).map((row) => ({
        songId: row.song_id,
        neteaseId: row.netease_id,
        title: row.title,
        artist: row.artist,
        album: row.album,
        source: row.source,
        coverUrl: row.cover_url,
        coverColor: row.cover_color,
        durationSeconds: row.duration_seconds,
        playCount: row.play_count,
        lastPlayedAt: row.last_played_at,
      }));
    },

    getTopArtists(limitInput) {
      const limit = clampPositiveInt(limitInput, 5, 50);
      return selectTopArtists.all(limit).map((row) => ({
        artist: row.artist,
        playCount: row.play_count,
        lastPlayedAt: row.last_played_at,
      }));
    },

    getDailyTrend(daysInput) {
      const days = clampPositiveInt(daysInput, 7, 90);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const fromTimestamp = startOfToday - ((days - 1) * 24 * 60 * 60 * 1000);
      const rows = selectDaily.all(fromTimestamp);
      return buildDailyRows(rows, days);
    },
  };
}

function createAnalyticsApp(db) {
  const store = createAnalyticsStore(db);
  const app = express();
  app.use(withCors);
  app.use(express.json({ limit: '100kb' }));

  app.post('/play-records', (req, res) => {
    try {
      const result = store.insertPlayRecord(req.body);
      res.status(201).json(result);
    } catch (error) {
      const statusCode = error && error.statusCode ? error.statusCode : 500;
      res.status(statusCode).json({ error: error.message || 'Failed to store play record' });
    }
  });

  app.get('/play-records/recent', (_req, res) => {
    try {
      res.json({ records: store.getRecentRecords(_req.query.limit) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load recent play records' });
    }
  });

  app.get('/stats/summary', (_req, res) => {
    try {
      res.json(store.getSummary());
    } catch (error) {
      res.status(500).json({ error: 'Failed to load listening summary' });
    }
  });

  app.get('/stats/top-songs', (_req, res) => {
    try {
      res.json({ songs: store.getTopSongs(_req.query.limit) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load top songs' });
    }
  });

  app.get('/stats/top-artists', (_req, res) => {
    try {
      res.json({ artists: store.getTopArtists(_req.query.limit) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load top artists' });
    }
  });

  app.get('/stats/daily', (_req, res) => {
    try {
      res.json({ days: store.getDailyTrend(_req.query.days) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load daily trend' });
    }
  });

  return app;
}

async function startAnalyticsServer(options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = Number(options.port ?? DEFAULT_PORT);
  const dbPath = options.dbPath;

  if (!dbPath) {
    throw new Error('dbPath is required');
  }

  const db = createDatabase(dbPath);
  const app = createAnalyticsApp(db);
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(port, host, () => resolve(instance));
    instance.on('error', reject);
  });

  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;

  return {
    app,
    db,
    server,
    host,
    port: actualPort,
    baseUrl: `http://${host}:${actualPort}`,
    close: () => new Promise((resolve, reject) => {
      if (!server.listening) {
        db.close();
        resolve();
        return;
      }
      server.close((error) => {
        db.close();
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }),
  };
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  createAnalyticsStore,
  createDatabase,
  startAnalyticsServer,
};
