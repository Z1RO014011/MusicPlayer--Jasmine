const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createAnalyticsStore, createDatabase } = require('../analytics/server.cjs');

function makeTempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jasmine-analytics-test-'));
  return path.join(dir, 'analytics.sqlite');
}

function createStore() {
  const db = createDatabase(makeTempDbPath());
  const store = createAnalyticsStore(db);
  return {
    store,
    close() {
      db.close();
    },
  };
}

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

test('records a play event and returns recent records in descending order', () => {
  const analytics = createStore();
  const todayStart = getStartOfToday();

  try {
    analytics.store.insertPlayRecord({
      songId: 'song-1',
      title: 'First Song',
      artist: 'Artist A',
      album: 'Album A',
      durationSeconds: 180,
      source: 'online',
      playedAt: todayStart - (2 * 24 * 60 * 60 * 1000),
    });
    analytics.store.insertPlayRecord({
      songId: 'song-2',
      title: 'Second Song',
      artist: 'Artist B',
      album: 'Album B',
      durationSeconds: 240,
      source: 'local',
      playedAt: todayStart - (24 * 60 * 60 * 1000),
    });

    const records = analytics.store.getRecentRecords(10);
    assert.equal(records.length, 2);
    assert.equal(records[0].songId, 'song-2');
    assert.equal(records[1].songId, 'song-1');
  } finally {
    analytics.close();
  }
});

test('returns summary, top songs, top artists, and daily trend aggregates', () => {
  const analytics = createStore();
  const todayStart = getStartOfToday();
  const dayOne = todayStart - (2 * 24 * 60 * 60 * 1000);
  const dayTwo = todayStart - (24 * 60 * 60 * 1000);

  try {
    analytics.store.insertPlayRecord({
      songId: 'song-1',
      neteaseId: 101,
      title: 'Repeat Song',
      artist: 'Artist A',
      album: 'Album A',
      durationSeconds: 180,
      source: 'online',
      coverUrl: 'https://example.com/a.jpg',
      coverColor: 'linear-gradient(#111, #222)',
      playedAt: dayOne + (8 * 60 * 60 * 1000),
    });
    analytics.store.insertPlayRecord({
      songId: 'song-1',
      neteaseId: 101,
      title: 'Repeat Song',
      artist: 'Artist A',
      album: 'Album A',
      durationSeconds: 180,
      source: 'online',
      coverUrl: 'https://example.com/a.jpg',
      coverColor: 'linear-gradient(#111, #222)',
      playedAt: dayOne + (9 * 60 * 60 * 1000),
    });
    analytics.store.insertPlayRecord({
      songId: 'song-2',
      title: 'Other Song',
      artist: 'Artist B',
      album: 'Album B',
      durationSeconds: 120,
      source: 'local',
      playedAt: dayTwo + (10 * 60 * 60 * 1000),
    });

    assert.deepEqual(analytics.store.getSummary(), {
      totalPlays: 3,
      totalMinutes: 8,
      uniqueSongs: 2,
      uniqueArtists: 2,
    });

    const topSongs = analytics.store.getTopSongs(5);
    assert.equal(topSongs.length, 2);
    assert.equal(topSongs[0].songId, 'song-1');
    assert.equal(topSongs[0].playCount, 2);
    assert.equal(topSongs[0].lastPlayedAt, dayOne + (9 * 60 * 60 * 1000));

    const topArtists = analytics.store.getTopArtists(5);
    assert.equal(topArtists.length, 2);
    assert.equal(topArtists[0].artist, 'Artist A');
    assert.equal(topArtists[0].playCount, 2);

    const daily = analytics.store.getDailyTrend(3);
    assert.equal(daily.length, 3);
    assert.equal(daily[0].playCount, 2);
    assert.equal(daily[1].playCount, 1);
    assert.equal(daily[0].totalMinutes, 6);
    assert.equal(daily[1].totalMinutes, 2);
  } finally {
    analytics.close();
  }
});

test('returns empty aggregates for a fresh database', () => {
  const analytics = createStore();

  try {
    assert.deepEqual(analytics.store.getSummary(), {
      totalPlays: 0,
      totalMinutes: 0,
      uniqueSongs: 0,
      uniqueArtists: 0,
    });

    assert.deepEqual(analytics.store.getRecentRecords(), []);

    const daily = analytics.store.getDailyTrend(2);
    assert.equal(daily.length, 2);
    assert.equal(daily[0].playCount, 0);
    assert.equal(daily[1].playCount, 0);
  } finally {
    analytics.close();
  }
});
