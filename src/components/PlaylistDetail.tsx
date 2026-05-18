import React, { useState, useRef } from 'react';
import { Playlist, Song } from '../types';
import { usePlayer, LIKED_PLAYLIST_ID } from '../context/PlayerContext';
import { useI18n } from '../i18n/I18nContext';
import { gradientColors } from '../data';

interface PlaylistDetailProps {
  playlist: Playlist;
  onBack: () => void;
}

export function PlaylistDetail({ playlist, onBack }: PlaylistDetailProps) {
  const { playPlaylist, playSong, removeSongFromPlaylist, deletePlaylist, renamePlaylist, userSongs, addSongsToPlaylist, updatePlaylistCover, toggleLike, isLiked } = usePlayer();
  const { t } = useI18n();
  const isLikedPlaylist = playlist.id === LIKED_PLAYLIST_ID;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(playlist.name);
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? t('common.durationHours', { h, m }) : t('common.durationMinutes', { m });
  }

  const totalDuration = playlist.songs.reduce((acc, s) => acc + s.duration, 0);

  function handleRename() {
    if (editName.trim() && editName.trim() !== playlist.name) {
      renamePlaylist(playlist.id, editName.trim());
    }
    setIsEditing(false);
  }

  function handleDelete() {
    deletePlaylist(playlist.id);
    onBack();
  }

  function handleAddSong(song: Song) {
    addSongsToPlaylist(playlist.id, [song]);
  }

  function handleCoverImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const coverStyle = `url(${dataUrl}) center/cover no-repeat`;
      updatePlaylistCover(playlist.id, coverStyle);
      setShowCoverEditor(false);
    };
    reader.readAsDataURL(file);
  }

  function handleCoverColorSelect(color: string) {
    updatePlaylistCover(playlist.id, color);
    setShowCoverEditor(false);
  }

  const availableSongs = userSongs.filter(s => !playlist.songs.some(ps => ps.id === s.id));

  return (
    <div className="playlist-detail">
      <div className="playlist-detail-hero" style={{ background: playlist.coverColor }}>
        <button className="back-button" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M15.5 3.5a1 1 0 010 1.5L9.42 12l6.08 7a1 1 0 01-1.5 1.5l-6.5-7.5a1 1 0 010-1.5l6.5-7.5a1 1 0 011.5 0z"/>
          </svg>
        </button>

        <button
          className="playlist-cover-edit-btn"
          onClick={() => setShowCoverEditor(!showCoverEditor)}
          title={t('playlist.changeCover')}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        {showCoverEditor && (
          <div className="playlist-cover-editor" onClick={e => e.stopPropagation()}>
            <div className="playlist-cover-editor-section">
              <p className="playlist-cover-editor-label">{t('playlist.uploadImage')}</p>
              <button className="cover-upload-btn" onClick={() => fileInputRef.current?.click()}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M19 10a1 1 0 01 1 1v6a3 3 0 01-3 3H7a3 3 0 01-3-3v-6a1 1 0 012 0v6a1 1 0 001 1h10a1 1 0 001-1v-6a1 1 0 011-1zm-7-7a1 1 0 01.707.293l4 4a1 1 0 01-1.414 1.414L13 6.414V15a1 1 0 11-2 0V6.414L8.707 8.707a1 1 0 01-1.414-1.414l4-4A1 1 0 0112 3z"/>
                </svg>
                {t('playlist.selectImage')}
              </button>
            </div>
            <div className="playlist-cover-editor-section">
              <p className="playlist-cover-editor-label">{t('playlist.orGradient')}</p>
              <div className="color-picker">
                {gradientColors.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`color-swatch ${playlist.coverColor === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => handleCoverColorSelect(c)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverImageSelect}
          style={{ display: 'none' }}
        />
        <div className="playlist-detail-info">
          <span className="playlist-detail-label">{t('playlist.label')}</span>
          {isEditing && !isLikedPlaylist ? (
            <div className="playlist-rename">
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsEditing(false); }}
                autoFocus
              />
              <button onClick={handleRename}>{t('playlist.save')}</button>
              <button onClick={() => setIsEditing(false)}>{t('playlist.cancel')}</button>
            </div>
          ) : (
            <h1 className="playlist-detail-title" onClick={() => { if (!isLikedPlaylist) { setEditName(playlist.name); setIsEditing(true); } }}>
              {playlist.name}
            </h1>
          )}
          <p className="playlist-detail-desc">{playlist.description}</p>
          <p className="playlist-detail-meta">
            {t('common.songCount', { count: playlist.songs.length })} · {t('common.durationApprox')} {formatDuration(totalDuration)}
            {playlist.creator && <> · {playlist.creator}</>}
          </p>
        </div>
      </div>

      <div className="playlist-detail-actions">
        <button className="playlist-play-all" onClick={() => playPlaylist(playlist)}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M5.7 3a.7.7 0 00-.7.7v16.6a.7.7 0 00.7.7l15.3-8.3a.7.7 0 000-1.2L5.7 3z"/>
          </svg>
        </button>
        {availableSongs.length > 0 && (
          <button className="playlist-action-btn" onClick={() => setShowAddSongs(!showAddSongs)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 3a1 1 0 011 1v7h7a1 1 0 110 2h-7v7a1 1 0 11-2 0v-7H4a1 1 0 110-2h7V4a1 1 0 011-1z"/>
            </svg>
            {t('playlist.addSongs')}
          </button>
        )}
        {!isLikedPlaylist && (
          <button className="playlist-action-btn danger" onClick={handleDelete}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M3 6h18v2H3V6zm2 2h14l-1 13H6L5 8zm4-4h6l1-1H8l1 1z"/>
            </svg>
            {t('playlist.deletePlaylist')}
          </button>
        )}
      </div>

      {showAddSongs && availableSongs.length > 0 && (
        <div className="add-songs-panel">
          <h3>{t('playlist.addFromLibrary')}</h3>
          <div className="add-songs-list">
            {availableSongs.map(song => (
              <div key={song.id} className="track-row" onClick={() => handleAddSong(song)}>
                <span className="track-col-num">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 3a1 1 0 011 1v7h7a1 1 0 110 2h-7v7a1 1 0 11-2 0v-7H4a1 1 0 110-2h7V4a1 1 0 011-1z"/>
                  </svg>
                </span>
                <span className="track-col-title">
                  <div className="track-cover-mini" style={{ background: song.coverColor }} />
                  <div className="track-title-text">{song.title}</div>
                </span>
                <span className="track-col-artist">{song.artist}</span>
                <span className="track-col-album">{song.album}</span>
                <span className="track-col-duration">
                  {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="playlist-detail-tracks">
        <div className="track-list">
          <div className="track-list-header">
            <span className="track-col-num">#</span>
            <span className="track-col-title">{t('library.headerTitle')}</span>
            <span className="track-col-artist">{t('library.headerArtist')}</span>
            <span className="track-col-album">{t('library.headerAlbum')}</span>
            <span className="track-col-like"></span>
            <span className="track-col-duration">{t('library.headerDuration')}</span>
            <span className="track-col-action">{t('library.headerAction')}</span>
          </div>
          <div className="track-list-body">
            {playlist.songs.length === 0 ? (
              <div className="track-list-empty">{t('playlist.empty')}</div>
            ) : (
              playlist.songs.map((song, idx) => (
                <div key={song.id} className="track-row" onClick={() => playPlaylist(playlist, idx)}>
                  <span className="track-col-num">{idx + 1}</span>
                  <span className="track-col-title">
                    <div className="track-cover-mini" style={{ background: song.coverColor }} />
                    <div className="track-title-text">{song.title}</div>
                  </span>
                  <span className="track-col-artist">{song.artist}</span>
                  <span className="track-col-album">{song.album}</span>
                  <span className="track-col-like">
                    <button
                      className={`track-like-btn ${isLiked(song.id) ? 'liked' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
                      title={isLiked(song.id) ? t('player.unlike') : t('player.like')}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill={isLiked(song.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                      </svg>
                    </button>
                  </span>
                  <span className="track-col-duration">
                    {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
                  </span>
                  <span className="track-col-action">
                    <button
                      className="row-action-btn"
                      onClick={(e) => { e.stopPropagation(); removeSongFromPlaylist(playlist.id, song.id); }}
                      title={t('playlist.removeFromPlaylist')}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" fill="none"/>
                      </svg>
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
