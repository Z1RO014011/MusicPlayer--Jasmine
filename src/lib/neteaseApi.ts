import { Song, Playlist, LyricLine } from '../types';
import { parseLRC } from './lyrics';
import type {
  NeteaseSongItem,
  NeteasePlaylistItem,
  NeteasePlaylistDetailResponse,
  NeteaseSongUrlResponse,
} from '../types/netease';

function getBaseURL(): string {
  const port = window.electronAPI?.apiPort ?? 3000;
  return `http://127.0.0.1:${port}`;
}

function mapNeteaseSong(item: NeteaseSongItem): Song {
  return {
    id: `netease-${item.id}`,
    neteaseId: item.id,
    title: item.name,
    artist: (item.ar || []).map(a => a.name).join(' / '),
    album: item.al?.name ?? '',
    duration: Math.floor((item.dt || 0) / 1000),
    coverColor: item.al?.picUrl
      ? `url(${item.al.picUrl}) center/cover no-repeat`
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    coverUrl: item.al?.picUrl,
    source: 'online',
  };
}

function mapNeteasePlaylist(item: NeteasePlaylistItem, songs: Song[] = []): Playlist {
  return {
    id: `netease-pl-${item.id}`,
    name: item.name,
    description: item.description || '',
    coverColor: item.coverImgUrl
      ? `url(${item.coverImgUrl}) center/cover no-repeat`
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    songs,
    createdAt: Date.now(),
    creator: item.creator?.nickname,
  };
}

export interface NeteaseArtist {
  id: number;
  name: string;
  picUrl: string;
  img1v1Url: string;
  albumSize: number;
  musicSize: number;
}

export interface NeteaseAlbum {
  id: number;
  name: string;
  picUrl: string;
  artist: string;
}

export async function searchOnline(
  keywords: string,
  limit = 30,
): Promise<{ songs: Song[]; playlists: Playlist[] }> {
  // Only search songs by default (fast initial load)
  const [songRes, plRes] = await Promise.all([
    fetch(`${getBaseURL()}/cloudsearch?keywords=${encodeURIComponent(keywords)}&limit=${limit}`),
    fetch(`${getBaseURL()}/search?keywords=${encodeURIComponent(keywords)}&limit=10`),
  ]);
  const songJson = await songRes.json();
  const plJson = await plRes.json();
  const songs = (songJson.result?.songs || []).map(mapNeteaseSong);
  const playlists = (plJson.result?.playlists || []).map((p: NeteasePlaylistItem) =>
    mapNeteasePlaylist(p),
  );
  return { songs, playlists };
}

export async function searchArtists(keywords: string): Promise<NeteaseArtist[]> {
  const res = await fetch(`${getBaseURL()}/cloudsearch?keywords=${encodeURIComponent(keywords)}&limit=20&type=100`);
  const json = await res.json();
  return (json.result?.artists || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    picUrl: a.picUrl || a.img1v1Url || '',
    img1v1Url: a.img1v1Url || '',
    albumSize: a.albumSize || 0,
    musicSize: a.musicSize || 0,
  }));
}

export async function searchAlbums(keywords: string): Promise<NeteaseAlbum[]> {
  const res = await fetch(`${getBaseURL()}/cloudsearch?keywords=${encodeURIComponent(keywords)}&limit=20&type=10`);
  const json = await res.json();
  return (json.result?.albums || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    picUrl: a.picUrl || '',
    artist: a.artist?.name || a.artists?.[0]?.name || '',
  }));
}

export async function getArtistSongs(artistId: number, limit = 50): Promise<Song[]> {
  const res = await fetch(
    `${getBaseURL()}/artist/songs?id=${artistId}&limit=${limit}`,
  );
  const json = await res.json();
  return (json.songs || []).map(mapNeteaseSong);
}

export async function getAlbumDetail(id: number): Promise<Playlist> {
  const res = await fetch(`${getBaseURL()}/album?id=${id}`);
  const json = await res.json();
  const album = json.album || {};
  const songs = (json.songs || []).map(mapNeteaseSong);
  return {
    id: `album-${album.id}`,
    name: album.name || '',
    description: album.artist?.name || '',
    coverColor: album.picUrl
      ? `url(${album.picUrl}) center/cover no-repeat`
      : 'linear-gradient(135deg, #667eea, #764ba2)',
    songs,
    createdAt: Date.now(),
    creator: album.artist?.name || '',
  };
}

