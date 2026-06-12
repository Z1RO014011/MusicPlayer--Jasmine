import React from 'react';
import { PlayRecord } from '../lib/db';
import { Song } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { useI18n } from '../i18n/I18nContext';

const DAY_MS = 86400000;

function getDateLabel(ts: number, t: (k: string) => string): string {
  const now = new Date();
  const d = new Date(ts);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - DAY_MS;
  const weekStart = todayStart - 7 * DAY_MS;
  if (ts >= todayStart) return t('history.today');
  if (ts >= yesterdayStart) return t('history.yesterday');
  if (ts >= weekStart) return t('history.thisWeek');
  return t('history.earlier');
}

function groupByDate(records: PlayRecord[], userSongs: Song[], t: (k: string) => string) {
  const groups: { label: string; songs: Song[]; sortKey: number }[] = [];
  const seen = new Set<string>();
  const grouped = new Map<string, Song[]>();

  for (const r of records) {
    const song = userSongs.find(s => s.id === r.songId);
    if (!song || seen.has(song.id)) continue;
    seen.add(song.id);
    const label = getDateLabel(r.playedAt, t);
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label)!.push(song);
  }

  // Sort keys for consistent ordering
  const order = [t('history.today'), t('history.yesterday'), t('history.thisWeek'), t('history.earlier')];
  for (const label of order) {
    const songs = grouped.get(label);
    if (songs && songs.length > 0) {
      groups.push({ label, songs, sortKey: order.indexOf(label) });
    }
  }
  return groups;
}

export function HistoryView() {
  const { playHistory, userSongs, playSong } = usePlayer();
  const { t } = useI18n();

  const groups = groupByDate(playHistory, userSongs, t);

  if (groups.length === 0) {
    return (
      <div className="history-view">
        <div className="library-empty">
          <p>{t('history.empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-view">
      {groups.map(group => (
        <section key={group.label} className="history-group">
          <h3 className="history-group-title">{group.label}</h3>
          <div className="track-list">
            <div className="track-list-body">
              {group.songs.map((song, idx) => (
                <div key={song.id} className="track-row" onClick={() => playSong(song, group.songs)}>
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
                  <span className="track-col-like"></span>
                  <span className="track-col-duration">
                    {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
