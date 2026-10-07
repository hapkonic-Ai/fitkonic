import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/app/App';
import './index.css';

// Clean up legacy IndexedDB versions and ensure offline Service Worker is registered silently
if (typeof window !== 'undefined') {
  if ('indexedDB' in window && typeof window.indexedDB.deleteDatabase === 'function') {
    [
      'fitkonic_offline_db',
      'fitkonic_offline_db_v1',
      'fitkonic_offline_db_v2',
      'fitkonic_offline_db_v3',
      'fitkonic_offline_db_v4_clean',
      'fitkonic_offline_db_v5_clean',
    ].forEach((oldDbName) => {
      try {
        window.indexedDB.deleteDatabase(oldDbName);
      } catch {
        // ignore
      }
    });
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (navigator.onLine) {
            void reg.update().catch(() => {});
          }
        })
        .catch(() => {
          // Silent in dev or offline
        });
    });
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: false,
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
