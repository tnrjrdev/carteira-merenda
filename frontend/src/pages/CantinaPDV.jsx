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

  useEffect(() => {
    api.get(`/produtos/cantina/${user.cantinaId}`).then(({ data }) => setProdutos(data));
  }, [user.cantinaId]);

  const total = useMemo(() =>
    carrinho.reduce((acc, it) => acc + it.quantidade * it.preco, 0),
    [carrinho]);

  const adicionar = (produto) => {
    setSucesso(null);
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
    try {
      const { data } = await api.post('/pagamentos/cobrar', {
        token: token.trim(),
        itens: carrinho.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
      });
      setSucesso(`✅ Cobrança de ${brl(data.totalCobrado)} de ${data.estudanteNome} aprovada! Saldo restante: ${brl(data.saldoApos)}`);
      setCarrinho([]);
      setToken('');
    } catch (e) {
      setErr(extractError(e));
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">PDV — Cantina</h1>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold mb-3">Produtos disponíveis</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {produtos.map((p) => (
              <button key={p.id} onClick={() => adicionar(p)}
                      className="border border-slate-200 rounded-lg p-3 text-left hover:border-merenda-400 hover:bg-merenda-50/30 transition">
                <div className="font-medium text-slate-800 text-sm">{p.nome}</div>
                {p.categoriaNome && <div className="text-xs text-slate-500">{p.categoriaNome}</div>}
                <div className="text-merenda-600 font-bold mt-1">{brl(p.preco)}</div>
                <div className="text-xs text-slate-400 mt-1">Estoque: {p.estoque}</div>
              </button>
            ))}
            {produtos.length === 0 && <p className="text-sm text-slate-500 col-span-3">Cadastre produtos primeiro.</p>}
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Carrinho</h2>
          {carrinho.length === 0 && <p className="text-sm text-slate-500">Selecione produtos.</p>}
          <ul className="space-y-2 max-h-72 overflow-auto">
            {carrinho.map((i) => (
              <li key={i.produtoId} className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">{i.nome}</div>
                  <div className="text-xs text-slate-500">{brl(i.preco)} × {i.quantidade} = {brl(i.preco * i.quantidade)}</div>
                </div>
                <button onClick={() => alterarQtd(i.produtoId, -1)} className="w-7 h-7 rounded bg-slate-100">-</button>
                <span className="w-6 text-center">{i.quantidade}</span>
                <button onClick={() => alterarQtd(i.produtoId, +1)} className="w-7 h-7 rounded bg-slate-100">+</button>
                <button onClick={() => remover(i.produtoId)} className="text-red-500 text-xs ml-1">x</button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t pt-3">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold text-merenda-600">{brl(total)}</span>
          </div>

          <div>
            <label className="label">Token do aluno (QR Code)</label>
            <input className="input font-mono" placeholder="Cole o código do QR aqui"
                   value={token} onChange={(e) => setToken(e.target.value)} />
            <p className="text-xs text-slate-500 mt-1">Em produção, ler via câmera. Aqui, peça ao aluno para mostrar o código sob o QR.</p>
          </div>

          {err && <div className="bg-red-50 text-red-700 p-2 rounded text-sm">{err}</div>}
          {sucesso && <div className="bg-green-50 text-green-700 p-2 rounded text-sm">{sucesso}</div>}

          <button className="btn-primary w-full" onClick={cobrar} disabled={carrinho.length === 0 || !token}>
            Confirmar e cobrar
          </button>
        </div>
      </div>
    </div>
  );
}
