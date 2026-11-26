const CACHE_NAME = 'maxlendar-shell-v2';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((name) => name.startsWith('maxlendar-shell-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
        }
        return response;
      }).catch(async () => (await caches.match('/')) ?? Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === 'string' ? payload.title : 'maxlendar';
  const eventTitle = typeof payload.eventTitle === 'string' ? payload.eventTitle : 'Evento';
  const startsAt = typeof payload.startsAt === 'string' ? new Date(payload.startsAt) : null;
  const localTime = startsAt && !Number.isNaN(startsAt.getTime())
    ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(startsAt)
    : null;
  const body = localTime
    ? `${eventTitle} começa às ${localTime}.`
    : typeof payload.body === 'string' ? payload.body : 'Você tem um evento próximo.';
  const target = typeof payload.url === 'string' ? payload.url : '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'maxlendar-reminder',
      data: { url: target, eventId: payload.eventId },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = new URL(event.notification.data?.url || '/', self.location.origin);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          void client.focus();
          return client.navigate(target.href);
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
