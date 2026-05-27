import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import api from '../../../services/api.js';
import Field from '../../../components/ui/Field.jsx';
import LgpdCheckbox from '../components/LgpdCheckbox.jsx';
import { extractError } from '../../../utils/format.js';
import * as V from '../../../utils/validation.js';
import { GoogleLogin } from '@react-oauth/google';

export default function Register() {
  const { register, googleRegister, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', telefone: '', cpf: '',
    role: 'RESPONSAVEL', cantinaId: '',
    dataNascimento: '',
    aceitaLgpd: false,
  });
  const [cantinas, setCantinas] = useState([]);
  const [politicaVersao, setPoliticaVersao] = useState('');
  const [err, setErr] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get('/cantinas/publicas').then(({ data }) => setCantinas(data)).catch(() => {});
    api.get('/lgpd/politica').then(({ data }) => setPoliticaVersao(data?.versao || '')).catch(() => {});
  }, []);

  const change = (k) => (e) => {
    setForm((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors({ ...errors, [k]: null });
  };

  const validate = () => V.validateForm({
    nome: [
      () => V.required(form.nome, 'Nome'),
      () => V.minLength(form.nome, 3, 'Nome'),
      () => V.maxLength(form.nome, 120, 'Nome'),
    ],
    email: [
      () => V.required(form.email, 'Email'),
      () => V.email(form.email),
      () => V.maxLength(form.email, 150, 'Email'),
    ],
    senha: [
      () => V.required(form.senha, 'Senha'),
      () => V.senhaForte(form.senha),
    ],
    cpf: [() => V.cpf(form.cpf)],
    telefone: [() => V.telefone(form.telefone)],
    cantinaId: [
      () => form.role === 'CANTINA' ? V.required(form.cantinaId, 'Cantina') : null,
    ],
    aceitaLgpd: [() => form.aceitaLgpd ? null : 'É necessário aceitar a política de privacidade'],
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
        dataNascimento: form.dataNascimento || null,
        politicaVersao: politicaVersao || null,
      };
      if (payload.role !== 'CANTINA') delete payload.cantinaId;
      else payload.cantinaId = Number(payload.cantinaId);
      const data = await register(payload);
      navigate(routeFor(data.role));
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setErr(null);
    if (!form.aceitaLgpd) {
      setErrors({ ...errors, aceitaLgpd: 'Aceite a política antes de continuar com o Google' });
      return;
    }
    if (form.role === 'CANTINA' && !form.cantinaId) {
      setErrors({ ...errors, cantinaId: 'Selecione uma cantina antes de continuar com o Google' });
      return;
    }
    try {
      const extras = {
        role: form.role,
        cantinaId: form.role === 'CANTINA' ? Number(form.cantinaId) : null,
        aceitaLgpd: true,
        politicaVersao: politicaVersao || null,
      };
      const data = await googleRegister(credentialResponse.credential, extras);
      navigate(routeFor(data.role));
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const handleGoogleError = () => {
    setErr('Ocorreu um erro ao tentar registrar com o Google.');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden bg-slate-50 font-sans">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-merenda-400/30 blur-3xl animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-accent/20 blur-3xl animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-merenda-300/30 blur-3xl animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-gradient-to-br from-merenda-400 to-merenda-600 text-white text-3xl font-display font-bold shadow-glow mb-4 hover:scale-105 transition-transform duration-300">
            M
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-800 tracking-tight">Criar conta</h1>
          <p className="text-slate-500 font-medium mt-1">Junte-se à revolução da merenda escolar</p>
        </div>

        <form onSubmit={submit} noValidate className="glass-panel p-6 sm:p-8 space-y-4 animate-slide-up">
          {err && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3.5 rounded-xl font-medium flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{err}</span>
            </div>
          )}

          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 mb-2">
            <Field label="Tipo de conta" hint="Contas de estudante são criadas pelo responsável.">
              <select className="input bg-white" value={form.role} onChange={change('role')}>
                <option value="RESPONSAVEL">Responsável (pai/mãe)</option>
                <option value="CANTINA">Operador de cantina</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Nome completo" error={errors.nome}>
                <input className="input" placeholder="Maria da Silva" value={form.nome} onChange={change('nome')} />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="E-mail" error={errors.email}>
                <input className="input" type="email" placeholder="maria@email.com" value={form.email} onChange={change('email')} />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Senha" error={errors.senha} hint="Mínimo 6 caracteres">
                <input className="input" type="password" placeholder="••••••••" value={form.senha} onChange={change('senha')} />
              </Field>
            </div>

            <div>
              <Field label="Telefone" error={errors.telefone} hint="Ex: 11999990000">
                <input className="input" placeholder="11999990000" value={form.telefone} onChange={change('telefone')} />
              </Field>
            </div>

            <div>
              <Field label="CPF" error={errors.cpf} hint="Apenas números">
                <input className="input" placeholder="00000000000" value={form.cpf} onChange={change('cpf')} />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Data de nascimento" hint="Exigida pela LGPD/ECA — para responsáveis ajuda a identificar se a conta é majoritária">
                <input className="input" type="date" value={form.dataNascimento}
                       onChange={change('dataNascimento')} />
              </Field>
            </div>

            {form.role === 'CANTINA' && (
              <div className="sm:col-span-2">
                <Field label="Cantina" error={errors.cantinaId}>
                  <select className="input" value={form.cantinaId} onChange={change('cantinaId')}>
                    <option value="">Selecione a cantina</option>
                    {cantinas.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome} ({c.escola})</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </div>

          <LgpdCheckbox
            checked={form.aceitaLgpd}
            onChange={(v) => { setForm((s) => ({ ...s, aceitaLgpd: v })); if (errors.aceitaLgpd) setErrors({ ...errors, aceitaLgpd: null }); }}
            erro={errors.aceitaLgpd}
          />

          <button type="submit" className="btn-primary w-full mt-4 text-lg shadow-glow" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Criando...
              </span>
            ) : 'Criar conta'}
          </button>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">Ou cadastre com</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              shape="rectangular"
              theme="outline"
              size="large"
            />
          </div>

          <div className="pt-4 text-sm text-slate-600 text-center border-t border-slate-200/50 mt-4">
            Já tem conta? <Link to="/login" className="text-merenda-600 font-semibold hover:text-merenda-700 hover:underline transition-colors">Entrar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function routeFor(role) {
  switch (role) {
    case 'RESPONSAVEL': return '/responsavel';
    case 'CANTINA': return '/cantina';
    default: return '/login';
  }
}
