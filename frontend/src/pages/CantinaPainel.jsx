import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import { brl, extractError, formatDateTime } from '../utils/format.js';

export default function CantinaPainel() {
  const [resumo, setResumo] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get('/cantina/painel/resumo');
      setResumo(data);
    } catch (e) {
      setErr(extractError(e));
    }
  };
  useEffect(() => { load(); }, []);

  if (err) return <div className="bg-red-50 text-red-700 p-3 rounded-lg">{err}</div>;
  if (!resumo) return <div className="text-slate-500">Carregando...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{resumo.cantinaNome}</h1>
          <p className="text-sm text-slate-500">Painel da cantina</p>
        </div>
        <Link to="/cantina/pdv" className="btn-primary">🧾 Abrir PDV</Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="text-sm text-slate-500">Vendas de hoje</div>
          <div className="text-3xl font-bold text-merenda-600 mt-1">{brl(resumo.totalHoje)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Vendas do mês</div>
          <div className="text-3xl font-bold text-slate-800 mt-1">{brl(resumo.totalMes)}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Últimas vendas</h2>
          <button className="text-sm text-merenda-600" onClick={load}>Atualizar</button>
        </div>
        {resumo.ultimasVendas.length === 0 && <p className="text-sm text-slate-500">Nenhuma venda ainda.</p>}
        <ul className="divide-y divide-slate-100">
          {resumo.ultimasVendas.map((v) => (
            <li key={v.id} className="py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">{formatDateTime(v.criadaEm)}</div>
                <div className="font-bold text-merenda-600">{brl(v.valor)}</div>
              </div>
              {v.itens?.length > 0 && (
                <ul className="text-xs text-slate-600 mt-1 ml-2">
                  {v.itens.map((i, idx) => (
                    <li key={idx}>· {i.quantidade}× {i.nomeProduto} ({brl(i.subtotal)})</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
