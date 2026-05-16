import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import Field from '../components/Field.jsx';
import { brl, extractError } from '../utils/format.js';
import * as V from '../utils/validation.js';

// --- Sub-components para modularização ---

const SkeletonGrid = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="card p-6 h-64 animate-pulse bg-slate-50 border border-slate-100 flex flex-col">
        <div className="flex gap-4 items-center mb-6">
          <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="h-16 bg-slate-200 rounded-xl w-full mb-4"></div>
        <div className="flex gap-3 mt-auto">
          <div className="h-10 bg-slate-200 rounded-lg w-1/2"></div>
          <div className="h-10 bg-slate-200 rounded-lg w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
);

const HeaderDashboard = ({ showForm, setShowForm }) => (
  <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-glass mb-6">
    <div>
      <h1 className="text-3xl font-display font-bold text-slate-800">Meus dependentes</h1>
      <p className="text-sm text-slate-500 mt-1 font-medium">Acompanhe e gerencie a carteira dos seus filhos</p>
    </div>
    <button 
      className={`btn-primary whitespace-nowrap shadow-md transition-all active:scale-95 ${showForm ? 'bg-gradient-to-r from-slate-500 to-slate-600 shadow-none' : ''}`} 
      onClick={() => setShowForm((v) => !v)}
      aria-expanded={showForm}
      aria-controls="form-novo-dependente"
    >
      {showForm ? (
        <><svg className="w-5 h-5 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Cancelar</>
      ) : (
        <><svg className="w-5 h-5 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Novo dependente</>
      )}
    </button>
  </header>
);

const EmptyState = ({ onAdd }) => (
  <div className="card text-center py-16 px-4 animate-fade-in border-dashed border-2 border-slate-200 bg-slate-50/50">
    <div className="w-20 h-20 bg-merenda-100 text-merenda-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    </div>
    <h3 className="text-xl font-display font-bold text-slate-800 mb-2">Nenhum dependente cadastrado</h3>
    <p className="text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">Cadastre seus filhos para começar a gerenciar os gastos da merenda escolar de forma segura e transparente.</p>
    <button className="btn-primary" onClick={onAdd}>Adicionar primeiro dependente</button>
  </div>
);

const DependenteCard = ({ d }) => {
  const percentDia = d.limiteDiario ? Math.min(100, (d.gastoHoje / d.limiteDiario) * 100) : 0;
  const percentSemana = d.limiteSemanal ? Math.min(100, (d.gastoSemana / d.limiteSemanal) * 100) : 0;

  return (
    <Link to={`/responsavel/dependente/${d.id}`} className="card p-0 overflow-hidden hover:shadow-glass-hover transition-all duration-300 group hover:-translate-y-1 flex flex-col focus:ring-2 focus:ring-merenda-500 focus:outline-none">
      <div className="p-6 flex-1 flex flex-col">
        <header className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-merenda-400 to-merenda-600 text-white flex items-center justify-center text-xl font-bold font-display shadow-sm" aria-hidden="true">
              {d.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg font-display leading-tight group-hover:text-merenda-600 transition-colors">{d.nome}</h2>
              <div className="text-xs text-slate-500 truncate max-w-[150px]">{d.email}</div>
            </div>
          </div>
          <span className="badge bg-merenda-50 text-merenda-700 border border-merenda-100 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
            Estudante
          </span>
        </header>
        
        <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100 group-hover:bg-merenda-50/50 transition-colors">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Saldo em Carteira</span>
          <span className="text-3xl font-display font-bold text-slate-800 tracking-tight">{brl(d.saldo)}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-xs mt-auto">
          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-slate-500 font-medium">Gasto hoje</span>
              <span className="font-bold text-slate-700">{brl(d.gastoHoje)}</span>
            </div>
            {d.limiteDiario && (
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow={percentDia} aria-valuemin="0" aria-valuemax="100">
                <div className={`h-full rounded-full transition-all duration-700 ${percentDia >= 100 ? 'bg-red-400' : percentDia > 75 ? 'bg-amber-400' : 'bg-merenda-400'}`} style={{ width: `${percentDia}%` }}></div>
              </div>
            )}
          </div>
          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-slate-500 font-medium">Na semana</span>
              <span className="font-bold text-slate-700">{brl(d.gastoSemana)}</span>
            </div>
            {d.limiteSemanal && (
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow={percentSemana} aria-valuemin="0" aria-valuemax="100">
                <div className={`h-full rounded-full transition-all duration-700 ${percentSemana >= 100 ? 'bg-red-400' : percentSemana > 75 ? 'bg-amber-400' : 'bg-merenda-400'}`} style={{ width: `${percentSemana}%` }}></div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between text-sm font-semibold text-merenda-600 group-hover:bg-merenda-100 transition-colors">
        Gerenciar carteira
        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
};

// --- Hook para gerenciar dados ---

function useDependentes() {
  const [dependentes, setDependentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/dependentes');
      setDependentes(data);
      setErr(null);
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { dependentes, loading, err, load, setErr };
}

// --- Componente Principal ---

export default function ResponsavelDashboard() {
  const { dependentes, loading, err, load, setErr } = useDependentes();
  const [showForm, setShowForm] = useState(false);
  
  const [novo, setNovo] = useState({ nome: '', email: '', senha: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    setIsSubmitting(true);
    try {
      await api.post('/dependentes', novo);
      setShowForm(false);
      setNovo({ nome: '', email: '', senha: '' });
      setErrors({});
      await load();
    } catch (e) {
      setErr(extractError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const change = (k) => (e) => {
    setNovo((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors({ ...errors, [k]: null });
  };

  return (
    <main className="space-y-6 animate-fade-in pb-10 max-w-7xl mx-auto">
      <HeaderDashboard showForm={showForm} setShowForm={setShowForm} />

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm animate-slide-up" role="alert">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {err}
        </div>
      )}

      {showForm && (
        <form id="form-novo-dependente" onSubmit={criar} noValidate className="card space-y-5 animate-slide-up border-merenda-200/50 bg-merenda-50/10 shadow-glass">
          <header className="border-b border-slate-100 pb-4 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-merenda-100 text-merenda-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-slate-800">Cadastrar Estudante</h2>
              <p className="text-xs text-slate-500 font-medium">Os dados de acesso serão usados pelo aluno no app.</p>
            </div>
          </header>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Field label="Nome completo" error={errors.nome}>
              <input className="input h-12" placeholder="Ex: João da Silva" value={novo.nome} onChange={change('nome')} aria-required="true" />
            </Field>
            <Field label="Email de acesso" error={errors.email}>
              <input className="input h-12" type="email" placeholder="joao@escola.com" value={novo.email} onChange={change('email')} aria-required="true" />
            </Field>
            <Field label="Senha provisória" error={errors.senha} hint="O aluno pode alterar depois">
              <input className="input h-12" type="password" placeholder="Mínimo 6 caracteres" value={novo.senha} onChange={change('senha')} aria-required="true" />
            </Field>
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button className="btn-primary px-8 h-12 text-lg shadow-glow" disabled={isSubmitting}>
              {isSubmitting ? 'Cadastrando...' : 'Criar Conta do Aluno'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <SkeletonGrid />
      ) : dependentes.length === 0 && !showForm ? (
        <EmptyState onAdd={() => setShowForm(true)} />
      ) : (
        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Lista de Dependentes">
          {dependentes.map((d) => (
            <DependenteCard key={d.id} d={d} />
          ))}
        </section>
      )}
    </main>
  );
}
