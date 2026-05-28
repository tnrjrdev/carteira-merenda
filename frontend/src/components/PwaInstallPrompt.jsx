import { useEffect, useState } from 'react';

const STORAGE_KEY = 'merenda.pwa.installDismissed';
const DISMISS_DAYS = 14;

function jaInstalado() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.navigator.standalone === true) return true;
  return false;
}

function dispensadoRecentemente() {
  const v = localStorage.getItem(STORAGE_KEY);
  if (!v) return false;
  const ts = Number(v);
  if (!ts) return false;
  return Date.now() - ts < DISMISS_DAYS * 86400000;
}

function detectarIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIosLike = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  return isIosLike && !jaInstalado();
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visivel, setVisivel] = useState(false);
  const [modoIos, setModoIos] = useState(false);

  useEffect(() => {
    if (jaInstalado() || dispensadoRecentemente()) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisivel(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (detectarIos()) {
      setModoIos(true);
      const t = setTimeout(() => setVisivel(true), 3000);
      return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', handler); };
    }

    const onInstalled = () => setVisivel(false);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dispensar = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisivel(false);
  };

  const instalar = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch (_) { /* ignora */ }
    setDeferredPrompt(null);
    setVisivel(false);
  };

  if (!visivel) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 animate-fade-in">
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-4 flex gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-merenda-400 to-merenda-600 text-white flex items-center justify-center text-2xl font-display font-bold">M</div>
        <div className="flex-1 min-w-0">
          {modoIos ? (
            <>
              <div className="font-semibold text-slate-900 text-sm">Instalar o Merenda</div>
              <div className="text-xs text-slate-600 mt-0.5 leading-snug">
                Toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b> para usar como app.
              </div>
              <div className="flex justify-end mt-2">
                <button onClick={dispensar} className="text-xs text-slate-500 hover:text-slate-800 font-medium">Fechar</button>
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold text-slate-900 text-sm">Instalar o Merenda</div>
              <div className="text-xs text-slate-600 mt-0.5 leading-snug">
                Acesse mais rápido e funcione offline · pagamentos NFC funcionam melhor instalado.
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={instalar} className="btn-primary text-xs py-1.5 px-3">Instalar app</button>
                <button onClick={dispensar} className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2">Agora não</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
