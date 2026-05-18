import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { LyricLine } from '../types';
import { findActiveLineIndex } from '../lib/lyrics';

interface LyricsViewProps {
  lyrics: LyricLine[];
  currentTime: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
}

export function LyricsView({ lyrics, currentTime, isPlaying: _isPlaying, onSeek }: LyricsViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const userScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeIndex = useMemo(
    () => findActiveLineIndex(lyrics, currentTime),
    [lyrics, currentTime],
  );

  // Auto-scroll to active line (instant, no animation lag)
  useEffect(() => {
    if (activeIndex < 0 || userScrolled) return;
    const container = containerRef.current;
    const el = container?.querySelector(`[data-lyric-index="${activeIndex}"]`) as HTMLElement | null;
    if (container && el) {
      container.scrollTop = el.offsetTop - container.clientHeight / 2 + el.offsetHeight / 2;
    }
  }, [activeIndex, userScrolled]);

  const handleScroll = useCallback(() => {
    setUserScrolled(true);
    if (userScrollTimer.current) clearTimeout(userScrollTimer.current);
    userScrollTimer.current = setTimeout(() => setUserScrolled(false), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (userScrollTimer.current) clearTimeout(userScrollTimer.current);
    };
  }, []);

  if (lyrics.length === 0) return null;

  return (
    <div className="am-lyrics-container" ref={containerRef} onScroll={handleScroll}>
      {/* Spacer to center first line */}
      <div className="am-lyrics-spacer" />

      {lyrics.map((line, i) => {
        const isActive = i === activeIndex;
        return (
          <div
            key={i}
            data-lyric-index={i}
            className={`am-lyric-line${isActive ? ' active' : ''}`}
            onClick={() => onSeek?.(line.time)}
          >
            <span className="am-lyric-text">{line.text}</span>
          </div>
        );
      })}

      {/* Spacer to center last line */}
      <div className="am-lyrics-spacer" />
    </div>
  );
}
