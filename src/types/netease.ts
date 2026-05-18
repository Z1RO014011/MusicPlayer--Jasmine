export interface NeteaseArtist {
  id: number;
  name: string;
}

export interface NeteaseSongItem {
  id: number;
  name: string;
  ar: NeteaseArtist[];
  al: { id: number; name: string; picUrl: string };
  dt: number;
}

export interface NeteasePlaylistItem {
  id: number;
  name: string;
  coverImgUrl: string;
  description: string;
  trackCount: number;
  playCount: number;
  creator: { nickname: string };
}

export interface NeteaseSearchResponse {
  result: {
    songs?: NeteaseSongItem[];
    playlists?: NeteasePlaylistItem[];
    songCount?: number;
  };
}

export interface NeteasePlaylistDetailResponse {
  playlist: {
    id: number;
    name: string;
    coverImgUrl: string;
    description: string;
    tracks: NeteaseSongItem[];
    trackIds: { id: number }[];
    creator: { nickname: string };
  };
}

export interface NeteaseSongUrlResponse {
  data: { id: number; url: string; br: number; type: string }[];
}
