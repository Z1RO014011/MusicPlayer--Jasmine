export interface PlaybackRestoreState {
  loaded: boolean;
  isPlaying: boolean;
  audioUrl: string;
  currentTime: number;
}

export function shouldRestoreAudioState(state: PlaybackRestoreState): boolean;
