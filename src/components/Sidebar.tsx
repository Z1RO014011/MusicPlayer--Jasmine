import React from 'react';
import { ViewType, Playlist } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../i18n/I18nContext';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  collapsed: boolean;
}

export function Sidebar({ currentView, onViewChange, onSelectPlaylist, collapsed }: SidebarProps) {
  const { userPlaylists } = usePlayer();
  const { t } = useI18n();
  const iconPath = `${import.meta.env.BASE_URL}icon.png`;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <img className="sidebar-logo-mark" src={iconPath} alt="" />
        {!collapsed && <span className="sidebar-logo-text">Jasmine</span>}
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${currentView === 'discover' ? 'active' : ''}`}
          onClick={() => onViewChange('discover')}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 13.5c3.2-5.4 9.2-8.4 16-8" />
            <path d="M5 18c2.7-3.4 7-5.1 11.5-4.5" />
            <path d="M12 8v9" />
            <path d="M16 6v9" />
          </svg>
          {!collapsed && <span>{t('nav.discover')}</span>}
        </button>
        <button
          className={`sidebar-nav-item ${currentView === 'library' ? 'active' : ''}`}
          onClick={() => onViewChange('library')}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4v16" />
            <path d="M10 4v16" />
            <path d="M15 6.2 20 4v16l-5-2.2z" />
          </svg>
          {!collapsed && <span>{t('nav.myMusic')}</span>}
        </button>
        <button
          className={`sidebar-nav-item ${currentView === 'search' ? 'active' : ''}`}
          onClick={() => onViewChange('search')}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          {!collapsed && <span>{t('nav.search')}</span>}
        </button>
        <button
          className={`sidebar-nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => onViewChange('settings')}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v3" />
            <path d="M12 18v3" />
            <path d="M4.2 7.5 6.8 9" />
            <path d="m17.2 15 2.6 1.5" />
            <circle cx="12" cy="12" r="4" />
            <path d="m4.2 16.5 2.6-1.5" />
            <path d="m17.2 9 2.6-1.5" />
          </svg>
          {!collapsed && <span>{t('nav.settings')}</span>}
        </button>
      </nav>

      <div className="sidebar-divider" />

      {!collapsed && (
        <div className="sidebar-section-title">{t('sidebar.yourPlaylists')}</div>
      )}

      <div className="sidebar-playlists">
        {!collapsed && userPlaylists.length === 0 && (
          <div className="sidebar-empty">{t('sidebar.emptyHint')}</div>
        )}
        {userPlaylists.map(pl => (
          <button
            key={pl.id}
            className="sidebar-playlist-item"
            onClick={() => onSelectPlaylist(pl)}
            title={pl.name}
          >
            {pl.name}
          </button>
        ))}
      </div>

    </aside>
  );
}
