export function shouldRestoreAudioState({ loaded, isPlaying, audioUrl, currentTime }) {
  return Boolean(
    loaded
    && !isPlaying
    && audioUrl
    && Number.isFinite(currentTime)
    && currentTime > 0
  );
}
