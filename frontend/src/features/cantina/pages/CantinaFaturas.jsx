import { useEffect, useState } from 'react';
import api from '../../../services/api.js';
import { brl, extractError, formatDateTime } from '../../../utils/format.js';

const cor = (s) => ({
  ABERTA: 'bg-amber-50 text-amber-700 border-amber-200',
  PAGA: 'bg-green-50 text-green-700 border-green-200',
  ATRASADA: 'bg-red-50 text-red-700 border-red-200',
})[s] || 'bg-slate-50 text-slate-600 border-slate-200';

export default function CantinaFaturas() {
  const [faturas, setFaturas] = useState([]);
  const [err, setErr] = useState(null);
  const [aviso, setAviso] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get('/faturas/cantina');
      setFaturas(data);
    } catch (e) { setErr(extractError(e)); }
  };

  useEffect(() => { load(); }, []);

  const pagar = async (id) => {
    try {
      await api.post(`/faturas/${id}/pagar`);
      setAviso('Fatura marcada como paga (mock). Em produção viria via webhook do gateway de assinatura.');
      await load();
    } catch (e) { setErr(extractError(e)); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <header>
        <h1 className="text-3xl font-display font-bold text-slate-900">Faturas SaaS</h1>
        <p className="text-sm text-slate-500 mt-1">Mensalidade da plataforma · gerada todo dia 1 às 03:00</p>
      </header>

      {err && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{err}</div>}
      {aviso && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm">{aviso}</div>}

      <div className="card">
        {faturas.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Nenhuma fatura ainda. A primeira é gerada no início do próximo mês.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left py-2">Competência</th>
                <th className="text-left">Plano</th>
                <th className="text-right">Valor</th>
                <th className="text-right">Vencimento</th>
                <th className="text-right">Status</th>
                <th className="text-right">Paga em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {faturas.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 font-mono">{f.competencia}</td>
                  <td>{f.plano}</td>
                  <td className="text-right font-semibold">{brl(f.valor)}</td>
                  <td className="text-right">{f.vencimento}</td>
                  <td className="text-right">
                    <span className={`badge border ${cor(f.status)}`}>{f.status}</span>
                  </td>
                  <td className="text-right text-xs text-slate-500">{f.pagaEm ? formatDateTime(f.pagaEm) : '—'}</td>
                  <td className="text-right">
                    {f.status !== 'PAGA' && (
                      <button onClick={() => pagar(f.id)} className="text-xs font-semibold text-merenda-700 hover:underline">
                        Marcar paga
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400">
        ⓘ <b>MOCK</b>: a integração real com gateway de assinaturas (Mercado Pago Subscriptions / Stripe) requer credenciais e
        configuração de webhooks. Hoje a fatura é gerada localmente e marcada como paga manualmente.
      </p>
    </div>
  );
}
