import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Song, Playlist } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../i18n/I18nContext';
import { defaultSource } from '../lib/sources';
import { createLoginQR, checkLoginQR, getLoginStatus, setLoginCookie, getLoginCookie, getArtistSongs, getAlbumDetail, searchOnline, searchArtists, searchAlbums, getPlaylistCategories, getTopPlaylistsByCat, getSearchHot, getRecommendResource, type LoginQRStatus, type NeteaseArtist, type NeteaseAlbum, type PlaylistCategory, type SearchHotItem } from '../lib/neteaseApi';

type DiscoverTab = 'search' | 'recommended' | 'charts';

interface SubView {
  type: 'playlist';
  id: string;
  name: string;
}

interface ArtistOpenRequest {
  id?: number;
  name: string;
  nonce: number;
}

interface DiscoverViewProps {
  artistOpenRequest?: ArtistOpenRequest | null;
}

export function DiscoverView({ artistOpenRequest }: DiscoverViewProps) {
  const { t } = useI18n();
  const { playSong, userSongs, addToQueue, playNext, isAlbumSaved, toggleAlbum, toggleLike, isLiked } = usePlayer();
  const source = defaultSource;

  const [tab, setTab] = useState<DiscoverTab>('search');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ songs: Song[]; playlists: Playlist[] } | null>(null);
  const [searchArtistsList, setSearchArtistsList] = useState<NeteaseArtist[]>([]);
  const [searchAlbumsList, setSearchAlbumsList] = useState<NeteaseAlbum[]>([]);
  const [resultType, setResultType] = useState<'songs' | 'artists' | 'albums' | 'playlists'>('songs');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [topPlaylists, setTopPlaylists] = useState<Playlist[]>([]);
  const [charts, setCharts] = useState<{ name: string; id: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Category browser for playlists
  const [categories, setCategories] = useState<PlaylistCategory[]>([]);
  const [activeCat, setActiveCat] = useState('');
  const [catPlaylists, setCatPlaylists] = useState<Playlist[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  const [subView, setSubView] = useState<SubView | null>(null);
  const [subViewPlaylist, setSubViewPlaylist] = useState<Playlist | null>(null);
  const [subViewLoading, setSubViewLoading] = useState(false);

  const [hotSearches, setHotSearches] = useState<SearchHotItem[]>([]);


  // Login state
  const [loginInfo, setLoginInfo] = useState<{ loggedIn: boolean; nickname?: string; avatarUrl?: string }>({ loggedIn: false });
  const [showLogin, setShowLogin] = useState(false);
  const [qrImg, setQrImg] = useState('');
  const [loginStatus, setLoginStatus] = useState<LoginQRStatus>({ code: 801, message: 'waiting' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const keyRef = useRef('');
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  // Check login status on mount (use saved cookie if any)
  useEffect(() => {
    const cookie = getLoginCookie();
    getLoginStatus(cookie || undefined).then(setLoginInfo).catch(() => {});
  }, []);

  // Load hot search terms
  useEffect(() => {
    if (tab !== 'search' || hotSearches.length > 0) return;
    getSearchHot().then(setHotSearches).catch(() => {});
  }, [tab]);

  // Load recommendations (personalized when logged in)
  useEffect(() => {
    if (tab !== 'recommended' || topPlaylists.length > 0) return;
    setLoading(true);
    const cookie = getLoginCookie();
    if (cookie && loginInfo.loggedIn) {
      getRecommendResource(cookie).then(setTopPlaylists).catch(() => {
        source.getRecommendations().then(setTopPlaylists).catch(() => {});
      }).finally(() => setLoading(false));
    } else {
      source.getRecommendations().then(setTopPlaylists).catch(() => {}).finally(() => setLoading(false));
    }
  }, [tab, loginInfo.loggedIn]);

  // Load charts
  useEffect(() => {
    if (tab !== 'charts' || charts.length > 0) return;
    setLoading(true);
    source.getCharts().then(setCharts).catch(() => {}).finally(() => setLoading(false));
  }, [tab]);

  // Debounced search
  const doSearch = useCallback((keywords: string) => {
    if (!keywords.trim()) { setSearchResults(null); setSearchError(''); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSearchLoading(true);
    setSearchError('');
    // Clear cached artists/albums, reset to songs tab
    setSearchArtistsList([]);
    setSearchAlbumsList([]);
    setResultType('songs');
    searchOnline(keywords, 30).then(res => {
      if (!ctrl.signal.aborted) setSearchResults(res);
    }).catch(() => {
      if (!ctrl.signal.aborted) {
        setSearchResults(null);
        setSearchError(t('discover.searchServiceError'));
      }
    }).finally(() => {
      if (!ctrl.signal.aborted) setSearchLoading(false);
    });
  }, [t]);

  const handleSearchInput = (v: string) => {
    setQuery(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(v), 300);
  };

  // --- Login flow ---
  const startLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    setLoginStatus({ code: 801, message: 'waiting' });
    setQrImg('');
    try {
      const { key, qrimg } = await createLoginQR();
      keyRef.current = key;
      setQrImg(qrimg);
      setLoginLoading(false);

      const doPoll = async () => {
        try {
          const result = await checkLoginQR(key);
          setLoginStatus(result);
          if (result.code === 803) {
            clearInterval(pollRef.current);
            // Store cookie for authenticated API calls (full songs)
            setLoginCookie(result.cookie);
            // Pass the cookie to getLoginStatus
            const info = await getLoginStatus(result.cookie);
            setLoginInfo(info);
            setTopPlaylists([]); // force reload with personalized recommendations
            setTimeout(() => setShowLogin(false), 1500);
          } else if (result.code === 800 || result.code === -1) {
            // QR expired or error → auto-refresh
            clearInterval(pollRef.current);
            startLogin();
          }
        } catch {}
      };

      doPoll();
      pollRef.current = setInterval(doPoll, 2500);
    } catch {
      setLoginError(t('login.error'));
      setLoginLoading(false);
    }
  };

  const handleOpenLogin = () => {
    setShowLogin(true);
    startLogin();
  };

  const openArtistDetail = useCallback(async (artist: { id?: number; name: string; picUrl?: string }) => {
    setTab('search');
    setSubView({ type: 'playlist', id: artist.id ? String(artist.id) : artist.name, name: artist.name });
    setSubViewLoading(true);
    setSubViewPlaylist(null);
    try {
      let resolved = artist;
      if (!resolved.id) {
        const matches = await searchArtists(artist.name);
        resolved = matches.find(a => a.name === artist.name) || matches[0] || artist;
      }
      if (!resolved.id) throw new Error('Artist not found');
      const songs = await getArtistSongs(resolved.id);
      setSubViewPlaylist({
        id: `artist-${resolved.id}`,
        name: resolved.name,
        description: '',
        coverColor: resolved.picUrl ? `url(${resolved.picUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #667eea, #764ba2)',
        songs,
        createdAt: Date.now(),
      });
    } catch {
      setSubViewPlaylist(null);
    } finally {
      setSubViewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!artistOpenRequest) return;
    openArtistDetail(artistOpenRequest);
  }, [artistOpenRequest?.nonce, openArtistDetail]);

  const loadArtists = (kw: string) => { if (searchArtistsList.length === 0) searchArtists(kw).then(setSearchArtistsList).catch(() => {}); };
  const loadAlbums = (kw: string) => { if (searchAlbumsList.length === 0) searchAlbums(kw).then(setSearchAlbumsList).catch(() => {}); };

  const handleBrowseCategories = async () => {
    if (categories.length > 0) return;
    setCatLoading(true);
    try { setCategories(await getPlaylistCategories()); } catch {}
    setCatLoading(false);
  };

  const handleSelectCategory = async (cat: string) => {
    setActiveCat(cat);
    setCatLoading(true);
    try { setCatPlaylists(await getTopPlaylistsByCat(cat, 30)); } catch {}
    setCatLoading(false);
  };

  const handleBackCategories = () => {
    setActiveCat('');
    setCatPlaylists([]);
  };

  const handleCloseLogin = () => {
    setShowLogin(false);
    clearInterval(pollRef.current);
  };

  // --- Playback ---
  const rawId = (s: Song) => s.id.replace(/^netease-/, '');

  const handlePlayOnlineSong = async (song: Song, context?: Song[]) => {
    const id = rawId(song);
    const [url, lyrics] = await Promise.all([
      !song.audioUrl ? source.getAudioUrl(id) : Promise.resolve(song.audioUrl),
      !song.lyrics ? source.getLyrics(id) : Promise.resolve(song.lyrics),
    ]);
    if (!url) return;
    song = { ...song, audioUrl: url, lyrics };
    if (context && context.length > 1) {
      // Batch-fetch all remaining context songs' URLs
      const idsToFetch = context
        .filter(s => s.id !== song.id && !s.audioUrl)
        .map(s => rawId(s));
      const urlMap = idsToFetch.length > 0 ? await source.getBatchAudioUrls(idsToFetch) : new Map<string, string | null>();
      const prepared = context.map(s => {
        if (s.id === song.id) return song;
        const fetchedUrl = urlMap.get(rawId(s)) || undefined;
        return fetchedUrl ? { ...s, audioUrl: fetchedUrl } : s;
      });
      playSong(song, prepared);
    } else {
      playSong(song);
    }
  };

  const handlePlayOnlinePlaylist = async (pl: Playlist) => {
    if (pl.songs.length === 0) return;
    // Batch-fetch audio URLs for all songs in the playlist
    const allIds = pl.songs.map(s => rawId(s));
    const urlMap = await source.getBatchAudioUrls(allIds);
    // Also fetch lyrics for the first song
    const firstId = rawId(pl.songs[0]);
    const lyrics = await source.getLyrics(firstId);
    const prepared = pl.songs.map(s => {
      const url = urlMap.get(rawId(s)) || undefined;
      return url ? { ...s, audioUrl: url } : s;
    });
    const first = prepared[0];
    if (!first.audioUrl) return;
    playSong({ ...first, lyrics }, prepared);
  };

  const handleOpenPlaylist = async (item: SubView) => {
    setSubView(item);
    setSubViewLoading(true);
    setSubViewPlaylist(null);
    try { setSubViewPlaylist(await source.getPlaylistDetail(item.id)); } catch {}
    setSubViewLoading(false);
  };

  const fmtTime = (d: number) => `${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, '0')}`;

  const renderSongRow = (song: Song, i: number, context?: Song[]) => (
    <div key={song.id} className="track-row" onClick={() => handlePlayOnlineSong(song, context)}>
      <span className="track-col-num">{i + 1}</span>
      <span className="track-col-title">
        <div className="track-cover-mini" style={{ background: song.coverColor }} />
        <div className="track-title-text">
          <div className="track-title-main">{song.title}</div>
          <div className="track-title-sub">{song.artist}</div>
        </div>
      </span>
      <span className="track-col-artist">{song.artist}</span>
      <span className="track-col-album">{song.album || song.artist}</span>
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
      <span className="track-col-duration">{fmtTime(song.duration)}</span>
      <span className="track-col-action">
        <button className="add-queue-btn" onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); playNext(song); }} title={t('discover.playNext')}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 5v14l8-7-8-7zm9 0h2v14h-2V5z"/></svg>
        </button>
        <button className="add-queue-btn" onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); addToQueue(song); }} title={t('discover.addToQueue')}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </button>
      </span>
    </div>
  );

  const renderPlaylistCard = (pl: Playlist, detailId: string) => (
    <div key={pl.id} className="playlist-card" onClick={() => handleOpenPlaylist({ type: 'playlist', id: detailId, name: pl.name })}>
      <div className="playlist-card-cover" style={{ background: pl.coverColor }}>
        <div className="playlist-card-overlay">
          <button className="play-button" onClick={e => { e.stopPropagation(); handlePlayOnlinePlaylist(pl); }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M5.7 3a.7.7 0 00-.7.7v16.6a.7.7 0 00.7.7l15.3-8.3a.7.7 0 000-1.2L5.7 3z"/></svg>
          </button>
        </div>
      </div>
      <div className="playlist-card-info">
        <h3 className="playlist-card-title">{pl.name}</h3>
        <p className="playlist-card-desc">{pl.description?.slice(0, 60)}</p>
      </div>
    </div>
  );

  // --- Sub-view ---
  if (subView) {
    const isAlbumDetail = subViewPlaylist?.id?.startsWith('album-');
    const albumNeteaseId = isAlbumDetail ? Number(subViewPlaylist!.id.replace(/^album-/, '')) : 0;
    const albumSaved = isAlbumDetail && isAlbumSaved(albumNeteaseId);
    return (
      <div className="discover-view">
        <div className="discover-sub-header">
          <button className="discover-back-btn" onClick={() => { setSubView(null); setSubViewPlaylist(null); }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
          <h2>{subView.name}</h2>
          {isAlbumDetail && (
            <button
              className={`album-toggle-btn ${albumSaved ? 'saved' : ''}`}
              onClick={() => {
                toggleAlbum({
                  neteaseId: albumNeteaseId,
                  name: subViewPlaylist!.name,
                  artist: subViewPlaylist!.description || '',
                  picUrl: subViewPlaylist!.coverColor.replace(/^url\(["']?(.*?)["']?\).*$/, '$1') || '',
                  coverColor: subViewPlaylist!.coverColor,
                });
              }}
              title={albumSaved ? t('album.remove') : t('album.save')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill={albumSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
              <span>{albumSaved ? t('album.remove') : t('album.save')}</span>
            </button>
          )}
        </div>
        {subViewLoading ? <div className="discover-loading">{t('discover.loading')}</div>
          : subViewPlaylist ? <div className="search-song-list">{subViewPlaylist.songs.map((s, i) => (
            <div key={s.id} className="track-row" onClick={() => handlePlayOnlineSong(s, subViewPlaylist.songs)}>
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
              <span className="track-col-duration">{fmtTime(s.duration)}</span>
              <span className="track-col-action">
                <button className="add-queue-btn" onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); playNext(s); }} title={t('discover.playNext')}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 5v14l8-7-8-7zm9 0h2v14h-2V5z"/></svg>
                </button>
                <button className="add-queue-btn" onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); addToQueue(s); }} title={t('discover.addToQueue')}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                </button>
              </span>
            </div>
          ))}</div>
          : <div className="discover-loading">{t('discover.loadFailed')}</div>
        }
      </div>
    );
  }

  // --- Login status display ---
  const loginText: Record<string, string> = {
    waiting: t('login.waiting'),
    scanned: t('login.scanned'),
    expired: t('login.expired'),
    error: t('login.error'),
  };

  // --- Main view ---
  return (
    <div className="discover-view">
      <div className="discover-header">
        <div className="discover-tabs">
          <button className={`discover-tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>{t('discover.search')}</button>
          <button className={`discover-tab ${tab === 'recommended' ? 'active' : ''}`} onClick={() => setTab('recommended')}>{t('discover.recommended')}</button>
          <button className={`discover-tab ${tab === 'charts' ? 'active' : ''}`} onClick={() => setTab('charts')}>{t('discover.charts')}</button>
        </div>
        <div className="discover-login-area">
          {loginInfo.loggedIn ? (
            <span className="login-user-badge">
              {loginInfo.avatarUrl ? <img src={loginInfo.avatarUrl} alt="" className="login-avatar" /> : null}
              {loginInfo.nickname}
            </span>
          ) : (
            <button className="login-btn" onClick={handleOpenLogin}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
              {t('login.loginBtn')}
            </button>
          )}
        </div>
      </div>

      {/* Search Tab */}
      {tab === 'search' && (
        <>
          <div className="search-bar">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.057l4.42 4.42a1 1 0 101.415-1.414l-4.42-4.42a9.18 9.18 0 002.092-5.808c0-5.14-4.226-9.28-9.414-9.28zm0 2c4.115 0 7.407 3.274 7.407 7.279 0 4.005-3.292 7.279-7.407 7.279-4.115 0-7.407-3.274-7.407-7.279 0-4.005 3.292-7.279 7.407-7.279z"/></svg>
            <input type="text" placeholder={t('discover.searchPlaceholder')} value={query} onChange={e => handleSearchInput(e.target.value)} className="search-input" autoFocus />
            {query && <button className="search-clear" onClick={() => { setQuery(''); setSearchResults(null); setSearchError(''); }}><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3.293 3.293a1 1 0 011.414 0L12 10.586l7.293-7.293a1 1 0 111.414 1.414L13.414 12l7.293 7.293a1 1 0 01-1.414 1.414L12 13.414l-7.293 7.293a1 1 0 01-1.414-1.414L10.586 12 3.293 4.707a1 1 0 010-1.414z"/></svg></button>}
          </div>
          {searchLoading ? <div className="discover-loading">{t('discover.loading')}</div>
            : searchError ? (
              <div className="search-empty"><p>{searchError}</p></div>
            )
            : searchResults ? (
              <div className="search-results">
                {/* Filter tabs */}
                {(searchResults.songs.length > 0 || searchResults.playlists.length > 0) && (
                  <div className="search-result-tabs">
                    <button className={`search-result-tab ${resultType === 'songs' ? 'active' : ''}`} onClick={() => setResultType('songs')}>
                      {t('discover.searchSongs')} ({searchResults.songs.length})
                    </button>
                    <button className={`search-result-tab ${resultType === 'artists' ? 'active' : ''}`} onClick={() => { setResultType('artists'); loadArtists(query); }}>
                      {t('discover.artists')}{searchArtistsList.length > 0 ? ` (${searchArtistsList.length})` : ''}
                    </button>
                    <button className={`search-result-tab ${resultType === 'albums' ? 'active' : ''}`} onClick={() => { setResultType('albums'); loadAlbums(query); }}>
                      {t('discover.albums')}{searchAlbumsList.length > 0 ? ` (${searchAlbumsList.length})` : ''}
                    </button>
                    {searchResults.playlists.length > 0 && (
                      <button className={`search-result-tab ${resultType === 'playlists' ? 'active' : ''}`} onClick={() => setResultType('playlists')}>
                        {t('discover.searchPlaylists')} ({searchResults.playlists.length})
                      </button>
                    )}
                  </div>
                )}

                {/* Artists tab */}
                {resultType === 'artists' && (
                  searchArtistsList.length === 0 ? <div className="discover-loading">{t('discover.loading')}</div> :
                  <div className="artist-grid">
                    {searchArtistsList.map(a => (
                      <div key={a.id} className="artist-card" onClick={() => openArtistDetail(a)}>
                        <div className="artist-card-img" style={{ background: a.picUrl ? `url(${a.picUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #667eea, #764ba2)' }} />
                        <div className="artist-card-name">{a.name}</div>
                        <div className="artist-card-meta">{a.musicSize} {t('discover.songs')}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Songs tab */}
                {resultType === 'songs' && (
                  searchResults.songs.length > 0 ? (
                    <div className="search-song-list">{searchResults.songs.map((s, i) => renderSongRow(s, i, searchResults.songs))}</div>
                  ) : null
                )}

                {/* Albums tab */}
                {resultType === 'albums' && (
                  searchAlbumsList.length === 0 ? <div className="discover-loading">{t('discover.loading')}</div> :
                  <div className="playlist-grid">
                    {searchAlbumsList.map(a => {
                      const saved = isAlbumSaved(a.id);
                      return (
                      <div key={a.id} className="playlist-card" onClick={() => {
                        setSubView({ type: 'playlist', id: String(a.id), name: a.name });
                        setSubViewLoading(true);
                        setSubViewPlaylist(null);
                        getAlbumDetail(a.id).then(pl => { setSubViewPlaylist(pl); setSubViewLoading(false); }).catch(() => setSubViewLoading(false));
                      }}>
                        <div className="playlist-card-cover" style={{ background: a.picUrl ? `url(${a.picUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                          <div className="playlist-card-overlay">
                            <button className="play-button" onClick={e => e.stopPropagation()}>
                              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M5.7 3a.7.7 0 00-.7.7v16.6a.7.7 0 00.7.7l15.3-8.3a.7.7 0 000-1.2L5.7 3z"/></svg>
                            </button>
                            <button
                              className={`album-save-btn ${saved ? 'saved' : ''}`}
                              onClick={e => {
                                e.stopPropagation();
                                toggleAlbum({
                                  neteaseId: a.id,
                                  name: a.name,
                                  artist: a.artist || '',
                                  picUrl: a.picUrl || '',
                                  coverColor: a.picUrl ? `url(${a.picUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #667eea, #764ba2)',
                                });
                              }}
                              title={saved ? t('album.remove') : t('album.save')}
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="playlist-card-info">
                          <h3 className="playlist-card-title">{a.name}</h3>
                          <p className="playlist-card-desc">{a.artist}</p>
                        </div>
                      </div>
                    )})}
                  </div>
                )}

                {/* Playlists tab */}
                {resultType === 'playlists' && (
                  searchResults.playlists.length > 0 ? (
                    <div className="playlist-grid">{searchResults.playlists.map(pl => renderPlaylistCard(pl, pl.id))}</div>
                  ) : null
                )}

                {searchResults.songs.length === 0 && searchResults.playlists.length === 0 && query && (
                  <div className="search-empty"><p>{t('discover.noOnlineResults', { query })}</p></div>
                )}
              </div>
            ) : (
              <div className="search-browse">
                <h2 className="section-title">{t('discover.searchHint')}</h2>
                {hotSearches.length > 0 && (
                  <>
                    <p className="search-hint">{t('discover.hotSearch')}</p>
                    <div className="hot-search-tags">
                      {hotSearches.map((h, i) => (
                        <button key={h.searchWord} className="hot-search-tag" onClick={() => { setQuery(h.searchWord); doSearch(h.searchWord); }}>
                          <span className="hot-search-rank">{i + 1}</span>
                          <span className="hot-search-word">{h.searchWord}</span>
                          {h.content && <span className="hot-search-content">{h.content}</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {hotSearches.length === 0 && <p className="search-hint">{t('discover.searchHintDesc')}</p>}
              </div>
            )
          }
        </>
      )}

      {/* Recommended */}
      {tab === 'recommended' && (
        loading ? <div className="discover-loading">{t('discover.loading')}</div> :
        <>
          <div className="section-header">
            <h2 className="section-title">{activeCat || t('discover.recommended')}</h2>
            {!activeCat && (
              <button className="browse-all-btn" onClick={handleBrowseCategories}>
                {categories.length > 0 ? t('discover.chooseCategory') : t('discover.browseAll')}
              </button>
            )}
            {activeCat && (
              <button className="browse-all-btn" onClick={handleBackCategories}>
                ← {t('discover.backToCategories')}
              </button>
            )}
          </div>

          {/* Category tags */}
          {categories.length > 0 && !activeCat && (
            <div className="category-tags">
              {categories.filter(c => c.hot).map(c => (
                <button key={c.name} className="category-tag" onClick={() => handleSelectCategory(c.name)}>
                  {c.name}
                </button>
              ))}
              {categories.filter(c => !c.hot).slice(0, 15).map(c => (
                <button key={c.name} className="category-tag" onClick={() => handleSelectCategory(c.name)}>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Playlists */}
          {catLoading ? <div className="discover-loading">{t('discover.loading')}</div> :
            activeCat ? (
              <div className="playlist-grid">{catPlaylists.map(pl => renderPlaylistCard(pl, pl.id))}</div>
            ) : (
              <div className="playlist-grid">{topPlaylists.map(pl => renderPlaylistCard(pl, pl.id))}</div>
            )
          }
        </>
      )}

      {/* Charts */}
      {tab === 'charts' && (
        loading ? <div className="discover-loading">{t('discover.loading')}</div>
          : <div className="charts-list">
              {charts.map(c => (
                <div key={c.id} className="charts-item" onClick={() => handleOpenPlaylist({ type: 'playlist', id: c.id, name: c.name })}>
                  <span className="charts-name">{c.name}</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="charts-arrow"><path d="M9.29 6.71a.996.996 0 000 1.41L13.17 12l-3.88 3.88a.996.996 0 101.41 1.41l4.59-4.59a.996.996 0 000-1.41L10.7 6.7c-.38-.38-1.03-.38-1.41.01z"/></svg>
                </div>
              ))}
            </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="modal-overlay" onClick={handleCloseLogin}>
          <div className="modal-content login-modal" onClick={e => e.stopPropagation()}>
            <h3>{t('login.title')}</h3>
            {loginLoading ? (
              <div className="login-loading"><div className="login-spinner" /><span>{t('discover.loading')}</span></div>
            ) : loginError ? (
              <div className="login-error"><p>{loginError}</p><button className="login-retry-btn" onClick={startLogin}>{t('login.retry')}</button></div>
            ) : loginStatus.code === 803 ? (
              <div className="login-success">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--accent)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <p>{t('login.success')}</p>
              </div>
            ) : (
              <>
                <div className="login-qr-container">
                  {qrImg ? <img src={qrImg} alt="QR" className="login-qr-img" /> : <div className="login-qr-placeholder" />}
                  <div className="login-qr-status">{loginText[loginStatus.message] || loginText.waiting}</div>
                </div>
                <p className="login-hint">{t('login.hint')}</p>
              </>
            )}
            <button className="modal-cancel" onClick={handleCloseLogin}>{t('action.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
