import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api.js';
import { brl, extractError, formatDateTime } from '../utils/format.js';

export default function PixModal({ recarga, onClose, onAprovada }) {
  const [estado, setEstado] = useState(recarga);
  const [copiado, setCopiado] = useState(false);
  const [aprovandoSim, setAprovandoSim] = useState(false);
  const [err, setErr] = useState(null);

  // polling de status a cada 4s enquanto PENDENTE
  useEffect(() => {
    if (!estado || estado.status !== 'PENDENTE') return;
    const id = setInterval(async () => {
      try {
        const { data } = await api.get(`/carteira/recarga-pix/${estado.id}`);
        setEstado(data);
        if (data.status === 'APROVADO') {
          clearInterval(id);
          setTimeout(() => onAprovada?.(data), 1200);
        }
      } catch (e) {
        setErr(extractError(e));
      }
    }, 4000);
    return () => clearInterval(id);
  }, [estado?.id, estado?.status, onAprovada]);

  if (!estado) return null;

  const copiarCola = async () => {
    try {
      await navigator.clipboard.writeText(estado.qrCodeCopiaCola || '');
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (_) { /* ignora */ }
  };

  const aprovarSim = async () => {
    if (estado.gateway !== 'simulated') return;
    setAprovandoSim(true);
    try {
      await api.post(`/carteira/recarga-pix/${estado.externalId}/aprovar-simulado`);
      const { data } = await api.get(`/carteira/recarga-pix/${estado.id}`);
      setEstado(data);
      if (data.status === 'APROVADO') setTimeout(() => onAprovada?.(data), 800);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setAprovandoSim(false);
    }
  };

  const aprovado = estado.status === 'APROVADO';
  const isSim = estado.gateway === 'simulated';
  const qrImg = estado.qrCodeBase64 && !isSim
      ? <img alt="QR Code Pix" src={`data:image/png;base64,${estado.qrCodeBase64}`} className="w-56 h-56" />
      : <QRCodeSVG value={estado.qrCodeCopiaCola || estado.externalId || 'pix'} size={224} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-glow max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-merenda-500 to-merenda-700 text-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider opacity-80">Recarga Pix</div>
              <div className="text-3xl font-display font-extrabold tracking-tight mt-1">{brl(estado.valor)}</div>
              <div className="text-xs opacity-80 mt-0.5">{estado.estudanteNome}</div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 transition flex items-center justify-center" aria-label="Fechar">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {aprovado ? (
            <div className="text-center py-8 animate-fade-in">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900">Pagamento aprovado!</h3>
              <p className="text-sm text-slate-500 mt-1">Saldo atualizado · {formatDateTime(estado.aprovadaEm)}</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                {qrImg}
              </div>

              {isSim && (
                <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg mb-3">
                  ⚠️ Gateway em modo <b>simulated</b> — o QR não é cobrado. Use o botão "Simular aprovação" abaixo para concluir o fluxo.
                </div>
              )}

              <div>
                <label className="label">Pix copia e cola</label>
                <div className="flex items-center gap-2">
                  <input className="input font-mono text-xs flex-1" readOnly value={estado.qrCodeCopiaCola || ''} />
                  <button onClick={copiarCola} className="btn-secondary text-sm">{copiado ? '✓ Copiado' : 'Copiar'}</button>
                </div>
              </div>

              {estado.urlTicket && (
                <a href={estado.urlTicket} target="_blank" rel="noreferrer"
                   className="block text-sm text-center text-merenda-600 hover:underline mt-3">
                  Abrir comprovante do Mercado Pago →
                </a>
              )}

              <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
                <span className="inline-flex w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
                Aguardando pagamento…
              </div>

              {isSim && (
                <button onClick={aprovarSim} disabled={aprovandoSim}
                        className="mt-4 w-full btn-secondary border-dashed">
                  {aprovandoSim ? 'Aprovando…' : 'Simular aprovação (dev)'}
                </button>
              )}

              {err && <div className="mt-3 bg-red-50 border border-red-200 text-red-600 text-sm p-2 rounded-lg">{err}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
