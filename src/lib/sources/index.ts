import { MusicSource } from './types';
import { neteaseSource } from './netease';

export type { MusicSource } from './types';
export const sources: MusicSource[] = [neteaseSource];
export const defaultSource = neteaseSource;
