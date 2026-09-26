'use client';

import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className = '',
  style,
}: EmptyStateProps) {
  return (
    <div
      className={`empty-state ${compact ? 'compact' : ''} ${className}`.trim()}
      style={style}
    >
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-desc">{description}</div>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

