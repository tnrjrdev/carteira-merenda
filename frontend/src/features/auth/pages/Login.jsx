import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Field from '../../../components/ui/Field.jsx';
import { extractError } from '../../../utils/format.js';
import * as V from '../../../utils/validation.js';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const { login, googleLogin, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState(null);

  const validate = () => V.validateForm({
    email: [() => V.required(email, 'Email'), () => V.email(email)],
    senha: [() => V.required(senha, 'Senha')],
  });

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      const data = await login(email, senha);
      navigate(routeFor(data.role));
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setErr(null);
    try {
      const data = await googleLogin(credentialResponse.credential);
      navigate(routeFor(data.role));
    } catch (e) {
      setErr(extractError(e));
    }
  };

  const handleGoogleError = () => {
    setErr('Ocorreu um erro ao tentar fazer login com o Google.');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-slate-50 font-sans">
      {/* Animated Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-merenda-400/30 blur-3xl animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-accent/20 blur-3xl animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-merenda-300/30 blur-3xl animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-[420px] animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-gradient-to-br from-merenda-400 to-merenda-600 text-white text-3xl font-display font-bold shadow-glow mb-4 hover:scale-105 transition-transform duration-300">
            M
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-800 tracking-tight">Merenda</h1>
          <p className="text-slate-500 font-medium mt-1">Sua carteira digital escolar</p>
        </div>
        
        <form onSubmit={submit} noValidate className="glass-panel p-8 space-y-5 animate-slide-up">
          <h2 className="text-xl font-display font-bold text-slate-800 border-b border-slate-200/50 pb-3">Bem-vindo de volta!</h2>
          
          {err && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3.5 rounded-xl font-medium flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{err}</span>
            </div>
          )}
          
          <Field label="E-mail" error={errors.email}>
            <div className="relative">
              <input 
                className="input pl-11" 
                type="email" 
                autoFocus 
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setErrors({ ...errors, ...validate() })} 
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </Field>
          
          <Field label="Senha" error={errors.senha}>
            <div className="relative">
              <input 
                className="input pl-11" 
                type="password" 
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onBlur={() => setErrors({ ...errors, ...validate() })} 
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </Field>
          
          <button className="btn-primary w-full mt-2 text-lg shadow-glow" type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
              </span>
            ) : 'Entrar'}
          </button>
          
          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">Ou continue com</span>
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

          <div className="pt-4 text-sm text-slate-600 text-center border-t border-slate-200/50">
            Não tem uma conta? <Link to="/register" className="text-merenda-600 font-semibold hover:text-merenda-700 hover:underline transition-colors">Cadastre-se</Link>
          </div>
        </form>

        <div className="mt-8 glass-panel p-5 text-xs text-slate-600 border border-slate-200/40 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <p className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-merenda-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Contas de Teste
          </p>
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-white/50 p-2 rounded-lg border border-slate-200/50 flex justify-between">
              <span className="font-medium text-slate-700">Responsável:</span> <span className="font-mono">maria@merenda.com / 123456</span>
            </div>
            <div className="bg-white/50 p-2 rounded-lg border border-slate-200/50 flex justify-between">
              <span className="font-medium text-slate-700">Estudante:</span> <span className="font-mono">joao@merenda.com / 123456</span>
            </div>
            <div className="bg-white/50 p-2 rounded-lg border border-slate-200/50 flex justify-between">
              <span className="font-medium text-slate-700">Cantina:</span> <span className="font-mono">cantina@merenda.com / 123456</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function routeFor(role) {
  switch (role) {
    case 'RESPONSAVEL': return '/responsavel';
    case 'ESTUDANTE': return '/estudante';
    case 'CANTINA': return '/cantina';
    case 'ADMIN': return '/responsavel';
    default: return '/login';
  }
}
