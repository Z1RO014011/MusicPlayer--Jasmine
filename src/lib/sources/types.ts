import { Song, Playlist, LyricLine } from '../../types';

export interface MusicSource {
  id: string;
  name: string;
  color: string;
  search: (keywords: string, limit?: number) => Promise<{ songs: Song[]; playlists: Playlist[] }>;
  getPlaylistDetail: (id: string) => Promise<Playlist>;
  getAudioUrl: (id: string) => Promise<string | null>;
  getBatchAudioUrls: (ids: string[]) => Promise<Map<string, string | null>>;
  getLyrics: (id: string) => Promise<LyricLine[]>;
  getRecommendations: () => Promise<Playlist[]>;
  getCharts: () => Promise<{ name: string; id: string }[]>;
  getChartSongs: (id: string) => Promise<Song[]>;
}
