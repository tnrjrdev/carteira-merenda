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
    if (!confirm('Remover este produto?')) return;
    await api.delete(`/produtos/${id}`);
    await load();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Produtos da cantina</h1>
      {err && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{err}</div>}

      <form onSubmit={submit} noValidate className="card space-y-3">
        <h2 className="font-semibold">{editando ? 'Editar produto' : 'Novo produto'}</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Field label="Nome" error={errors.nome}>
              <input className="input" value={form.nome} onChange={(e) => change('nome')(e.target.value)} />
            </Field>
          </div>
          <Field label="Preço (R$)" error={errors.preco}>
            <input className="input" type="number" step="0.01" min="0.01" value={form.preco}
                   onChange={(e) => change('preco')(e.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Descrição" error={errors.descricao}>
              <input className="input" value={form.descricao} onChange={(e) => change('descricao')(e.target.value)} />
            </Field>
          </div>
          <Field label="Estoque" error={errors.estoque}>
            <input className="input" type="number" min="0" value={form.estoque}
                   onChange={(e) => change('estoque')(e.target.value)} />
          </Field>
          <Field label="Categoria">
            <select className="input" value={form.categoriaId}
                    onChange={(e) => change('categoriaId')(e.target.value)}>
              <option value="">— Nenhuma —</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <div className="flex items-center mt-6 gap-2">
            <input type="checkbox" id="disp" checked={form.disponivel}
                   onChange={(e) => setForm({ ...form, disponivel: e.target.checked })} />
            <label htmlFor="disp">Disponível para venda</label>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary">{editando ? 'Salvar alterações' : 'Adicionar produto'}</button>
          {editando && <button type="button" className="btn-secondary" onClick={cancelar}>Cancelar</button>}
        </div>
      </form>

      <div className="card">
        <h2 className="font-semibold mb-3">Cardápio cadastrado</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-left text-xs uppercase">
              <tr>
                <th className="py-2">Produto</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {produtos.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 font-medium">{p.nome}</td>
                  <td>{p.categoriaNome || '-'}</td>
                  <td>{brl(p.preco)}</td>
                  <td>{p.estoque}</td>
                  <td>
                    {p.disponivel
                      ? <span className="badge bg-green-50 text-green-700">Disponível</span>
                      : <span className="badge bg-slate-100 text-slate-600">Pausado</span>}
                  </td>
                  <td className="text-right">
                    <button onClick={() => startEdit(p)} className="text-merenda-600 text-xs mr-3">Editar</button>
                    <button onClick={() => remover(p.id)} className="text-red-600 text-xs">Remover</button>
                  </td>
                </tr>
              ))}
              {produtos.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-500">Nenhum produto cadastrado.</td></tr>
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
