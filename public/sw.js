// HabitDuo Service Worker - Push Notifications & Background Sync

const CACHE_NAME = 'habitduo-v2'

// Install
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const title = data.title || 'HabitDuo 🔥'
  const options = {
    body: data.body || '¡Tienes hábitos pendientes!',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: data.vibrate || [200, 100, 200, 100, 200],
    tag: data.tag || 'habitduo-reminder',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [
      { action: 'open', title: '💪 ¡Vamos!' },
      { action: 'later', title: '🔄 Después' },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'later') {
    // Dismiss - no action needed
    return
  }

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      // Open new window
      return clients.openWindow(event.notification.data.url || '/')
    })
  )
})
