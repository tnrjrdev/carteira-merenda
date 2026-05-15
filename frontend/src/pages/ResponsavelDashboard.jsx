import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import Field from '../components/Field.jsx';
import { brl, extractError } from '../utils/format.js';
import * as V from '../utils/validation.js';

export default function ResponsavelDashboard() {
  const [dependentes, setDependentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [novo, setNovo] = useState({ nome: '', email: '', senha: '' });
  const [errors, setErrors] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/dependentes');
      setDependentes(data);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const validate = () => V.validateForm({
    nome: [
      () => V.required(novo.nome, 'Nome'),
      () => V.minLength(novo.nome, 3, 'Nome'),
      () => V.maxLength(novo.nome, 120, 'Nome'),
    ],
    email: [
      () => V.required(novo.email, 'Email'),
      () => V.email(novo.email),
    ],
    senha: [
      () => V.required(novo.senha, 'Senha'),
      () => V.senhaForte(novo.senha),
    ],
  });

  const criar = async (e) => {
    e.preventDefault();
    setErr(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await api.post('/dependentes', novo);
      setShowForm(false);
      setNovo({ nome: '', email: '', senha: '' });
      setErrors({});
      await load();
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const change = (k) => (e) => {
    setNovo((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors({ ...errors, [k]: null });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-glass">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-800">Meus dependentes</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Acompanhe e gerencie a carteira dos seus filhos</p>
        </div>
        <button className={`btn-primary whitespace-nowrap shadow-md ${showForm ? 'bg-gradient-to-r from-slate-500 to-slate-600' : ''}`} onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Cancelar</>
          ) : (
            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Novo dependente</>
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
        <form onSubmit={criar} noValidate className="card space-y-4 animate-slide-up border-merenda-200/50 bg-merenda-50/10">
          <h2 className="text-xl font-display font-bold text-slate-800 border-b border-slate-100 pb-3">Cadastrar novo estudante</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Nome completo" error={errors.nome}>
              <input className="input" placeholder="João da Silva" value={novo.nome} onChange={change('nome')} />
            </Field>
            <Field label="Email de acesso" error={errors.email}>
              <input className="input" type="email" placeholder="joao@email.com" value={novo.email} onChange={change('email')} />
            </Field>
            <Field label="Senha provisória" error={errors.senha} hint="Mínimo 6 caracteres">
              <input className="input" type="password" placeholder="••••••••" value={novo.senha} onChange={change('senha')} />
            </Field>
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
            <button className="btn-primary px-8">Cadastrar Estudante</button>
          </div>
        </form>
      )}

      {loading && (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="animate-spin h-8 w-8 border-4 border-merenda-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {!loading && dependentes.length === 0 && !showForm && (
        <div className="card text-center py-16 px-4 animate-fade-in">
          <div className="w-20 h-20 bg-merenda-100 text-merenda-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-display font-bold text-slate-800 mb-2">Nenhum dependente cadastrado</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-6">Cadastre seus filhos para começar a gerenciar os gastos da merenda escolar de forma segura.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>Adicionar primeiro dependente</button>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dependentes.map((d) => (
          <Link key={d.id} to={`/responsavel/dependente/${d.id}`} className="card p-0 overflow-hidden hover:shadow-glass-hover transition-all duration-300 group hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-merenda-400 to-merenda-600 text-white flex items-center justify-center text-xl font-bold font-display shadow-sm">
                    {d.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-lg font-display leading-tight">{d.nome}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[150px]">{d.email}</div>
                  </div>
                </div>
                <span className="badge bg-merenda-50 text-merenda-700 border border-merenda-100 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                  Estudante
                </span>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100 group-hover:bg-merenda-50/30 transition-colors">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Saldo em Carteira</span>
                <span className="text-3xl font-display font-bold text-slate-800 tracking-tight">{brl(d.saldo)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-500 font-medium mb-0.5">Gasto hoje</div>
                  <div className="font-semibold text-slate-700">{brl(d.gastoHoje)}</div>
                  {d.limiteDiario && (
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div className={`h-full rounded-full ${d.gastoHoje >= d.limiteDiario ? 'bg-red-400' : 'bg-merenda-400'}`} style={{ width: `${Math.min(100, (d.gastoHoje / d.limiteDiario) * 100)}%` }}></div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-slate-500 font-medium mb-0.5">Gasto semana</div>
                  <div className="font-semibold text-slate-700">{brl(d.gastoSemana)}</div>
                  {d.limiteSemanal && (
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div className={`h-full rounded-full ${d.gastoSemana >= d.limiteSemanal ? 'bg-red-400' : 'bg-merenda-400'}`} style={{ width: `${Math.min(100, (d.gastoSemana / d.limiteSemanal) * 100)}%` }}></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between text-sm font-medium text-merenda-600 group-hover:bg-merenda-50 transition-colors">
              Gerenciar carteira
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
