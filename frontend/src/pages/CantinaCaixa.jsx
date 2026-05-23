import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { brl, extractError, formatDateTime } from '../utils/format.js';

export default function CantinaCaixa() {
  const [previa, setPrevia] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [dia, setDia] = useState(() => new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [fechando, setFechando] = useState(false);

  const load = async (d = dia) => {
    try {
      const [p, h] = await Promise.all([
        api.get(`/cantina/caixa/previa?dia=${d}`),
        api.get('/cantina/caixa'),
      ]);
      setPrevia(p.data);
      setHistorico(h.data);
    } catch (e) { setErr(extractError(e)); }
  };

  useEffect(() => { load(dia); }, [dia]);

  const fechar = async () => {
    setFechando(true); setErr(null); setAviso(null);
    try {
      await api.post('/cantina/caixa/fechar', { dia });
      setAviso('Caixa fechado! Repasse marcado como REPASSADO (mock).');
      await load(dia);
    } catch (e) { setErr(extractError(e)); }
    finally { setFechando(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <header>
        <h1 className="text-3xl font-display font-bold text-slate-900">Fechamento de caixa</h1>
        <p className="text-sm text-slate-500 mt-1">Calcule o repasse do dia (vendas − taxa da plataforma)</p>
      </header>

      {err && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{err}</div>}
      {aviso && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm">{aviso}</div>}

      <div className="card space-y-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="label">Dia</label>
            <input className="input" type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
          <button onClick={() => load(dia)} className="btn-secondary text-sm">Recarregar prévia</button>
        </div>

        {previa && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Total bruto</div>
              <div className="text-2xl font-bold text-slate-900">{brl(previa.totalBruto)}</div>
              <div className="text-xs text-slate-500">{previa.quantidadeTransacoes} transações</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 border border-red-200">
              <div className="text-[10px] uppercase tracking-wide text-red-600">Taxa plataforma</div>
              <div className="text-2xl font-bold text-red-700">− {brl(previa.taxaPlataforma)}</div>
              <div className="text-xs text-red-500">{(Number(previa.taxaPlataformaPct) * 100).toFixed(2)}%</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 border border-green-200 col-span-2">
              <div className="text-[10px] uppercase tracking-wide text-green-600">Líquido a repassar</div>
              <div className="text-3xl font-bold text-green-700">{brl(previa.totalLiquido)}</div>
              {previa.jaFechado && <div className="text-xs text-amber-600 mt-1">⚠ Caixa do dia já fechado</div>}
            </div>
          </div>
        )}

        <button onClick={fechar} disabled={fechando || previa?.jaFechado} className="btn-primary w-full">
          {fechando ? 'Fechando…' : previa?.jaFechado ? 'Caixa já fechado' : 'Fechar caixa do dia'}
        </button>
      </div>

      <section className="card">
        <h2 className="font-display font-bold text-xl text-slate-900 mb-4">Histórico</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum fechamento ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left py-2">Dia</th>
                <th className="text-right">Bruto</th>
                <th className="text-right">Taxa</th>
                <th className="text-right">Líquido</th>
                <th className="text-right">Repasse</th>
                <th className="text-right">Fechado em</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 font-semibold">{f.dia}</td>
                  <td className="text-right">{brl(f.totalBruto)}</td>
                  <td className="text-right text-red-600">− {brl(f.taxaPlataforma)}</td>
                  <td className="text-right font-bold text-green-700">{brl(f.totalLiquido)}</td>
                  <td className="text-right">
                    <span className={`badge ${f.statusRepasse === 'REPASSADO' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {f.statusRepasse}
                    </span>
                  </td>
                  <td className="text-right text-xs text-slate-500">{formatDateTime(f.fechadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
