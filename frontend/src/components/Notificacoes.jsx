import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotificacoes } from '../context/NotificacoesContext.jsx';
import { formatDateTime } from '../utils/format.js';

const iconePorTipo = (tipo) => {
  switch (tipo) {
    case 'COMPRA': return '🍔';
    case 'RECARGA_APROVADA': return '💰';
    case 'MESADA': return '💸';
    case 'PEDIDO_NOVO': return '📋';
    case 'PEDIDO_PRONTO': return '✅';
    case 'PEDIDO_PREPARANDO': return '👩‍🍳';
    case 'PEDIDO_ENTREGUE': return '📦';
    case 'PEDIDO_CANCELADO': return '⛔';
    case 'BADGE': return '🏅';
    default: return '🔔';
  }
};

export default function Notificacoes() {
  const { lista, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        className="relative p-2 rounded-full text-slate-700 hover:bg-slate-100 transition"
        title="Notificações"
        aria-label="Notificações"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow ring-2 ring-white">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-display font-bold text-slate-800">Notificações</span>
            {naoLidas > 0 && (
              <button onClick={marcarTodasLidas} className="text-xs font-medium text-merenda-600 hover:text-merenda-700">
                Marcar todas
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-auto custom-scrollbar divide-y divide-slate-100">
            {lista.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">Sem notificações ainda</li>
            ) : lista.map((n) => {
              const linkProps = n.linkAcao ? { as: Link, to: n.linkAcao } : {};
              const Inner = (
                <button
                  onClick={() => { if (!n.lida) marcarLida(n.id); setAberto(false); }}
                  className={`w-full text-left px-4 py-3 transition flex items-start gap-3 ${n.lida ? 'bg-white' : 'bg-merenda-50/50'} hover:bg-slate-50`}
                >
                  <div className="text-xl">{iconePorTipo(n.tipo)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate">{n.titulo}</div>
                    <div className="text-xs text-slate-600 line-clamp-2">{n.mensagem}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{formatDateTime(n.criadaEm)}</div>
                  </div>
                  {!n.lida && <span className="w-2 h-2 rounded-full bg-merenda-500 mt-2 shrink-0"></span>}
                </button>
              );
              return (
                <li key={n.id}>
                  {n.linkAcao
                    ? <Link to={n.linkAcao} onClick={() => { if (!n.lida) marcarLida(n.id); setAberto(false); }}
                            className="block">{Inner}</Link>
                    : Inner}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
