import api from './api.js';
import { firebaseConfigurado, obterTokenFcm } from './firebase.js';

/**
 * Registra um token de push.
 *
 * Tenta FCM real se VITE_FIREBASE_* estiverem configuradas e o usuário aceitar
 * permissão de notificação. Caso contrário, mantém o comportamento legado de
 * registrar um token MOCK local (UUID em localStorage) — útil para dev/PWA sem
 * Firebase, já que o backend ainda consegue persistir e correlacionar.
 *
 * Backend só envia push real quando merenda.push.enabled=true E FirebaseConfig
 * conseguir credenciais; do contrário, log apenas.
 */
export async function registrarPushToken() {
  if (typeof window === 'undefined') return;

  let token = null;
  let plataforma = 'web';

  if (firebaseConfigurado()) {
    token = await obterTokenFcm();
    if (token) plataforma = 'web-fcm';
  }

  if (!token) {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    token = localStorage.getItem('merenda.pushToken');
    if (!token) {
      token = 'mock-' + (crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2));
      localStorage.setItem('merenda.pushToken', token);
    }
  } else {
    // Salva também para evitar re-registro a cada visita
    localStorage.setItem('merenda.pushToken', token);
  }

  try {
    await api.post('/push/registrar', {
      token,
      plataforma,
      userAgent: navigator.userAgent.slice(0, 200),
    });
  } catch (_) { /* silencioso */ }
}

/** Alias preservado por retrocompat. */
export const registrarPushTokenMock = registrarPushToken;
