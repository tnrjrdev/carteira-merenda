import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { brl, extractError } from '../utils/format.js';

export default function AdminRede() {
  const [dias, setDias] = useState(30);
  const [resumo, setResumo] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/rede/resumo?dias=${dias}`)
      .then(({ data }) => setResumo(data))
      .catch((e) => setErr(extractError(e)))
      .finally(() => setLoading(false));
  }, [dias]);

  if (loading && !resumo) return <div className="text-slate-500">Carregando rede...</div>;
  if (err) return <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl">{err}</div>;
  if (!resumo) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Painel da Rede</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Visão agregada de todas as cantinas · últimos {resumo.dias} dias</p>
        </div>
        <div className="bg-white/70 backdrop-blur border border-slate-200 rounded-xl p-1 flex gap-1">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDias(d)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                      dias === d ? 'bg-merenda-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
              {d} dias
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Receita período" value={brl(resumo.totalReceitaPeriodo)} accent="merenda" />
        <Kpi label="Receita hoje" value={brl(resumo.totalReceitaHoje)} accent="slate" />
        <Kpi label="Transações" value={resumo.totalTransacoesPeriodo} accent="slate" />
        <Kpi label="Cantinas ativas" value={resumo.totalCantinas} accent="slate" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi label="Responsáveis" value={resumo.totalResponsaveis} accent="slate" />
        <Kpi label="Estudantes" value={resumo.totalEstudantes} accent="slate" />
        <Kpi label="Operadores" value={resumo.totalOperadores} accent="slate" />
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
          <div className="feature-icon">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <h2 className="font-display font-bold text-xl text-slate-900">Cantinas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase">
              <tr className="text-left">
                <th className="py-2">Cantina</th>
                <th>Escola</th>
                <th className="text-right">Receita hoje</th>
                <th className="text-right">Receita período</th>
                <th className="text-right">Transações</th>
                <th className="text-right">Alunos ativos</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resumo.porCantina.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="py-3 font-semibold text-slate-800">{c.nome}</td>
                  <td className="text-slate-600">{c.escola || '-'}</td>
                  <td className="text-right font-mono">{brl(c.receitaHoje)}</td>
                  <td className="text-right font-mono font-semibold">{brl(c.receitaPeriodo)}</td>
                  <td className="text-right">{c.transacoesPeriodo}</td>
                  <td className="text-right">{c.alunosAtivos}</td>
                  <td className="text-center">
                    {c.ativa
                      ? <span className="badge bg-green-50 text-green-700 border border-green-100">Ativa</span>
                      : <span className="badge bg-slate-100 text-slate-600">Inativa</span>}
                  </td>
                </tr>
              ))}
              {resumo.porCantina.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-slate-500">Nenhuma cantina cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className={`text-3xl font-display font-extrabold tracking-tight mt-1 ${accent === 'merenda' ? 'text-merenda-600' : 'text-slate-900'}`}>
        {value}
      </div>
    </div>
  );
}
