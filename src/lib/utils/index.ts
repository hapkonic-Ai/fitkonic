import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { SyncMetadata } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createId(prefix = 'fk'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSyncMeta(status: SyncMetadata['_syncStatus'] = 'pending'): SyncMetadata {
  return {
    _syncStatus: status,
    _lastModified: Date.now(),
    _localVersion: 1,
    _serverVersion: status === 'synced' ? Date.now() : undefined,
    _deletedAt: null,
  };
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

export function sanitizeText(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageUpload(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, WebP, and SVG images are permitted.',
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds 5MB limit. Please choose a smaller image.',
    };
  }
  return { valid: true };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const validation = validateImageUpload(file);
    if (!validation.valid) {
      reject(new Error(validation.error));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