export async function getPlaylistDetail(id: number): Promise<Playlist> {
  const res = await fetch(`${getBaseURL()}/playlist/detail?id=${id}`);
  const json: NeteasePlaylistDetailResponse = await res.json();
  const tracks = (json.playlist?.tracks || []).map(mapNeteaseSong);
  return {
    id: `netease-pl-${json.playlist.id}`,
    name: json.playlist.name,
    description: json.playlist.description || '',
    coverColor: json.playlist.coverImgUrl
      ? `url(${json.playlist.coverImgUrl}) center/cover no-repeat`
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    songs: tracks,
    createdAt: Date.now(),
    creator: json.playlist.creator?.nickname,
  };
}

let savedCookie = '';
export function setLoginCookie(cookie: string) {
  savedCookie = cookie;
  try { localStorage.setItem('mp-netease-cookie', cookie); } catch {}
}
export function getLoginCookie(): string {
  if (savedCookie) return savedCookie;
  try { savedCookie = localStorage.getItem('mp-netease-cookie') || ''; } catch {}
  return savedCookie;
}

// --- Audio URL cache (localStorage, 30-min TTL) ---

const URL_CACHE_KEY = 'mp-audio-urls';
const URL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function loadUrlCache(): Record<string, { url: string; ts: number }> {
  try {
    const raw = localStorage.getItem(URL_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveUrlCache(cache: Record<string, { url: string; ts: number }>) {
  try { localStorage.setItem(URL_CACHE_KEY, JSON.stringify(cache)); } catch {}
}

function getCachedUrl(neteaseId: number): string | null {
  const cache = loadUrlCache();
  const entry = cache[String(neteaseId)];
  if (entry && Date.now() - entry.ts < URL_CACHE_TTL) return entry.url;
  return null;
}

function setCachedUrl(neteaseId: number, url: string) {
  const cache = loadUrlCache();
  cache[String(neteaseId)] = { url, ts: Date.now() };
  saveUrlCache(cache);
}

export async function getSongAudioUrl(neteaseId: number): Promise<string | null> {
  const cached = getCachedUrl(neteaseId);
  if (cached) return cached;

  const cookie = getLoginCookie();
  const cookieParam = cookie ? `&cookie=${encodeURIComponent(cookie)}` : '';
  const res = await fetch(
    `${getBaseURL()}/song/url?id=${neteaseId}&level=standard${cookieParam}`,
  );
  const json: NeteaseSongUrlResponse = await res.json();
  const url = json.data?.[0]?.url || null;
  if (url) setCachedUrl(neteaseId, url);
  return url;
}

/** Batch-fetch audio URLs for multiple netease IDs in one request */
export async function getBatchSongAudioUrls(
  ids: number[],
): Promise<Map<number, string | null>> {
  const result = new Map<number, string | null>();

  // Check cache first
  const uncached: number[] = [];
  for (const id of ids) {
    const cached = getCachedUrl(id);
    if (cached) {
      result.set(id, cached);
    } else {
      uncached.push(id);
    }
  }

  if (uncached.length === 0) return result;

  const cookie = getLoginCookie();
  const cookieParam = cookie ? `&cookie=${encodeURIComponent(cookie)}` : '';
  const res = await fetch(
    `${getBaseURL()}/song/url?id=${uncached.join(',')}&level=standard${cookieParam}`,
  );
  const json: NeteaseSongUrlResponse = await res.json();
  const items: Array<{ id: number; url: string | null }> = json.data || [];

  for (const item of items) {
    const url = item.url || null;
    if (url) setCachedUrl(item.id, url);
    result.set(item.id, url);
  }
  // Fill null for IDs not returned
  for (const id of uncached) {
    if (!result.has(id)) result.set(id, null);
  }
  return result;
}

export async function getTopPlaylists(
  cat = '全部',
  limit = 30,
): Promise<Playlist[]> {
  const res = await fetch(
    `${getBaseURL()}/top/playlist?cat=${encodeURIComponent(cat)}&limit=${limit}`,
  );
  const json = await res.json();
  return (json.playlists || []).map((p: NeteasePlaylistItem) =>
    mapNeteasePlaylist(p),
  );
}

/** 推荐歌单（无需登录，泛化推荐） */
export async function getPersonalizedPlaylists(limit = 30): Promise<Playlist[]> {
  const res = await fetch(`${getBaseURL()}/personalized?limit=${limit}`);
  const json = await res.json();
  return (json.result || []).map((item: any) => {
    const playCount = item.playCount ? formatPlayCount(item.playCount) : '';
    return mapNeteasePlaylist(
      { ...item, coverImgUrl: item.picUrl, description: item.copywriter || playCount },
      [],
    );
  });
}

function formatPlayCount(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}

/** 每日推荐歌单（需要登录，个性化推荐） */
export async function getRecommendResource(cookie: string): Promise<Playlist[]> {
  const res = await fetch(
    `${getBaseURL()}/recommend/resource?cookie=${encodeURIComponent(cookie)}`,
  );
  const json = await res.json();
  return (json.recommend || []).map((item: any) => {
    const playCount = item.playCount ? formatPlayCount(item.playCount) : '';
    return mapNeteasePlaylist(
      { ...item, coverImgUrl: item.picUrl, description: item.copywriter || playCount },
      [],
    );
  });
}

export async function getToplistDetail(): Promise<
  { name: string; id: number }[]
> {
  const res = await fetch(`${getBaseURL()}/toplist`);
  const json = await res.json();
  return (json.list || []).map((item: { name: string; id: number }) => ({
    name: item.name,
    id: item.id,
  }));
}

interface NeteaseLyricResponse {
  lrc?: { lyric: string };
  tlyric?: { lyric: string };
}

export interface PlaylistCategory {
  name: string;
  hot: boolean;
}

export interface SearchHotItem {
  searchWord: string;
  iconUrl?: string;
  content?: string;
  score: number;
}

export async function getSearchHot(): Promise<SearchHotItem[]> {
  const res = await fetch(`${getBaseURL()}/search/hot/detail`);
  const json = await res.json();
  return (json.data || []).map((d: any) => ({
    searchWord: d.searchWord,
    iconUrl: d.iconUrl,
    content: d.content,
    score: d.score || 0,
  }));
}

export async function getPlaylistCategories(): Promise<PlaylistCategory[]> {
  const res = await fetch(`${getBaseURL()}/playlist/catlist`);
  const json = await res.json();
  return (json.sub || []).map((s: any) => ({ name: s.name, hot: !!s.hot }));
}

export async function getTopPlaylistsByCat(
  cat: string,
  limit = 30,
  offset = 0,
): Promise<Playlist[]> {
  const res = await fetch(
    `${getBaseURL()}/top/playlist?cat=${encodeURIComponent(cat)}&limit=${limit}&offset=${offset}`,
  );
  const json = await res.json();
  return (json.playlists || []).map((p: NeteasePlaylistItem) =>
    mapNeteasePlaylist(p),
  );
}

export async function getLyrics(neteaseId: number): Promise<LyricLine[]> {
  const res = await fetch(`${getBaseURL()}/lyric?id=${neteaseId}`);
  const json: NeteaseLyricResponse = await res.json();
  const lrcText = json.lrc?.lyric || json.tlyric?.lyric;
  if (!lrcText) return [];
  return parseLRC(lrcText);
}

// --- Login / Authentication ---

function ts() { return `&timestamp=${Date.now()}`; }

export interface LoginQR {
  key: string;
  qrimg: string;
}

export async function createLoginQR(): Promise<LoginQR> {
  const keyRes = await fetch(`${getBaseURL()}/login/qr/key?${ts()}`);
  const keyData = await keyRes.json();
  const key = keyData?.data?.unikey;
  if (!key) throw new Error('Failed to get QR key');

  const qrRes = await fetch(
    `${getBaseURL()}/login/qr/create?key=${key}&qrimg=true${ts()}`,
  );
  const qrData = await qrRes.json();
  return { key, qrimg: qrData?.data?.qrimg || '' };
}

export type LoginQRStatus =
  | { code: 800; message: 'expired' }
  | { code: 801; message: 'waiting' }
  | { code: 802; message: 'scanned' }
  | { code: 803; message: 'success'; cookie: string }
  | { code: -1; message: 'error' };

export async function checkLoginQR(key: string): Promise<LoginQRStatus> {
  const res = await fetch(`${getBaseURL()}/login/qr/check?key=${key}${ts()}`);
  const json = await res.json();
  const code = json.code;

  if (code === 803) return { code: 803, message: 'success', cookie: json.cookie || '' };
  if (code === 802) return { code: 802, message: 'scanned' };
  if (code === 801) return { code: 801, message: 'waiting' };
  if (code === 800) return { code: 800, message: 'expired' };
  return { code: -1, message: 'error' };
}

export interface LoginStatusInfo {
  loggedIn: boolean;
  nickname?: string;
  avatarUrl?: string;
  userId?: number;
}

export async function getLoginStatus(cookie?: string): Promise<LoginStatusInfo> {
  const cookieParam = cookie ? `&cookie=${encodeURIComponent(cookie)}` : '';
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${getBaseURL()}/login/status?${ts()}${cookieParam}`);
      const json = await res.json();
      const profile = json?.data?.profile;
      if (profile && profile.nickname) {
        return {
          loggedIn: true,
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
          userId: profile.userId,
        };
      }
    } catch {}
    if (i < 2) await new Promise(r => setTimeout(r, 1000));
  }
  return { loggedIn: false };
}
