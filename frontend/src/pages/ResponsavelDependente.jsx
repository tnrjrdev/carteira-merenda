import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api.js';
import Field from '../components/Field.jsx';
import { brl, extractError, formatDateTime } from '../utils/format.js';

export default function ResponsavelDependente() {
  const { id } = useParams();
  const [saldo, setSaldo] = useState(null);
  const [extrato, setExtrato] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [err, setErr] = useState(null);
  const [recarga, setRecarga] = useState('');
  const [recargaErr, setRecargaErr] = useState(null);
  const [recargaOk, setRecargaOk] = useState(null);
  const [recargaLoading, setRecargaLoading] = useState(false);
  const [limites, setLimites] = useState({ limiteDiario: '', limiteSemanal: '' });
  const [salvandoLimites, setSalvandoLimites] = useState(false);

  const load = async () => {
    try {
      const [s, e, b, c] = await Promise.all([
        api.get(`/carteira/estudante/${id}`),
        api.get(`/carteira/estudante/${id}/extrato`),
        api.get(`/bloqueios/estudante/${id}`),
        api.get('/categorias'),
      ]);
      setSaldo(s.data);
      setExtrato(e.data);
      setBloqueios(b.data);
      setCategorias(c.data);
      setLimites({
        limiteDiario: s.data.limiteDiario ?? '',
        limiteSemanal: s.data.limiteSemanal ?? '',
      });
    } catch (e) {
      setErr(extractError(e));
    }
  };

  useEffect(() => { load(); }, [id]);

  const recarregar = async (e) => {
    e.preventDefault();
    setRecargaErr(null);
    setRecargaOk(null);
    const valor = Number(recarga);
    if (!recarga || isNaN(valor)) {
      setRecargaErr('Informe um valor válido');
      return;
    }
    if (valor < 1) {
      setRecargaErr('Valor mínimo de recarga é R$ 1,00');
      return;
    }
    if (valor > 10000) {
      setRecargaErr('Valor máximo é R$ 10.000,00');
      return;
    }
    
    setRecargaLoading(true);
    try {
      await api.post('/carteira/recarga', {
        estudanteId: Number(id),
        valor,
        metodo: 'Pix',
      });
      setRecarga('');
      setRecargaOk(`Recarga de ${brl(valor)} realizada com sucesso!`);
      await load();
      setTimeout(() => setRecargaOk(null), 5000);
    } catch (e) {
      setRecargaErr(extractError(e));
    } finally {
      setRecargaLoading(false);
    }
  };

  const salvarLimites = async (e) => {
    e.preventDefault();
    setErr(null);
    if (limites.limiteDiario !== '' && Number(limites.limiteDiario) < 0) {
      setErr('Limite diário não pode ser negativo');
      return;
    }
    if (limites.limiteSemanal !== '' && Number(limites.limiteSemanal) < 0) {
      setErr('Limite semanal não pode ser negativo');
      return;
    }
    if (limites.limiteDiario !== '' && limites.limiteSemanal !== ''
        && Number(limites.limiteDiario) > Number(limites.limiteSemanal)) {
      setErr('Limite diário não pode ser maior que o semanal');
      return;
    }
    
    setSalvandoLimites(true);
    try {
      await api.put(`/dependentes/${id}/limites`, {
        limiteDiario: limites.limiteDiario === '' ? null : Number(limites.limiteDiario),
        limiteSemanal: limites.limiteSemanal === '' ? null : Number(limites.limiteSemanal),
      });
      await load();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setSalvandoLimites(false);
    }
  };

  const toggleBloqueio = async (categoriaId, ativo) => {
    try {
      if (ativo) {
        await api.delete(`/bloqueios/estudante/${id}/categoria/${categoriaId}`);
      } else {
        await api.post(`/bloqueios/estudante/${id}/categoria/${categoriaId}`, { motivo: 'Bloqueado pelos responsáveis' });
      }
      await load();
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const isBloqueada = (catId) => bloqueios.some((b) => b.categoriaId === catId);

  if (!saldo) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-merenda-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <Link to="/responsavel" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-merenda-600 transition-colors bg-white px-4 py-2 rounded-full shadow-sm w-fit">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Voltar para Painel
      </Link>

      <div className="glass-panel overflow-hidden relative bg-gradient-to-br from-merenda-500 to-merenda-700 text-white shadow-glow border-0">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-black/10 rounded-full blur-xl"></div>
        
        <div className="relative z-10 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-display font-bold shadow-sm backdrop-blur-md border border-white/30">
                  {saldo.nomeEstudante?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold leading-tight">{saldo.nomeEstudante}</h1>
                  <span className="badge bg-white/20 border border-white/30 text-white mt-1">Estudante</span>
                </div>
              </div>
              
              <div className="mt-6">
                <div className="text-sm font-medium opacity-80 uppercase tracking-wider mb-1">Saldo na Carteira</div>
                <div className="text-5xl md:text-6xl font-display font-bold tracking-tight">{brl(saldo.saldo)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full md:w-auto mt-4 md:mt-0">
              <div className="bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col justify-center">
                <div className="opacity-80 text-xs font-semibold uppercase tracking-wider mb-1">Gasto Hoje</div>
                <div className="font-display font-bold text-xl">{brl(saldo.gastoHoje)}</div>
                {saldo.limiteDiario && <div className="text-xs opacity-70 mt-1 flex justify-between"><span>L: {brl(saldo.limiteDiario)}</span> <span>{Math.round((saldo.gastoHoje/saldo.limiteDiario)*100)}%</span></div>}
              </div>
              <div className="bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col justify-center">
                <div className="opacity-80 text-xs font-semibold uppercase tracking-wider mb-1">Gasto Semana</div>
                <div className="font-display font-bold text-xl">{brl(saldo.gastoSemana)}</div>
                {saldo.limiteSemanal && <div className="text-xs opacity-70 mt-1 flex justify-between"><span>L: {brl(saldo.limiteSemanal)}</span> <span>{Math.round((saldo.gastoSemana/saldo.limiteSemanal)*100)}%</span></div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm animate-slide-up">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {err}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <form onSubmit={recarregar} className="card space-y-4">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
            <svg className="w-6 h-6 text-merenda-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h2 className="text-xl font-display font-bold text-slate-800">Recarga Expresso</h2>
          </div>
          
          {recargaErr && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">{recargaErr}</div>}
          {recargaOk && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-100 animate-fade-in">{recargaOk}</div>}
          
          <div>
            <label className="label">Valor da Recarga</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-slate-400 font-medium text-lg">R$</span>
              </div>
              <input className="input pl-12 text-lg font-bold text-slate-800 h-14" type="number" step="0.01" min="1.00" placeholder="0.00"
                     value={recarga} onChange={(e) => setRecarga(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[10, 20, 50, 100].map((v) => (
              <button key={v} type="button" onClick={() => setRecarga(String(v))} className="btn-secondary py-2 px-1 text-sm font-semibold hover:border-merenda-400 hover:text-merenda-600">
                + {v}
              </button>
            ))}
          </div>
          <button className="btn-primary w-full h-12 text-lg mt-2 shadow-glow" disabled={recargaLoading || !recarga}>
            {recargaLoading ? 'Processando...' : 'Pagar via Pix'}
          </button>
        </form>

        <form onSubmit={salvarLimites} className="card space-y-4">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
            <svg className="w-6 h-6 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <h2 className="text-xl font-display font-bold text-slate-800">Controle Financeiro</h2>
          </div>
          <p className="text-sm text-slate-500">Defina limites para controlar quanto seu filho pode gastar por dia ou semana na cantina.</p>
          
          <div className="space-y-3">
            <div>
              <label className="label">Limite Diário (R$)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-400">R$</span></div>
                <input className="input pl-10" type="number" step="0.01" placeholder="Ilimitado"
                       value={limites.limiteDiario} onChange={(e) => setLimites({ ...limites, limiteDiario: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Limite Semanal (R$)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-400">R$</span></div>
                <input className="input pl-10" type="number" step="0.01" placeholder="Ilimitado"
                       value={limites.limiteSemanal} onChange={(e) => setLimites({ ...limites, limiteSemanal: e.target.value })} />
              </div>
            </div>
          </div>
          <button className="w-full btn bg-slate-800 text-white hover:bg-slate-700 h-12 mt-2" disabled={salvandoLimites}>
            {salvandoLimites ? 'Salvando...' : 'Salvar limites'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          <h2 className="text-xl font-display font-bold text-slate-800">Restrições Alimentares</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4 font-medium">Selecione as categorias de produtos que seu filho está <span className="text-red-500 font-bold">proibido</span> de comprar (alergias, dietas, etc).</p>
        
        <div className="flex flex-wrap gap-3">
          {categorias.map((c) => {
            const ativo = isBloqueada(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleBloqueio(c.id, ativo)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${ativo ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${ativo ? 'bg-red-500 border-red-500' : 'border-slate-300'}`}>
                  {ativo && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                {c.nome}
                {ativo && <span className="ml-1 text-xs uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md">Bloqueado</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Histórico de Transações
          </h2>
        </div>
        
        {extrato.length === 0 ? (
          <div className="text-center py-10 text-slate-500 bg-white">
            <p>Nenhuma movimentação registrada na carteira ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 bg-white">
            {extrato.map((t) => (
              <li key={t.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border mt-1
                      ${t.tipo === 'COMPRA' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-500 border-green-100'}`}
                    >
                      {t.tipo === 'COMPRA' ? '🍔' : '💰'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-base">
                        {t.tipo === 'COMPRA' ? 'Compra na Cantina' : 'Recarga via Pix'}
                        {t.cantinaNome && <span className="text-slate-500 font-medium"> · {t.cantinaNome}</span>}
                      </div>
                      <div className="text-xs font-medium text-slate-400 mt-0.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {formatDateTime(t.criadaEm)}
                      </div>
                      
                      {t.itens?.length > 0 && (
                        <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Itens consumidos</div>
                          <ul className="space-y-1.5">
                            {t.itens.map((i, idx) => (
                              <li key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-slate-700"><span className="font-bold text-slate-400 w-6 inline-block">{i.quantidade}x</span> {i.nomeProduto}</span>
                                <span className="font-semibold text-slate-600">{brl(i.subtotal)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`font-display font-bold text-lg px-3 py-1.5 rounded-lg border ${t.tipo === 'COMPRA' ? 'text-slate-800 border-slate-200 bg-white' : 'text-green-700 bg-green-50 border-green-100'}`}>
                    {t.tipo === 'COMPRA' ? '-' : '+'}{brl(t.valor)}
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
