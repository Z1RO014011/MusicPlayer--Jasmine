import React, { useState } from 'react';
import { SavedAlbum } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { getAlbumDetail } from '../lib/neteaseApi';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  onBack: () => void;
}

export function AlbumListView({ onBack }: Props) {
  const { t } = useI18n();
  const { savedAlbums, removeSavedAlbum, playSong } = usePlayer();
  const [showAlbum, setShowAlbum] = useState<{ playlist: import('../types').Playlist; songs: import('../types').Song[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenAlbum = async (album: SavedAlbum) => {
    setLoading(true);
    try {
      const pl = await getAlbumDetail(album.neteaseId);
      setShowAlbum({ playlist: pl, songs: pl.songs });
    } catch {}
    setLoading(false);
  };

  const handlePlaySong = (song: import('../types').Song, idx: number) => {
    if (!showAlbum) return;
    const songWithUrl = showAlbum.songs[idx];
    playSong(songWithUrl, showAlbum.songs);
  };

  // Album detail view
  if (showAlbum) {
    const allSongs = showAlbum.songs;
    return (
      <div className="discover-view">
        <div className="discover-sub-header">
          <button className="discover-back-btn" onClick={() => setShowAlbum(null)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
          <h2>{showAlbum.playlist.name}</h2>
          <button
            className="album-toggle-btn"
            onClick={() => {
              const album = savedAlbums.find(a => a.neteaseId === Number(showAlbum.playlist.id.replace(/^album-/, '')));
              if (album) removeSavedAlbum(album.id);
            }}
            title={t('album.remove')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            {t('album.remove')}
          </button>
        </div>
        <div className="search-song-list">
          {allSongs.map((s, i) => (
            <div key={s.id} className="track-row" onClick={() => handlePlaySong(s, i)}>
              <span className="track-col-num">{i + 1}</span>
              <span className="track-col-title">
                <div className="track-cover-mini" style={{ background: s.coverColor }} />
                <div className="track-title-text">
                  <div className="track-title-main">{s.title}</div>
                  <div className="track-title-sub">{s.artist}</div>
                </div>
              </span>
              <span className="track-col-artist">{s.artist}</span>
              <span className="track-col-album">{s.album}</span>
              <span className="track-col-duration">{Math.floor(s.duration / 60)}:{String(Math.floor(s.duration % 60)).padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Loading
  if (loading) return (
    <div className="discover-view">
      <div className="discover-sub-header">
        <button className="discover-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
      </div>
      <div className="discover-loading">{t('discover.loading')}</div>
    </div>
  );

  // Main grid view
  return (
    <div className="album-list-view">
      <div className="discover-sub-header">
        <button className="discover-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <h2>{t('sidebar.savedAlbums')}</h2>
      </div>
      {savedAlbums.length === 0 ? (
        <div className="album-list-empty">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" opacity="0.2"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
          <p>{t('discover.albums')}</p>
        </div>
      ) : (
        <div className="album-grid">
          {savedAlbums.map(album => (
            <div key={album.id} className="album-card" onClick={() => handleOpenAlbum(album)}>
              <div className="album-card-cover" style={{ background: album.picUrl ? `url(${album.picUrl}) center/cover no-repeat` : album.coverColor }}>
                <button className="album-card-remove" onClick={e => { e.stopPropagation(); removeSavedAlbum(album.id); }} title={t('album.remove')}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
              <h3 className="album-card-name">{album.name}</h3>
              <p className="album-card-artist">{album.artist}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
