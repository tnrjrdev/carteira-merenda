import { useEffect, useMemo, useState } from 'react';
import api from '../../../services/api.js';
import { brl, extractError } from '../../../utils/format.js';

const PERIODOS = [
  { label: '7 dias', dias: 7 },
  { label: '30 dias', dias: 30 },
  { label: '90 dias', dias: 90 },
];

const corCategoria = (i) => {
  const cores = [
    'from-merenda-400 to-merenda-600',
    'from-blue-400 to-blue-600',
    'from-emerald-400 to-emerald-600',
    'from-pink-400 to-rose-600',
    'from-violet-400 to-purple-600',
    'from-amber-400 to-orange-600',
  ];
  return cores[i % cores.length];
};

const SparkBars = ({ dados }) => {
  const max = useMemo(() => Math.max(1, ...dados.map((d) => Number(d.receita))), [dados]);
  if (dados.length === 0) {
    return <div className="text-sm text-slate-500 text-center py-10">Sem vendas no período.</div>;
  }
  return (
    <div className="flex items-end gap-1.5 h-40">
      {dados.map((d) => {
        const h = Math.max(2, (Number(d.receita) / max) * 100);
        return (
          <div key={d.data} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.data}: ${brl(d.receita)}`}>
            <div className="w-full bg-gradient-to-t from-merenda-500 to-merenda-300 rounded-t-md transition-all group-hover:from-merenda-600 group-hover:to-merenda-400"
                 style={{ height: `${h}%` }}></div>
            <div className="text-[9px] text-slate-400 transform -rotate-45 origin-top-left whitespace-nowrap">
              {d.data.slice(5)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function CantinaRelatorios() {
  const [dias, setDias] = useState(30);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);

  const load = async (d) => {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get(`/cantina/painel/relatorios?dias=${d}`);
      setData(data);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(dias); }, [dias]);

  const exportarCsv = async () => {
    setExportando(true);
    try {
      const resp = await api.get(`/cantina/painel/exportar?dias=${dias}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `transacoes-${dias}dias-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setExportando(false);
    }
  };

  if (loading && !data) return <div className="text-slate-500">Carregando relatórios...</div>;
  if (err) return <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl">{err}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Relatórios</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">{data.cantinaNome} · últimos {data.dias} dias</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/70 backdrop-blur border border-slate-200 rounded-xl p-1 flex gap-1">
            {PERIODOS.map((p) => (
              <button key={p.dias} onClick={() => setDias(p.dias)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                        dias === p.dias ? 'bg-merenda-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                      }`}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={exportarCsv} className="btn-secondary text-sm" disabled={exportando}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {exportando ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon="receita" label="Receita total" value={brl(data.kpis.totalReceita)} />
        <KpiCard icon="trans" label="Transações" value={data.kpis.totalTransacoes} />
        <KpiCard icon="ticket" label="Ticket médio" value={brl(data.kpis.ticketMedio)} />
        <KpiCard icon="alunos" label="Alunos ativos" value={data.kpis.alunosAtivos} />
      </div>

      {/* Vendas por dia (sparkline) */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="feature-icon">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900">Vendas por dia</h2>
            <p className="text-xs text-slate-500">Receita diária no período selecionado</p>
          </div>
        </div>
        <SparkBars dados={data.porDia} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top produtos */}
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="feature-icon">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900">Top produtos</h2>
          </div>
          {data.topProdutos.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-6">Sem vendas no período.</div>
          ) : (
            <ol className="space-y-3">
              {data.topProdutos.map((p, i) => (
                <li key={p.nomeProduto} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{p.nomeProduto}</div>
                    <div className="text-xs text-slate-500">{p.quantidade} {p.quantidade === 1 ? 'unidade' : 'unidades'}</div>
                  </div>
                  <div className="font-display font-bold text-slate-800">{brl(p.receita)}</div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Por categoria */}
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="feature-icon">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900">Vendas por categoria</h2>
          </div>
          {data.porCategoria.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-6">Sem vendas no período.</div>
          ) : (
            <ul className="space-y-3">
              {data.porCategoria.map((c, i) => {
                const total = data.kpis.totalReceita > 0 ? (Number(c.receita) / Number(data.kpis.totalReceita)) * 100 : 0;
                return (
                  <li key={c.categoria}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700">{c.categoria}</span>
                      <span className="text-sm font-semibold text-slate-800">{brl(c.receita)} <span className="text-xs text-slate-400 font-normal">({total.toFixed(1)}%)</span></span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${corCategoria(i)} rounded-full transition-all`}
                           style={{ width: `${total}%` }}></div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }) {
  const icons = {
    receita: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    trans: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    ticket: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
    alunos: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  };
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className="feature-icon">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[icon]} /></svg>
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold truncate">{label}</div>
          <div className="text-2xl font-display font-extrabold text-slate-900 tracking-tight truncate">{value}</div>
        </div>
      </div>
    </div>
  );
}
