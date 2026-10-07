import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/app/App';
import './index.css';

// Force immediate update of any older cached PWA Service Worker & delete legacy IndexedDB versions
if (typeof window !== 'undefined') {
  if ('indexedDB' in window && typeof window.indexedDB.deleteDatabase === 'function') {
    [
      'fitkonic_offline_db',
      'fitkonic_offline_db_v1',
      'fitkonic_offline_db_v2',
      'fitkonic_offline_db_v3',
      'fitkonic_offline_db_v4_clean',
    ].forEach((oldDbName) => {
      try {
        window.indexedDB.deleteDatabase(oldDbName);
      } catch {
        // ignore
      }
    });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        void reg.update();
      }
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
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
