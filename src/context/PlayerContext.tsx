import React, { createContext, useContext, useReducer, useRef, useCallback, useEffect, useState } from 'react';
import { PlayerState, Song, Playlist, LyricLine, SavedAlbum } from '../types';
import { gradientColors } from '../data';
import { saveAudioFile, saveAudioData, loadAudioFile, deleteAudioFile, saveSongs, loadSongs, savePlaylists, loadPlaylists, saveAlbums, loadAlbums, savePlayHistory, loadPlayHistory, type PlayRecord } from '../lib/db';
import { extractMetadata } from '../lib/metadata';
import { getLoginCookie, getLyrics } from '../lib/neteaseApi';
import { useI18n } from '../i18n/I18nContext';

type PlayerAction =
  | { type: 'PLAY_SONG'; song: Song; playlist?: Playlist; queue?: Song[] }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_CURRENT_TIME'; time: number }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'CYCLE_REPEAT' }
  | { type: 'SET_QUEUE'; songs: Song[]; index: number }
  | { type: 'SEEK'; time: number }
  | { type: 'ADD_TO_QUEUE'; song: Song }
  | { type: 'REMOVE_FROM_QUEUE'; index: number }
  | { type: 'SET_SONG_LYRICS'; lyrics: LyricLine[] };

const initialState: PlayerState = {
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  isShuffled: false,
  repeatMode: 'off',
  queue: [],
  queueIndex: -1,
};

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'PLAY_SONG': {
      const explicitQueue = action.queue
        || (action.playlist ? action.playlist.songs : undefined);
      if (explicitQueue) {
        const idx = explicitQueue.findIndex(s => s.id === action.song.id);
        return { ...state, currentSong: action.song, queue: explicitQueue, queueIndex: idx >= 0 ? idx : 0, isPlaying: true, currentTime: 0 };
      }
      // No explicit queue: keep existing, just update song and index
      const idx = state.queue.findIndex(s => s.id === action.song.id);
      return { ...state, currentSong: action.song, queueIndex: idx >= 0 ? idx : state.queueIndex, isPlaying: true, currentTime: 0 };
    }
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.isPlaying };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.time };
    case 'SET_DURATION':
      return { ...state, duration: action.duration };
    case 'SET_VOLUME':
      return { ...state, volume: Math.max(0, Math.min(1, action.volume)) };
    case 'NEXT': {
      const { queue, queueIndex, repeatMode } = state;
      if (queue.length === 0) return state;
      let nextIndex: number;
      if (repeatMode === 'one') {
        nextIndex = queueIndex;
      } else {
        nextIndex = queueIndex + 1;
        if (nextIndex >= queue.length) {
          if (repeatMode === 'all') {
            nextIndex = 0;
          } else {
            return { ...state, isPlaying: false };
          }
        }
      }
      const nextSong = queue[nextIndex];
      return { ...state, currentSong: nextSong, queueIndex: nextIndex, isPlaying: true, currentTime: 0 };
    }
    case 'PREV': {
      const { queue, queueIndex, currentTime, repeatMode } = state;
      if (queue.length === 0) return state;
      if (currentTime > 3) {
        return { ...state, currentTime: 0 };
      }
      let prevIndex: number;
      if (repeatMode === 'one') {
        prevIndex = queueIndex;
      } else {
        prevIndex = queueIndex - 1;
        if (prevIndex < 0) {
          if (repeatMode === 'all') {
            prevIndex = queue.length - 1;
          } else {
            prevIndex = 0;
          }
        }
      }
      const prevSong = queue[prevIndex];
      return { ...state, currentSong: prevSong, queueIndex: prevIndex, isPlaying: true, currentTime: 0 };
    }
    case 'TOGGLE_SHUFFLE':
      return { ...state, isShuffled: !state.isShuffled };
    case 'CYCLE_REPEAT': {
      const modes: PlayerState['repeatMode'][] = ['off', 'all', 'one'];
      const idx = modes.indexOf(state.repeatMode);
      return { ...state, repeatMode: modes[(idx + 1) % modes.length] };
    }
    case 'SET_QUEUE':
      return { ...state, queue: action.songs, queueIndex: action.index };
    case 'SEEK':
      return { ...state, currentTime: action.time };
    case 'ADD_TO_QUEUE':
      return { ...state, queue: [...state.queue, action.song] };
    case 'REMOVE_FROM_QUEUE': {
      const q = [...state.queue];
      q.splice(action.index, 1);
      if (q.length === 0) return { ...state, queue: [], queueIndex: -1, currentSong: null, isPlaying: false };
      // Adjust queueIndex if we removed current or before-current song
      let newIdx = state.queueIndex;
      if (action.index < state.queueIndex) newIdx--;
      else if (action.index === state.queueIndex) {
        // Current song removed, play next or previous
        newIdx = Math.min(newIdx, q.length - 1);
        // If we removed the last song, go to previous
        if (newIdx >= q.length) newIdx = q.length - 1;
      }
      return { ...state, queue: q, queueIndex: newIdx, currentSong: q[newIdx] || null };
    }
    case 'SET_SONG_LYRICS':
      return state.currentSong
        ? { ...state, currentSong: { ...state.currentSong, lyrics: action.lyrics } }
        : state;
    default:
      return state;
  }
}

