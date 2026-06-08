import { Song, Playlist, LyricLine } from '../types';
import { parseLRC } from './lyrics';
import type {
  NeteaseSongItem,
  NeteasePlaylistItem,
  NeteasePlaylistDetailResponse,
  NeteaseSongUrlResponse,
} from '../types/netease';

// ==================== Shared helpers ====================

function getCookieParam(): string {
  const cookie = getLoginCookie();
  return cookie ? `&cookie=${encodeURIComponent(cookie)}` : '';
}

export function getBaseURL(): string {
  if (window.electronAPI?.apiPort) {
    return `http://127.0.0.1:${window.electronAPI.apiPort}`;
  }
  return '/api';
}

function mapNeteaseSong(item: NeteaseSongItem): Song {
  return {
    id: `netease-${item.id}`,
    neteaseId: item.id,
    title: item.name,
    artist: (item.ar || []).map(a => a.name).join(' / '),
    artists: (item.ar || []).map(a => ({ id: a.id, name: a.name })),
    album: item.al?.name ?? '',
    duration: Math.floor((item.dt || 0) / 1000),
    coverColor: item.al?.picUrl
      ? `url(${item.al.picUrl}) center/cover no-repeat`
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    coverUrl: item.al?.picUrl,
    source: 'online',
    audioUrl: undefined,
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

interface PlaylistDetailOptions {
  onPartial?: (playlist: Playlist) => void;
}

function buildNeteasePlaylist(playlist: any, songs: Song[]): Playlist {
  return {
    id: `netease-pl-${playlist.id}`,
    name: playlist.name,
    description: playlist.description || '',
    coverColor: playlist.coverImgUrl
      ? `url(${playlist.coverImgUrl}) center/cover no-repeat`
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    songs,
    createdAt: Date.now(),
    creator: playlist.creator?.nickname || '',
  };
}

export async function getPlaylistDetail(id: number, options: PlaylistDetailOptions = {}): Promise<Playlist> {
  // Step 1: Get playlist metadata + full trackIds
  const res = await fetch(
    `${getBaseURL()}/playlist/detail?id=${id}${getCookieParam()}`,
  );
  const json = await res.json();
  const playlist = json?.playlist;
  if (!playlist) throw new Error('Playlist not found');

  const trackIds: number[] = (playlist.trackIds || []).map((t: any) => t.id);
  const firstBatch = (playlist.tracks || []).map(mapNeteaseSong);
  if (firstBatch.length > 0) {
    options.onPartial?.(buildNeteasePlaylist(playlist, firstBatch));
  }

  // Step 2: If more than first batch, fetch remaining via /song/detail in batches
  const BATCH = 500;
  let allTracks = firstBatch;

  if (trackIds.length > firstBatch.length) {
    const remaining = trackIds.slice(firstBatch.length);
    for (let i = 0; i < remaining.length; i += BATCH) {
      const batch = remaining.slice(i, i + BATCH).join(',');
      const songRes = await fetch(
        `${getBaseURL()}/song/detail?ids=${batch}${getCookieParam()}`,
      );
      const songJson = await songRes.json();
      const songs = (songJson?.songs || []).map(mapNeteaseSong);
      allTracks = allTracks.concat(songs);
    }
  }

  return buildNeteasePlaylist(playlist, allTracks);
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

function loginTs(joiner: '?' | '&' = '&') { return `${joiner}timestamp=${Date.now()}`; }

export interface LoginQR {
  key: string;
  qrimg: string;
}

export async function createLoginQR(): Promise<LoginQR> {
  const keyRes = await fetch(`${getBaseURL()}/login/qr/key${loginTs('?')}`, { cache: 'no-store' });
  const keyData = await keyRes.json();
  const key = keyData?.data?.unikey;
  if (!key) throw new Error('Failed to get QR key');

  const qrRes = await fetch(
    `${getBaseURL()}/login/qr/create?key=${key}&qrimg=true${loginTs()}`,
    { cache: 'no-store' },
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
  const res = await fetch(`${getBaseURL()}/login/qr/check?key=${key}&noCookie=true${loginTs()}`, { cache: 'no-store' });
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
      const res = await fetch(
        `${getBaseURL()}/login/status${loginTs('?')}${cookieParam}`,
        { cache: 'no-store' },
      );
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

// ==================== 相似推荐 ====================

/** 相似歌曲（基于当前歌曲） */
export async function getSimiSong(songId: number, limit = 20): Promise<Song[]> {
  const res = await fetch(
    `${getBaseURL()}/simi/song?id=${songId}&limit=${limit}${getCookieParam()}`,
  );
  const json = await res.json();
  return (json.songs || []).map(mapNeteaseSong);
}

/** 相似歌手 */
export async function getSimiArtist(artistId: number): Promise<NeteaseArtist[]> {
  const res = await fetch(
    `${getBaseURL()}/simi/artist?id=${artistId}${getCookieParam()}`,
  );
  const json = await res.json();
  return (json.artists || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    picUrl: a.picUrl || a.img1v1Url || '',
    img1v1Url: a.img1v1Url || '',
    albumSize: a.albumSize || 0,
    musicSize: a.musicSize || 0,
  }));
}

// ==================== 歌手 ====================

export interface NeteaseArtistDetail {
  id: number;
  name: string;
  briefDesc: string;
  picUrl: string;
  albumSize: number;
  musicSize: number;
  tags: string[];
}

/** 歌手详情（简介、标签） */
export async function getArtistDetail(artistId: number): Promise<NeteaseArtistDetail | null> {
  const res = await fetch(
    `${getBaseURL()}/artist/detail?id=${artistId}${getCookieParam()}`,
  );
  const json = await res.json();
  const data = json?.data;
  if (!data?.artist) return null;
  const artist = data.artist;
  return {
    id: artist.id,
    name: artist.name,
    briefDesc: data.user?.briefDesc || artist.briefDesc || '',
    picUrl: artist.picUrl || artist.img1v1Url || '',
    albumSize: artist.albumSize || 0,
    musicSize: artist.musicSize || 0,
    tags: (artist.tags || []).filter(Boolean),
  };
}

/** 歌手介绍（长文本描述） */
export async function getArtistDesc(artistId: number): Promise<string> {
  const res = await fetch(
    `${getBaseURL()}/artist/desc?id=${artistId}${getCookieParam()}`,
  );
  const json = await res.json();
  return json?.introduction?.map((s: any) => s.txt).join('\n') || '';
}

/** 歌手热门 50 首 */
export async function getArtistTopSongs(artistId: number): Promise<Song[]> {
  const res = await fetch(
    `${getBaseURL()}/artist/top/song?id=${artistId}${getCookieParam()}`,
  );
  const json = await res.json();
  return (json.songs || []).map(mapNeteaseSong);
}

// ==================== 专辑 ====================

export interface NeteaseAlbumDetail {
  id: number;
  name: string;
  picUrl: string;
  description: string;
  publishTime: number;
  company: string;
  artists: NeteaseArtist[];
}

/** 专辑完整信息（大图、介绍、发行公司、时间） */
export async function getAlbumFullDetail(albumId: number): Promise<{
  album: NeteaseAlbumDetail;
  songs: Song[];
}> {
  const res = await fetch(
    `${getBaseURL()}/album?id=${albumId}${getCookieParam()}`,
  );
  const json = await res.json();
  const album = json.album || {};
  const songs = (json.songs || []).map(mapNeteaseSong);
  return {
    album: {
      id: album.id,
      name: album.name || '',
      picUrl: album.picUrl || '',
      description: album.description || album.briefDesc || '',
      publishTime: album.publishTime || 0,
      company: album.company || '',
      artists: (album.artists || []).map((a: any) => ({ id: a.id, name: a.name })),
    },
    songs,
  };
}

// ==================== 用户数据 ====================

/** 用户歌单（包括创建和收藏的） */
export async function getUserPlaylists(
  uid: number,
  limit = 30,
  offset = 0,
): Promise<Playlist[]> {
  const res = await fetch(
    `${getBaseURL()}/user/playlist?uid=${uid}&limit=${limit}&offset=${offset}${getCookieParam()}`,
  );
  const json = await res.json();
  return (json.playlist || []).map((p: NeteasePlaylistItem) =>
    mapNeteasePlaylist(p),
  );
}

export interface UserRecordItem {
  playCount: number;
  score: number;
  song: NeteaseSongItem;
}

/** 听歌排行（type: 0=所有时间, 1=最近一周） */
export async function getUserRecord(
  uid: number,
  type: 0 | 1 = 0,
): Promise<UserRecordItem[]> {
  const res = await fetch(
    `${getBaseURL()}/user/record?uid=${uid}&type=${type}${getCookieParam()}`,
  );
  const json = await res.json();
  const data = type === 1 ? json?.weekData : json?.allData;
  return (data || []).map((item: any) => ({
    playCount: item.playCount || 0,
    score: item.score || 0,
    song: item.song,
  }));
}

export interface UserSubcount {
  playlistCount: number;
  subPlaylistCount: number;
  artistCount: number;
  albumCount: number;
}

/** 收藏计数 */
export async function getUserSubcount(): Promise<UserSubcount> {
  const res = await fetch(
    `${getBaseURL()}/user/subcount${getCookieParam() ? `?${getCookieParam().slice(1)}` : ''}`,
  );
  const json = await res.json();
  return {
    playlistCount: json?.createdPlaylistCount || json?.playlistCount || 0,
    subPlaylistCount: json?.subPlaylistCount || 0,
    artistCount: json?.artistCount || 0,
    albumCount: json?.albumCount || 0,
  };
}

export interface UserDetail {
  userId: number;
  nickname: string;
  avatarUrl: string;
  signature: string;
  followeds: number;
  follows: number;
  playlistCount: number;
  level: number;
  birthday: number;
  province: number;
  city: number;
  gender: number;
}

/** 用户详情（等级、关注、粉丝、生日等） */
export async function getUserDetail(uid: number): Promise<UserDetail | null> {
  const res = await fetch(
    `${getBaseURL()}/user/detail?uid=${uid}${getCookieParam()}`,
  );
  const json = await res.json();
  const profile = json?.profile;
  if (!profile) return null;
  return {
    userId: profile.userId,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
    signature: profile.signature || '',
    followeds: profile.followeds || 0,
    follows: profile.follows || 0,
    playlistCount: profile.playlistCount || 0,
    level: profile.level || 0,
    birthday: profile.birthday || 0,
    province: profile.province || 0,
    city: profile.city || 0,
    gender: profile.gender || 0,
  };
}

/** 关注歌手列表 */
export async function getUserFollows(
  uid: number,
  limit = 30,
  offset = 0,
): Promise<NeteaseArtist[]> {
  const res = await fetch(
    `${getBaseURL()}/user/follows?uid=${uid}&limit=${limit}&offset=${offset}${getCookieParam()}`,
  );
  const json = await res.json();
  return (json.follow || []).map((f: any) => ({
    id: f.userId,
    name: f.nickname,
    picUrl: f.avatarUrl || '',
    img1v1Url: f.avatarUrl || '',
    albumSize: 0,
    musicSize: 0,
  }));
}

/** 收藏专辑列表 */
export async function getUserAlbumSublist(
  limit = 25,
  offset = 0,
): Promise<Playlist[]> {
  const res = await fetch(
    `${getBaseURL()}/album/sublist?limit=${limit}&offset=${offset}${getCookieParam()}`,
  );
  const json = await res.json();
  return (json.data || []).map((item: any) => {
    const playCount = item.playCount ? formatPlayCount(item.playCount) : '';
    return mapNeteasePlaylist(
      {
        id: item.id,
        name: item.name,
        coverImgUrl: item.picUrl,
        description: item.copywriter || playCount || '',
        trackCount: item.size || 0,
        playCount: item.playCount || 0,
        creator: { nickname: item.artist?.name || '' },
      },
      [],
    );
  });
}

/** 用户动态（最近 events） */
export async function getUserEvents(
  uid: number,
  limit = 30,
  lasttime = -1,
): Promise<any[]> {
  const res = await fetch(
    `${getBaseURL()}/user/event?uid=${uid}&limit=${limit}&lasttime=${lasttime}${getCookieParam()}`,
  );
  const json = await res.json();
  return json?.events || [];
}
