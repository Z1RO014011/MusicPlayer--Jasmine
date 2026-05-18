import { MusicSource } from './types';
import {
  searchOnline,
  getPlaylistDetail,
  getSongAudioUrl,
  getBatchSongAudioUrls,
  getLyrics,
  getPersonalizedPlaylists,
  getToplistDetail,
} from '../neteaseApi';

export const neteaseSource: MusicSource = {
  id: 'netease',
  name: '网易云',
  color: '#ec4141',

  async search(keywords: string, limit?: number) {
    return searchOnline(keywords, limit);
  },

  async getPlaylistDetail(id: string) {
    const numId = Number(id.replace(/^netease-pl-/, ''));
    return getPlaylistDetail(numId);
  },

  async getAudioUrl(id: string) {
    const numId = Number(id.replace(/^netease-/, ''));
    return getSongAudioUrl(numId);
  },

  async getBatchAudioUrls(ids: string[]) {
    const numIds = ids.map(id => Number(id.replace(/^netease-/, '')));
    const numMap = await getBatchSongAudioUrls(numIds);
    const strMap = new Map<string, string | null>();
    for (const[id, url] of numMap) strMap.set(String(id), url);
    return strMap;
  },

  async getLyrics(id: string) {
    const numId = Number(id.replace(/^netease-/, ''));
    return getLyrics(numId);
  },

  async getRecommendations() {
    return getPersonalizedPlaylists(30);
  },

  async getCharts() {
    const list = await getToplistDetail();
    return list.map(item => ({ name: item.name, id: String(item.id) }));
  },

  async getChartSongs(id: string) {
    const pl = await getPlaylistDetail(Number(id));
    return pl.songs;
  },
};
