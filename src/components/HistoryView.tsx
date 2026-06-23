import React, { useEffect, useMemo, useState } from 'react';
import { PlayRecord } from '../lib/db';
import { Song } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../i18n/I18nContext';
import {
  AnalyticsDailyPoint,
  AnalyticsPlayRecord,
  AnalyticsSummary,
  AnalyticsTopArtist,
  AnalyticsTopSong,
  fetchAnalyticsSummary,
  fetchDailyTrend,
  fetchRecentPlayRecords,
  fetchTopArtists,
  fetchTopSongs,
} from '../lib/analyticsApi';

const DAY_MS = 86400000;
const EMPTY_SUMMARY: AnalyticsSummary = {
  totalPlays: 0,
  totalMinutes: 0,
  uniqueSongs: 0,
  uniqueArtists: 0,
};

function getDateLabel(ts: number, t: (k: string) => string): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - DAY_MS;
  const weekStart = todayStart - 7 * DAY_MS;
  if (ts >= todayStart) return t('history.today');
  if (ts >= yesterdayStart) return t('history.yesterday');
  if (ts >= weekStart) return t('history.thisWeek');
  return t('history.earlier');
}

function groupByDate(records: PlayRecord[], userSongs: Song[], t: (k: string) => string) {
  const groups: { label: string; songs: Song[] }[] = [];
  const seen = new Set<string>();
  const grouped = new Map<string, Song[]>();

  for (const r of records) {
    const song = userSongs.find(s => s.id === r.songId);
    if (!song || seen.has(song.id)) continue;
    seen.add(song.id);
    const label = getDateLabel(r.playedAt, t);
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label)!.push(song);
  }

  const order = [t('history.today'), t('history.yesterday'), t('history.thisWeek'), t('history.earlier')];
  for (const label of order) {
    const songs = grouped.get(label);
    if (songs && songs.length > 0) groups.push({ label, songs });
  }
  return groups;
}

function formatSongDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function formatTotalMinutes(minutes: number, t: (k: string, vars?: Record<string, string | number>) => string): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return t('common.durationHours', { h, m });
  }
  return t('common.durationMinutes', { m: minutes });
}

