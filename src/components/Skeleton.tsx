import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}

/**
 * Shimmer skeleton placeholder for loading states.
 * Replaces plain spinners for a more polished loading experience.
 */
export function Skeleton({ className = '', width = '100%', height = 16, borderRadius = 8 }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer${className ? ` ${className}` : ''}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton width="100%" height={160} borderRadius={16} />
      <Skeleton width="75%" height={14} className="skeleton-mt" />
      <Skeleton width="50%" height={12} className="skeleton-mt" />
    </div>
  );
}

export function SkeletonCover({ size = 320 }: { size?: number }) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={16}
    />
  );
}
