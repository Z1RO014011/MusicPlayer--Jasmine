import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../i18n/I18nContext';

interface QueueViewProps {
  onBack: () => void;
}

export function QueueView({ onBack }: QueueViewProps) {
  const { state, playSong, removeFromQueue, clearQueue } = usePlayer();
  const { t } = useI18n();
  const { queue, queueIndex } = state;

  const fmtTime = (d: number) =>
    `${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, '0')}`;

  return (
    <div className="discover-view">
      <div className="discover-sub-header">
        <button className="discover-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h2>{t('queue.title')}</h2>
          <p className="queue-subtitle">{t('queue.count', { count: queue.length })}</p>
        </div>
        {queue.length > 1 && (
          <button className="queue-clear-btn" onClick={clearQueue}>
            {t('queue.clear')}
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="discover-loading" style={{ paddingTop: 80 }}>
          <p>{t('queue.empty')}</p>
        </div>
      ) : (
        <div className="queue-list">
          {queue.map((song, i) => {
            const isCurrent = i === queueIndex;
            return (
              <div
                key={`${song.id}-${i}`}
                className={`track-row ${isCurrent ? 'active' : ''}`}
                onClick={() => playSong(song, queue)}
              >
                <span className="track-col-num">
                  {isCurrent ? (
                    <span className="queue-playing-indicator">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M5 2v20l15-10L5 2z" />
                      </svg>
                    </span>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="track-col-title">
                  <div className="track-cover-mini" style={{ background: song.coverColor }} />
                  <div className="track-title-text">
                    <div className="track-title-main" style={isCurrent ? { color: 'var(--accent)' } : {}}>
                      {song.title}
                    </div>
                    <div className="track-title-sub">{song.artist}</div>
                  </div>
                </span>
                <span className="track-col-artist">{song.artist}</span>
                <span className="track-col-album">{song.album}</span>
                <span className="track-col-duration">{fmtTime(song.duration)}</span>
                <span className="track-col-action">
                  <button
                    className="queue-remove-btn"
                    onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); removeFromQueue(i); }}
                    title={t('action.delete')}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
