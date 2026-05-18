import React, { useState } from 'react';
import { Playlist, Song, SavedAlbum } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../i18n/I18nContext';
import { CreatePlaylistModal } from './CreatePlaylistModal';
import { HistoryView } from './HistoryView';
import { getAlbumDetail } from '../lib/neteaseApi';

interface LibraryViewProps {
  onSelectPlaylist: (playlist: Playlist) => void;
}

export function LibraryView({ onSelectPlaylist }: LibraryViewProps) {
  const { userSongs, userPlaylists, savedAlbums, playPlaylist, playSong, deleteSong, createPlaylist, importFiles, removeSavedAlbum, toggleLike, isLiked } = usePlayer();
  const { t } = useI18n();
  const [tab, setTab] = useState<'playlists' | 'songs' | 'albums' | 'history' | 'local'>('playlists');
  const localSongs = userSongs.filter(s => s.source === 'local');
  const [showModal, setShowModal] = useState(false);
  const [albumDetail, setAlbumDetail] = useState<{ playlist: Playlist; songs: Song[] } | null>(null);
  const [loading, setLoading] = useState(false);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      importFiles(e.target.files);
      e.target.value = '';
    }
  }

  const handleOpenAlbum = async (album: SavedAlbum) => {
    setLoading(true);
    try {
      const pl = await getAlbumDetail(album.neteaseId);
      setAlbumDetail({ playlist: pl, songs: pl.songs });
    } catch {}
    setLoading(false);
  };

  const handlePlayAlbumSong = (song: Song, idx: number) => {
    if (!albumDetail) return;
    playSong(albumDetail.songs[idx], albumDetail.songs);
  };

  // Album detail view
  if (tab === 'albums' && albumDetail) {
    return (
      <div className="library-view">
        <div className="discover-sub-header">
          <button className="discover-back-btn" onClick={() => setAlbumDetail(null)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
          <h2>{albumDetail.playlist.name}</h2>
          <button
            className="album-toggle-btn"
            onClick={() => {
              const album = savedAlbums.find(a => a.neteaseId === Number(albumDetail.playlist.id.replace(/^album-/, '')));
              if (album) {
                removeSavedAlbum(album.id);
                setAlbumDetail(null);
              }
            }}
            title={t('album.remove')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            {t('album.remove')}
          </button>
        </div>
        <div className="search-song-list">
          {albumDetail.songs.map((s, i) => (
            <div key={s.id} className="track-row" onClick={() => handlePlayAlbumSong(s, i)}>
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
              <span className="track-col-like">
                <button
                  className={`track-like-btn ${isLiked(s.id) ? 'liked' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleLike(s); }}
                  title={isLiked(s.id) ? t('player.unlike') : t('player.like')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill={isLiked(s.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                </button>
              </span>
              <span className="track-col-duration">{Math.floor(s.duration / 60)}:{String(Math.floor(s.duration % 60)).padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="library-view">
      <div className="library-header">
        <div className="library-header-top">
          <h1 className="library-title">{t('library.title')}</h1>
          <button className="import-music-btn" onClick={() => document.getElementById('import-audio-input')?.click()}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 10a1 1 0 011 1v6a3 3 0 01-3 3H7a3 3 0 01-3-3v-6a1 1 0 012 0v6a1 1 0 001 1h10a1 1 0 001-1v-6a1 1 0 011-1zm-7-7a1 1 0 01.707.293l4 4a1 1 0 01-1.414 1.414L13 6.414V15a1 1 0 11-2 0V6.414L8.707 8.707a1 1 0 01-1.414-1.414l4-4A1 1 0 0112 3z"/>
            </svg>
            {t('action.importMusic')}
          </button>
        </div>
        <input
          id="import-audio-input"
          type="file"
          accept="audio/*,.lrc"
          multiple
          onChange={handleImport}
          style={{ display: 'none' }}
        />
        <div className="library-tabs">
          <button className={`library-tab ${tab === 'playlists' ? 'active' : ''}`} onClick={() => setTab('playlists')}>
            {t('library.tabPlaylists', { count: userPlaylists.length })}
          </button>
          <button className={`library-tab ${tab === 'songs' ? 'active' : ''}`} onClick={() => setTab('songs')}>
            {t('library.tabSongs', { count: userSongs.length })}
          </button>
          <button className={`library-tab ${tab === 'albums' ? 'active' : ''}`} onClick={() => setTab('albums')}>
            {t('library.tabAlbums', { count: savedAlbums.length })}
          </button>
          <button className={`library-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            {t('library.tabHistory')}
          </button>
          <button className={`library-tab ${tab === 'local' ? 'active' : ''}`} onClick={() => setTab('local')}>
            {t('library.tabLocal', { count: localSongs.length })}
          </button>
        </div>
      </div>

      {tab === 'playlists' && (
        <div className="library-playlists">
          <button className="create-playlist-btn" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 3a1 1 0 011 1v7h7a1 1 0 110 2h-7v7a1 1 0 11-2 0v-7H4a1 1 0 110-2h7V4a1 1 0 011-1z"/>
            </svg>
            <span>{t('library.newPlaylist')}</span>
          </button>

          {userPlaylists.length === 0 && (
            <div className="library-empty">
              <p>{t('library.emptyPlaylists')}</p>
            </div>
          )}

          <div className="library-grid">
            {userPlaylists.map(pl => (
              <div key={pl.id} className="playlist-card" onClick={() => onSelectPlaylist(pl)}>
                <div className="playlist-card-cover" style={{ background: pl.coverColor }}>
                  <div className="playlist-card-overlay">
                    <button className="play-button" onClick={(e) => { e.stopPropagation(); playPlaylist(pl); }}>
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M5.7 3a.7.7 0 00-.7.7v16.6a.7.7 0 00.7.7l15.3-8.3a.7.7 0 000-1.2L5.7 3z"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="playlist-card-info">
                  <h3 className="playlist-card-title">{pl.name}</h3>
                  <p className="playlist-card-desc">{t('common.songCount', { count: pl.songs.length })}{pl.creator ? ` · ${pl.creator}` : ''}</p>
                </div>
              </div>
            ))}
          </div>

          {showModal && (
            <CreatePlaylistModal
              onClose={() => setShowModal(false)}
              onCreate={(data) => {
                createPlaylist(data);
                setShowModal(false);
              }}
            />
          )}
        </div>
      )}

      {tab === 'songs' && (
        <div className="library-songs">
          {userSongs.length === 0 ? (
            <div className="library-empty">
              <p>{t('library.emptySongs')}</p>
            </div>
          ) : (
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
                  {userSongs.map((song, idx) => (
                    <div key={song.id} className="track-row" onClick={() => playSong(song, userSongs)}>
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
                        onClick={(e) => { e.stopPropagation(); deleteSong(song.id); }}
                        title={t('action.delete')}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M3 6h18v2H3V6zm2 2h14l-1 13H6L5 8zm4-4h6l1-1H8l1 1z"/>
                        </svg>
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'albums' && (
        <div className="library-albums">
          {loading ? (
            <div className="discover-loading">{t('discover.loading')}</div>
          ) : savedAlbums.length === 0 ? (
            <div className="library-empty">
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
      )}

      {tab === 'history' && <HistoryView />}

      {tab === 'local' && (
        <div className="library-songs">
          {localSongs.length === 0 ? (
            <div className="library-empty">
              <p>{t('library.emptyLocal')}</p>
            </div>
          ) : (
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
                {localSongs.map((song, idx) => (
                  <div key={song.id} className="track-row" onClick={() => playSong(song, localSongs)}>
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
                        onClick={(e) => { e.stopPropagation(); deleteSong(song.id); }}
                        title={t('action.delete')}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M3 6h18v2H3V6zm2 2h14l-1 13H6L5 8zm4-4h6l1-1H8l1 1z"/>
                        </svg>
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
