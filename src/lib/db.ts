import { SavedAlbum } from '../types';

const DB_NAME = 'music-player-store';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('audioFiles')) {
        db.createObjectStore('audioFiles', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAudioFile(id: string, file: File): Promise<void> {
  const db = await openDB();
  const buffer = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioFiles', 'readwrite');
    tx.objectStore('audioFiles').put({ id, data: buffer, type: file.type });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function saveAudioData(
  id: string,
  data: ArrayBuffer,
  mimeType: string,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioFiles', 'readwrite');
    tx.objectStore('audioFiles').put({ id, data, type: mimeType });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadAudioFile(id: string): Promise<{ blob: Blob; url: string } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioFiles', 'readonly');
    const req = tx.objectStore('audioFiles').get(id);
    req.onsuccess = () => {
      db.close();
      const record = req.result;
      if (!record) { resolve(null); return; }
      const blob = new Blob([record.data], { type: record.type || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      resolve({ blob, url });
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteAudioFile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioFiles', 'readwrite');
    tx.objectStore('audioFiles').delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// --- localStorage helpers ---

export interface PlayRecord {
  songId: string;
  playedAt: number;
}

const LS_KEYS = {
  songs: 'mp-songs',
  playlists: 'mp-playlists',
  albums: 'mp-albums',
  playHistory: 'mp-play-history',
} as const;

export function saveSongs(songs: unknown[]): void {
  try {
    const data = songs.map((s: any) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      duration: s.duration,
      coverColor: s.coverColor,
      coverUrl: s.coverUrl,
      source: s.source,
      neteaseId: s.neteaseId,
      lyrics: s.lyrics,
    }));
    localStorage.setItem(LS_KEYS.songs, JSON.stringify(data));
  } catch {}
}

export function loadSongs(): unknown[] | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.songs);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePlaylists(playlists: unknown[]): void {
  try {
    const data = playlists.map((p: any) => ({
      ...p,
      songs: p.songs.map((s: any) => s.id),
      // Embed full song data so playlists survive even if mp-songs is lost
      _embeddedSongs: p.songs.map((s: any) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        duration: s.duration,
        coverColor: s.coverColor,
        coverUrl: s.coverUrl,
        source: s.source,
        neteaseId: s.neteaseId,
        lyrics: s.lyrics,
      })),
    }));
    localStorage.setItem(LS_KEYS.playlists, JSON.stringify(data));
  } catch {}
}

export function loadPlaylists(): { raw: any[]; songIds: string[]; embeddedSongs: Map<string, any> } | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.playlists);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const allIds: string[] = [];
    const embedded = new Map<string, any>();
    for (const pl of data) {
      if (pl.songs) allIds.push(...pl.songs);
      if (pl._embeddedSongs) {
        for (const s of pl._embeddedSongs) {
          if (!embedded.has(s.id)) embedded.set(s.id, s);
        }
      }
    }
    return { raw: data, songIds: [...new Set(allIds)], embeddedSongs: embedded };
  } catch {
    return null;
  }
}

export function saveAlbums(albums: SavedAlbum[]): void {
  try { localStorage.setItem(LS_KEYS.albums, JSON.stringify(albums)); } catch {}
}

export function loadAlbums(): SavedAlbum[] | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.albums);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function savePlayHistory(records: PlayRecord[]): void {
  try { localStorage.setItem(LS_KEYS.playHistory, JSON.stringify(records)); } catch {}
}

export function loadPlayHistory(): PlayRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEYS.playHistory);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
