import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Crown,
  Flame,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trophy,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SyncStatus as SyncStatusType, UserProfile } from '@/types';

export function FitkonicLogo({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-lg' },
    md: { icon: 'w-7 h-7', text: 'text-xl' },
    lg: { icon: 'w-10 h-10', text: 'text-3xl' },
  }[size];

  return (
    <div className={cn('inline-flex items-center gap-2 select-none', className)}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={cn(sizes.icon, 'shrink-0 drop-shadow-[0_0_12px_rgba(94,200,255,0.45)]')}
        aria-hidden="true"
      >
        <path d="M16 52L26 12H52L47 23H34L32 31H45L41 41H29L26 52H16Z" fill="#7DD3FC" />
        <path d="M10 43L21 12L16 43H10Z" fill="#F5F7FA" />
      </svg>
      <span
        className={cn(
          'font-display font-bold italic tracking-tight text-[#F5F7FA]',
          sizes.text
        )}
      >
        Fit<span className="text-[#7DD3FC]">konic</span>
      </span>
    </div>
  );
}

export function ProgressRing({
  value,
  max,
  size = 44,
  strokeWidth = 4,
  color = '#5EC8FF',
  children,
  className,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, Math.max(0, max > 0 ? value / max : 0));
  const strokeDashoffset = circumference - ratio * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#202A35"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

export function ChallengeMemberStack({
  profiles,
  onInvite,
  maxVisible = 5,
}: {
  profiles: UserProfile[];
  onInvite?: () => void;
  maxVisible?: number;
}) {
  const visible = profiles.slice(0, maxVisible);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center">
        <div className="flex -space-x-2.5 overflow-hidden">
          {visible.map((p) => (
            <img
              key={p.id}
              src={p.avatar_url}
              alt={p.display_name}
              title={p.display_name}
              className="inline-block h-8 w-8 rounded-full ring-2 ring-[#0D1117] object-cover bg-[#121821]"
            />
          ))}
        </div>
        <span className="ml-3 text-xs font-medium text-[#8B98A8]">
          {profiles.length} {profiles.length === 1 ? 'member' : 'members'}
        </span>
      </div>
      {onInvite && (
        <button
          type="button"
          onClick={onInvite}
          aria-label="Invite member to challenge"
          className="h-8 w-8 rounded-full bg-[#121821] border border-[#202A35] hover:border-[#5EC8FF] text-[#5EC8FF] flex items-center justify-center transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  badge,
  badgePositive = true,
  sublabel,
  rightContent,
  onClick,
  className,
}: {
  label: string;
  value: string | number;
  badge?: string;
  badgePositive?: boolean;
  sublabel?: string;
  rightContent?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[#0D1117] border border-[#202A35] rounded-2xl p-4 flex items-center justify-between gap-4 transition-colors',
        onClick && 'cursor-pointer hover:border-[#5EC8FF]/50',
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-[#8B98A8]">{label}</p>
          {badge && (
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-semibold rounded-full',
                badgePositive
                  ? 'bg-[#4ADE80]/15 text-[#4ADE80]'
                  : 'bg-[#5EC8FF]/15 text-[#5EC8FF]'
              )}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#F5F7FA] tracking-tight">
          {value}
        </p>
        {sublabel && <p className="mt-0.5 text-xs text-[#8B98A8]">{sublabel}</p>}
      </div>
      {rightContent && <div className="shrink-0">{rightContent}</div>}
    </div>
  );
}

export function PRBadge({
  exerciseName,
  weight,
  reps,
  estimated1RM,
}: {
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
}) {
  return (
    <div className="bg-gradient-to-r from-[#0D1117] via-[#121821] to-[#0D1117] border border-[#5EC8FF]/40 rounded-2xl p-4 flex items-center justify-between shadow-glow-cyan">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#5EC8FF]/15 border border-[#5EC8FF]/40 flex items-center justify-center text-[#5EC8FF]">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#5EC8FF]">
              NEW PR
            </span>
            <span className="text-xs text-[#8B98A8]">• Est. 1RM {estimated1RM} kg</span>
          </div>
          <p className="font-display font-bold text-base text-[#F5F7FA]">{exerciseName}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-display font-bold text-lg text-[#7DD3FC]">
          {weight}kg × {reps}
        </p>
      </div>
    </div>
  );
}

export function StreakIndicator({ days }: { days: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121821] border border-[#202A35] text-xs font-semibold text-[#F5F7FA]">
      <Flame className="w-3.5 h-3.5 text-[#FBBF24] fill-[#FBBF24]" />
      <span className="font-display">{days} DAY STREAK</span>
    </div>
  );
}

export function OfflineBanner({
  isOnline,
  simulatedOffline,
  syncStatus,
  pendingCount,
  lastError,
  onToggleSimulatedOffline,
  onRetrySync,
}: {
  isOnline: boolean;
  simulatedOffline: boolean;
  syncStatus: SyncStatusType;
  pendingCount: number;
  lastError: string | null;
  onToggleSimulatedOffline: () => void;
  onRetrySync: () => void;
}) {
  const effectiveOffline = !isOnline || simulatedOffline;

  return (
    <div
      data-testid="sync-status-bar"
      className={cn(
        'w-full px-3 py-1.5 border-b text-xs flex items-center justify-between gap-2 transition-colors',
        effectiveOffline
          ? 'bg-[#FBBF24]/10 border-[#FBBF24]/30 text-[#FBBF24]'
          : syncStatus === 'failed'
          ? 'bg-[#FF5C5C]/10 border-[#FF5C5C]/30 text-[#FF5C5C]'
          : 'bg-[#0D1117] border-[#202A35] text-[#8B98A8]'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {effectiveOffline ? (
          <>
            <CloudOff className="w-3.5 h-3.5 shrink-0 text-[#FBBF24]" />
            <span className="font-medium truncate" data-testid="offline-indicator-text">
              OFFLINE MODE — Workouts & meals are safely stored on this device
              {pendingCount > 0 ? ` (${pendingCount} pending sync)` : ''}
            </span>
          </>
        ) : syncStatus === 'syncing' ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin text-[#5EC8FF]" />
            <span className="font-medium text-[#5EC8FF]">Syncing to Neon DB...</span>
          </>
        ) : syncStatus === 'failed' ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#FF5C5C]" />
            <span className="font-medium truncate">
              SYNC FAILED ({lastError || 'Check connection'}) — Your workout is safely stored on this device.
            </span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 shrink-0 text-[#5EC8FF]" />
            <span className="font-medium text-[#F5F7FA]">{pendingCount} changes queued for sync</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#4ADE80]" />
            <span className="truncate" data-testid="synced-indicator-text">
              Neon DB Synced • Offline-First Ready
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {(pendingCount > 0 || syncStatus === 'failed') && !effectiveOffline && (
          <button
            type="button"
            onClick={onRetrySync}
            data-testid="retry-sync-button"
            className="px-2 py-0.5 rounded bg-[#5EC8FF]/20 text-[#5EC8FF] font-semibold hover:bg-[#5EC8FF]/30 transition-colors"
          >
            RETRY SYNC
          </button>
        )}
        <button
          type="button"
          onClick={onToggleSimulatedOffline}
          data-testid="toggle-offline-button"
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-medium transition-colors',
            effectiveOffline
              ? 'bg-[#FBBF24]/20 border-[#FBBF24]/50 text-[#FBBF24]'
              : 'bg-[#121821] border-[#202A35] text-[#8B98A8] hover:text-[#F5F7FA]'
          )}
        >
          {effectiveOffline ? (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Offline (Tap to Reconnect)</span>
            </>
          ) : (
            <>
              <Wifi className="w-3 h-3 text-[#4ADE80]" />
              <span>Online</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  ctaText,
  onAction,
  icon,
}: {
  title: string;
  ctaText: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl p-8 text-center flex flex-col items-center justify-center">
      {icon && <div className="mb-3 text-[#5EC8FF]">{icon}</div>}
      <p className="text-sm text-[#8B98A8] mb-1">{title}</p>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 px-5 py-2.5 rounded-xl bg-[#5EC8FF] text-[#07090C] font-display font-bold text-xs tracking-wider uppercase hover:brightness-110 transition-all"
        >
          {ctaText}
        </button>
      ) : (
        <p className="font-display font-bold text-sm tracking-wider uppercase text-[#F5F7FA]">
          {ctaText}
        </p>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="bg-[#0D1117] border border-[#202A35] rounded-2xl max-w-md w-full p-6 shadow-card">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center',
              danger ? 'bg-[#FF5C5C]/15 text-[#FF5C5C]' : 'bg-[#5EC8FF]/15 text-[#5EC8FF]'
            )}
          >
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 id="confirm-dialog-title" className="font-display font-bold text-lg text-[#F5F7FA]">
            {title}
          </h3>
        </div>
        <p className="text-sm text-[#8B98A8] mb-6 leading-relaxed">{description}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-[#121821] border border-[#202A35] text-sm font-medium text-[#F5F7FA] hover:border-[#8B98A8]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-display font-bold uppercase tracking-wider',
              danger
                ? 'bg-[#FF5C5C] text-white hover:bg-[#FF5C5C]/90'
                : 'bg-[#5EC8FF] text-[#07090C] hover:brightness-110'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RankIndicator({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 text-[#FBBF24]"
        title="Rank #1"
      >
        <Crown className="w-4 h-4 fill-[#FBBF24]" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 font-display font-bold text-sm text-[#8B98A8]">
      {rank}
    </span>
  );
}
