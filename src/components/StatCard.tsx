'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  delta?: number; // % change vs last month, positive = up
  deltaLabel?: string;
  variant?: 'default' | 'income' | 'expense';
  icon?: React.ReactNode;
}

export default function StatCard({ label, value, delta, deltaLabel, variant = 'default', icon }: StatCardProps) {
  const valueClass = variant === 'income' ? 'income' : variant === 'expense' ? 'expense' : '';

  const renderDelta = () => {
    if (delta === undefined) return null;
    const isUp = delta > 0;
    const isDown = delta < 0;
    const cls = isUp ? 'up' : isDown ? 'down' : 'neutral';
    return (
      <div className={`stat-card-delta ${cls}`}>
        {isUp ? <TrendingUp size={11} strokeWidth={2.5} /> : isDown ? <TrendingDown size={11} strokeWidth={2.5} /> : <Minus size={11} />}
        <span>{Math.abs(delta)}% {deltaLabel ?? 'vs last month'}</span>
      </div>
    );
  };

  return (
    <div className="stat-card">
      <div className="stat-card-label">
        {icon && <span style={{ opacity: 0.7 }}>{icon}</span>}
        {label}
      </div>
      <div className={`stat-card-value${valueClass ? ` ${valueClass}` : ''}`}>{value}</div>
      {renderDelta()}
    </div>
  );
}
