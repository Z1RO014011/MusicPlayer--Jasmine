import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ViewType, Playlist } from './types';
import { I18nProvider } from './i18n/I18nContext';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { SearchView } from './components/SearchView';
import { LibraryView } from './components/LibraryView';
import { PlaylistDetail } from './components/PlaylistDetail';
import { NowPlayingView } from './components/NowPlayingView';
import { SettingsView } from './components/SettingsView';
import { DiscoverView } from './components/DiscoverView';
import { QueueView } from './components/QueueView';
import { DownloadView } from './components/DownloadView';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { getLoginStatus, getLoginCookie, getUserPlaylists, setLoginCookie } from './lib/neteaseApi';
import './App.css';

interface ArtistOpenRequest {
  id?: number;
  name: string;
  nonce: number;
}

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('discover');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [prevView, setPrevView] = useState<ViewType>('discover');
  const [artistOpenRequest, setArtistOpenRequest] = useState<ArtistOpenRequest | null>(null);
  const [neteaseUserId, setNeteaseUserId] = useState<number | null>(null);
  const [neteasePlaylists, setNeteasePlaylists] = useState<Playlist[]>([]);
  const { userPlaylists, togglePlay, nextTrack, prevTrack, state, dispatch, audioRef } = usePlayer();
  const mainRef = useRef<HTMLDivElement>(null);

  const shortcuts = useMemo(() => ({
    togglePlay,
    nextTrack,
    prevTrack,
    volumeUp: () => dispatch({ type: 'SET_VOLUME', volume: Math.min(1, state.volume + 0.1) }),
    volumeDown: () => dispatch({ type: 'SET_VOLUME', volume: Math.max(0, state.volume - 0.1) }),
    toggleShuffle: () => dispatch({ type: 'TOGGLE_SHUFFLE' }),
    cycleRepeat: () => dispatch({ type: 'CYCLE_REPEAT' }),
    seekForward: () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 5);
      }
    },
    seekBackward: () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
      }
    },
  }), [togglePlay, nextTrack, prevTrack, state.volume, dispatch, audioRef]);

  useKeyboardShortcuts(shortcuts, true);

  // Check Netease login & load user playlists on mount
  useEffect(() => {
    const cookie = getLoginCookie();
    if (!cookie) return;
    getLoginStatus(cookie).then(info => {
      if (info.loggedIn && info.userId) {
        setLoginCookie(cookie);
        setNeteaseUserId(info.userId);
        getUserPlaylists(info.userId).then(setNeteasePlaylists).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
    setSelectedPlaylistId(null);
    setPrevView(view);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, []);

  const handleSelectPlaylist = useCallback((playlist: Playlist) => {
    setSelectedPlaylistId(playlist.id);
    setCurrentView('playlist');
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, []);

  const handleSelectNeteasePlaylist = useCallback((playlist: Playlist) => {
    setSelectedPlaylistId(playlist.id);
    setCurrentView('playlist');
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, []);

  const handleBack = useCallback(() => {
    setSelectedPlaylistId(null);
    setCurrentView('library');
  }, []);

  const handleOpenNowPlaying = useCallback(() => {
    if (currentView !== 'nowplaying') {
      setPrevView(currentView);
      setCurrentView('nowplaying');
    }
  }, [currentView]);

  const handleOpenQueue = useCallback(() => {
    setPrevView(currentView);
    setCurrentView('queue');
  }, [currentView]);

  const handleCloseNowPlaying = useCallback(() => {
    setCurrentView(prevView);
  }, [prevView]);

  const handleOpenArtist = useCallback((artist: { id?: number; name: string }) => {
    setArtistOpenRequest({ ...artist, nonce: Date.now() });
    setCurrentView('discover');
    setSelectedPlaylistId(null);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, []);

  const selectedPlaylist = selectedPlaylistId
    ? (userPlaylists.find(pl => pl.id === selectedPlaylistId)
        || neteasePlaylists.find(pl => pl.id === selectedPlaylistId)
        || null)
    : null;

  function renderMainContent() {
    switch (currentView) {
      case 'nowplaying':
        return <NowPlayingView onBack={handleCloseNowPlaying} onOpenArtist={handleOpenArtist} />;
      case 'home':
      case 'library':
        return <LibraryView onSelectPlaylist={handleSelectPlaylist} neteasePlaylists={neteasePlaylists} />;
      case 'search':
        return <SearchView onSelectPlaylist={handleSelectPlaylist} />;
      case 'settings':
        return <SettingsView />;
      case 'download':
        return <DownloadView />;
      case 'discover':
        return <DiscoverView artistOpenRequest={artistOpenRequest} />;
      case 'queue':
        return <QueueView onBack={() => setCurrentView(prevView)} />;
      case 'playlist':
        if (selectedPlaylist) {
          return (
            <PlaylistDetail
              playlist={selectedPlaylist}
              onBack={handleBack}
            />
          );
        }
        return <LibraryView onSelectPlaylist={handleSelectPlaylist} neteasePlaylists={neteasePlaylists} />;
      default:
        return <LibraryView onSelectPlaylist={handleSelectPlaylist} neteasePlaylists={neteasePlaylists} />;
    }
  }

  return (
    <div className={`app ${currentView === 'nowplaying' ? 'nowplaying-active' : ''}`}>
      <div className="app-body">
        {currentView !== 'nowplaying' && (
          <>
            <Sidebar
              currentView={currentView === 'playlist' ? 'library' : currentView}
              onViewChange={handleViewChange}
              onSelectPlaylist={handleSelectPlaylist}
              onSelectNeteasePlaylist={handleSelectNeteasePlaylist}
              collapsed={sidebarCollapsed}
              neteasePlaylists={neteasePlaylists}
            />
            <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
              </svg>
            </button>
          </>
        )}
        <main className={`main-content ${currentView === 'nowplaying' ? 'nowplaying-main' : ''}`} ref={mainRef}>
          {renderMainContent()}
        </main>
      </div>
      <PlayerBar onOpenNowPlaying={handleOpenNowPlaying} onOpenQueue={handleOpenQueue} />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <PlayerProvider>
        <AppContent />
      </PlayerProvider>
    </I18nProvider>
  );
}
