// Service Worker for HabitDuo PWA
const CACHE_NAME = 'habitduo-v2';

self.addEventListener('install', (event) => {
  console.log('[SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'HabitDuo';
  const options = {
    body: data.body || '¡Hora de completar tus hábitos! 🔥',
    icon: '/habit-duo/icons/icon-192.png',
    badge: '/habit-duo/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/habit-duo/'
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/habit-duo/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('habit-duo') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
