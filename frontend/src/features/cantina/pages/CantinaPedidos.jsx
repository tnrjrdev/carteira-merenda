import { useEffect, useState } from 'react';
import api from '../../../services/api.js';
import { brl, extractError, formatDateTime } from '../../../utils/format.js';

const statusCor = {
  AGENDADO: 'bg-amber-50 text-amber-700 border-amber-200',
  PREPARANDO: 'bg-blue-50 text-blue-700 border-blue-200',
  PRONTO: 'bg-green-50 text-green-700 border-green-200',
  ENTREGUE: 'bg-slate-50 text-slate-700 border-slate-200',
  CANCELADO: 'bg-red-50 text-red-700 border-red-200',
};

const transicoes = {
  AGENDADO: ['PREPARANDO', 'CANCELADO'],
  PREPARANDO: ['PRONTO', 'CANCELADO'],
  PRONTO: ['ENTREGUE', 'CANCELADO'],
};

export default function CantinaPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get('/pedidos/fila');
      setPedidos(data);
    } catch (e) { setErr(extractError(e)); }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const mudar = async (id, novo) => {
    try {
      await api.put(`/pedidos/${id}/status`, { status: novo });
      await load();
    } catch (e) { setErr(extractError(e)); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <header>
        <h1 className="text-3xl font-display font-bold text-slate-900">Pedidos pré-agendados</h1>
        <p className="text-sm text-slate-500 mt-1">Alunos que pediram antes — prepara e entrega no horário</p>
      </header>

      {err && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{err}</div>}

      {pedidos.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">Nenhum pedido na fila.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pedidos.map((p) => (
            <div key={p.id} className="card flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="font-mono text-2xl font-bold tracking-widest text-slate-900">{p.codigoRetirada}</div>
                  <div className="text-sm font-semibold text-slate-700 mt-1">{p.estudante?.nome}</div>
                  <div className="text-xs text-slate-500">Pedido em {formatDateTime(p.criadoEm)}</div>
                  {p.retiradaPrevista && (
                    <div className="text-xs text-merenda-700 font-semibold mt-1">
                      Retirar às {formatDateTime(p.retiradaPrevista)}
                    </div>
                  )}
                </div>
                <span className={`badge border ${statusCor[p.status]}`}>{p.status}</span>
              </div>

              <ul className="space-y-1 mb-3">
                {p.itens?.map((i) => (
                  <li key={i.id} className="flex justify-between text-sm">
                    <span><b>{i.quantidade}×</b> {i.nomeProduto}</span>
                    <span className="text-slate-600">{brl(i.subtotal)}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center mb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Total</span>
                <span className="font-display font-bold text-lg text-slate-900">{brl(p.total)}</span>
              </div>

              <div className="flex gap-2 flex-wrap mt-auto">
                {(transicoes[p.status] || []).map((novo) => (
                  <button key={novo} onClick={() => mudar(p.id, novo)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                            novo === 'CANCELADO'
                              ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
                              : 'border-merenda-200 text-merenda-700 bg-merenda-50 hover:bg-merenda-100'
                          }`}>
                    → {novo}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
