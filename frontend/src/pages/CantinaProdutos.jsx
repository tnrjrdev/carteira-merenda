import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Field from '../components/Field.jsx';
import { brl, extractError } from '../utils/format.js';
import * as V from '../utils/validation.js';

export default function CantinaProdutos() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState(null);
  const [showForm, setShowForm] = useState(false);

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
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelar = () => {
    setEditando(null);
    setForm(emptyForm());
    setErrors({});
    setShowForm(false);
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
      if (editando) {
        await api.put(`/produtos/${editando}`, payload);
      } else {
        await api.post('/produtos', payload);
      }
      cancelar();
      await load();
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const change = (k) => (v) => {
    setForm((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors({ ...errors, [k]: null });
  };

  const remover = async (id) => {
    if (!confirm('Remover este produto permanentemente? Esta ação não pode ser desfeita.')) return;
    await api.delete(`/produtos/${id}`);
    await load();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-merenda-500/10 text-merenda-600 rounded-xl flex items-center justify-center shadow-inner">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-800 leading-tight">Produtos</h1>
            <p className="text-sm text-slate-500 font-medium">Gerencie o cardápio e estoque da sua cantina</p>
          </div>
        </div>
        <button 
          className={`btn-primary shadow-glow transition-all whitespace-nowrap ${showForm ? 'bg-gradient-to-r from-slate-500 to-slate-600' : ''}`}
          onClick={() => showForm && !editando ? cancelar() : setShowForm(!showForm)}
        >
          {showForm && !editando ? (
            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Cancelar</>
          ) : (
            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Novo Produto</>
          )}
        </button>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm animate-slide-up">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {err}
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} noValidate className="card space-y-4 animate-slide-up border-merenda-200/50 bg-merenda-50/10">
          <h2 className="text-xl font-display font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            {editando ? (
              <><svg className="w-5 h-5 text-merenda-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Editar produto</>
            ) : (
              <><svg className="w-5 h-5 text-merenda-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Novo produto</>
            )}
          </h2>
          <div className="grid md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
              <Field label="Nome do Produto" error={errors.nome}>
                <input className="input" placeholder="Ex: Sanduíche Natural" value={form.nome} onChange={(e) => change('nome')(e.target.value)} />
              </Field>
            </div>
            <div className="md:col-span-4">
              <Field label="Preço (R$)" error={errors.preco}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-medium">R$</span>
                  </div>
                  <input className="input pl-10" type="number" step="0.01" min="0.01" placeholder="0.00" value={form.preco} onChange={(e) => change('preco')(e.target.value)} />
                </div>
              </Field>
            </div>
            <div className="md:col-span-12">
              <Field label="Descrição (Opcional)" error={errors.descricao}>
                <input className="input" placeholder="Detalhes ou ingredientes..." value={form.descricao} onChange={(e) => change('descricao')(e.target.value)} />
              </Field>
            </div>
            <div className="md:col-span-4">
              <Field label="Estoque Atual" error={errors.estoque}>
                <input className="input font-mono" type="number" min="0" value={form.estoque} onChange={(e) => change('estoque')(e.target.value)} />
              </Field>
            </div>
            <div className="md:col-span-8">
              <Field label="Categoria">
                <select className="input bg-white" value={form.categoriaId} onChange={(e) => change('categoriaId')(e.target.value)}>
                  <option value="">— Sem categoria —</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mt-2">
            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
              <input type="checkbox" name="toggle" id="disp" checked={form.disponivel} onChange={(e) => setForm({ ...form, disponivel: e.target.checked })} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-slate-200 appearance-none cursor-pointer transition-transform duration-200 ease-in-out" style={{ transform: form.disponivel ? 'translateX(100%)' : 'translateX(0)', borderColor: form.disponivel ? '#f97316' : '#e2e8f0' }}/>
              <label htmlFor="disp" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${form.disponivel ? 'bg-merenda-500' : 'bg-slate-200'}`}></label>
            </div>
            <div>
              <label htmlFor="disp" className="font-semibold text-slate-800 cursor-pointer block">Disponível para venda</label>
              <p className="text-xs text-slate-500">Se desativado, o produto não aparecerá no PDV.</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            {editando && <button type="button" className="btn-secondary" onClick={cancelar}>Cancelar</button>}
            <button className="btn-primary px-8">{editando ? 'Salvar alterações' : 'Adicionar produto'}</button>
          </div>
        </form>
      )}

      <div className="card p-0 overflow-hidden shadow-sm border-slate-200">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-merenda-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            Cardápio Cadastrado
          </h2>
          <span className="badge bg-white text-slate-600 border border-slate-200 shadow-sm">{produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-slate-500 text-xs uppercase tracking-wider bg-white">
              <tr>
                <th className="px-6 py-4 font-semibold">Produto</th>
                <th className="px-6 py-4 font-semibold">Categoria</th>
                <th className="px-6 py-4 font-semibold">Preço</th>
                <th className="px-6 py-4 font-semibold text-center">Estoque</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {produtos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{p.nome}</div>
                    {p.descricao && <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{p.descricao}</div>}
                  </td>
                  <td className="px-6 py-4">
                    {p.categoriaNome ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        {p.categoriaNome}
                      </span>
                    ) : <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-merenda-600">{brl(p.preco)}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-mono font-medium ${p.estoque <= 5 ? 'text-red-500' : 'text-slate-700'}`}>
                      {p.estoque}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {p.disponivel
                      ? <span className="badge bg-green-50 text-green-600 border border-green-100">Ativo</span>
                      : <span className="badge bg-slate-100 text-slate-500 border border-slate-200">Pausado</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => remover(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remover">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {produtos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                      Nenhum produto cadastrado no momento.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function emptyForm() {
  return { nome: '', descricao: '', preco: '', estoque: 0, categoriaId: '', imagemUrl: '', disponivel: true };
}
