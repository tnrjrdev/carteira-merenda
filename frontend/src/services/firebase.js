/**
 * Bootstrap do Firebase Web SDK. Tudo é opcional — sem as envs, retorna null e o
 * sistema cai em modo MOCK (geração de UUID local). Com as envs preenchidas e o
 * usuário concedendo permissão de notificação, geramos um token FCM real e
 * registramos em /api/push/registrar.
 *
 * Vars necessárias no .env do frontend:
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 *   VITE_FIREBASE_VAPID_KEY  (chave Web Push pública do projeto Firebase)
 */
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function firebaseConfigurado() {
  return !!(cfg.apiKey && cfg.projectId && cfg.appId && cfg.messagingSenderId && VAPID_KEY);
}

let appCache = null;
function appOuNull() {
  if (!firebaseConfigurado()) return null;
  if (appCache) return appCache;
  appCache = getApps().length ? getApps()[0] : initializeApp(cfg);
  return appCache;
}

let messagingCache = null;
async function messagingOuNull() {
  if (messagingCache) return messagingCache;
  const app = appOuNull();
  if (!app) return null;
  try {
    if (!(await isSupported())) return null;
    messagingCache = getMessaging(app);
    return messagingCache;
  } catch (_) {
    return null;
  }
}

/** Tenta obter um token FCM real. Retorna `null` em qualquer falha. */
export async function obterTokenFcm() {
  try {
    const messaging = await messagingOuNull();
    if (!messaging) return null;
    if (typeof Notification === 'undefined') return null;
    if (Notification.permission === 'denied') return null;
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return null;
    }
    let registration = null;
    if ('serviceWorker' in navigator) {
      registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
        .catch(() => null);
      if (!registration) {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
          .catch(() => null);
      }
    }
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration || undefined,
    });
    return token || null;
  } catch (e) {
    console.warn('FCM getToken falhou:', e?.message || e);
    return null;
  }
}

/** Escuta mensagens em foreground (push enquanto o app está aberto). */
export async function ouvirMensagensFcm(handler) {
  const messaging = await messagingOuNull();
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
}
