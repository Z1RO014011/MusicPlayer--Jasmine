import React from 'react';
import { Playlist } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../i18n/I18nContext';

interface HomeViewProps {
  onSelectPlaylist: (playlist: Playlist) => void;
}

export function HomeView({ onSelectPlaylist }: HomeViewProps) {
  const { userSongs, userPlaylists, playPlaylist, playSong } = usePlayer();
  const { t } = useI18n();

  const hasContent = userSongs.length > 0 || userPlaylists.length > 0;
  const recentSongs = userSongs.slice(-8).reverse();
  const recentSongsList = [...recentSongs].reverse();

  return (
    <div className="home-view">
      {hasContent ? (
        <>
          {userPlaylists.length > 0 && (
            <section className="home-section">
              <div className="section-header">
                <h2 className="section-title">{t('home.yourPlaylists')}</h2>
              </div>
              <div className="playlist-grid">
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
                      <p className="playlist-card-desc">{t('common.songCount', { count: pl.songs.length })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {recentSongs.length > 0 && (
            <section className="home-section">
              <div className="section-header">
                <h2 className="section-title">{t('home.recentlyImported')}</h2>
              </div>
              <div className="track-list">
                <div className="track-list-body">
                  {recentSongs.map((song, idx) => (
                    <div key={song.id} className="track-row" onClick={() => playSong(song, userSongs)}>
                      <span className="track-col-num">{idx + 1}</span>
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
            </section>
          )}
        </>
      ) : (
        <section className="home-section home-empty">
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
                <path d="M12 3a1 1 0 011 1v7h7a1 1 0 110 2h-7v7a1 1 0 11-2 0v-7H4a1 1 0 110-2h7V4a1 1 0 011-1z"/>
              </svg>
            </div>
            <h3 className="empty-title">{t('home.emptyTitle')}</h3>
            <p className="empty-desc">{t('home.emptyDesc1')}</p>
            <p className="empty-desc">{t('home.emptyDesc2')}</p>
          </div>
        </section>
      )}
    </div>
  );
}
