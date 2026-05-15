import { useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { brl, extractError } from '../utils/format.js';

export default function CantinaPDV() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [token, setToken] = useState('');
  const [err, setErr] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    api.get(`/produtos/cantina/${user.cantinaId}`).then(({ data }) => setProdutos(data));
  }, [user.cantinaId]);

  const total = useMemo(() =>
    carrinho.reduce((acc, it) => acc + it.quantidade * it.preco, 0),
    [carrinho]);

  const adicionar = (produto) => {
    setSucesso(null);
    setErr(null);
    setCarrinho((c) => {
      const ex = c.find((i) => i.produtoId === produto.id);
      if (ex) {
        return c.map((i) => i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      }
      return [...c, { produtoId: produto.id, nome: produto.nome, preco: Number(produto.preco), quantidade: 1 }];
    });
  };

  const alterarQtd = (id, delta) => {
    setCarrinho((c) => c
      .map((i) => i.produtoId === id ? { ...i, quantidade: Math.max(0, i.quantidade + delta) } : i)
      .filter((i) => i.quantidade > 0));
  };

  const remover = (id) => {
    setCarrinho((c) => c.filter((i) => i.produtoId !== id));
  };

  const cobrar = async () => {
    setErr(null);
    setSucesso(null);
    const t = token.trim();
    if (!t) { setErr('Informe o token do aluno (cole ou leia o QR Code)'); return; }
    if (t.length < 8 || t.length > 64) { setErr('Token inválido'); return; }
    if (carrinho.length === 0) { setErr('Adicione produtos ao carrinho'); return; }
    if (carrinho.length > 50) { setErr('Máximo de 50 itens diferentes por compra'); return; }
    if (carrinho.some((i) => i.quantidade > 99)) { setErr('Quantidade máxima por item é 99'); return; }
    
    setCarregando(true);
    try {
      const { data } = await api.post('/pagamentos/cobrar', {
        token: token.trim(),
        itens: carrinho.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
      });
      setSucesso(`Pagamento de ${brl(data.totalCobrado)} aprovado! Aluno: ${data.estudanteNome}.`);
      setCarrinho([]);
      setToken('');
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white/60 shadow-sm">
        <div className="w-12 h-12 bg-merenda-100 text-merenda-600 rounded-xl flex items-center justify-center shadow-inner">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 leading-tight">Ponto de Venda</h1>
          <p className="text-sm text-slate-500 font-medium">Selecione os itens e escaneie o código do aluno</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 card bg-white/70">
          <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-display font-bold text-slate-800">Produtos disponíveis</h2>
            <span className="badge bg-slate-100 text-slate-600 border border-slate-200">{produtos.length} itens</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar pb-4">
            {produtos.map((p) => (
              <button key={p.id} onClick={() => adicionar(p)}
                      className="group flex flex-col items-center text-center border-2 border-slate-100/80 rounded-2xl p-4 bg-white hover:border-merenda-400 hover:shadow-glow transition-all duration-300 active:scale-95">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-2xl mb-3 shadow-sm group-hover:bg-merenda-50 transition-colors">
                  {p.categoriaNome?.toLowerCase().includes('bebida') ? '🥤' : 
                   p.categoriaNome?.toLowerCase().includes('salgado') ? '🥐' : 
                   p.categoriaNome?.toLowerCase().includes('doce') ? '🍫' : '🍔'}
                </div>
                <div className="font-semibold text-slate-800 text-sm leading-tight mb-1 line-clamp-2 h-10 flex items-center justify-center w-full">{p.nome}</div>
                <div className="text-merenda-600 font-display font-bold text-lg mb-2">{brl(p.preco)}</div>
                <div className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${p.estoque > 5 ? 'bg-green-50 text-green-600' : p.estoque > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}`}>
                  Estoque: {p.estoque}
                </div>
              </button>
            ))}
            {produtos.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 flex flex-col items-center">
                <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                <p>Nenhum produto cadastrado no momento.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 sticky top-6">
          <div className="glass-panel overflow-hidden border-t-4 border-t-merenda-500 p-0 flex flex-col shadow-xl">
            <div className="p-5 border-b border-slate-100 bg-white/50">
              <h2 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-merenda-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                Carrinho
              </h2>
            </div>
            
            <div className="p-3 bg-white/40 flex-1 min-h-[250px] max-h-[40vh] overflow-y-auto custom-scrollbar">
              {carrinho.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <svg className="w-16 h-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <p className="text-sm font-medium">O carrinho está vazio</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {carrinho.map((i) => (
                    <li key={i.produtoId} className="flex flex-col bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-slate-800 leading-tight pr-2">{i.nome}</span>
                        <button onClick={() => remover(i.produtoId)} className="text-slate-400 hover:text-red-500 transition-colors p-1 -mr-1 -mt-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200">
                          <button onClick={() => alterarQtd(i.produtoId, -1)} className="w-7 h-7 rounded-md bg-white shadow-sm text-slate-600 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg></button>
                          <span className="w-6 text-center font-bold text-sm text-slate-800">{i.quantidade}</span>
                          <button onClick={() => alterarQtd(i.produtoId, +1)} className="w-7 h-7 rounded-md bg-white shadow-sm text-slate-600 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                        </div>
                        <div className="font-bold text-slate-800">{brl(i.preco * i.quantidade)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-slate-800 text-white p-5">
              <div className="flex items-end justify-between mb-4">
                <span className="text-slate-300 text-sm font-medium uppercase tracking-wider">Total a Cobrar</span>
                <span className="text-3xl font-display font-bold text-merenda-400 leading-none">{brl(total)}</span>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                  </div>
                  <input 
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-merenda-500 focus:border-merenda-500 outline-none transition-all placeholder-slate-500 font-mono text-sm shadow-inner" 
                    placeholder="Código do Aluno"
                    value={token} 
                    onChange={(e) => setToken(e.target.value)} 
                  />
                </div>

                {err && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl text-sm font-medium flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{err}</span>
                  </div>
                )}
                
                {sucesso && (
                  <div className="bg-green-500/20 border border-green-500/50 text-green-200 p-3 rounded-xl text-sm font-medium flex items-start gap-2 animate-fade-in">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{sucesso}</span>
                  </div>
                )}

                <button 
                  className="w-full bg-gradient-to-r from-merenda-500 to-merenda-600 hover:from-merenda-400 hover:to-merenda-500 text-white font-bold py-4 rounded-xl shadow-glow transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                  onClick={cobrar} 
                  disabled={carrinho.length === 0 || !token || carregando}
                >
                  {carregando ? (
                    <><svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processando...</>
                  ) : (
                    <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Confirmar Venda</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
