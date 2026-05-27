import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api.js';
import { brl, extractError, formatDateTime } from '../../../utils/format.js';

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

  if (err) return (
    <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm">
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {err}
    </div>
  );
  
  if (!resumo) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin h-8 w-8 border-4 border-merenda-500 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="glass-panel overflow-hidden relative bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-glow border-0 p-6 md:p-8">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-merenda-500/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-brand-accent/20 rounded-full blur-xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl backdrop-blur-md border border-white/20">
                🏪
              </div>
              <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Painel da Cantina</p>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">{resumo.cantinaNome}</h1>
          </div>
          <Link to="/cantina/pdv" className="btn-primary shadow-glow md:text-lg whitespace-nowrap hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Abrir PDV
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="card relative overflow-hidden group hover:shadow-glass-hover transition-all duration-300">
          <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-merenda-50 rounded-full blur-2xl group-hover:bg-merenda-100 transition-colors"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <svg className="w-5 h-5 text-merenda-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Vendas de Hoje
            </div>
            <div className="text-4xl font-display font-bold text-merenda-600 tracking-tight">{brl(resumo.totalHoje)}</div>
          </div>
        </div>
        
        <div className="card relative overflow-hidden group hover:shadow-glass-hover transition-all duration-300">
          <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-brand-light rounded-full blur-2xl group-hover:bg-blue-50 transition-colors"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <svg className="w-5 h-5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Vendas do Mês
            </div>
            <div className="text-4xl font-display font-bold text-slate-800 tracking-tight">{brl(resumo.totalMes)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-display font-bold text-slate-800">Últimas vendas</h2>
          <button className="text-sm font-medium text-merenda-600 bg-merenda-50 px-3 py-1.5 rounded-lg hover:bg-merenda-100 transition-colors flex items-center gap-1" onClick={load}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        </div>
        
        {resumo.ultimasVendas.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p>Nenhuma venda registrada ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {resumo.ultimasVendas.map((v) => (
              <li key={v.id} className="py-4 hover:bg-slate-50/50 px-2 -mx-2 rounded-lg transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-500 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDateTime(v.criadaEm)}
                      </div>
                      {v.itens?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {v.itens.map((i, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                              {i.quantidade}× {i.nomeProduto}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="font-display font-bold text-lg text-slate-800 bg-white border border-slate-100 px-3 py-1 rounded-lg shadow-sm">
                    {brl(v.valor)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
