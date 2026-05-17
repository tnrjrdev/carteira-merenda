import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const links = navLinksFor(user?.role);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-merenda-300/15 blur-3xl"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-200/15 blur-3xl"></div>
      </div>

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-white/60 shadow-sm">
        <div className="container-narrow flex items-center justify-between h-16">
          <Link to={defaultRoute(user?.role)} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-merenda-400 to-merenda-600 text-white flex items-center justify-center text-lg font-display font-bold shadow-md group-hover:scale-105 transition-transform">M</div>
            <span className="font-display text-xl font-bold text-slate-900 tracking-tight hidden sm:inline">Merenda</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-merenda-50 text-merenda-700 shadow-sm'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block leading-tight">
              <div className="text-sm font-semibold text-slate-800">{user?.nome}</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">{roleLabel(user?.role)}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-merenda-400 to-merenda-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
              {(user?.nome || '?').charAt(0).toUpperCase()}
            </div>
            <button onClick={handleLogout} className="btn-secondary text-sm hidden sm:inline-flex" title="Sair">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sair
            </button>
            <button onClick={handleLogout} className="sm:hidden p-2 rounded-lg text-slate-600 hover:bg-white/70" title="Sair">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>

        <div className="md:hidden border-t border-white/40 px-3 py-2 flex gap-1 overflow-x-auto custom-scrollbar">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-merenda-50 text-merenda-700' : 'text-slate-600'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="flex-1 container-narrow py-8">
        <Outlet />
      </main>

      <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-200/60 bg-white/40">
        © {new Date().getFullYear()} Merenda · Carteira digital escolar
      </footer>
    </div>
  );
}

function navLinksFor(role) {
  switch (role) {
    case 'RESPONSAVEL':
      return [{ to: '/responsavel', label: 'Meus filhos', end: true }];
    case 'ESTUDANTE':
      return [{ to: '/estudante', label: 'Minha carteira', end: true }];
    case 'CANTINA':
      return [
        { to: '/cantina', label: 'Painel', end: true },
        { to: '/cantina/pdv', label: 'PDV' },
        { to: '/cantina/produtos', label: 'Produtos' },
        { to: '/cantina/relatorios', label: 'Relatórios' },
        { to: '/cantina/webhooks', label: 'Integrações' },
      ];
    case 'ADMIN':
      return [
        { to: '/admin/rede', label: 'Painel da rede', end: true },
        { to: '/responsavel', label: 'Modo responsável' },
      ];
    default:
      return [];
  }
}

function roleLabel(role) {
  switch (role) {
    case 'RESPONSAVEL': return 'Responsável';
    case 'ESTUDANTE': return 'Estudante';
    case 'CANTINA': return 'Cantina';
    case 'ADMIN': return 'Administrador';
    default: return '';
  }
}

function defaultRoute(role) {
  switch (role) {
    case 'RESPONSAVEL': return '/responsavel';
    case 'ESTUDANTE': return '/estudante';
    case 'CANTINA': return '/cantina';
    case 'ADMIN': return '/admin/rede';
    default: return '/';
  }
}
