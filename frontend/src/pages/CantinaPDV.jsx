import { useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { brl, extractError } from '../utils/format.js';
import QrScanner from '../components/QrScanner.jsx';
import { nfcSupported, lerNfcUmaVez } from '../services/nfc.js';

const categoriaCor = (nome) => {
  const map = {
    'Salgados': 'from-amber-400 to-orange-500',
    'Bebidas': 'from-cyan-400 to-blue-500',
    'Saudáveis': 'from-emerald-400 to-green-500',
    'Doces': 'from-pink-400 to-rose-500',
    'Refeições': 'from-violet-400 to-purple-500',
  };
  return map[nome] || 'from-slate-400 to-slate-500';
};

const ProdutoCard = ({ produto, onAdd, count }) => (
  <button
    onClick={() => onAdd(produto)}
    className="relative text-left rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 hover:border-merenda-400 hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-merenda-500/50"
  >
    {count > 0 && (
      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-merenda-500 text-white text-xs font-bold flex items-center justify-center shadow-md ring-4 ring-white">
        {count}
      </span>
    )}
    <div className={`w-full h-2 rounded-full bg-gradient-to-r ${categoriaCor(produto.categoriaNome)} mb-3 opacity-80`}></div>
    <div className="font-semibold text-slate-800 leading-tight line-clamp-2 min-h-[2.5rem]">{produto.nome}</div>
    {produto.categoriaNome && (
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{produto.categoriaNome}</div>
    )}
    {produto.alergenos && (
      <div className="text-[10px] text-red-600 mt-1" title="Alérgenos">⚠ {produto.alergenos}</div>
    )}
    <div className="flex items-center justify-between mt-3">
      <span className="text-merenda-600 font-display font-bold text-xl">{brl(produto.preco)}</span>
      <span className="text-[11px] text-slate-400">Est. {produto.estoque}</span>
    </div>
  </button>
);

export default function CantinaPDV() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [categoria, setCategoria] = useState('TODAS');
  const [carrinho, setCarrinho] = useState([]);
  const [token, setToken] = useState('');
  const [err, setErr] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [cobrando, setCobrando] = useState(false);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [lendoNfc, setLendoNfc] = useState(false);

  const podeNfc = nfcSupported();

  useEffect(() => {
    api.get(`/produtos/cantina/${user.cantinaId}`).then(({ data }) => setProdutos(data));
  }, [user.cantinaId]);

  const categorias = useMemo(() => {
    const set = new Set(produtos.map((p) => p.categoriaNome).filter(Boolean));
    return ['TODAS', ...set];
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      if (categoria !== 'TODAS' && p.categoriaNome !== categoria) return false;
      if (filtro && !p.nome.toLowerCase().includes(filtro.toLowerCase())) return false;
      return true;
    });
  }, [produtos, filtro, categoria]);

  const total = useMemo(() => carrinho.reduce((acc, it) => acc + it.quantidade * it.preco, 0), [carrinho]);
  const totalItens = useMemo(() => carrinho.reduce((acc, it) => acc + it.quantidade, 0), [carrinho]);
  const countDe = (id) => carrinho.find((i) => i.produtoId === id)?.quantidade || 0;

  const adicionar = (produto) => {
    setSucesso(null);
    setCarrinho((c) => {
      const ex = c.find((i) => i.produtoId === produto.id);
      if (ex) return c.map((i) => (i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i));
      return [...c, { produtoId: produto.id, nome: produto.nome, preco: Number(produto.preco), quantidade: 1 }];
    });
  };

  const alterarQtd = (id, delta) => {
    setCarrinho((c) =>
      c.map((i) => (i.produtoId === id ? { ...i, quantidade: Math.max(0, i.quantidade + delta) } : i))
        .filter((i) => i.quantidade > 0)
    );
  };
  const remover = (id) => setCarrinho((c) => c.filter((i) => i.produtoId !== id));
  const limpar = () => { setCarrinho([]); setSucesso(null); setErr(null); };

  const cobrar = async (tokenOverride) => {
    setErr(null);
    setSucesso(null);
    const t = (tokenOverride ?? token).trim();
    if (!t) { setErr('Informe o token do aluno (escaneie ou cole)'); return; }
    if (t.length < 8 || t.length > 64) { setErr('Token inválido'); return; }
    if (carrinho.length === 0) { setErr('Adicione produtos ao carrinho'); return; }
    if (carrinho.length > 50) { setErr('Máximo de 50 itens diferentes por compra'); return; }
    if (carrinho.some((i) => i.quantidade > 99)) { setErr('Quantidade máxima por item é 99'); return; }

    setCobrando(true);
    try {
      const { data } = await api.post('/pagamentos/cobrar', {
        token: t,
        itens: carrinho.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
      });
      setSucesso({ ...data });
      setCarrinho([]);
      setToken('');
      const fresh = await api.get(`/produtos/cantina/${user.cantinaId}`);
      setProdutos(fresh.data);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setCobrando(false);
    }
  };

  const lerNfc = async () => {
    setErr(null); setSucesso(null);
    setLendoNfc(true);
    try {
      const lido = await lerNfcUmaVez();
      setToken(lido);
      await cobrar(lido);
    } catch (e) {
      setErr(e?.message || 'Falha ao ler NFC');
    } finally { setLendoNfc(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">PDV — Ponto de Venda</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Selecione produtos · escaneie o QR Code ou aproxime o cartão NFC</p>
        </div>
        {carrinho.length > 0 && (
          <button onClick={limpar} className="btn-secondary text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" /></svg>
            Limpar carrinho
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                className="input pl-10"
                placeholder="Buscar produto..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-4 -mx-1 px-1">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  categoria === cat
                    ? 'bg-merenda-500 text-white border-merenda-500 shadow-sm'
                    : 'bg-white/70 border-slate-200 text-slate-700 hover:border-merenda-300'
                }`}
              >
                {cat === 'TODAS' ? 'Todas' : cat}
              </button>
            ))}
          </div>

          {produtosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>Nenhum produto encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {produtosFiltrados.map((p) => (
                <ProdutoCard key={p.id} produto={p} onAdd={adicionar} count={countDe(p.id)} />
              ))}
            </div>
          )}
        </div>

        <aside className="card sticky top-24 self-start space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-merenda-50 text-merenda-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                <div className="font-display font-bold text-slate-900">Carrinho</div>
                <div className="text-xs text-slate-500">{totalItens} {totalItens === 1 ? 'item' : 'itens'}</div>
              </div>
            </div>
          </div>

          {carrinho.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Toque nos produtos para adicionar
            </div>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-auto custom-scrollbar -mx-1 px-1">
              {carrinho.map((i) => (
                <li key={i.produtoId} className="bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 truncate">{i.nome}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{brl(i.preco)} × {i.quantidade}</div>
                    </div>
                    <button onClick={() => remover(i.produtoId)} className="text-slate-400 hover:text-red-500 transition shrink-0" title="Remover">×</button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => alterarQtd(i.produtoId, -1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:border-merenda-400">−</button>
                      <span className="w-7 text-center font-semibold text-slate-800">{i.quantidade}</span>
                      <button onClick={() => alterarQtd(i.produtoId, +1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:border-merenda-400">+</button>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{brl(i.preco * i.quantidade)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm uppercase tracking-wider opacity-80">Total</span>
              <span className="text-3xl font-display font-extrabold tracking-tight">{brl(total)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">Token do aluno</label>
            {scannerAberto ? (
              <div className="space-y-2">
                <QrScanner onScan={(text) => { setScannerAberto(false); setToken(text); cobrar(text); }} />
                <button onClick={() => setScannerAberto(false)} className="btn-secondary w-full text-sm">Cancelar leitura</button>
              </div>
            ) : (
              <>
                <input className="input font-mono text-sm" placeholder="Cole o código aqui ou use a câmera"
                       value={token} onChange={(e) => setToken(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setScannerAberto(true)} className="btn-secondary text-sm">
                    📷 Escanear QR
                  </button>
                  <button onClick={lerNfc} disabled={!podeNfc || lendoNfc}
                          className="btn-secondary text-sm disabled:opacity-50"
                          title={podeNfc ? 'Aproxime o cartão NFC' : 'NFC indisponível (use Android + Chrome)'}>
                    {lendoNfc ? 'Aguardando…' : '📶 Ler NFC'}
                  </button>
                </div>
                {!podeNfc && (
                  <p className="text-[10px] text-slate-400">NFC só funciona em Android + Chrome com HTTPS.</p>
                )}
              </>
            )}
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{err}</div>
          )}
          {sucesso && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm">
              <b>✓ Cobrança aprovada</b><br />
              {brl(sucesso.totalCobrado)} de <b>{sucesso.estudanteNome}</b><br />
              Saldo restante: <b>{brl(sucesso.saldoApos)}</b>
            </div>
          )}

          <button
            className="btn-primary w-full text-base py-3.5"
            onClick={() => cobrar()}
            disabled={carrinho.length === 0 || !token || cobrando}
          >
            {cobrando ? 'Processando...' : `Cobrar ${brl(total)}`}
          </button>
        </aside>
      </div>
    </div>
  );
}
