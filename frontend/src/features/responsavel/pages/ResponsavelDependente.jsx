import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../../services/api.js';
import Field from '../../../components/ui/Field.jsx';
import PixModal from '../components/PixModal.jsx';
import BoletoModal from '../components/BoletoModal.jsx';
import CartaoModal from '../components/CartaoModal.jsx';
import MesadaForm from '../components/MesadaForm.jsx';
import { brl, extractError, formatDateTime } from '../../../utils/format.js';

const HeaderSaldo = ({ saldo, dep }) => {
  const percentDia = saldo.limiteDiario ? Math.min(100, (Number(saldo.gastoHoje) / Number(saldo.limiteDiario)) * 100) : 0;
  return (
    <header className="glass-panel overflow-hidden relative bg-gradient-to-br from-merenda-500 to-merenda-700 text-white shadow-glow border-0">
      <div className="relative z-10 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold">
            {(saldo.nomeEstudante || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Dependente</div>
            <h1 className="text-xl font-display font-bold leading-tight">{saldo.nomeEstudante}</h1>
            {dep?.alergias && (
              <div className="text-xs mt-1 inline-flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-300/30">
                ⚠ Alergias: <b>{dep.alergias}</b>
              </div>
            )}
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

export default function ResponsavelDependente() {
  const { id } = useParams();
  const [dep, setDep] = useState(null);
  const [saldo, setSaldo] = useState(null);
  const [extrato, setExtrato] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [err, setErr] = useState(null);
  const [recarga, setRecarga] = useState('');
  const [recargaErr, setRecargaErr] = useState(null);
  const [recargaOk, setRecargaOk] = useState(null);
  const [pixAtivo, setPixAtivo] = useState(null);
  const [boletoAtivo, setBoletoAtivo] = useState(null);
  const [cartaoAberto, setCartaoAberto] = useState(false);
  const [iniciando, setIniciando] = useState(null);
  const [limites, setLimites] = useState({ limiteDiario: '', limiteSemanal: '' });
  const [perfil, setPerfil] = useState({ dataNascimento: '', alergias: '' });
  const [perfilOk, setPerfilOk] = useState(null);

  const load = async () => {
    try {
      const [s, e, b, c, deps] = await Promise.all([
        api.get(`/carteira/estudante/${id}`),
        api.get(`/carteira/estudante/${id}/extrato`),
        api.get(`/bloqueios/estudante/${id}`),
        api.get('/categorias'),
        api.get('/dependentes'),
      ]);
      setSaldo(s.data);
      setExtrato(e.data);
      setBloqueios(b.data);
      setCategorias(c.data);
      const d = (deps.data || []).find((x) => String(x.id) === String(id));
      setDep(d);
      setLimites({
        limiteDiario: s.data.limiteDiario ?? '',
        limiteSemanal: s.data.limiteSemanal ?? '',
      });
      setPerfil({
        dataNascimento: d?.dataNascimento || '',
        alergias: d?.alergias || '',
      });
    } catch (e) { setErr(extractError(e)); }
  };

  useEffect(() => { load(); }, [id]);

  const validarValor = () => {
    const v = Number(recarga);
    if (!recarga || isNaN(v)) return 'Informe um valor válido';
    if (v < 1) return 'Valor mínimo é R$ 1,00';
    if (v > 10000) return 'Valor máximo é R$ 10.000,00';
    return null;
  };

  const recargarManual = async (e) => {
    e.preventDefault();
    setRecargaErr(null); setRecargaOk(null);
    const msg = validarValor(); if (msg) { setRecargaErr(msg); return; }
    setIniciando('manual');
    try {
      const v = Number(recarga);
      await api.post('/carteira/recarga', { estudanteId: Number(id), valor: v, metodo: 'Manual' });
      setRecarga(''); setRecargaOk(`Recarga de ${brl(v)} realizada!`);
      await load();
    } catch (e) { setRecargaErr(extractError(e)); }
    finally { setIniciando(null); }
  };

  const iniciarPix = async () => {
    setRecargaErr(null); setRecargaOk(null);
    const msg = validarValor(); if (msg) { setRecargaErr(msg); return; }
    setIniciando('pix');
    try {
      const { data } = await api.post('/carteira/recarga-pix', { estudanteId: Number(id), valor: Number(recarga) });
      setPixAtivo(data);
    } catch (e) { setRecargaErr(extractError(e)); }
    finally { setIniciando(null); }
  };

  const iniciarBoleto = async () => {
    setRecargaErr(null); setRecargaOk(null);
    if (Number(recarga) < 5) { setRecargaErr('Boleto mínimo R$ 5,00'); return; }
    setIniciando('boleto');
    try {
      const { data } = await api.post('/carteira/recarga-boleto', { estudanteId: Number(id), valor: Number(recarga) });
      setBoletoAtivo(data);
    } catch (e) { setRecargaErr(extractError(e)); }
    finally { setIniciando(null); }
  };

  const iniciarCartao = () => {
    setRecargaErr(null); setRecargaOk(null);
    const msg = validarValor(); if (msg) { setRecargaErr(msg); return; }
    setCartaoAberto(true);
  };

  const onAprovado = async () => {
    setPixAtivo(null); setBoletoAtivo(null); setCartaoAberto(false);
    setRecarga(''); setRecargaOk('Pagamento confirmado!');
    await load();
  };

  const salvarLimites = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      await api.put(`/dependentes/${id}/limites`, {
        limiteDiario: limites.limiteDiario === '' ? null : Number(limites.limiteDiario),
        limiteSemanal: limites.limiteSemanal === '' ? null : Number(limites.limiteSemanal),
      });
      await load();
    } catch (e) { setErr(extractError(e)); }
  };

  const salvarPerfil = async (e) => {
    e.preventDefault();
    setErr(null); setPerfilOk(null);
    try {
      await api.put(`/dependentes/${id}/perfil`, {
        dataNascimento: perfil.dataNascimento || null,
        alergias: perfil.alergias || null,
      });
      setPerfilOk('Perfil atualizado!');
      await load();
    } catch (e) { setErr(extractError(e)); }
  };

  const toggleBloqueio = async (categoriaId, ativo) => {
    try {
      if (ativo) await api.delete(`/bloqueios/estudante/${id}/categoria/${categoriaId}`);
      else await api.post(`/bloqueios/estudante/${id}/categoria/${categoriaId}`, { motivo: 'Bloqueado pelos responsáveis' });
      await load();
    } catch (e) { setErr(extractError(e)); }
  };

  const isBloqueada = (catId) => bloqueios.some((b) => b.categoriaId === catId);

  if (!saldo) return <div className="text-slate-500">Carregando…</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <Link to="/responsavel" className="inline-flex items-center gap-1 text-sm font-medium text-merenda-600 hover:text-merenda-700">
        ← Voltar para meus dependentes
      </Link>

      <HeaderSaldo saldo={saldo} dep={dep} />

      {err && <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-sm">{err}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="feature-icon">💰</div>
            <div>
              <h2 className="font-display font-bold text-xl">Recarregar carteira</h2>
              <p className="text-xs text-slate-500">Pix, Boleto, Cartão ou crédito manual</p>
            </div>
          </div>

          {recargaErr && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{recargaErr}</div>}
          {recargaOk && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm">{recargaOk}</div>}

          <Field label="Valor">
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
                          : 'border-slate-200 bg-white/70 text-slate-700 hover:border-merenda-300'
                      }`}>R$ {v}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={iniciarPix} disabled={iniciando === 'pix'} className="btn-primary">
              {iniciando === 'pix' ? 'Gerando QR…' : '⚡ Pix QR'}
            </button>
            <button onClick={iniciarBoleto} disabled={iniciando === 'boleto'} className="btn-secondary">
              {iniciando === 'boleto' ? 'Gerando…' : '🧾 Boleto'}
            </button>
            <button onClick={iniciarCartao} className="btn-secondary">💳 Cartão (+ taxa)</button>
            <button onClick={recargarManual} disabled={iniciando === 'manual'} className="btn-secondary">
              {iniciando === 'manual' ? '...' : '✍ Manual (dev)'}
            </button>
          </div>
          <p className="text-[10px] text-slate-400">Pix e Boleto só creditam após confirmação. Cartão tem taxa de conveniência (~4,99%).</p>
        </div>

        <form onSubmit={salvarLimites} className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="feature-icon">🛡</div>
            <div>
              <h2 className="font-display font-bold text-xl">Limites de gastos</h2>
              <p className="text-xs text-slate-500">Tetos diário e semanal</p>
            </div>
          </div>
          <Field label="Limite diário">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">R$</span>
              <input className="input pl-12" type="number" step="0.01" placeholder="Sem limite"
                     value={limites.limiteDiario}
                     onChange={(e) => setLimites({ ...limites, limiteDiario: e.target.value })} />
            </div>
          </Field>
          <Field label="Limite semanal">
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

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={salvarPerfil} className="card space-y-3">
          <div className="flex items-center gap-3">
            <div className="feature-icon">👶</div>
            <div>
              <h2 className="font-display font-bold text-xl">Perfil do estudante</h2>
              <p className="text-xs text-slate-500">Alergias bloqueiam compras de produtos contendo o alérgeno</p>
            </div>
          </div>
          {perfilOk && <div className="bg-green-50 border border-green-200 text-green-700 p-2 rounded-lg text-xs">{perfilOk}</div>}
          <Field label="Data de nascimento">
            <input className="input" type="date" value={perfil.dataNascimento}
                   onChange={(e) => setPerfil({ ...perfil, dataNascimento: e.target.value })} />
          </Field>
          <Field label="Alergias (separadas por vírgula)" hint="ex: amendoim, leite, gluten">
            <input className="input" placeholder="ex: amendoim, leite" value={perfil.alergias}
                   onChange={(e) => setPerfil({ ...perfil, alergias: e.target.value })} />
          </Field>
          <button className="btn-primary text-sm">Salvar perfil</button>
        </form>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="feature-icon">💸</div>
            <div>
              <h2 className="font-display font-bold text-xl">Mesada programada</h2>
              <p className="text-xs text-slate-500">Crédito automático segundo o cronograma</p>
            </div>
          </div>
          <MesadaForm estudanteId={id} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="feature-icon">🚫</div>
          <div>
            <h2 className="font-display font-bold text-xl">Bloqueio nutricional</h2>
            <p className="text-xs text-slate-500">Bloqueie categorias inteiras</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => {
            const ativo = isBloqueada(c.id);
            return (
              <button key={c.id} onClick={() => toggleBloqueio(c.id, ativo)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        ativo
                          ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                          : 'bg-white/70 border-slate-200 text-slate-700 hover:border-merenda-300'
                      }`}>
                {ativo ? '🚫 ' : '+ '}{c.nome}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
          <h2 className="font-display font-bold text-xl">Extrato detalhado</h2>
          <span className="badge bg-slate-100 text-slate-600">{extrato.length}</span>
        </div>
        {extrato.length === 0 ? (
          <p className="text-center py-10 text-slate-500 text-sm">Nenhuma transação ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {extrato.map((t) => (
              <li key={t.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800">
                      {t.tipo === 'COMPRA' ? 'Compra'
                        : t.tipo === 'RECARGA' ? 'Recarga'
                        : t.tipo === 'MESADA' ? '💸 Mesada'
                        : t.tipo === 'ESTORNO' ? '↩ Estorno'
                        : t.tipo === 'TAXA_PLATAFORMA' ? 'Taxa plataforma' : t.tipo}
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
                  <div className={`font-display font-bold text-lg shrink-0 ${
                      t.tipo === 'COMPRA' || t.tipo === 'TAXA_PLATAFORMA' ? 'text-red-600'
                      : (t.tipo === 'RECARGA' || t.tipo === 'MESADA' || t.tipo === 'ESTORNO') ? 'text-green-600'
                      : 'text-slate-700'
                  }`}>
                    {(t.tipo === 'COMPRA' || t.tipo === 'TAXA_PLATAFORMA') ? '−' : '+'}{brl(t.valor)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pixAtivo && <PixModal recarga={pixAtivo} onClose={() => setPixAtivo(null)} onAprovada={onAprovado} />}
      {boletoAtivo && <BoletoModal recarga={boletoAtivo} onClose={() => setBoletoAtivo(null)} onAprovada={onAprovado} />}
      {cartaoAberto && (
        <CartaoModal estudanteId={Number(id)} valorInicial={recarga}
                     onClose={() => setCartaoAberto(false)} onAprovada={onAprovado} />
      )}
    </div>
  );
}
