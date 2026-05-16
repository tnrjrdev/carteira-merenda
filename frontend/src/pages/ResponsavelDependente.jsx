import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api.js';
import Field from '../components/Field.jsx';
import { brl, extractError, formatDateTime } from '../utils/format.js';

// --- Subcomponentes ---

const SkeletonHeader = () => (
  <div className="glass-panel overflow-hidden relative bg-slate-200 text-slate-100 shadow-glow border-0 animate-pulse min-h-[200px]"></div>
);

const HeaderSaldo = ({ saldo }) => {
  const percentDia = saldo.limiteDiario ? Math.min(100, (Number(saldo.gastoHoje) / Number(saldo.limiteDiario)) * 100) : 0;
  return (
    <header className="glass-panel overflow-hidden relative bg-gradient-to-br from-merenda-500 to-merenda-700 text-white shadow-glow border-0">
      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 bg-black/10 rounded-full blur-xl"></div>
      <div className="relative z-10 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold">
            {(saldo.nomeEstudante || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Dependente</div>
            <h1 className="text-xl font-display font-bold leading-tight">{saldo.nomeEstudante}</h1>
          </div>
        </div>
        <div className="mt-6">
          <div className="text-sm font-medium opacity-80 uppercase tracking-wider">Saldo em carteira</div>
          <div className="text-5xl md:text-6xl font-display font-extrabold mt-1 tracking-tight">{brl(saldo.saldo)}</div>
        </div>
        {saldo.limiteDiario && (
          <div className="mt-6 bg-black/10 backdrop-blur rounded-xl p-4 border border-white/10">
            <div className="flex justify-between text-sm mb-2">
              <span className="opacity-90">Gasto hoje</span>
              <span className="font-semibold">{brl(saldo.gastoHoje)} <span className="opacity-70 font-normal">/ {brl(saldo.limiteDiario)}</span></span>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
              <div className={`h-2 rounded-full transition-all duration-700 ${percentDia >= 100 ? 'bg-red-400' : 'bg-white'}`} style={{ width: `${percentDia}%` }}></div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

const TransacaoIcon = ({ tipo }) => {
  const map = {
    COMPRA: { bg: 'bg-red-50', color: 'text-red-600', d: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
    RECARGA: { bg: 'bg-green-50', color: 'text-green-600', d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  };
  const i = map[tipo] || { bg: 'bg-slate-50', color: 'text-slate-600', d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
  return (
    <div className={`w-10 h-10 rounded-full ${i.bg} ${i.color} flex items-center justify-center shrink-0`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={i.d} /></svg>
    </div>
  );
};

// --- Main ---

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
  const [recarregando, setRecarregando] = useState(false);
  const [limites, setLimites] = useState({ limiteDiario: '', limiteSemanal: '' });
  const [limitesOk, setLimitesOk] = useState(null);

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
    if (!recarga || isNaN(valor)) { setRecargaErr('Informe um valor válido'); return; }
    if (valor < 1) { setRecargaErr('Valor mínimo de recarga é R$ 1,00'); return; }
    if (valor > 10000) { setRecargaErr('Valor máximo de recarga é R$ 10.000,00'); return; }
    setRecarregando(true);
    try {
      await api.post('/carteira/recarga', { estudanteId: Number(id), valor, metodo: 'Pix' });
      setRecarga('');
      setRecargaOk(`Recarga de ${brl(valor)} realizada!`);
      await load();
    } catch (e) {
      setRecargaErr(extractError(e));
    } finally {
      setRecarregando(false);
    }
  };

  const salvarLimites = async (e) => {
    e.preventDefault();
    setErr(null);
    setLimitesOk(null);
    if (limites.limiteDiario !== '' && Number(limites.limiteDiario) < 0) {
      setErr('Limite diário não pode ser negativo'); return;
    }
    if (limites.limiteSemanal !== '' && Number(limites.limiteSemanal) < 0) {
      setErr('Limite semanal não pode ser negativo'); return;
    }
    if (limites.limiteDiario !== '' && limites.limiteSemanal !== ''
        && Number(limites.limiteDiario) > Number(limites.limiteSemanal)) {
      setErr('Limite diário não pode ser maior que o semanal'); return;
    }
    try {
      await api.put(`/dependentes/${id}/limites`, {
        limiteDiario: limites.limiteDiario === '' ? null : Number(limites.limiteDiario),
        limiteSemanal: limites.limiteSemanal === '' ? null : Number(limites.limiteSemanal),
      });
      setLimitesOk('Limites atualizados com sucesso!');
      await load();
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const toggleBloqueio = async (categoriaId, ativo) => {
    try {
      if (ativo) await api.delete(`/bloqueios/estudante/${id}/categoria/${categoriaId}`);
      else await api.post(`/bloqueios/estudante/${id}/categoria/${categoriaId}`, { motivo: 'Bloqueado pelos responsáveis' });
      await load();
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const isBloqueada = (catId) => bloqueios.some((b) => b.categoriaId === catId);

  if (!saldo) return <SkeletonHeader />;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <Link to="/responsavel" className="inline-flex items-center gap-1 text-sm font-medium text-merenda-600 hover:text-merenda-700 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Voltar para meus dependentes
      </Link>

      <HeaderSaldo saldo={saldo} />

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {err}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={recarregar} noValidate className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="feature-icon">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-slate-900">Recarregar carteira</h2>
              <p className="text-xs text-slate-500">Adicione saldo via Pix instantâneo</p>
            </div>
          </div>

          {recargaErr && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{recargaErr}</div>}
          {recargaOk && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            {recargaOk}
          </div>}

          <Field label="Valor da recarga">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">R$</span>
              <input className="input pl-12 text-lg font-semibold" type="number" step="0.01" min="0.01" placeholder="0,00"
                     value={recarga} onChange={(e) => setRecarga(e.target.value)} />
            </div>
          </Field>

          <div className="grid grid-cols-4 gap-2">
            {[10, 20, 50, 100].map((v) => (
              <button key={v} type="button" onClick={() => setRecarga(String(v))}
                      className={`text-sm font-semibold rounded-xl py-2.5 border transition-all ${
                        recarga === String(v)
                          ? 'border-merenda-500 bg-merenda-50 text-merenda-700 shadow-sm'
                          : 'border-slate-200 bg-white/70 text-slate-700 hover:border-merenda-300 hover:bg-merenda-50/50'
                      }`}>
                R$ {v}
              </button>
            ))}
          </div>

          <button className="btn-primary w-full" disabled={recarregando}>
            {recarregando ? 'Processando...' : '⚡ Recarregar via Pix'}
          </button>
        </form>

        <form onSubmit={salvarLimites} className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="feature-icon">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-slate-900">Limites de gastos</h2>
              <p className="text-xs text-slate-500">Defina tetos diário e semanal</p>
            </div>
          </div>

          {limitesOk && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm">{limitesOk}</div>}

          <Field label="Limite diário" hint="Deixe vazio para sem limite">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">R$</span>
              <input className="input pl-12" type="number" step="0.01" placeholder="Sem limite"
                     value={limites.limiteDiario}
                     onChange={(e) => setLimites({ ...limites, limiteDiario: e.target.value })} />
            </div>
          </Field>
          <Field label="Limite semanal" hint="Deixe vazio para sem limite">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">R$</span>
              <input className="input pl-12" type="number" step="0.01" placeholder="Sem limite"
                     value={limites.limiteSemanal}
                     onChange={(e) => setLimites({ ...limites, limiteSemanal: e.target.value })} />
            </div>
          </Field>

          <button className="btn-primary w-full">Salvar limites</button>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="feature-icon">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900">Bloqueio nutricional</h2>
            <p className="text-xs text-slate-500">Bloqueie categorias por alergia ou restrição alimentar</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => {
            const ativo = isBloqueada(c.id);
            return (
              <button key={c.id} onClick={() => toggleBloqueio(c.id, ativo)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                        ativo
                          ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                          : 'bg-white/70 border-slate-200 text-slate-700 hover:border-merenda-300 hover:bg-merenda-50/50'
                      }`}>
                {ativo ? '🚫 ' : '+ '}{c.nome}
              </button>
            );
          })}
          {categorias.length === 0 && <p className="text-sm text-slate-500">Nenhuma categoria cadastrada.</p>}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="feature-icon">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900">Extrato detalhado</h2>
          </div>
          <span className="badge bg-slate-100 text-slate-600">{extrato.length} {extrato.length === 1 ? 'movimentação' : 'movimentações'}</span>
        </div>

        {extrato.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <p className="text-sm">Nenhuma transação ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {extrato.map((t) => (
              <li key={t.id} className="py-4 px-2 -mx-2 rounded-lg hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <TransacaoIcon tipo={t.tipo} />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800">
                        {t.tipo === 'COMPRA' ? 'Compra' : t.tipo === 'RECARGA' ? 'Recarga' : t.tipo}
                        {t.cantinaNome && <span className="text-slate-500 font-normal"> · {t.cantinaNome}</span>}
                      </div>
                      <div className="text-xs text-slate-400">{formatDateTime(t.criadaEm)}</div>
                      {t.itens?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {t.itens.map((i, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                              {i.quantidade}× {i.nomeProduto}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`font-display font-bold text-lg shrink-0 ${t.tipo === 'COMPRA' ? 'text-red-600' : 'text-green-600'}`}>
                    {t.tipo === 'COMPRA' ? '−' : '+'}{brl(t.valor)}
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
