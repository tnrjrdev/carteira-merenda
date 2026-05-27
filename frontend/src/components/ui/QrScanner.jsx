import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

/**
 * Lê QR Codes via câmera (ZXing). Chama onScan(text) na primeira leitura
 * e desliga a câmera. Use `key` no parent para forçar remount quando quiser ler de novo.
 */
export default function QrScanner({ onScan, onError }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let cancelado = false;
    (async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, _err, ctrl) => {
            if (cancelado) return;
            if (result) {
              ctrl.stop();
              controlsRef.current = null;
              onScan?.(result.getText());
            }
          }
        );
        controlsRef.current = controls;
      } catch (e) {
        setErro(e?.message || 'Não foi possível acessar a câmera');
        onError?.(e);
      }
    })();
    return () => {
      cancelado = true;
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch (_) { /* ignore */ }
        controlsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative aspect-square w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-slate-900">
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      <div className="absolute inset-0 border-4 border-merenda-400/70 rounded-xl pointer-events-none"></div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent text-white text-xs p-3 text-center">
        Aponte para o QR Code do aluno
      </div>
      {erro && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-white text-sm p-4 text-center">
          {erro}
        </div>
      )}
    </div>
  );
}
