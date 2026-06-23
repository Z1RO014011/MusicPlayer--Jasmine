import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldRestoreAudioState } from '../src/lib/playbackRestore.js';

test('does not restore audio state for a fresh track start at time 0', () => {
  assert.equal(shouldRestoreAudioState({
    loaded: true,
    isPlaying: false,
    audioUrl: 'blob:track-1',
    currentTime: 0,
  }), false);
});

test('restores audio state for paused playback with progress', () => {
  assert.equal(shouldRestoreAudioState({
    loaded: true,
    isPlaying: false,
    audioUrl: 'blob:track-1',
    currentTime: 42,
  }), true);
});

test('does not restore when audio is already playing or missing url', () => {
  assert.equal(shouldRestoreAudioState({
    loaded: true,
    isPlaying: true,
    audioUrl: 'blob:track-1',
    currentTime: 42,
  }), false);

  assert.equal(shouldRestoreAudioState({
    loaded: true,
    isPlaying: false,
    audioUrl: '',
    currentTime: 42,
  }), false);
});
