import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Register PWA Service Worker for mobile installability and offline support
if (typeof window !== 'undefined') {
  // Filter out and prevent Firestore background quota & gRPC stream errors from breaking the UI
  const isFirestoreQuotaError = (msg: string) => {
    const lower = (msg || '').toLowerCase();
    return (
      lower.includes('resource_exhausted') ||
      lower.includes('resource-exhausted') ||
      lower.includes('quota limit exceeded') ||
      lower.includes('quota exceeded') ||
      lower.includes('daily write units') ||
      lower.includes('grpcconnection') ||
      lower.includes('call cancelled') ||
      lower.includes('@firebase/firestore')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = String(reason?.message || reason?.code || reason || '');
    if (isFirestoreQuotaError(msg)) {
      event.preventDefault(); // Stop Vite error overlay and browser crash modal
      console.warn('⚠️ [Safe Handled] Firestore quota pause active; app operating via secure server persistence.');
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event.message || '');
    if (isFirestoreQuotaError(msg)) {
      event.preventDefault(); // Stop Vite error overlay
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update();
          if ('caches' in window) {
            caches.keys().then((keys) => {
              keys.forEach((k) => {
                if (k !== 'hlf-pwa-cache-v99-reset') {
                  caches.delete(k);
                }
              });
            });
          }
          console.log('✅ PWA Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA Service Worker registration notice:', err);
        });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


