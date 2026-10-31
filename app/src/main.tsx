import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// FR-4: Request persistent storage on launch so the browser never purges offline maps/events
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persisted().then((isPersisted) => {
    if (!isPersisted) {
      navigator.storage.persist().then((granted) => {
        console.info(`[MeshMap] Storage persistence granted: ${granted}`);
      });
    } else {
      console.info('[MeshMap] Storage is already persisted.');
    }
  }).catch((err) => {
    console.warn('[MeshMap] Error checking storage persistence:', err);
  });
}

// Register service worker for complete offline caching and PWA installability
registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('[MeshMap] Service worker registered: App ready to work offline.');
  },
  onNeedRefresh() {
    console.info('[MeshMap] App updated: refreshing cache.');
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