function formatShortDate(dateText: string, language: 'zh' | 'en'): string {
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function toPlayableSongFromRecord(record: AnalyticsPlayRecord | AnalyticsTopSong, userSongs: Song[]): Song | null {
  const existingSong = userSongs.find(song => song.id === record.songId);
  if (existingSong) return existingSong;
  if (record.source !== 'online') return null;
  return {
    id: record.songId,
    title: record.title,
    artist: record.artist,
    album: record.album,
    duration: record.durationSeconds,
    coverColor: record.coverColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    coverUrl: record.coverUrl || undefined,
    source: 'online',
    neteaseId: record.neteaseId || undefined,
  };
}

export function HistoryView() {
  const { playHistory, userSongs, playSong } = usePlayer();
  const { t, language } = useI18n();
  const [summary, setSummary] = useState<AnalyticsSummary>(EMPTY_SUMMARY);
  const [recentRecords, setRecentRecords] = useState<AnalyticsPlayRecord[]>([]);
  const [topSongs, setTopSongs] = useState<AnalyticsTopSong[]>([]);
  const [topArtists, setTopArtists] = useState<AnalyticsTopArtist[]>([]);
  const [dailyPoints, setDailyPoints] = useState<AnalyticsDailyPoint[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(false);

  const legacyGroups = useMemo(() => groupByDate(playHistory, userSongs, t), [playHistory, t, userSongs]);
  const refreshToken = playHistory[0]?.playedAt ?? 0;
  const maxDailyPlayCount = Math.max(...dailyPoints.map(point => point.playCount), 1);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setAnalyticsLoading(true);
      try {
        const [nextSummary, nextRecent, nextTopSongs, nextTopArtists, nextDailyPoints] = await Promise.all([
          fetchAnalyticsSummary(),
          fetchRecentPlayRecords(12),
          fetchTopSongs(5),
          fetchTopArtists(5),
          fetchDailyTrend(7),
        ]);
        if (cancelled) return;
        setSummary(nextSummary);
        setRecentRecords(nextRecent);
        setTopSongs(nextTopSongs);
        setTopArtists(nextTopArtists);
        setDailyPoints(nextDailyPoints);
        setAnalyticsError(false);
      } catch {
        if (cancelled) return;
        setSummary(EMPTY_SUMMARY);
        setRecentRecords([]);
        setTopSongs([]);
        setTopArtists([]);
        setDailyPoints([]);
        setAnalyticsError(true);
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    }

    loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const handlePlayAnalyticsSong = (record: AnalyticsPlayRecord | AnalyticsTopSong) => {
    const song = toPlayableSongFromRecord(record, userSongs);
    if (song) playSong(song);
  };

  const hasLegacyHistory = legacyGroups.length > 0;
  const hasAnalyticsContent =
    summary.totalPlays > 0 || recentRecords.length > 0 || topSongs.length > 0 || topArtists.length > 0;

  return (
    <div className="history-view">
      <section className="history-section">
        <div className="history-section-header">
          <div>
            <h2 className="history-section-title">{t('history.analyticsTitle')}</h2>
            <p className="history-section-subtitle">{t('history.analyticsSubtitle')}</p>
          </div>
        </div>

        {analyticsError && !analyticsLoading && (
          <div className="history-inline-state history-inline-error">{t('history.analyticsUnavailable')}</div>
        )}

        <div className="history-summary-grid">
          <div className="history-summary-card">
            <span className="history-summary-label">{t('history.summaryPlays')}</span>
            <strong className="history-summary-value">{summary.totalPlays}</strong>
          </div>
          <div className="history-summary-card">
            <span className="history-summary-label">{t('history.summaryMinutes')}</span>
            <strong className="history-summary-value">{formatTotalMinutes(summary.totalMinutes, t)}</strong>
          </div>
          <div className="history-summary-card">
            <span className="history-summary-label">{t('history.summarySongs')}</span>
            <strong className="history-summary-value">{summary.uniqueSongs}</strong>
          </div>
          <div className="history-summary-card">
            <span className="history-summary-label">{t('history.summaryArtists')}</span>
            <strong className="history-summary-value">{summary.uniqueArtists}</strong>
          </div>
        </div>

        <div className="history-analytics-grid">
          <section className="history-panel">
            <div className="history-panel-header">
              <h3>{t('history.trendTitle')}</h3>
            </div>
            <div className="history-trend-chart">
              {dailyPoints.map(point => (
                <div key={point.date} className="history-trend-bar-group">
                  <div className="history-trend-bar-wrap">
                    <div
                      className="history-trend-bar"
                      style={{ height: `${Math.max((point.playCount / maxDailyPlayCount) * 100, point.playCount > 0 ? 14 : 6)}%` }}
                    />
                  </div>
                  <span className="history-trend-value">{point.playCount}</span>
                  <span className="history-trend-label">{formatShortDate(point.date, language)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="history-panel">
            <div className="history-panel-header">
              <h3>{t('history.topSongsTitle')}</h3>
            </div>
            {analyticsLoading ? (
              <div className="history-inline-state">{t('discover.loading')}</div>
            ) : topSongs.length === 0 ? (
              <div className="history-inline-state">{t('history.empty')}</div>
            ) : (
              <div className="history-ranking-list">
                {topSongs.map((song, index) => {
                  const playable = toPlayableSongFromRecord(song, userSongs);
                  return (
                    <button
                      key={`${song.songId}-${index}`}
                      className={`history-ranking-item ${playable ? 'is-clickable' : ''}`}
                      onClick={() => playable && handlePlayAnalyticsSong(song)}
                      disabled={!playable}
                    >
                      <span className="history-ranking-index">{index + 1}</span>
                      <span className="history-ranking-main">
                        <strong>{song.title}</strong>
                        <small>{song.artist}</small>
                      </span>
                      <span className="history-ranking-meta">{t('history.playCount', { count: song.playCount })}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="history-panel">
            <div className="history-panel-header">
              <h3>{t('history.topArtistsTitle')}</h3>
            </div>
            {analyticsLoading ? (
              <div className="history-inline-state">{t('discover.loading')}</div>
            ) : topArtists.length === 0 ? (
              <div className="history-inline-state">{t('history.empty')}</div>
            ) : (
              <div className="history-ranking-list">
                {topArtists.map((artist, index) => (
                  <div key={`${artist.artist}-${index}`} className="history-ranking-item">
                    <span className="history-ranking-index">{index + 1}</span>
                    <span className="history-ranking-main">
                      <strong>{artist.artist}</strong>
                      <small>{new Date(artist.lastPlayedAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}</small>
                    </span>
                    <span className="history-ranking-meta">{t('history.playCount', { count: artist.playCount })}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="history-section">
        <div className="history-section-header">
          <div>
            <h2 className="history-section-title">{t('history.recentTitle')}</h2>
            <p className="history-section-subtitle">{t('history.recentSubtitle')}</p>
          </div>
        </div>
        {analyticsLoading ? (
          <div className="library-empty">
            <p>{t('discover.loading')}</p>
          </div>
        ) : recentRecords.length === 0 ? (
          <div className="library-empty">
            <p>{analyticsError ? t('history.analyticsUnavailable') : t('history.empty')}</p>
          </div>
        ) : (
          <div className="track-list">
            <div className="track-list-header">
              <span className="track-col-num">#</span>
              <span className="track-col-title">{t('library.headerTitle')}</span>
              <span className="track-col-artist">{t('library.headerArtist')}</span>
              <span className="track-col-album">{t('library.headerAlbum')}</span>
              <span className="track-col-like">{t('history.playedAt')}</span>
              <span className="track-col-duration">{t('library.headerDuration')}</span>
            </div>
            <div className="track-list-body">
              {recentRecords.map((record, idx) => {
                const playable = toPlayableSongFromRecord(record, userSongs);
                return (
                  <div
                    key={record.id}
                    className={`track-row ${playable ? '' : 'is-disabled'}`}
                    onClick={() => playable && handlePlayAnalyticsSong(record)}
                  >
                    <span className="track-col-num">{idx + 1}</span>
                    <span className="track-col-title">
                      <div
                        className="track-cover-mini"
                        style={{ background: record.coverColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                      />
                      <div className="track-title-text">
                        <div className="track-title-main">{record.title}</div>
                        <div className="track-title-sub">{record.artist} · {record.album}</div>
                      </div>
                    </span>
                    <span className="track-col-artist">{record.artist}</span>
                    <span className="track-col-album">{record.album}</span>
                    <span className="track-col-like history-played-at">
                      {new Date(record.playedAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                    </span>
                    <span className="track-col-duration">{formatSongDuration(record.durationSeconds)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {(hasLegacyHistory || (!hasAnalyticsContent && !analyticsLoading)) && (
        <section className="history-section">
          <div className="history-section-header">
            <div>
              <h2 className="history-section-title">{t('history.legacyTitle')}</h2>
              <p className="history-section-subtitle">{t('history.legacySubtitle')}</p>
            </div>
          </div>

          {legacyGroups.length === 0 ? (
            <div className="library-empty">
              <p>{t('history.empty')}</p>
            </div>
          ) : (
            legacyGroups.map(group => (
              <section key={group.label} className="history-group">
                <h3 className="history-group-title">{group.label}</h3>
                <div className="track-list">
                  <div className="track-list-body">
                    {group.songs.map((song, idx) => (
                      <div key={song.id} className="track-row" onClick={() => playSong(song, group.songs)}>
                        <span className="track-col-num">{idx + 1}</span>
                        <span className="track-col-title">
                          <div className="track-cover-mini" style={{ background: song.coverColor }} />
                          <div className="track-title-text">
                            <div className="track-title-main">{song.title}</div>
                            <div className="track-title-sub">{song.artist} · {song.album}</div>
                          </div>
                        </span>
                        <span className="track-col-artist">{song.artist}</span>
                        <span className="track-col-album">{song.album}</span>
                        <span className="track-col-like"></span>
                        <span className="track-col-duration">{formatSongDuration(song.duration)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))
          )}
        </section>
      )}
    </div>
  );
}
