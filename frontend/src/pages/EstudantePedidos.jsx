import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import { brl, extractError, formatDateTime } from '../utils/format.js';

const statusCor = {
  AGENDADO: 'bg-amber-100 text-amber-800',
  PREPARANDO: 'bg-blue-100 text-blue-800',
  PRONTO: 'bg-green-100 text-green-800',
  ENTREGUE: 'bg-slate-100 text-slate-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

export default function EstudantePedidos() {
  const [cantinas, setCantinas] = useState([]);
  const [cantinaId, setCantinaId] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [retirada, setRetirada] = useState('');
  const [meus, setMeus] = useState([]);
  const [err, setErr] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const load = async () => {
    try {
      const [c, m] = await Promise.all([
        api.get('/cantinas'),
        api.get('/pedidos/meus'),
      ]);
      setCantinas(c.data);
      setMeus(m.data);
      if (!cantinaId && c.data.length > 0) setCantinaId(c.data[0].id);
    } catch (e) { setErr(extractError(e)); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!cantinaId) return;
    api.get(`/produtos/cantina/${cantinaId}`).then(({ data }) => setProdutos(data));
  }, [cantinaId]);

  const adicionar = (p) => {
    setCarrinho((c) => {
      const ex = c.find((i) => i.produtoId === p.id);
      if (ex) return c.map((i) => i.produtoId === p.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...c, { produtoId: p.id, nome: p.nome, preco: Number(p.preco), quantidade: 1 }];
    });
  };

  const alterar = (id, delta) => setCarrinho((c) => c
      .map((i) => i.produtoId === id ? { ...i, quantidade: Math.max(0, i.quantidade + delta) } : i)
      .filter((i) => i.quantidade > 0));

  const total = useMemo(() => carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0), [carrinho]);

  const enviar = async () => {
    if (carrinho.length === 0) { setErr('Adicione itens'); return; }
    setEnviando(true);
    setErr(null);
    try {
      const body = {
        cantinaId: Number(cantinaId),
        itens: carrinho.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
        retiradaPrevista: retirada || null,
      };
      await api.post('/pedidos', body);
      setCarrinho([]); setRetirada('');
      setAviso('Pedido criado! Acompanhe a fila da cantina abaixo.');
      await load();
    } catch (e) {
      setErr(extractError(e));
    } finally { setEnviando(false); }
  };

  const cancelar = async (id) => {
    try {
      await api.post(`/pedidos/${id}/cancelar`);
      await load();
    } catch (e) { setErr(extractError(e)); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Pedidos antecipados</h1>
          <p className="text-sm text-slate-500 mt-1">Peça antes e fure a fila do recreio · seu saldo é reservado quando você confirma</p>
        </div>
        <Link to="/estudante" className="btn-secondary text-sm">← Voltar à carteira</Link>
      </header>

      {aviso && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm">{aviso}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{err}</div>}

      <div className="card space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Cantina</label>
            <select className="input" value={cantinaId} onChange={(e) => setCantinaId(e.target.value)}>
              {cantinas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Hora desejada de retirada (opcional)</label>
            <input className="input" type="datetime-local" value={retirada}
                   onChange={(e) => setRetirada(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {produtos.map((p) => (
            <button key={p.id} onClick={() => adicionar(p)}
                    className="text-left bg-white border border-slate-200 hover:border-merenda-400 rounded-xl p-3 transition">
              <div className="font-semibold text-slate-800 line-clamp-2">{p.nome}</div>
              <div className="text-xs text-slate-500">{p.categoriaNome || '—'}</div>
              <div className="text-merenda-600 font-bold text-lg mt-1">{brl(p.preco)}</div>
              {p.alergenos && <div className="text-[10px] text-red-600 mt-1">⚠ contém {p.alergenos}</div>}
            </button>
          ))}
        </div>

        {carrinho.length > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <h3 className="font-semibold text-slate-800">Seu pedido</h3>
            {carrinho.map((i) => (
              <div key={i.produtoId} className="flex justify-between items-center bg-slate-50 rounded-lg p-2">
                <div className="text-sm">{i.nome}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => alterar(i.produtoId, -1)} className="w-7 h-7 rounded-md border">−</button>
                  <span className="w-6 text-center">{i.quantidade}</span>
                  <button onClick={() => alterar(i.produtoId, +1)} className="w-7 h-7 rounded-md border">+</button>
                  <span className="w-20 text-right font-semibold">{brl(i.preco * i.quantidade)}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-slate-500 uppercase tracking-wide">Total</span>
              <span className="text-2xl font-display font-bold">{brl(total)}</span>
            </div>
            <button onClick={enviar} disabled={enviando} className="btn-primary w-full">
              {enviando ? 'Enviando…' : 'Confirmar pedido (debita saldo)'}
            </button>
          </div>
        )}
      </div>

      <section className="card">
        <h2 className="font-display font-bold text-xl text-slate-900 mb-4">Meus pedidos</h2>
        {meus.length === 0 ? (
          <p className="text-sm text-slate-500">Você ainda não fez pedidos.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {meus.map((p) => (
              <li key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-lg font-bold tracking-widest text-slate-900">{p.codigoRetirada}</div>
                  <div className="text-xs text-slate-500">{p.cantina?.nome} · {formatDateTime(p.criadoEm)}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {p.itens?.map((i) => `${i.quantidade}× ${i.nomeProduto}`).join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusCor[p.status]}`}>{p.status}</span>
                  <span className="font-display font-bold text-slate-900">{brl(p.total)}</span>
                  {p.status === 'AGENDADO' && (
                    <button onClick={() => cancelar(p.id)}
                            className="text-xs text-red-600 hover:underline">Cancelar</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
