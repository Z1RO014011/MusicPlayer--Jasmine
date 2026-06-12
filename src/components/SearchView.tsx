import React, { useState, useMemo } from 'react';
import { Playlist } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../i18n/I18nContext';

interface SearchViewProps {
  onSelectPlaylist: (playlist: Playlist) => void;
}

export function SearchView({ onSelectPlaylist }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const { userSongs, userPlaylists, playPlaylist, playSong, toggleLike, isLiked } = usePlayer();
  const { t } = useI18n();

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    const songs = userSongs.filter(
      s => s.title.toLowerCase().includes(q) ||
           s.artist.toLowerCase().includes(q) ||
           s.album.toLowerCase().includes(q)
    );
    const playlists = userPlaylists.filter(
      p => p.name.toLowerCase().includes(q) ||
           p.description.toLowerCase().includes(q)
    );
    return { songs, playlists };
  }, [query, userSongs, userPlaylists]);

  return (
    <div className="search-view">
      <div className="search-bar">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.057l4.42 4.42a1 1 0 101.415-1.414l-4.42-4.42a9.18 9.18 0 002.092-5.808c0-5.14-4.226-9.28-9.414-9.28zm0 2c4.115 0 7.407 3.274 7.407 7.279 0 4.005-3.292 7.279-7.407 7.279-4.115 0-7.407-3.274-7.407-7.279 0-4.005 3.292-7.279 7.407-7.279z"/>
        </svg>
        <input
          type="text"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="search-input"
          autoFocus
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M3.293 3.293a1 1 0 011.414 0L12 10.586l7.293-7.293a1 1 0 111.414 1.414L13.414 12l7.293 7.293a1 1 0 01-1.414 1.414L12 13.414l-7.293 7.293a1 1 0 01-1.414-1.414L10.586 12 3.293 4.707a1 1 0 010-1.414z"/>
            </svg>
          </button>
        )}
      </div>

      {results ? (
        <div className="search-results">
          {results.playlists.length > 0 && (
            <section className="search-section">
              <h2 className="section-title">{t('search.playlists')}</h2>
              <div className="playlist-grid">
                {results.playlists.map(pl => (
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
          {results.songs.length > 0 && (
            <section className="search-section">
              <h2 className="section-title">{t('search.songs')}</h2>
              <div className="search-song-list">
                {results.songs.map((song, idx) => (
                  <div key={song.id} className="track-row" onClick={() => playSong(song, results.songs)}>
                    <span className="track-col-num">{idx + 1}</span>
                    <span className="track-col-title">
                      <div className="track-cover-mini" style={{ background: song.coverColor }} />
                      <div className="track-title-text">
                        <div className="track-title-main">{song.title}</div>
                        <div className="track-title-sub">{song.artist} · {song.album}</div>
                      </div>
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
                  </div>
                ))}
              </div>
            </section>
          )}
          {results.songs.length === 0 && results.playlists.length === 0 && (
            <div className="search-empty">
              <p>{t('search.noResults', { query })}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="search-browse">
          <h2 className="section-title">{t('search.browseTitle')}</h2>
          <p className="search-hint">{t('search.browseHint')}</p>
          <p className="search-hint">{t('search.totalCount', { songs: userSongs.length, playlists: userPlaylists.length })}</p>
        </div>
      )}
    </div>
  );
}
