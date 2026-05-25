export interface LyricLine {
  time: number;
  text: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  artists?: { id: number; name: string }[];
  album: string;
  duration: number;
  coverColor: string;
  coverUrl?: string;
  source?: 'local' | 'online';
  neteaseId?: number;
  audioUrl?: string;
  lyrics?: LyricLine[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverColor: string;
  songs: Song[];
  createdAt: number;
  creator?: string;
}

export interface SavedAlbum {
  id: string;
  neteaseId: number;
  name: string;
  artist: string;
  picUrl: string;
  coverColor: string;
  savedAt: number;
}

export type ViewType = 'home' | 'search' | 'library' | 'playlist' | 'nowplaying' | 'settings' | 'discover' | 'queue';

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: Song[];
  queueIndex: number;
}

export interface PlaylistFormData {
  name: string;
  description: string;
  creator: string;
  coverColor: string;
}