let colorIndex = 0;
function nextColor(): string {
  const c = gradientColors[colorIndex % gradientColors.length];
  colorIndex++;
  return c;
}

import { parseLRC } from '../lib/lyrics';

export const LIKED_PLAYLIST_ID = '__liked__';

interface PlayerContextType {
  state: PlayerState;
  dispatch: React.Dispatch<PlayerAction>;
  playPlaylist: (playlist: Playlist, startIndex?: number) => void;
  playSong: (song: Song, context?: Song[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;

  userSongs: Song[];
  userPlaylists: Playlist[];
  importFiles: (files: FileList) => Promise<void>;
  deleteSong: (songId: string) => void;
  createPlaylist: (data: { name: string; description: string; creator: string; coverColor: string }) => void;
  deletePlaylist: (playlistId: string) => void;
  renamePlaylist: (playlistId: string, name: string) => void;
  addSongsToPlaylist: (playlistId: string, songs: Song[]) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;

  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  likedPlaylist: Playlist | undefined;
  isLiked: (songId: string) => boolean;
  toggleLike: (song: Song) => void;
  savedAlbums: SavedAlbum[];
  isAlbumSaved: (neteaseId: number) => boolean;
  toggleAlbum: (album: Omit<SavedAlbum, 'id' | 'savedAt'>) => void;
  removeSavedAlbum: (albumId: string) => void;
  updateSongLyrics: (songId: string, lrcText: string) => void;
  updatePlaylistCover: (playlistId: string, coverColor: string) => void;
  downloadOnlineSong: (song: Song) => Promise<void>;
  playHistory: PlayRecord[];
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const [userSongs, setUserSongs] = useState<Song[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [savedAlbums, setSavedAlbums] = useState<SavedAlbum[]>([]);
  const [playHistory, setPlayHistory] = useState<PlayRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { t, language } = useI18n();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef(state);
  const loadedRef = useRef(false);
  stateRef.current = state;

  // Load persisted data on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      const songMeta = loadSongs() as any[];
      const playlistData = loadPlaylists();
      const songs: Song[] = [];
      const restoredPlaylistSongs = new Map<string, Song>();

      // Helper to create song from metadata
      const songFromMeta = async (meta: any) => {
        const audio = await loadAudioFile(meta.id);
        const song: Song = {
          id: meta.id,
          title: meta.title,
          artist: meta.artist,
          album: meta.album,
          duration: meta.duration,
          coverColor: meta.coverColor,
          coverUrl: meta.coverUrl,
          source: meta.source || 'local',
          neteaseId: meta.neteaseId,
          audioUrl: audio?.url || undefined,
          lyrics: meta.lyrics || undefined,
        };
        return song;
      };

      // Load audio and create songs from mp-songs
      if (songMeta) {
        for (const meta of songMeta) {
          const song = await songFromMeta(meta);
          songs.push(song);
          restoredPlaylistSongs.set(meta.id, song);
        }
      }

      // Fallback: restore songs from playlist embedded data if missing
      if (playlistData?.embeddedSongs) {
        for (const [id, meta] of playlistData.embeddedSongs) {
          if (!restoredPlaylistSongs.has(id)) {
            const song = await songFromMeta(meta);
            songs.push(song);
            restoredPlaylistSongs.set(id, song);
          }
        }
      }

      // Load playlists
      let pls: Playlist[] = [];
      if (playlistData) {
        pls = playlistData.raw.map((pl: any) => ({
          ...pl,
          songs: (pl.songs || [])
            .map((sid: string) => restoredPlaylistSongs.get(sid))
            .filter(Boolean),
          _embeddedSongs: undefined,
        }));
      }

      // Ensure "我喜欢的音乐" playlist exists
      const likedExists = pls.some(pl => pl.id === LIKED_PLAYLIST_ID);
      if (!likedExists) {
        pls.unshift({
          id: LIKED_PLAYLIST_ID,
          name: t('default.likedPlaylistName'),
          description: t('default.likedPlaylistDesc'),
          coverColor: 'linear-gradient(135deg, #e23b3b 0%, #ff6b6b 100%)',
          songs: [],
          createdAt: 0,
        });
      }

      // Load saved albums
      const savedAlbumsData = loadAlbums();
      if (savedAlbumsData) setSavedAlbums(savedAlbumsData);

      // Load play history
      setPlayHistory(loadPlayHistory());

      setUserPlaylists(pls);
      setUserSongs(songs);
      // Re-save songs to ensure mp-songs is always in sync
      if (songs.length > 0) saveSongs(songs);
      setLoaded(true);
    })();
  }, []);

  // Persist playlists when they change
  useEffect(() => {
    if (!loaded) return;
    savePlaylists(userPlaylists);
  }, [userPlaylists, loaded]);

  // Update liked playlist name when language changes
  useEffect(() => {
    if (!loaded) return;
    setUserPlaylists(prev =>
      prev.map(pl =>
        pl.id === LIKED_PLAYLIST_ID
          ? { ...pl, name: t('default.likedPlaylistName'), description: t('default.likedPlaylistDesc') }
          : pl
      )
    );
  }, [language, loaded, t]);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = state.volume;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => dispatch({ type: 'SET_CURRENT_TIME', time: audio.currentTime });
    const onDuration = () => dispatch({ type: 'SET_DURATION', duration: audio.duration });
    const onPlay = () => dispatch({ type: 'SET_PLAYING', isPlaying: true });
    const onPause = () => dispatch({ type: 'SET_PLAYING', isPlaying: false });

    const onEnded = () => {
      const s = stateRef.current;
      const playerAudio = audioRef.current;
      if (s.queue.length === 0) return;
      let nextIndex: number;
      if (s.repeatMode === 'one') {
        nextIndex = s.queueIndex;
      } else {
        nextIndex = s.queueIndex + 1;
        if (nextIndex >= s.queue.length) {
          if (s.repeatMode === 'all') {
            nextIndex = 0;
          } else {
            dispatch({ type: 'SET_PLAYING', isPlaying: false });
            if (playerAudio) playerAudio.pause();
            return;
          }
        }
      }
      const nextSong = s.queue[nextIndex];
      if (nextSong && playerAudio) {
        dispatch({ type: 'PLAY_SONG', song: nextSong });
        if (nextSong.audioUrl) {
          if (playerAudio.src !== nextSong.audioUrl) {
            playerAudio.src = nextSong.audioUrl;
            playerAudio.load();
          }
          playerAudio.play().catch(() => {});
          fetchLyricsForSong(nextSong);
        } else if (nextSong.source === 'online' && nextSong.neteaseId) {
          // Lazy-fetch online song URL
          const cookie = getLoginCookie();
          const cookieParam = cookie ? `&cookie=${encodeURIComponent(cookie)}` : '';
          fetch(`http://127.0.0.1:3000/song/url?id=${nextSong.neteaseId}&level=standard${cookieParam}`)
            .then(r => r.json())
            .then(json => {
              const url = json.data?.[0]?.url || undefined;
              if (url) {
                nextSong.audioUrl = url;
                if (playerAudio) {
                  playerAudio.src = url;
                  playerAudio.load();
                  playerAudio.play().catch(() => {});
                }
                fetchLyricsForSong(nextSong);
              }
            }).catch(() => {});
        }
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = state.volume;
  }, [state.volume]);

  async function initAudio(song: Song) {
    const audio = audioRef.current;
    if (!audio) return;
    let url = song.audioUrl;
    // Lazy-fetch audioUrl for online songs that haven't been loaded yet
    if (!url && song.source === 'online' && song.neteaseId) {
      const cookie = getLoginCookie();
      const cookieParam = cookie ? `&cookie=${encodeURIComponent(cookie)}` : '';
      try {
        const res = await fetch(`http://127.0.0.1:3000/song/url?id=${song.neteaseId}&level=standard${cookieParam}`);
        const json = await res.json();
        url = json.data?.[0]?.url || undefined;
        if (url) song.audioUrl = url;
      } catch {}
    }
    if (!url) return;
    if (audio.src !== url) {
      audio.src = url;
      audio.load();
    }
    audio.play().catch(() => {});
    prefetchNextUrl();
    fetchLyricsForSong(song);
  }


  const playPlaylist = useCallback((playlist: Playlist, startIndex = 0) => {
    const song = playlist.songs[startIndex];
    if (song) {
      dispatch({ type: 'PLAY_SONG', song, playlist });
      initAudio(song);
    }
  }, []);

  const playSong = useCallback((song: Song, context?: Song[]) => {
    if (context && context.length > 0) {
      dispatch({ type: 'PLAY_SONG', song, queue: context });
    } else {
      dispatch({ type: 'PLAY_SONG', song });
    }
    initAudio(song);
    // Record to play history
    setPlayHistory(prev => {
      const next = [{ songId: song.id, playedAt: Date.now() }, ...prev].slice(0, 500);
      savePlayHistory(next);
      return next;
    });
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    dispatch({ type: 'TOGGLE_PLAY' });
  }, []);

  // Preload next song's audio URL in background
  function prefetchNextUrl() {
    const s = stateRef.current;
    if (s.queue.length <= 1) return;
    let nextIdx = s.queueIndex + 1;
    if (nextIdx >= s.queue.length) nextIdx = 0;
    const nextSong = s.queue[nextIdx];
    if (nextSong && nextSong.source === 'online' && nextSong.neteaseId && !nextSong.audioUrl) {
      const cookie = getLoginCookie();
      const cookieParam = cookie ? `&cookie=${encodeURIComponent(cookie)}` : '';
      fetch(`http://127.0.0.1:3000/song/url?id=${nextSong.neteaseId}&level=standard${cookieParam}`)
        .then(r => r.json())
        .then(json => {
          const url = json.data?.[0]?.url || undefined;
          if (url) nextSong.audioUrl = url;
        }).catch(() => {});
    }
  }

  // Lazy-fetch lyrics for online songs missing them
  function fetchLyricsForSong(song: Song) {
    if (song.lyrics || !song.neteaseId) return;
    const port = window.electronAPI?.apiPort ?? 3000;
    fetch(`http://127.0.0.1:${port}/lyric?id=${song.neteaseId}`)
      .then(r => r.json())
      .then(json => {
        const lrcText = json.lrc?.lyric || json.tlyric?.lyric;
        if (lrcText) {
          const parsed = parseLRC(lrcText);
          if (parsed.length > 0) {
            song.lyrics = parsed;
            dispatch({ type: 'SET_SONG_LYRICS', lyrics: parsed });
          }
        }
      }).catch(() => {});
  }

  const switchToSong = useCallback((song: Song | undefined, audio: HTMLAudioElement | null) => {
    if (!song || !audio) return;
    const sameTrack = stateRef.current.currentSong?.id === song.id;
    dispatch({ type: 'PLAY_SONG', song: song });
    if (sameTrack) {
      // Same track: just seek to 0, keep playing
      audio.currentTime = 0;
      dispatch({ type: 'SEEK', time: 0 });
      audio.play().catch(() => {});
      return;
    }
    if (song.audioUrl) {
      audio.src = song.audioUrl;
      audio.load();
      audio.play().catch(() => {});
      prefetchNextUrl();
      fetchLyricsForSong(song);
      return;
    }
    // Lazy-fetch audioUrl for online songs missing URL
    if (song.source === 'online' && song.neteaseId) {
      const cookie = getLoginCookie();
      const cookieParam = cookie ? `&cookie=${encodeURIComponent(cookie)}` : '';
      fetch(`http://127.0.0.1:3000/song/url?id=${song.neteaseId}&level=standard${cookieParam}`)
        .then(r => r.json())
        .then(json => {
          const url = json.data?.[0]?.url || undefined;
          if (url) {
            song.audioUrl = url;
            if (audio) {
              audio.src = url;
              audio.load();
              audio.play().catch(() => {});
              prefetchNextUrl();
              fetchLyricsForSong(song);
            }
          }
        }).catch(() => {});
    }
  }, []);

  const nextTrack = useCallback(() => {
    const audio = audioRef.current;
    const { queue, queueIndex, repeatMode } = state;
    if (queue.length === 0) return;
    let nextIndex = queueIndex + 1;
    if (repeatMode === 'one') {
      nextIndex = queueIndex;
    } else if (nextIndex >= queue.length) {
      nextIndex = repeatMode === 'all' ? 0 : queueIndex;
    }
    switchToSong(queue[nextIndex], audio);
  }, [state.queue, state.queueIndex, state.repeatMode, switchToSong]);

  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    const { queue, queueIndex, currentTime, repeatMode } = state;
    if (queue.length === 0) return;
    if (currentTime > 3) {
      if (audio) {
        audio.currentTime = 0;
        dispatch({ type: 'SEEK', time: 0 });
      }
      return;
    }
    let prevIndex = queueIndex - 1;
    if (repeatMode === 'one') {
      prevIndex = queueIndex;
    } else if (prevIndex < 0) {
      prevIndex = repeatMode === 'all' ? queue.length - 1 : 0;
    }
    switchToSong(queue[prevIndex], audio);
  }, [state.queue, state.queueIndex, state.currentTime, state.repeatMode, switchToSong]);

  const importFiles = useCallback(async (files: FileList) => {
    const newSongs: Song[] = [];
    const fileArray = Array.from(files);

    // Separate audio files and LRC files
    const audioFiles = fileArray.filter(f => !f.name.endsWith('.lrc'));
    const lrcFiles = fileArray.filter(f => f.name.endsWith('.lrc'));

    // Parse LRC files and build a basename → lyrics map
    const lrcMap = new Map<string, LyricLine[]>();
    for (const lrcFile of lrcFiles) {
      const baseName = lrcFile.name.replace(/\.lrc$/i, '');
      try {
        const text = await lrcFile.text();
        const parsed = parseLRC(text);
        if (parsed.length > 0) {
          lrcMap.set(baseName, parsed);
        }
      } catch {
        // skip unreadable LRC files
      }
    }

    for (const file of audioFiles) {
      const id = `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await saveAudioFile(id, file);
      const loaded = await loadAudioFile(id);
      const duration = await getAudioDuration(loaded!.url);
      const meta = await extractMetadata(file);
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const matchedLyrics = lrcMap.get(baseName);
      const coverColor = meta.coverDataUrl
        ? `url(${meta.coverDataUrl}) center/cover no-repeat`
        : nextColor();
      const song: Song = {
        id,
        title: meta.title || baseName,
        artist: meta.artist || t('default.unknownArtist'),
        album: meta.album || t('default.unknownAlbum'),
        duration: Math.floor(duration),
        coverColor,
        audioUrl: loaded?.url,
        lyrics: matchedLyrics,
      };
      newSongs.push(song);
    }

    setUserSongs(prev => {
      const next = [...prev, ...newSongs];
      saveSongs(next);
      return next;
    });
  }, []);

  const deleteSong = useCallback((songId: string) => {
    deleteAudioFile(songId);
    setUserSongs(prev => {
      const deleted = prev.find(s => s.id === songId);
      if (deleted?.audioUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(deleted.audioUrl);
      }
      const next = prev.filter(s => s.id !== songId);
      saveSongs(next);
      return next;
    });
    setUserPlaylists(prev =>
      prev.map(pl => ({
        ...pl,
        songs: pl.songs.filter(s => s.id !== songId),
      }))
    );
  }, []);

  const createPlaylist = useCallback((data: { name: string; description: string; creator: string; coverColor: string }) => {
    const playlist: Playlist = {
      id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: data.name,
      description: data.description || t('default.playlistDescription', { name: data.name }),
      coverColor: data.coverColor || nextColor(),
      songs: [],
      createdAt: Date.now(),
      creator: data.creator || undefined,
    };
    setUserPlaylists(prev => [...prev, playlist]);
  }, []);

  const deletePlaylist = useCallback((playlistId: string) => {
    if (playlistId === LIKED_PLAYLIST_ID) return;
    setUserPlaylists(prev => prev.filter(pl => pl.id !== playlistId));
  }, []);

  const renamePlaylist = useCallback((playlistId: string, name: string) => {
    setUserPlaylists(prev =>
      prev.map(pl => pl.id === playlistId ? { ...pl, name, description: t('default.playlistDescription', { name }) } : pl)
    );
  }, []);

  const addSongsToPlaylist = useCallback((playlistId: string, songs: Song[]) => {
    setUserPlaylists(prev =>
      prev.map(pl =>
        pl.id === playlistId
          ? { ...pl, songs: [...pl.songs, ...songs.filter(s => !pl.songs.some(ps => ps.id === s.id))] }
          : pl
      )
    );
  }, []);

  const removeSongFromPlaylist = useCallback((playlistId: string, songId: string) => {
    setUserPlaylists(prev =>
      prev.map(pl =>
        pl.id === playlistId
          ? { ...pl, songs: pl.songs.filter(s => s.id !== songId) }
          : pl
      )
    );
  }, []);

  const likedPlaylist = userPlaylists.find(pl => pl.id === LIKED_PLAYLIST_ID);

  const isLiked = useCallback((songId: string) => {
    return likedPlaylist?.songs.some(s => s.id === songId) ?? false;
  }, [likedPlaylist]);

  const addToQueue = useCallback((song: Song) => {
    dispatch({ type: 'ADD_TO_QUEUE', song });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_FROM_QUEUE', index });
  }, []);

  const toggleLike = useCallback((song: Song) => {
    setUserPlaylists(prev =>
      prev.map(pl => {
        if (pl.id !== LIKED_PLAYLIST_ID) return pl;
        const exists = pl.songs.some(s => s.id === song.id);
        if (exists) {
          const remaining = pl.songs.filter(s => s.id !== song.id);
          return {
            ...pl,
            songs: remaining,
            coverColor: remaining.length > 0
              ? remaining[remaining.length - 1].coverColor
              : 'linear-gradient(135deg, #e23b3b 0%, #ff6b6b 100%)',
          };
        }
        const updated = [...pl.songs, song];
        return {
          ...pl,
          songs: updated,
          coverColor: song.coverColor,
        };
      })
    );
    // Ensure song is persisted to userSongs so playlist references survive reload
    setUserSongs(prev => {
      if (prev.some(s => s.id === song.id)) return prev;
      const next = [...prev, song];
      saveSongs(next);
      return next;
    });
  }, []);

  const updateSongLyrics = useCallback((songId: string, lrcText: string) => {
    const parsed = parseLRC(lrcText);
    setUserSongs(prev => {
      const next = prev.map(s => s.id === songId ? { ...s, lyrics: parsed } : s);
      saveSongs(next);
      return next;
    });
    if (stateRef.current.currentSong?.id === songId) {
      dispatch({ type: 'SET_SONG_LYRICS', lyrics: parsed });
    }
  }, []);

  const updatePlaylistCover = useCallback((playlistId: string, coverColor: string) => {
    setUserPlaylists(prev =>
      prev.map(pl => pl.id === playlistId ? { ...pl, coverColor } : pl)
    );
  }, []);

  const isAlbumSaved = useCallback((neteaseId: number) => {
    return savedAlbums.some(a => a.neteaseId === neteaseId);
  }, [savedAlbums]);

  const toggleAlbum = useCallback((album: Omit<SavedAlbum, 'id' | 'savedAt'>) => {
    setSavedAlbums(prev => {
      const exists = prev.find(a => a.neteaseId === album.neteaseId);
      let next: SavedAlbum[];
      if (exists) {
        next = prev.filter(a => a.neteaseId !== album.neteaseId);
      } else {
        next = [...prev, {
          ...album,
          id: `saved-album-${album.neteaseId}`,
          savedAt: Date.now(),
        }];
      }
      saveAlbums(next);
      return next;
    });
  }, []);

  const removeSavedAlbum = useCallback((albumId: string) => {
    setSavedAlbums(prev => {
      const next = prev.filter(a => a.id !== albumId);
      saveAlbums(next);
      return next;
    });
  }, []);

  const downloadOnlineSong = useCallback(async (song: Song) => {
    if (song.source !== 'online' || !song.audioUrl || !song.neteaseId) return;

    // Check if already downloaded
    setUserSongs(prev => {
      const exists = prev.some(s => s.neteaseId === song.neteaseId && s.source === 'local');
      if (exists) return prev;
      return prev;
    });

    const localId = `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let blobUrl: string | undefined;

    if (window.electronAPI) {
      const result = await window.electronAPI.downloadAudio(localId, song.audioUrl);
      await saveAudioData(localId, result.data.buffer as ArrayBuffer, result.mimeType);
    } else {
      // Browser dev fallback
      const response = await fetch(song.audioUrl);
      const buffer = await response.arrayBuffer();
      await saveAudioData(localId, buffer, response.headers.get('content-type') || 'audio/mpeg');
    }

    const loaded = await loadAudioFile(localId);
    blobUrl = loaded?.url;

    // Get duration
    let duration = song.duration;
    if (blobUrl) {
      duration = await getAudioDuration(blobUrl);
    }

    const localSong: Song = {
      id: localId,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: Math.floor(duration),
      coverColor: song.coverColor,
      coverUrl: song.coverUrl,
      source: 'local',
      neteaseId: song.neteaseId,
      audioUrl: blobUrl,
      lyrics: song.lyrics,
    };

    setUserSongs(prev => {
      const exists = prev.some(s => s.neteaseId === song.neteaseId && s.source === 'local');
      if (exists) return prev;
      const next = [...prev, localSong];
      saveSongs(next);
      return next;
    });
  }, []);

  return (
    <PlayerContext.Provider value={{
      state, dispatch, playPlaylist, playSong, togglePlay, nextTrack, prevTrack, audioRef,
      userSongs, userPlaylists,
      importFiles, deleteSong, createPlaylist, deletePlaylist,
      renamePlaylist, addSongsToPlaylist, removeSongFromPlaylist,
      addToQueue, removeFromQueue,
      likedPlaylist, isLiked, toggleLike, savedAlbums, isAlbumSaved, toggleAlbum, removeSavedAlbum,
      updateSongLyrics, updatePlaylistCover,
      downloadOnlineSong,
      playHistory,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

function getAudioDuration(url: string): Promise<number> {
  return new Promise(resolve => {
    const audio = new Audio(url);
    audio.preload = 'metadata';
    const onLoaded = () => {
      const dur = audio.duration || 0;
      cleanup();
      resolve(dur);
    };
    const onError = () => { cleanup(); resolve(0); };
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
      audio.src = '';
    };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);
    audio.load();
    setTimeout(() => { cleanup(); resolve(0); }, 3000);
  });
}
