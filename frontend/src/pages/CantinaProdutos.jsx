import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Field from '../components/Field.jsx';
import { brl, extractError } from '../utils/format.js';
import * as V from '../utils/validation.js';

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

export default function CantinaProdutos() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState(null);
  const [filtro, setFiltro] = useState('');

  const load = async () => {
    try {
      const [p, c] = await Promise.all([
        api.get(`/produtos/cantina/${user.cantinaId}?somenteDisponiveis=false`),
        api.get('/categorias'),
      ]);
      setProdutos(p.data);
      setCategorias(c.data);
    } catch (e) {
      setErr(extractError(e));
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (p) => {
    setEditando(p.id);
    setForm({
      nome: p.nome,
      descricao: p.descricao || '',
      preco: p.preco,
      estoque: p.estoque ?? 0,
      categoriaId: p.categoriaId || '',
      imagemUrl: p.imagemUrl || '',
      disponivel: p.disponivel,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelar = () => {
    setEditando(null);
    setForm(emptyForm());
    setErrors({});
  };

  const validate = () => V.validateForm({
    nome: [
      () => V.required(form.nome, 'Nome'),
      () => V.minLength(form.nome, 2, 'Nome'),
      () => V.maxLength(form.nome, 120, 'Nome'),
    ],
    preco: [
      () => V.required(form.preco, 'Preço'),
      () => V.number(form.preco, 'Preço'),
      () => V.min(form.preco, 0.01, 'Preço'),
      () => V.max(form.preco, 10000, 'Preço'),
    ],
    estoque: [
      () => V.number(form.estoque, 'Estoque'),
      () => V.min(form.estoque, 0, 'Estoque'),
      () => V.max(form.estoque, 100000, 'Estoque'),
    ],
    descricao: [() => V.maxLength(form.descricao, 500, 'Descrição')],
  });

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      const payload = {
        ...form,
        preco: Number(form.preco),
        estoque: Number(form.estoque || 0),
        categoriaId: form.categoriaId === '' ? null : Number(form.categoriaId),
      };
      if (editando) await api.put(`/produtos/${editando}`, payload);
      else await api.post('/produtos', payload);
      cancelar();
      await load();
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const remover = async (id) => {
    if (!confirm('Remover este produto?')) return;
    await api.delete(`/produtos/${id}`);
    await load();
  };

  const change = (k) => (v) => {
    setForm((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors({ ...errors, [k]: null });
  };

  const produtosFiltrados = produtos.filter((p) =>
    !filtro || p.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Cardápio da cantina</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Cadastre e gerencie os produtos vendidos no PDV</p>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {err}
        </div>
      )}

      <form onSubmit={submit} noValidate className="card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="feature-icon">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {editando
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
              </svg>
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-slate-900">{editando ? 'Editar produto' : 'Novo produto'}</h2>
              <p className="text-xs text-slate-500">{editando ? 'Atualize os dados e salve' : 'Adicione um item ao seu cardápio'}</p>
            </div>
          </div>
          {editando && (
            <button type="button" className="btn-secondary text-sm" onClick={cancelar}>Cancelar edição</button>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Field label="Nome do produto" error={errors.nome}>
              <input className="input" placeholder="Ex: Coxinha de frango" value={form.nome}
                     onChange={(e) => change('nome')(e.target.value)} />
            </Field>
          </div>
          <Field label="Preço" error={errors.preco}>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">R$</span>
              <input className="input pl-12" type="number" step="0.01" min="0.01" placeholder="0,00" value={form.preco}
                     onChange={(e) => change('preco')(e.target.value)} />
            </div>
          </Field>
          <div className="md:col-span-2">
            <Field label="Descrição (opcional)" error={errors.descricao}>
              <input className="input" placeholder="Ex: massa crocante, recheio de catupiry" value={form.descricao}
                     onChange={(e) => change('descricao')(e.target.value)} />
            </Field>
          </div>
          <Field label="Estoque" error={errors.estoque}>
            <input className="input" type="number" min="0" placeholder="0" value={form.estoque}
                   onChange={(e) => change('estoque')(e.target.value)} />
          </Field>
          <Field label="Categoria">
            <select className="input" value={form.categoriaId} onChange={(e) => change('categoriaId')(e.target.value)}>
              <option value="">— Nenhuma —</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <div className="md:col-span-2 flex items-center mt-7">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <span className="relative">
                <input type="checkbox" className="sr-only peer" checked={form.disponivel}
                       onChange={(e) => setForm({ ...form, disponivel: e.target.checked })} />
                <span className="block w-11 h-6 bg-slate-200 rounded-full peer-checked:bg-merenda-500 transition-colors"></span>
                <span className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform peer-checked:translate-x-5"></span>
              </span>
              <span className="text-sm font-medium text-slate-700">Disponível para venda no PDV</span>
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button className="btn-primary">{editando ? 'Salvar alterações' : 'Adicionar produto'}</button>
        </div>
      </form>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900">Cardápio cadastrado</h2>
            <p className="text-xs text-slate-500 mt-0.5">{produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'} no total</p>
          </div>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="input pl-10 max-w-xs" placeholder="Buscar produto..." value={filtro}
                   onChange={(e) => setFiltro(e.target.value)} />
          </div>
        </div>

        {produtosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
            </div>
            <p className="text-sm">{filtro ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.'}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtosFiltrados.map((p) => (
              <div key={p.id} className="bg-white/80 backdrop-blur border border-slate-200 rounded-2xl p-4 hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-full h-2 rounded-full bg-gradient-to-r ${categoriaCor(p.categoriaNome)} mb-3 opacity-80`}></div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-800 leading-tight line-clamp-2">{p.nome}</h3>
                    {p.categoriaNome && (
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{p.categoriaNome}</div>
                    )}
                  </div>
                  {p.disponivel
                    ? <span className="badge bg-green-50 text-green-700 border border-green-100">Ativo</span>
                    : <span className="badge bg-slate-100 text-slate-600 border border-slate-200">Pausado</span>}
                </div>
                {p.descricao && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{p.descricao}</p>}
                <div className="flex items-end justify-between mt-3">
                  <span className="font-display font-bold text-2xl text-merenda-600">{brl(p.preco)}</span>
                  <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md">Estoque: <b className="text-slate-700">{p.estoque}</b></span>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button onClick={() => startEdit(p)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-merenda-700 bg-merenda-50 hover:bg-merenda-100 rounded-lg py-2 transition">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Editar
                  </button>
                  <button onClick={() => remover(p.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg py-2 transition">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" /></svg>
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function emptyForm() {
  return { nome: '', descricao: '', preco: '', estoque: 0, categoriaId: '', imagemUrl: '', disponivel: true };
}
