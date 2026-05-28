// Service worker do Firebase Cloud Messaging — exibe notificações quando o
// app está em background. As envs Firebase precisam ser injetadas em build
// time; aqui usamos /firebase-config.json se existir, ou ficamos inertes.
//
// Para uma config 100% estática, edite as constantes abaixo manualmente OU
// crie public/firebase-config.json com os mesmos campos do VITE_FIREBASE_*.

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

async function carregarConfig() {
  try {
    const resp = await fetch('/firebase-config.json', { cache: 'no-store' });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (_) {
    return null;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cfg = await carregarConfig();
    if (cfg && cfg.apiKey && cfg.projectId && cfg.appId) {
      self.__merenda_firebase_cfg = cfg;
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

(async () => {
  const cfg = await carregarConfig();
  if (!cfg || !cfg.apiKey) return;

  firebase.initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId,
  });

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const titulo = payload?.notification?.title || 'Merenda';
    const opts = {
      body: payload?.notification?.body || '',
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      data: payload?.data || {},
    };
    self.registration.showNotification(titulo, opts);
  });
})();

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const c of clientList) {
        if ('focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});
