import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../i18n/I18nContext';
import { LyricsView } from './LyricsView';
import { generateShareCard } from '../lib/share';
import { SkeletonCover } from './Skeleton';
import { getSimiSong } from '../lib/neteaseApi';
import { defaultSource } from '../lib/sources';
import type { Song } from '../types';

interface NowPlayingViewProps {
  onBack: () => void;
  onOpenArtist?: (artist: { id?: number; name: string }) => void;
}

export function NowPlayingView({ onBack, onOpenArtist }: NowPlayingViewProps) {
  const { state, dispatch, togglePlay, nextTrack, prevTrack, audioRef, isLiked, toggleLike, updateSongLyrics, playSong } = usePlayer();
  const { t } = useI18n();  const source = defaultSource;
  const { currentSong, isPlaying, currentTime, duration, volume, isShuffled, repeatMode } = state;
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const [draggingVolume, setDraggingVolume] = useState(false);
  const [draggingProgress, setDraggingProgress] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [editingLyrics, setEditingLyrics] = useState(false);
  const [lrcInput, setLrcInput] = useState('');
  const [simiSongs, setSimiSongs] = useState<Song[]>([]);
  const [simiLoading, setSimiLoading] = useState(false);
  const [showSimi, setShowSimi] = useState(false);

  function formatTime(sec: number): string {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // --- progress bar ---
  const handleProgressDown = useCallback((e: React.MouseEvent) => {
    const el = progressRef.current;
    if (!el || !duration) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = pct * duration;
    if (audioRef.current) audioRef.current.currentTime = time;
    dispatch({ type: 'SEEK', time });
    setDraggingProgress(true);
  }, [duration, dispatch, audioRef]);

  useEffect(() => {
    if (!draggingProgress) return;
    const handleMove = (e: MouseEvent) => {
      const el = progressRef.current;
      if (!el || !duration) return;
      const rect = el.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pct * duration;
      if (audioRef.current) audioRef.current.currentTime = time;
      dispatch({ type: 'SEEK', time });
    };
    const handleUp = () => setDraggingProgress(false);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [draggingProgress, duration, dispatch, audioRef]);

  // --- volume bar ---
  const handleVolumeDown = useCallback((e: React.MouseEvent) => {
    const el = volumeRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    dispatch({ type: 'SET_VOLUME', volume: pct });
    setDraggingVolume(true);
  }, [dispatch]);

  useEffect(() => {
    if (!draggingVolume) return;
    const handleMove = (e: MouseEvent) => {
      const el = volumeRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      dispatch({ type: 'SET_VOLUME', volume: pct });
    };
    const handleUp = () => setDraggingVolume(false);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [draggingVolume, dispatch]);

  // --- share ---
  const handleShare = useCallback(async () => {
    if (!currentSong) return;
    setSharing(true);
    try {
      const dataUrl = await generateShareCard(currentSong);
      setShareImage(dataUrl);
    } catch {
      setSharing(false);
    }
  }, [currentSong]);

  const handleDownloadShare = useCallback(() => {
    if (!shareImage || !currentSong) return;
    const a = document.createElement('a');
    a.href = shareImage;
    a.download = `${currentSong.title} - ${currentSong.artist}.png`;
    a.click();
  }, [shareImage, currentSong]);

  // --- lyrics ---
  const handleLyricSeek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
    dispatch({ type: 'SEEK', time });
  }, [audioRef, dispatch]);

  // --- similar songs ---
  useEffect(() => {
    if (!currentSong?.neteaseId || !showLyrics) return;
    setSimiLoading(true);
    getSimiSong(currentSong.neteaseId, 10)
      .then(setSimiSongs)
      .catch(() => setSimiSongs([]))
      .finally(() => setSimiLoading(false));
  }, [currentSong?.neteaseId, showLyrics]);

  const handlePlaySimiSong = useCallback(async (song: Song, _index: number) => {
    const id = song.id.replace(/^netease-/, '');
    const audioUrl = song.audioUrl || (await source.getAudioUrl(id)) || undefined;
    playSong(
      audioUrl ? { ...song, audioUrl } : song,
      simiSongs.length > 0 ? simiSongs.map(s => {
        if (s.id === song.id) return audioUrl ? { ...song, audioUrl } : song;
        return s;
      }) : undefined,
    );
  }, [playSong, simiSongs, source]);

  const handleSaveLyrics = useCallback(() => {
    if (!currentSong || !lrcInput.trim()) return;
    updateSongLyrics(currentSong.id, lrcInput);
    setEditingLyrics(false);
    setLrcInput('');
    setShowLyrics(true);
  }, [currentSong, lrcInput, updateSongLyrics]);

  // --- computed ---
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayedArtists = useMemo<Array<{ id?: number; name: string }>>(() => {
    if (currentSong?.artists?.length) return currentSong.artists;
    return (currentSong?.artist || '')
      .split(/\s*\/\s*/)
      .map(name => name.trim())
      .filter(Boolean)
      .map(name => ({ name }));
  }, [currentSong]);
  const bgStyle = useMemo(() => {
    if (currentSong?.coverColor?.startsWith('url(')) {
      return { background: currentSong.coverColor, backgroundSize: 'cover' };
    }
    return { background: currentSong?.coverColor || '#121212' };
  }, [currentSong]);

  // --- empty state ---
  if (!currentSong) {
    return (
      <div className="nowplaying-view" style={{ background: '#121212' }}>
        <div className="nowplaying-view-inner">
          <p className="nowplaying-none">{t('np.noSong')}</p>
        </div>
      </div>
    );
  }

  const lyrics = currentSong.lyrics || [];
  const hasLyrics = lyrics.length > 0;
  const renderArtistLinks = (className: string) => (
    <span className={className}>
      {displayedArtists.map((artist, index) => (
        <React.Fragment key={`${artist.id || artist.name}-${index}`}>
          {index > 0 && <span className="artist-link-separator"> / </span>}
          <button
            type="button"
            className="artist-link-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenArtist?.(artist);
            }}
            disabled={!onOpenArtist}
            title={artist.name}
          >
            {artist.name}
          </button>
        </React.Fragment>
      ))}
    </span>
  );

  return (
    <div className="nowplaying-view" style={bgStyle}>
      <div className="nowplaying-view-bg" style={bgStyle} />
      <div className="nowplaying-view-overlay" />

      {/* Top bar */}
      <div className="nowplaying-view-top-bar">
        <button className="nowplaying-view-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M15.5 3.5a1 1 0 010 1.5L9.42 12l6.08 7a1 1 0 01-1.5 1.5l-6.5-7.5a1 1 0 010-1.5l6.5-7.5a1 1 0 011.5 0z"/>
          </svg>
        </button>
      </div>

      {/* Main content */}
      {showLyrics ? (
        /* ── LYRICS MODE: split layout ── */
        <div className="np-lyrics-mode-layout">
          <div className="np-lyrics-left">
            <div className="nowplaying-view-cover" onClick={() => setShowLyrics(false)} title={t('np.clickToReturn')}>
              <div
                className="nowplaying-view-cover-art"
                style={{
                  background: currentSong.coverColor.startsWith('url(')
                    ? `${currentSong.coverColor}`
                    : currentSong.coverColor,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div className="nowplaying-view-cover-ring" />
              <div className="np-lyrics-cover-hint">{t('np.clickToReturn')}</div>
            </div>

            <div className="np-lyrics-info" onClick={() => setShowLyrics(false)} style={{ cursor: 'pointer' }} title={t('np.clickToReturn')}>
              <div className="np-lyrics-title">{currentSong.title}</div>
              {renderArtistLinks('np-lyrics-artist')}
            </div>

            <div className="np-lyrics-controls-section">
              <div className="np-lyrics-progress">
                <div className="nowplaying-view-progress" ref={progressRef} onMouseDown={handleProgressDown}>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                    <div className="progress-thumb" style={{ left: `${progressPct}%` }} />
                  </div>
                </div>
                <div className="np-lyrics-time">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="np-lyrics-ctrls">
                <button
                  className={`nowplaying-view-btn${isShuffled ? ' active' : ''}`}
                  onClick={() => dispatch({ type: 'TOGGLE_SHUFFLE' })}
                  title={t('player.shuffle')}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m18 14 4 4-4 4" />
                    <path d="m18 2 4 4-4 4" />
                    <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
                    <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
                    <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
                  </svg>
                </button>
                <button className="nowplaying-view-btn" onClick={prevTrack} title={t('player.previous')}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M6 4h2v16H6V4zm12.49-.323l-12 8.485a1 1 0 000 1.676l12 8.485A1 1 0 0022 21.485V2.515a1 1 0 00-1.51-.838z"/>
                  </svg>
                </button>
                <button className="nowplaying-view-play" onClick={togglePlay} title={isPlaying ? t('action.pause') : t('action.play')}>
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                      <path d="M5.7 3a.7.7 0 00-.7.7v16.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V3.7a.7.7 0 00-.7-.7H5.7zm8 0a.7.7 0 00-.7.7v16.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V3.7a.7.7 0 00-.7-.7h-2.6z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                      <path d="M5.7 3a.7.7 0 00-.7.7v16.6a.7.7 0 00.7.7l15.3-8.3a.7.7 0 000-1.2L5.7 3z"/>
                    </svg>
                  )}
                </button>
                <button className="nowplaying-view-btn" onClick={nextTrack} title={t('player.next')}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M5.51 2.323l12 8.485a1 1 0 010 1.676l-12 8.485A1 1 0 014 20.485V3.515a1 1 0 011.51-.838zM18 4h2v16h-2V4z"/>
                  </svg>
                </button>
                <button
                  className={`nowplaying-view-btn${repeatMode !== 'off' ? ' active' : ''}`}
                  onClick={() => dispatch({ type: 'CYCLE_REPEAT' })}
                  title={`${t('player.repeat')}: ${repeatMode === 'off' ? t('player.repeatOff') : repeatMode === 'all' ? t('player.repeatAll') : t('player.repeatOne')}`}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={repeatMode === 'one'
                      ? 'm17 2 4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 m-14 16-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3 M11 10h1v4'
                      : 'm17 2 4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 m-14 16-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3'} />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="np-lyrics-right">
            {hasLyrics ? (
              <>
                <div className="np-lyrics-right-actions">
                  <button
                    className={`nowplaying-lyrics-toggle${showSimi ? ' active' : ''}`}
                    onClick={() => setShowSimi(!showSimi)}
                    title={showSimi ? t('np.closeLyrics') : t('np.similarSongs')}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M9.5 3A6.5 6.5 0 0116 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l4.5 4.5-1.5 1.5-4.5-4.5v-.79l-.27-.27A6.5 6.5 0 119.5 3zm0 2a4.5 4.5 0 100 9 4.5 4.5 0 000-9z"/>
                    </svg>
                  </button>
                  <button
                    className="nowplaying-lyrics-edit-btn"
                    onClick={() => { setEditingLyrics(true); setLrcInput(''); }}
                    title={t('np.editLyrics')}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M16.86 3.02a1.5 1.5 0 012.12 2.12l-10.6 10.6-2.84.7.7-2.84 10.62-10.58zM4 20h16v-2H4v2z"/>
                    </svg>
                  </button>
                  <button
                    className={`nowplaying-lyrics-toggle${showLyrics && !showSimi ? ' active' : ''}`}
                    onClick={() => { setShowLyrics(false); setEditingLyrics(false); setShowSimi(false); }}
                    title={t('np.closeLyrics')}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/>
                    </svg>
                  </button>
                </div>
                {showSimi ? (
                  <div className="np-simi-panel">
                    <h3 className="np-simi-title">{t('np.similarSongs')}</h3>
                    {simiLoading ? (
                      <div className="np-simi-loading">{t('discover.loading')}</div>
                    ) : simiSongs.length === 0 ? (
                      <div className="np-simi-empty">{t('discover.searchHint')}</div>
                    ) : (
                      <div className="np-simi-list">
                        {simiSongs.slice(0, 10).map((song, i) => (
                          <div
                            key={song.id}
                            className="np-simi-row"
                            onClick={() => handlePlaySimiSong(song, i)}
                          >
                            <span className="np-simi-num">{i + 1}</span>
                            <div className="np-simi-cover" style={{ background: song.coverColor }} />
                            <div className="np-simi-info">
                              <div className="np-simi-name">{song.title}</div>
                              <div className="np-simi-artist">{song.artist}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                <LyricsView
                  lyrics={lyrics}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onSeek={handleLyricSeek}
                />
                )}
              </>
            ) : (
              <div className="nowplaying-no-lyrics">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                  <path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/>
                </svg>
                <p>{t('np.noLyrics')}</p>
                <button className="nowplaying-add-lyrics-btn" onClick={() => { setEditingLyrics(true); setLrcInput(''); }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/>
                  </svg>
                  {t('np.addLyrics')}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── NORMAL MODE ── */
        <div className="nowplaying-view-inner">
          <div className="nowplaying-view-left">
            <div
              className="nowplaying-view-cover"
              onClick={() => setShowLyrics(true)}
              title={t('np.clickForLyrics')}
              style={{ cursor: 'pointer' }}
            >
              <div
                className="nowplaying-view-cover-art"
                style={{
                  background: currentSong.coverColor.startsWith('url(')
                    ? `${currentSong.coverColor}`
                    : currentSong.coverColor,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div className="nowplaying-view-cover-ring" />
              {hasLyrics && <div className="np-lyrics-cover-hint">{t('np.clickForLyrics')}</div>}
            </div>
          </div>

          <div className="nowplaying-view-right">
            {editingLyrics ? (
              /* ── LYRICS EDITOR ── */
              <div className="nowplaying-lyrics-editor">
                <p className="nowplaying-lyrics-editor-hint">
                  {t('np.lrcHint')}
                </p>
                <textarea
                  className="nowplaying-lyrics-textarea"
                  value={lrcInput}
                  onChange={e => setLrcInput(e.target.value)}
                  placeholder={t('np.lrcPlaceholder')}
                  rows={10}
                />
                <div className="nowplaying-lyrics-editor-actions">
                  <button className="nowplaying-lyrics-btn-cancel" onClick={() => setEditingLyrics(false)}>{t('action.cancel')}</button>
                  <button className="nowplaying-lyrics-btn-save" onClick={handleSaveLyrics}>{t('np.saveLyrics')}</button>
                </div>
              </div>
            ) : (
              /* ── DEFAULT VIEW ── */
              <>
                {hasLyrics && (
                  <div className="np-lyrics-right-actions">
                    <button
                      className="nowplaying-lyrics-edit-btn"
                      onClick={() => { setEditingLyrics(true); setLrcInput(''); }}
                      title={t('np.editLyrics')}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M16.86 3.02a1.5 1.5 0 012.12 2.12l-10.6 10.6-2.84.7.7-2.84 10.62-10.58zM4 20h16v-2H4v2z"/>
                      </svg>
                    </button>
                    <button
                      className={`nowplaying-lyrics-toggle${showLyrics ? ' active' : ''}`}
                      onClick={() => { setShowLyrics(!showLyrics); setEditingLyrics(false); }}
                      title={showLyrics ? t('np.hideLyrics') : t('np.showLyrics')}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/>
                      </svg>
                    </button>
                  </div>
                )}
                <div className="nowplaying-view-text">
                  <div className="nowplaying-view-title-row">
                    <h1 className="nowplaying-view-title">{currentSong.title}</h1>
                    <button
                      className={`like-btn${isLiked(currentSong.id) ? ' liked' : ''}`}
                      onClick={() => toggleLike(currentSong)}
                      title={isLiked(currentSong.id) ? t('player.unlike') : t('player.like')}
                    >
                      <svg viewBox="0 0 24 24" width="24" height="24" fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </button>
                  </div>
                  {renderArtistLinks('nowplaying-view-artist')}
                  <p className="nowplaying-view-album">{currentSong.album}</p>
                </div>

                <div className="nowplaying-view-progress-section">
                  <div className="nowplaying-view-progress" ref={progressRef} onMouseDown={handleProgressDown}>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                      <div className="progress-thumb" style={{ left: `${progressPct}%` }} />
                    </div>
                  </div>
                  <div className="nowplaying-view-time">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="nowplaying-view-controls">
                  <button
                    className={`nowplaying-view-btn${isShuffled ? ' active' : ''}`}
                    onClick={() => dispatch({ type: 'TOGGLE_SHUFFLE' })}
                    title={t('player.shuffle')}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m18 14 4 4-4 4" />
                    <path d="m18 2 4 4-4 4" />
                    <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
                    <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
                    <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
                    </svg>
                  </button>
                  <button className="nowplaying-view-btn" onClick={prevTrack} title={t('player.previous')}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M6 4h2v16H6V4zm12.49-.323l-12 8.485a1 1 0 000 1.676l12 8.485A1 1 0 0022 21.485V2.515a1 1 0 00-1.51-.838z"/>
                    </svg>
                  </button>
                  <button className="nowplaying-view-play" onClick={togglePlay} title={isPlaying ? t('action.pause') : t('action.play')}>
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                        <path d="M5.7 3a.7.7 0 00-.7.7v16.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V3.7a.7.7 0 00-.7-.7H5.7zm8 0a.7.7 0 00-.7.7v16.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V3.7a.7.7 0 00-.7-.7h-2.6z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                        <path d="M5.7 3a.7.7 0 00-.7.7v16.6a.7.7 0 00.7.7l15.3-8.3a.7.7 0 000-1.2L5.7 3z"/>
                      </svg>
                    )}
                  </button>
                  <button className="nowplaying-view-btn" onClick={nextTrack} title={t('player.next')}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M5.51 2.323l12 8.485a1 1 0 010 1.676l-12 8.485A1 1 0 014 20.485V3.515a1 1 0 011.51-.838zM18 4h2v16h-2V4z"/>
                    </svg>
                  </button>
                  <button
                    className={`nowplaying-view-btn${repeatMode !== 'off' ? ' active' : ''}`}
                    onClick={() => dispatch({ type: 'CYCLE_REPEAT' })}
                    title={`${t('player.repeat')}: ${repeatMode === 'off' ? t('player.repeatOff') : repeatMode === 'all' ? t('player.repeatAll') : t('player.repeatOne')}`}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={repeatMode === 'one'
                      ? 'm17 2 4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 m-14 16-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3 M11 10h1v4'
                      : 'm17 2 4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 m-14 16-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3'} />
                    </svg>
                    </button>
                </div>

                <div className="nowplaying-volume-section">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="np-volume-icon">
                    <path d={volume === 0
                      ? "M1 8v8h4l5.7 5.3a1 1 0 001.3 0V2.7a1 1 0 00-1.3 0L5 8H1z"
                      : "M1 8v8h4l5.7 5.3a1 1 0 001.3 0V2.7a1 1 0 00-1.3 0L5 8H1zm13.5 4a4.5 4.5 0 01-2.12 3.82.75.75 0 00.74 1.3 6 6 0 000-10.24.75.75 0 10-.74 1.3A4.5 4.5 0 0114.5 12z"
                    }/>
                  </svg>
                  <div className="np-volume-bar" ref={volumeRef} onMouseDown={handleVolumeDown}>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${volume * 100}%` }} />
                      <div className="progress-thumb" style={{ left: `${volume * 100}%` }} />
                    </div>
                  </div>
                </div>

                <div className="nowplaying-view-meta">
                  <div className="np-meta-item">
                    <span className="np-meta-label">{t('np.album')}</span>
                    <span className="np-meta-value">{currentSong.album}</span>
                  </div>
                  <div className="np-meta-item">
                    <span className="np-meta-label">{t('np.artist')}</span>
                    {renderArtistLinks('np-meta-value')}
                  </div>
                  <div className="np-meta-item">
                    <span className="np-meta-label">{t('np.duration')}</span>
                    <span className="np-meta-value">{formatTime(currentSong.duration)}</span>
                  </div>
                </div>

                {!hasLyrics && (
                  <button className="nowplaying-add-lyrics-btn" onClick={() => { setLrcInput(''); setEditingLyrics(true); }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/>
                    </svg>
                    {t('np.addLyrics')}
                  </button>
                )}
                <button className="nowplaying-share-btn" onClick={handleShare} title={t('np.shareSong')}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                  </svg>
                  {t('np.share')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Share modal */}
      {shareImage && (
        <div className="modal-overlay" onClick={() => { setShareImage(null); setSharing(false); }}>
          <div className="share-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{t('np.shareCard')}</h2>
              <button className="modal-close" onClick={() => { setShareImage(null); setSharing(false); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M3.293 3.293a1 1 0 011.414 0L12 10.586l7.293-7.293a1 1 0 111.414 1.414L13.414 12l7.293 7.293a1 1 0 01-1.414 1.414L12 13.414l-7.293 7.293a1 1 0 01-1.414-1.414L10.586 12 3.293 4.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
            <div className="share-card-preview">
              <img src={shareImage} alt={t('np.shareCard')} loading="lazy" />
            </div>
            <div className="share-modal-actions">
              <button className="share-download-btn" onClick={handleDownloadShare}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M19 10a1 1 0 01 1 1v6a3 3 0 01-3 3H7a3 3 0 01-3-3v-6a1 1 0 012 0v6a1 1 0 001 1h10a1 1 0 001-1v-6a1 1 0 011-1zm-7-7a1 1 0 01.707.293l4 4a1 1 0 01-1.414 1.414L13 6.414V15a1 1 0 11-2 0V6.414L8.707 8.707a1 1 0 01-1.414-1.414l4-4A1 1 0 0112 3z"/>
                </svg>
                {t('np.downloadImage')}
              </button>
            </div>
          </div>
        </div>
      )}

      {sharing && !shareImage && (
        <div className="modal-overlay">
          <div className="share-loading">
            <div className="share-spinner" />
            <p>{t('np.generating')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
