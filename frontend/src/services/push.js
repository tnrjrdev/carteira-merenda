import api from './api.js';

/**
 * Registro de token de push.
 *
 * MOCK: hoje geramos um token local (UUID) e mandamos para /api/push/registrar.
 * O backend só armazena — não envia push real (PushService.enabled=false).
 *
 * Para ativar push real:
 *   1) Criar projeto Firebase + Web App + obter VITE_FIREBASE_VAPID_KEY e config.
 *   2) Instalar `firebase` no frontend e usar getMessaging() + getToken({ vapidKey }).
 *   3) Substituir o bloco "MOCK" por essa chamada Firebase.
 *   4) Subir backend com PUSH_ENABLED=true e firebase-admin no pom.xml.
 */
export async function registrarPushTokenMock() {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  try {
    if (Notification.permission === 'default') {
      // pede permissão silenciosamente (usuário poderá negar)
      Notification.requestPermission().catch(() => {});
    }
  } catch (_) { /* navegador antigo */ }

  let token = localStorage.getItem('merenda.pushToken');
  if (!token) {
    token = 'mock-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    localStorage.setItem('merenda.pushToken', token);
  }
  try {
    await api.post('/push/registrar', {
      token,
      plataforma: 'web',
      userAgent: navigator.userAgent.slice(0, 200),
    });
  } catch (_) { /* silencioso */ }
}
