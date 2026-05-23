import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { brl, extractError, formatDateTime } from '../utils/format.js';

export default function BoletoModal({ recarga, onClose, onAprovada }) {
  const [estado, setEstado] = useState(recarga);
  const [copiado, setCopiado] = useState(false);
  const [aprovandoSim, setAprovandoSim] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!estado || estado.status !== 'PENDENTE') return;
    const id = setInterval(async () => {
      try {
        const { data } = await api.get(`/carteira/recarga-boleto/${estado.id}`);
        setEstado(data);
        if (data.status === 'APROVADO') { clearInterval(id); setTimeout(() => onAprovada?.(data), 800); }
      } catch (e) { setErr(extractError(e)); }
    }, 6000);
    return () => clearInterval(id);
  }, [estado?.id, estado?.status, onAprovada]);

  if (!estado) return null;

  const aprovado = estado.status === 'APROVADO';
  const isSim = estado.gateway?.includes('simulated');

  const copiar = async () => {
    try { await navigator.clipboard.writeText(estado.linhaDigitavel || ''); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch (_) { /* */ }
  };

  const simular = async () => {
    setAprovandoSim(true);
    try {
      await api.post(`/carteira/recarga-boleto/${estado.externalId}/aprovar-simulado`);
      const { data } = await api.get(`/carteira/recarga-boleto/${estado.id}`);
      setEstado(data);
      if (data.status === 'APROVADO') setTimeout(() => onAprovada?.(data), 800);
    } catch (e) { setErr(extractError(e)); }
    finally { setAprovandoSim(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-glow max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Boleto bancário</div>
            <div className="text-3xl font-display font-extrabold tracking-tight mt-1">{brl(estado.valor)}</div>
            <div className="text-xs opacity-80">{estado.estudanteNome}</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">×</button>
        </div>

        <div className="p-6">
          {aprovado ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4 text-3xl">✓</div>
              <h3 className="text-xl font-display font-bold">Pagamento confirmado!</h3>
              <p className="text-sm text-slate-500 mt-1">{formatDateTime(estado.aprovadaEm)}</p>
            </div>
          ) : (
            <>
              {isSim && (
                <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg mb-3">
                  ⚠️ Boleto em modo <b>simulated</b> — sem cobrança real. Use "Simular aprovação" abaixo.
                </div>
              )}

              <label className="label">Linha digitável</label>
              <div className="flex items-center gap-2">
                <input className="input font-mono text-xs flex-1" readOnly value={estado.linhaDigitavel || ''} />
                <button onClick={copiar} className="btn-secondary text-sm">{copiado ? '✓' : 'Copiar'}</button>
              </div>

              {estado.urlBoleto && (
                <a href={estado.urlBoleto} target="_blank" rel="noreferrer"
                   className="block text-sm text-center text-merenda-600 hover:underline mt-3">
                  Abrir boleto (PDF) →
                </a>
              )}

              <div className="text-xs text-slate-500 mt-3">Vencimento: {estado.expiraEm ? formatDateTime(estado.expiraEm) : '—'}</div>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <span className="inline-flex w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
                Aguardando compensação…
              </div>

              {isSim && (
                <button onClick={simular} disabled={aprovandoSim} className="mt-4 w-full btn-secondary border-dashed">
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
