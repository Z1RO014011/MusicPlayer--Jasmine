import type { Song } from '../types';

const LOCAL_ANALYTICS_PORT = 3001;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function normalizeBaseURL(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getAnalyticsBaseURL(): string {
  if (window.electronAPI?.analyticsPort) {
    return `http://127.0.0.1:${window.electronAPI.analyticsPort}`;
  }
  const configuredBaseURL = import.meta.env.VITE_ANALYTICS_API_BASE_URL?.trim();
  if (configuredBaseURL) {
    return normalizeBaseURL(configuredBaseURL);
  }
  if (typeof window !== 'undefined' && LOOPBACK_HOSTS.has(window.location.hostname)) {
    const host = window.location.hostname === '::1' ? '[::1]' : window.location.hostname;
    return `http://${host}:${LOCAL_ANALYTICS_PORT}`;
  }
  return '/analytics-api';
}

export interface AnalyticsPlayRecord {
  id: number;
  songId: string;
  neteaseId: number | null;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  source: 'local' | 'online';
  coverUrl: string | null;
  coverColor: string | null;
  playedAt: number;
}

export interface AnalyticsSummary {
  totalPlays: number;
  totalMinutes: number;
  uniqueSongs: number;
  uniqueArtists: number;
}

export interface AnalyticsTopSong {
  songId: string;
  neteaseId: number | null;
  title: string;
  artist: string;
  album: string;
  source: 'local' | 'online';
  coverUrl: string | null;
  coverColor: string | null;
  durationSeconds: number;
  playCount: number;
  lastPlayedAt: number;
}

export interface AnalyticsTopArtist {
  artist: string;
  playCount: number;
  lastPlayedAt: number;
}

export interface AnalyticsDailyPoint {
  date: string;
  playCount: number;
  totalMinutes: number;
}

export async function recordPlayEvent(song: Song, playedAt = Date.now()): Promise<void> {
  await fetch(`${getAnalyticsBaseURL()}/play-records`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      songId: song.id,
      neteaseId: song.neteaseId,
      title: song.title,
      artist: song.artist,
      album: song.album,
      durationSeconds: song.duration,
      source: song.source || 'local',
      coverUrl: song.coverUrl,
      coverColor: song.coverColor,
      playedAt,
    }),
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to record play event: ${response.status}`);
    }
  });
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const response = await fetch(`${getAnalyticsBaseURL()}/stats/summary`);
  if (!response.ok) throw new Error('Failed to load listening summary');
  return response.json();
}

export async function fetchRecentPlayRecords(limit = 20): Promise<AnalyticsPlayRecord[]> {
  const response = await fetch(`${getAnalyticsBaseURL()}/play-records/recent?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to load recent play records');
  const json = await response.json();
  return json.records || [];
}

export async function fetchTopSongs(limit = 5): Promise<AnalyticsTopSong[]> {
  const response = await fetch(`${getAnalyticsBaseURL()}/stats/top-songs?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to load top songs');
  const json = await response.json();
  return json.songs || [];
}

export async function fetchTopArtists(limit = 5): Promise<AnalyticsTopArtist[]> {
  const response = await fetch(`${getAnalyticsBaseURL()}/stats/top-artists?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to load top artists');
  const json = await response.json();
  return json.artists || [];
}

export async function fetchDailyTrend(days = 7): Promise<AnalyticsDailyPoint[]> {
  const response = await fetch(`${getAnalyticsBaseURL()}/stats/daily?days=${days}`);
  if (!response.ok) throw new Error('Failed to load daily trend');
  const json = await response.json();
  return json.days || [];
}
